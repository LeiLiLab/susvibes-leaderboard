"""
Core converter: Anthropic-style trajectory events -> OpenAI / ms-swift `messages`.

The leaderboard's canonical trajectory format used to be an Anthropic Messages-style
event stream:

    [ {type:"system"|"assistant"|"user"|"result", message:{role, content:[blocks]}} ]

where a block is one of {type:"text"}, {type:"tool_use", id, name, input},
{type:"tool_result", tool_use_id, content}.

This module maps one such event list to an OpenAI-style `messages` list:

    [ {role:"assistant", content:"...", tool_calls:[{id, type:"function",
                                                     function:{name, arguments:"<json str>"}}]},
      {role:"tool", tool_call_id:"...", content:"..."},
      {role:"user", content:"..."} ]

Notes / decisions:
- `tool_use.input` (object) -> `function.arguments` (JSON **string**), matching OpenAI.
- One Anthropic `tool` event may carry several `tool_result` blocks; OpenAI requires
  one `tool` message per result, so we split them out (each keeps its tool_call_id).
- `system` and `result` events carry no chat content here (only model/usage metadata)
  and are dropped from the message stream. The model name is surfaced separately via
  extract_model() so the visualizer can still show it.
- Display metadata (timestamp / cost / usage) is preserved as EXTRA keys on each message
  by default. ms-swift reads only role/content/tool_calls/tool_call_id and ignores the
  rest, so the same file feeds both training and the visualizer. Pass strip_meta=True
  for pure OpenAI messages.
"""

import json


def _tool_result_to_text(content):
    """Flatten a tool_result `content` (str | list-of-blocks) into a plain string."""
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
                elif "content" in c and isinstance(c["content"], str):
                    parts.append(c["content"])
                else:
                    parts.append(json.dumps(c, ensure_ascii=False))
        return "\n".join(parts)
    if content is None:
        return ""
    return json.dumps(content, ensure_ascii=False)


def _meta(event, message, strip_meta):
    if strip_meta:
        return {}
    out = {}
    ts = event.get("timestamp")
    if ts is not None:
        out["timestamp"] = ts
    if message.get("cost") is not None:
        out["cost"] = message.get("cost")
    usage = message.get("usage")
    if usage:
        out["usage"] = {
            "prompt_tokens": usage.get("input_tokens", usage.get("prompt_tokens", 0)),
            "completion_tokens": usage.get("output_tokens", usage.get("completion_tokens", 0)),
        }
    return out


def extract_model(events):
    """Return the model name from the system event, if any (for display metadata)."""
    for ev in events:
        if isinstance(ev, dict) and ev.get("type") == "system" and ev.get("model"):
            return ev["model"]
    return None


def extract_result(events):
    """Return the run-result metadata (the `result` event minus its `type`), if any.

    `result` is NOT an OpenAI message role, so it is kept as instance-level metadata
    rather than placed in `messages`. Holds e.g. subtype / num_turns / is_error /
    duration_ms / total_cost_usd.
    """
    for ev in events:
        if isinstance(ev, dict) and ev.get("type") == "result":
            return {k: v for k, v in ev.items() if k != "type"}
    return None


def normalize_result(events, messages):
    """Build a result dict with a UNIFIED core present on every record, while keeping
    any scaffold-specific fields untouched.

    Unified core (same meaning across all scaffolds):
      - subtype : 'completed' | 'error' | 'incomplete'   (success -> completed; gemini
                  status / is_error mapped in)
      - is_error: bool
      - num_turns: int   (filled from the assistant-message count when the scaffold did
                          not report it; existing values are kept, e.g. claude-cli's)
    """
    raw = extract_result(events) or {}
    result = dict(raw)  # preserve scaffold-specific extras (duration_ms, stats, ...)

    sub = raw.get("subtype")
    gemini_status = raw.get("status")  # gemini-cli native status field
    if raw.get("is_error") is True or gemini_status == "error":
        status = "error"
    elif sub in ("completed", "success") or gemini_status == "success":
        status = "completed"
    else:
        status = "incomplete"
    result["subtype"] = status

    if result.get("is_error") is None:
        result["is_error"] = (status == "error")

    if result.get("num_turns") is None:
        result["num_turns"] = sum(
            1 for m in messages if isinstance(m, dict) and m.get("role") == "assistant")

    return result


def is_already_messages(entries):
    """Heuristic: a list of openai messages has `role` and no Anthropic `type` envelope."""
    for e in entries:
        if isinstance(e, dict):
            return "role" in e and "type" not in e
    return False


def is_flat_format(events):
    """Detect the gemini-cli flat schema: standalone `tool_use`/`tool_result`/`init`
    events with role/content at the top level, vs the Anthropic `{type, message:{...}}`
    envelope used by swe-agent / openhands / claude-cli."""
    for ev in events:
        if isinstance(ev, dict) and ev.get("type") in ("tool_use", "tool_result", "init"):
            return True
    return False


