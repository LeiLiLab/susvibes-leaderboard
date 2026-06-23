"""Regenerate the 13 converter-based v1 submissions in the SPLIT layout with the
renamed `run_metadata` field. Wipes each submission's old trajectory files and writes
`<sub>.trials.json` (index, messages = path) + `messages/<id>.json` per instance.

Does NOT touch submission.json / summary.json (already correct).
"""
import glob
import json
import os
import shutil
import sys

# the canonical converters live in the susvibes eval harness (single source of truth)
import importlib.util  # noqa: E402
_EH = "/home/songwenzhao/susvibes/evaluation_harness"


def _load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


swe = _load("swe_convert", f"{_EH}/swe_agent/convert.py")
oh = _load("oh_convert", f"{_EH}/openhands/convert.py")

REPO = "/home/songwenzhao/susvibes-leaderboard"
TR = "/home/songwenzhao/SWE-agent/trajectories/songwenzhao"
OH = "/home/songwenzhao/OpenHands/OpenHands-0.54/evaluation/evaluation_outputs/outputs/susvibes/CodeActAgent"
DATASET = "/home/songwenzhao/susvibes/datasets/default/susvibes_dataset.jsonl"

# submission -> (scaffold, source path, model)
SWE = {
    "glm-5_swe-agent_default_2026-02-25": (
        f"{TR}/susvibes_eval__bedrock/zai.glm-5__t-0.00__p-1.00__c-0.00___susvibes.eval.core_glm-5_swe-agent_default_generic_instances", "GLM-5"),
    "glm-4.7-flash_swe-agent_default_2026-02-16": (
        f"{TR}/susvibes_eval__bedrock/zai.glm-4.7-flash__t-0.00__p-1.00__c-0.00___susvibes.eval.core_glm-4.7-flash_swe-agent_default_generic_instances", "GLM-4.7-Flash"),
    "qwen3-coder-next_swe-agent_default_2026-02-25": (
        f"{TR}/susvibes_eval__bedrock/qwen.qwen3-coder-next__t-0.00__p-1.00__c-0.00___susvibes.eval.core_qwen3-coder-next_swe-agent_default_generic_instances", "Qwen3-Coder-Next"),
    "claude-4-sonnet_swe-agent_default_2025-12-29": (
        f"{TR}/susvibes_eval__claude-sonnet-4-20250514__t-0.00__p-1.00__c-0.00___susvibes.run_evaluation_generic_instances", "Claude 4 Sonnet"),
    "claude-4-sonnet_swe-agent_custom-oracle-prompt_2025-12-29": (
        f"{TR}/susvibes_eval__claude-sonnet-4-20250514__t-0.00__p-1.00__c-0.00___susvibes.run_evaluation_oracle_instances", "Claude 4 Sonnet"),
    "claude-4-sonnet_swe-agent_custom-self-selection-prompt_2025-12-29": (
        f"{TR}/susvibes_eval__claude-sonnet-4-20250514__t-0.00__p-1.00__c-0.00___susvibes.run_evaluation_self-selection_instances", "Claude 4 Sonnet"),
    "gemini-2.5-pro_swe-agent_default_2025-12-29": (
        f"{TR}/susvibes_eval__gemini/gemini-2.5-pro__t-0.00__p-1.00__c-0.00___susvibes.run_evaluation_generic_instances", "Gemini 2.5 Pro"),
    "gemini-3-pro_swe-agent_default_2025-12-29": (
        f"{TR}/susvibes_eval__gemini/gemini-3-pro-preview__t-0.00__p-1.00__c-0.00___susvibes.run_evaluation_generic_instances", "Gemini 3 Pro"),
    "kimi-k2_swe-agent_default_2025-12-29": (
        f"{TR}/susvibes_eval__moonshot/kimi-k2-0711-preview__t-0.00__p-1.00__c-0.00___susvibes.run_evaluation_generic_instances", "Kimi K2"),
}
OHJOBS = {
    "claude-4-sonnet_openhands_default_2025-12-29": (
        f"{OH}/claude-sonnet-4-20250514_maxiter_200_N_run_evaluation_generic_instances/output.jsonl", "Claude 4 Sonnet"),
    "gemini-2.5-pro_openhands_default_2025-12-29": (
        f"{OH}/gemini-2.5-pro_maxiter_200_N_run_evaluation_generic_instances/output.jsonl", "Gemini 2.5 Pro"),
    "gemini-3-pro_openhands_default_2025-12-29": (
        f"{OH}/gemini-3-pro-preview_maxiter_200_N_run_evaluation_generic_instances/output.jsonl", "Gemini 3 Pro"),
    "kimi-k2_openhands_default_2025-12-29": (
        f"{OH}/kimi-k2-0711-preview_maxiter_200_N_run_evaluation_generic_instances/output.jsonl", "Kimi K2"),
}


