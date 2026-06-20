#!/usr/bin/env python3
"""
Convert SWE-agent .traj files into the leaderboard's canonical trials.json format.

Output is the OpenAI / ms-swift `messages` format (see the leaderboard's
docs/TRAJECTORY_FORMAT.md). Each instance becomes:

    {
      "instance_id": ...,
      "model_patch": ...,                      # the submitted patch (info.submission / .pred)
      "model": "claude-sonnet-4-20250514",     # from --model or the run-dir name
      "result": {subtype, is_error, num_turns, exit_status, cost_usd,
                 tokens_sent, tokens_received, tool_execution_time_s},
      "messages": [ ...OpenAI chat messages... ]
    }

The messages are taken verbatim from the .traj `history` (the COMPLETE message list:
the real system prompt, the initial user task, and every assistant + tool turn through
the end), not reconstructed from per-step action strings — so nothing is dropped.

Usage:
    python converters/scaffolds/swe_agent.py --input-dir <raw .traj dir> [--input-dir DIR] [--output FILE] [--model NAME]
"""

import argparse
import glob
import json
import os
import re
import sys


# --------------------------------------------------------------------------- #
# helpers
# --------------------------------------------------------------------------- #

def _text_from(content):
    """Flatten a content value (str | list-of-blocks) into a plain string."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for c in content:
            if isinstance(c, str):
                parts.append(c)
            elif isinstance(c, dict):
                if c.get("type") == "text":
                    parts.append(c.get("text", ""))
                elif isinstance(c.get("content"), str):
                    parts.append(c["content"])
                else:
                    parts.append(json.dumps(c, ensure_ascii=False))
        return "\n".join(p for p in parts if p)
    if content is None:
        return ""
    return json.dumps(content, ensure_ascii=False)


def _clean_tool_calls(tool_calls):
    """Normalize SWE-agent tool_calls to OpenAI shape (drop `index`, ensure str args)."""
    out = []
    for tc in tool_calls or []:
        fn = tc.get("function", {}) or {}
        args = fn.get("arguments", "{}")
        if not isinstance(args, str):
            args = json.dumps(args, ensure_ascii=False)
        out.append({
            "id": tc.get("id"),
            "type": "function",
            "function": {"name": fn.get("name"), "arguments": args},
        })
    return out


def history_to_messages(history):
    """Convert the .traj `history` (full message list) into OpenAI messages."""
    messages = []
    for m in history:
        role = m.get("role")
        if role == "system":
            messages.append({"role": "system", "content": _text_from(m.get("content"))})
        elif role == "user":
            messages.append({"role": "user", "content": _text_from(m.get("content"))})
        elif role == "assistant":
            msg = {"role": "assistant",
                   "content": m["content"] if isinstance(m.get("content"), str)
                   else _text_from(m.get("content"))}
            tcs = _clean_tool_calls(m.get("tool_calls"))
            if tcs:
                msg["tool_calls"] = tcs
            messages.append(msg)
        elif role == "tool":
            ids = m.get("tool_call_ids") or []
            content = m.get("content")
            # SWE-agent: one tool result per call. Pair when counts match, else join.
            if isinstance(content, list) and len(content) == len(ids) and ids:
                for cid, c in zip(ids, content):
                    messages.append({"role": "tool", "tool_call_id": cid,
                                     "content": _text_from([c])})
            else:
                text = _text_from(content)
                if ids:
                    messages.append({"role": "tool", "tool_call_id": ids[0], "content": text})
                else:
                    messages.append({"role": "tool", "content": text})
        # unknown roles ignored
    return messages


def build_result(info, trajectory):
    """Build the unified `result` from .traj info + per-step execution times."""
    stats = info.get("model_stats", {}) or {}
    exit_status = info.get("exit_status", "")
    submitted = isinstance(exit_status, str) and exit_status.startswith("submitted")
    subtype = "completed" if submitted else ("error" if "error" in (exit_status or "") else "incomplete")
    tool_time = sum(s.get("execution_time", 0) or 0 for s in trajectory)
    return {
        # unified core
        "subtype": subtype,
        "is_error": not submitted,
        "num_turns": stats.get("api_calls"),
        "total_cost_usd": stats.get("instance_cost"),
        # scaffold-specific extras
        "exit_status": exit_status,
        "tokens_sent": stats.get("tokens_sent"),
        "tokens_received": stats.get("tokens_received"),
        "tool_execution_time_s": round(tool_time, 3),
    }


def verify(history, messages):
    """Structural checks; returns list of problems (empty == ok)."""
    problems = []
    n_tool_use = sum(len(m.get("tool_calls") or []) for m in history if m.get("role") == "assistant")
    call_ids = {tc["id"] for m in messages for tc in m.get("tool_calls", [])}
    if n_tool_use != len(call_ids):
        problems.append(f"tool_use={n_tool_use} vs emitted tool_calls={len(call_ids)}")
    for m in messages:
        if m.get("role") == "tool" and m.get("tool_call_id") not in call_ids:
            problems.append(f"tool msg references unknown id {m.get('tool_call_id')}")
        for tc in m.get("tool_calls", []):
            try:
                json.loads(tc["function"]["arguments"])
            except (json.JSONDecodeError, TypeError, KeyError):
                problems.append(f"tool_call {tc.get('id')} args not JSON")
    # message count: 1 per history message, except tool messages may fan out per id
    return problems


def model_from_dirname(path):
    m = re.search(r"susvibes_eval__(.+?)__t-", os.path.basename(path.rstrip("/")))
    return m.group(1) if m else "unknown"


# --------------------------------------------------------------------------- #
# main
# --------------------------------------------------------------------------- #

def main():
    here = os.path.dirname(os.path.abspath(__file__))
    ap = argparse.ArgumentParser()
    ap.add_argument("--input-dir", default=here,
                    help="dir containing <instance>/<instance>.traj subfolders")
    ap.add_argument("--output", default=None, help="output trials.json (default: <input-dir>/trials.json)")
    ap.add_argument("--model", default=None, help="model name (default: parsed from dir name)")
    args = ap.parse_args()

    in_dir = os.path.abspath(args.input_dir)
    out_path = args.output or os.path.join(in_dir, "trials.json")
    model = args.model or model_from_dirname(in_dir)

    # optional base preds.json fallback for patches
    preds = {}
    pj = os.path.join(in_dir, "preds.json")
    if os.path.isfile(pj):
        with open(pj, encoding="utf-8") as f:
            preds = json.load(f)

    traj_files = sorted(glob.glob(os.path.join(in_dir, "*", "*.traj")))
    print(f"model={model}  found {len(traj_files)} .traj files")

    trials, n_fail = [], 0
    for traj_path in traj_files:
        instance_id = os.path.basename(os.path.dirname(traj_path))
        try:
            with open(traj_path, encoding="utf-8") as f:
                d = json.load(f)
        except (OSError, ValueError) as e:
            print(f"  ! {instance_id}: cannot read ({e})")
            n_fail += 1
            continue

        history = d.get("history", []) or []
        info = d.get("info", {}) or {}
        trajectory = d.get("trajectory", []) or []

        messages = history_to_messages(history)
        model_patch = info.get("submission") or preds.get(instance_id, {}).get("model_patch", "") or ""

        probs = verify(history, messages)
        if probs:
            n_fail += 1
            print(f"  ! {instance_id}: {'; '.join(probs[:3])}")

        trials.append({
            "instance_id": instance_id,
            "model_patch": model_patch,
            "model": model,
            "result": build_result(info, trajectory),
            "messages": messages,
        })

    trials.sort(key=lambda x: x["instance_id"])
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(trials, f, ensure_ascii=False, indent=1)

    n_msgs = sum(len(t["messages"]) for t in trials)
    print(f"\nwrote {len(trials)} trials ({n_msgs} messages total) -> {out_path}")
    print(f"verification failures: {n_fail}")
    return 0 if n_fail == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