def convert_events(events, strip_meta=False):
    """Convert a scaffold event list into an OpenAI `messages` list, dispatching on
    the source schema (Anthropic-nested vs gemini-cli-flat)."""
    if is_flat_format(events):
        return _convert_flat(events, strip_meta=strip_meta)
    return _convert_nested(events, strip_meta=strip_meta)


def _convert_flat(events, strip_meta=False):
    """Convert the gemini-cli flat schema into OpenAI `messages`.

    Events: message{role,content}, tool_use{tool_name,tool_id,parameters},
    tool_result{tool_id,output}, init/error/result (metadata, dropped). A `tool_use`
    is merged into the preceding assistant message as a tool_call when possible, so one
    assistant turn carries its text and calls together (like the nested scaffolds).
    """
    messages = []
    seen_call_ids = set()
    for ev in events:
        if not isinstance(ev, dict):
            continue
        t = ev.get("type")
        if t in ("init", "result", "error"):
            continue
        meta = {} if strip_meta else ({"timestamp": ev["timestamp"]} if ev.get("timestamp") else {})

        if t == "message":
            role = ev.get("role") or "user"
            if role not in ("user", "assistant", "system"):
                role = "user"
            content = ev.get("content")
            content = content if isinstance(content, str) else _tool_result_to_text(content)
            msg = {"role": role, "content": content}
            msg.update(meta)
            messages.append(msg)

        elif t == "tool_use":
            tid = ev.get("tool_id")
            seen_call_ids.add(tid)
            tool_call = {
                "id": tid,
                "type": "function",
                "function": {
                    "name": ev.get("tool_name"),
                    "arguments": json.dumps(ev.get("parameters", {}), ensure_ascii=False),
                },
            }
            if messages and messages[-1].get("role") == "assistant":
                messages[-1].setdefault("tool_calls", []).append(tool_call)
            else:
                msg = {"role": "assistant", "content": "", "tool_calls": [tool_call]}
                msg.update(meta)
                messages.append(msg)

        elif t == "tool_result":
            tid = ev.get("tool_id")
            text = ev.get("output")
            text = text if isinstance(text, str) else _tool_result_to_text(text)
            if tid in seen_call_ids:
                msg = {"role": "tool", "tool_call_id": tid, "content": text}
            else:
                msg = {"role": "user", "content": text}
            msg.update(meta)
            messages.append(msg)

    return messages


def _convert_nested(events, strip_meta=False):
    """Convert an Anthropic-nested event list into an OpenAI `messages` list.

    A single ordered pass tracks the tool_call ids the model has actually produced.
    A `tool_result` whose id was never emitted as a tool_call is an environment
    observation injected by the harness (initial task seed, final submit result, ...),
    not a response to a model call -> it becomes a `user` message so the output stays
    valid OpenAI (no dangling tool_call_id).
    """
    messages = []
    seen_call_ids = set()

    for ev in events:
        if not isinstance(ev, dict):
            continue
        etype = ev.get("type")
        if etype in ("system", "result"):
            continue
        message = ev.get("message")
        if isinstance(message, str):
            message = {"content": message}
        elif not isinstance(message, dict):
            message = {}
        role = message.get("role") or etype
        content = message.get("content")
        meta = _meta(ev, message, strip_meta)

        if role == "assistant":
            text_parts, tool_calls = [], []
            if isinstance(content, list):
                for c in content:
                    if isinstance(c, str):
                        text_parts.append(c)
                    elif isinstance(c, dict):
                        ctype = c.get("type")
                        if ctype == "text":
                            text_parts.append(c.get("text", ""))
                        elif ctype == "tool_use":
                            tool_calls.append({
                                "id": c.get("id"),
                                "type": "function",
                                "function": {
                                    "name": c.get("name"),
                                    "arguments": json.dumps(c.get("input", {}), ensure_ascii=False),
                                },
                            })
                            seen_call_ids.add(c.get("id"))
                        elif ctype == "tool_result":
                            # rare: tool_result inside an assistant turn -> treat as text
                            text_parts.append(_tool_result_to_text(c.get("content")))
                        else:
                            text_parts.append(json.dumps(c, ensure_ascii=False))
            elif isinstance(content, str):
                text_parts.append(content)
            msg = {"role": "assistant", "content": "\n".join(p for p in text_parts if p)}
            if tool_calls:
                msg["tool_calls"] = tool_calls
            msg.update(meta)
            messages.append(msg)

        elif role == "tool":
            blocks = content if isinstance(content, list) else [content]
            emitted = False
            for c in blocks:
                if isinstance(c, dict) and c.get("type") == "tool_result":
                    tcid = c.get("tool_use_id")
                    text = _tool_result_to_text(c.get("content"))
                    if tcid in seen_call_ids:
                        msg = {"role": "tool", "tool_call_id": tcid, "content": text}
                    else:
                        # harness-injected observation with no matching model call
                        msg = {"role": "user", "content": text}
                    msg.update(meta)
                    messages.append(msg)
                    emitted = True
                elif isinstance(c, str):
                    msg = {"role": "user", "content": c}
                    msg.update(meta)
                    messages.append(msg)
                    emitted = True
            if not emitted:
                msg = {"role": "user", "content": _tool_result_to_text(content)}
                msg.update(meta)
                messages.append(msg)

        else:  # user (or anything else) -> user message
            if isinstance(content, list):
                parts = []
                for c in content:
                    if isinstance(c, str):
                        parts.append(c)
                    elif isinstance(c, dict):
                        if c.get("type") == "text":
                            parts.append(c.get("text", ""))
                        elif c.get("type") == "tool_result":
                            parts.append(_tool_result_to_text(c.get("content")))
                        else:
                            parts.append(json.dumps(c, ensure_ascii=False))
                text = "\n".join(p for p in parts if p)
            elif isinstance(content, str):
                text = content
            else:
                text = _tool_result_to_text(content)
            msg = {"role": "user", "content": text}
            msg.update(meta)
            messages.append(msg)

    return messages