def fresh_split_dir(sub):
    td = os.path.join(REPO, "public/submissions", sub, "trajectories")
    assert os.path.isdir(td), td
    for old in ("trials", "messages"):
        p = os.path.join(td, old)
        if os.path.isdir(p):
            shutil.rmtree(p)
    os.makedirs(os.path.join(td, "messages"))
    return td


def write_split(td, sub, records):
    n_msgs = 0
    for r in records:
        with open(os.path.join(td, r["messages"]), "w", encoding="utf-8") as f:
            json.dump(r.pop("_messages"), f, ensure_ascii=False, indent=1)
        n_msgs += r.pop("_n")
    records.sort(key=lambda x: x["instance_id"])
    json.dump(records, open(f"{td}/{sub}.trials.json", "w"), ensure_ascii=False, indent=1)
    return n_msgs


def main():
    keep = {json.loads(l)["instance_id"] for l in open(DATASET)}
    assert len(keep) == 186

    for sub, (src, _label) in SWE.items():
        assert os.path.isdir(src), src
        # model name is auto-detected from the run (run_batch.config.yaml), not the label
        mnop = swe.model_from_run_config(src) or swe.model_from_dirname(src)
        preds = {}
        pj = os.path.join(src, "preds.json")
        if os.path.isfile(pj):
            preds = json.load(open(pj))
        td = fresh_split_dir(sub)
        recs, empty = [], 0
        for tp in sorted(glob.glob(os.path.join(src, "*", "*.traj"))):
            iid = os.path.basename(os.path.dirname(tp))
            if iid not in keep:
                continue
            d = json.load(open(tp, encoding="utf-8"))
            msgs = swe.history_to_messages(d.get("history", []) or [])
            patch = (d.get("info", {}) or {}).get("submission") or preds.get(iid, {}).get("model_patch", "") or ""
            if not patch.strip():
                empty += 1
            recs.append({"instance_id": iid, "model_patch": patch, "model_name_or_path": mnop,
                         "run_metadata": swe.build_result(d.get("info", {}) or {}, d.get("trajectory", []) or []),
                         "tools": swe.tools_from_traj(d),
                         "messages": f"messages/{iid}.json", "_messages": msgs, "_n": len(msgs)})
        ids = {r["instance_id"] for r in recs}
        assert ids == keep, f"{sub}: {len(ids)} != 186 (missing {len(keep - ids)})"
        n = write_split(td, sub, recs)
        print(f"{sub}: 186 trials, {n} msgs, empty_patch={empty}  [{mnop}]")

    for sub, (jsonl, _label) in OHJOBS.items():
        assert os.path.isfile(jsonl), jsonl
        td = fresh_split_dir(sub)
        recs, empty, seen, mnop = [], 0, set(), "unknown"
        for line in open(jsonl, encoding="utf-8"):
            line = line.strip()
            if not line:
                continue
            rec = json.loads(line)
            iid = rec.get("instance_id")
            if iid not in keep or iid in seen:
                continue
            seen.add(iid)
            # model name is auto-detected per record (metadata.llm_config.model)
            mnop = (rec.get("metadata", {}).get("llm_config", {}).get("model") or "unknown")
            hist = rec.get("history", []) or []
            msgs = oh.history_to_messages(hist)
            na = sum(1 for m in msgs if m.get("role") == "assistant")
            patch = (rec.get("test_result") or {}).get("git_patch", "") or ""
            if not patch.strip():
                empty += 1
            recs.append({"instance_id": iid, "model_patch": patch, "model_name_or_path": mnop,
                         "run_metadata": oh.build_result(rec, hist, na),
                         "tools": oh.extract_tools(hist),
                         "messages": f"messages/{iid}.json", "_messages": msgs, "_n": len(msgs)})
        ids = {r["instance_id"] for r in recs}
        assert ids == keep, f"{sub}: {len(ids)} != 186 (missing {len(keep - ids)})"
        n = write_split(td, sub, recs)
        print(f"{sub}: 186 trials, {n} msgs, empty_patch={empty}  [{mnop}]")


if __name__ == "__main__":
    main()
