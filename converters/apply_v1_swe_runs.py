"""Apply the already-v1 SWE-agent runs (claude-sonnet-4 generic/oracle/self-selection,
gemini-2.5-pro, gemini-3-pro-preview, kimi-k2) to their leaderboard submissions.

These runs were evaluated on the v1 (186) dataset already (susvibes summary
num_candidates=186). The raw .traj dirs still hold the full 200; we convert and
filter to the 186 v1 ids so trials match the summary and the other v1 submissions.

For each: write trials.json (186, messages format), copy the v1 summary.json
(adding num_reward_hack_removed=0 / details.reward_hack_removed=[] for schema
parity with the other leaderboard summaries), and update submission.json
(results.python.{func_pass_1,sec_pass_1} from the summary, susvibes_version=v1.0).
"""
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "scaffolds"))
import swe_agent as conv  # noqa: E402

REPO = "/home/songwenzhao/susvibes-leaderboard"
TR = "/home/songwenzhao/SWE-agent/trajectories/songwenzhao"
SUM = "/home/songwenzhao/susvibes/logs/run_evaluation"
DATASET = "/home/songwenzhao/susvibes/datasets/default/susvibes_dataset.jsonl"

# submission -> (traj dir, summary.json, model name)
JOBS = {
    "claude-4-sonnet_swe-agent_default_2025-12-29": (
        f"{TR}/susvibes_eval__claude-sonnet-4-20250514__t-0.00__p-1.00__c-0.00___susvibes.run_evaluation_generic_instances",
        f"{SUM}/swe-agent/generic/susvibes_eval__claude-sonnet-4-20250514__t-0.00__p-1.00__c-0.00___susvibes.run_evaluation_generic_instances/summary.json",
        "Claude 4 Sonnet",
    ),
    "claude-4-sonnet_swe-agent_custom-oracle-prompt_2025-12-29": (
        f"{TR}/susvibes_eval__claude-sonnet-4-20250514__t-0.00__p-1.00__c-0.00___susvibes.run_evaluation_oracle_instances",
        f"{SUM}/swe-agent/oracle/susvibes_eval__claude-sonnet-4-20250514__t-0.00__p-1.00__c-0.00___susvibes.run_evaluation_oracle_instances/summary.json",
        "Claude 4 Sonnet",
    ),
    "claude-4-sonnet_swe-agent_custom-self-selection-prompt_2025-12-29": (
        f"{TR}/susvibes_eval__claude-sonnet-4-20250514__t-0.00__p-1.00__c-0.00___susvibes.run_evaluation_self-selection_instances",
        f"{SUM}/swe-agent/self-selection/susvibes_eval__claude-sonnet-4-20250514__t-0.00__p-1.00__c-0.00___susvibes.run_evaluation_self-selection_instances/summary.json",
        "Claude 4 Sonnet",
    ),
    "gemini-2.5-pro_swe-agent_default_2025-12-29": (
        f"{TR}/susvibes_eval__gemini/gemini-2.5-pro__t-0.00__p-1.00__c-0.00___susvibes.run_evaluation_generic_instances",
        f"{SUM}/swe-agent/generic/gemini-2.5-pro__t-0.00__p-1.00__c-0.00___susvibes.run_evaluation_generic_instances/summary.json",
        "Gemini 2.5 Pro",
    ),
    "gemini-3-pro_swe-agent_default_2025-12-29": (
        f"{TR}/susvibes_eval__gemini/gemini-3-pro-preview__t-0.00__p-1.00__c-0.00___susvibes.run_evaluation_generic_instances",
        f"{SUM}/swe-agent/generic/gemini-3-pro-preview__t-0.00__p-1.00__c-0.00___susvibes.run_evaluation_generic_instances/summary.json",
        "Gemini 3 Pro",
    ),
    "kimi-k2_swe-agent_default_2025-12-29": (
        f"{TR}/susvibes_eval__moonshot/kimi-k2-0711-preview__t-0.00__p-1.00__c-0.00___susvibes.run_evaluation_generic_instances",
        f"{SUM}/swe-agent/generic/kimi-k2-0711-preview__t-0.00__p-1.00__c-0.00___susvibes.run_evaluation_generic_instances/summary.json",
        "Kimi K2",
    ),
}


def convert_dir(in_dir, model, keep_ids):
    """Run the canonical converter, keeping only keep_ids; return sorted trials."""
    import glob
    preds = {}
    pj = os.path.join(in_dir, "preds.json")
    if os.path.isfile(pj):
        preds = json.load(open(pj, encoding="utf-8"))
    trials, fails = [], 0
    for tp in sorted(glob.glob(os.path.join(in_dir, "*", "*.traj"))):
        iid = os.path.basename(os.path.dirname(tp))
        if iid not in keep_ids:
            continue
        d = json.load(open(tp, encoding="utf-8"))
        history = d.get("history", []) or []
        info = d.get("info", {}) or {}
        messages = conv.history_to_messages(history)
        patch = info.get("submission") or preds.get(iid, {}).get("model_patch", "") or ""
        if conv.verify(history, messages):
            fails += 1
        trials.append({
            "instance_id": iid, "model_patch": patch, "model": model,
            "result": conv.build_result(info, d.get("trajectory", []) or []),
            "messages": messages,
        })
    trials.sort(key=lambda x: x["instance_id"])
    return trials, fails


def main():
    keep_ids = {json.loads(l)["instance_id"] for l in open(DATASET)}
    assert len(keep_ids) == 186, len(keep_ids)

    for sub, (in_dir, sum_path, model) in JOBS.items():
        sub_dir = os.path.join(REPO, "public/submissions", sub)
        traj_dir = os.path.join(sub_dir, "trajectories")
        assert os.path.isdir(traj_dir), traj_dir
        assert os.path.isdir(in_dir), in_dir
        assert os.path.isfile(sum_path), sum_path

        # 1) trials (filtered to 186)
        trials, fails = convert_dir(in_dir, model, keep_ids)
        ids = {t["instance_id"] for t in trials}
        assert ids == keep_ids, f"{sub}: trials != 186 ({len(ids)}, missing {len(keep_ids-ids)})"
        json.dump(trials, open(f"{traj_dir}/{sub}.trials.json", "w"),
                  ensure_ascii=False, indent=1)

        # 2) summary (raw v1 + reward-hack parity fields)
        summary = json.load(open(sum_path))
        summary.setdefault("num_reward_hack_removed", 0)
        summary["num_reward_hack_removed"] = 0
        summary["details"].setdefault("reward_hack_removed", [])
        summary["details"]["reward_hack_removed"] = []
        json.dump(summary, open(f"{traj_dir}/{sub}.summary.json", "w"),
                  ensure_ascii=False, indent=1)

        # 3) submission.json scores + version
        sp = os.path.join(sub_dir, "submission.json")
        meta = json.load(open(sp))
        fp = round(summary["func_pass"] * 100, 1)
        sp_ = round(summary["sec_pass"] * 100, 1)
        meta["results"]["python"]["func_pass_1"] = fp
        meta["results"]["python"]["sec_pass_1"] = sp_
        meta["methodology"]["susvibes_version"] = "v1.0"
        json.dump(meta, open(sp, "w"), ensure_ascii=False, indent=2)

        empty = sum(1 for t in trials if not (t["model_patch"] or "").strip())
        print(f"{sub}: trials=186 (empty_patch={empty}, verify_fail={fails}) "
              f"func={fp}% sec={sp_}% v1.0  [{model}]")


if __name__ == "__main__":
    main()