# --------------------------------------------------------------------------- #
# Verification
# --------------------------------------------------------------------------- #

def _event_content(ev):
    """Safely pull `message.content` from an event, tolerating str/None messages."""
    if not isinstance(ev, dict):
        return None
    message = ev.get("message")
    if isinstance(message, str):
        return message
    if not isinstance(message, dict):
        return None
    return message.get("content")


def _collect_event_texts(events):
    """All human-readable text strings present in the source events (order-preserving)."""
    if is_flat_format(events):
        texts = []
        for ev in events:
            if not isinstance(ev, dict):
                continue
            if ev.get("type") == "message" and isinstance(ev.get("content"), str) and ev["content"]:
                texts.append(ev["content"])
            elif ev.get("type") == "tool_result":
                t = ev.get("output")
                t = t if isinstance(t, str) else _tool_result_to_text(t)
                if t:
                    texts.append(t)
        return texts

    texts = []
    for ev in events:
        if not isinstance(ev, dict) or ev.get("type") in ("system", "result"):
            continue
        content = _event_content(ev)
        if isinstance(content, str):
            if content:
                texts.append(content)
        elif isinstance(content, list):
            for c in content:
                if isinstance(c, str):
                    if c:
                        texts.append(c)
                elif isinstance(c, dict):
                    if c.get("type") == "text" and c.get("text"):
                        texts.append(c["text"])
                    elif c.get("type") == "tool_result":
                        t = _tool_result_to_text(c.get("content"))
                        if t:
                            texts.append(t)
    return texts


def verify(events, messages):
    """Return a list of problem strings; empty list == conversion looks correct."""
    problems = []

    # 1) tool_use count == tool_calls count
    if is_flat_format(events):
        n_tool_use = sum(1 for ev in events
                         if isinstance(ev, dict) and ev.get("type") == "tool_use")
    else:
        n_tool_use = 0
        for ev in events:
            if not isinstance(ev, dict) or ev.get("type") in ("system", "result"):
                continue
            content = _event_content(ev)
            if isinstance(content, list):
                n_tool_use += sum(
                    1 for c in content if isinstance(c, dict) and c.get("type") == "tool_use")
    call_ids = [tc.get("id") for m in messages for tc in m.get("tool_calls", [])]
    if n_tool_use != len(call_ids):
        problems.append(f"tool_use={n_tool_use} but emitted tool_calls={len(call_ids)}")

    # 2) every tool message references a known tool_call id
    call_id_set = set(call_ids)
    for m in messages:
        if m.get("role") == "tool":
            tcid = m.get("tool_call_id")
            if tcid is not None and tcid not in call_id_set:
                problems.append(f"tool message references unknown tool_call_id={tcid}")

    # 3) arguments must be valid JSON
    for m in messages:
        for tc in m.get("tool_calls", []):
            args = tc.get("function", {}).get("arguments")
            try:
                json.loads(args)
            except (json.JSONDecodeError, TypeError):
                problems.append(f"tool_call {tc.get('id')} has non-JSON arguments")

    # 4) no text content lost. Assistant turns join several text blocks with "\n",
    #    so compare whitespace-insensitive concatenations rather than exact strings.
    src_texts = _collect_event_texts(events)
    dst_texts = [m["content"] for m in messages
                 if isinstance(m.get("content"), str) and m["content"]]

    def _norm(strings):
        return "".join(strings).replace(" ", "").replace("\n", "").replace("\t", "")

    if _norm(src_texts) != _norm(dst_texts):
        problems.append(
            f"text content mismatch: {len(src_texts)} source strings vs "
            f"{len(dst_texts)} message strings")

    return problems
