"""Apply the already-v1 OpenHands runs (claude-4-sonnet, gemini-2.5-pro,
gemini-3-pro, kimi-k2) to their leaderboard submissions.

Like the SWE-agent v1 batch, these runs hold the full 200 but were evaluated on
the v1 (186) dataset (susvibes summary num_candidates=186). We convert and filter
to the 186 v1 ids, in the SPLIT layout (per-instance trials/<id>.json + an index
trials.json whose `messages` is a path), copy the v1 summary, and update
submission.json (scores from the summary, susvibes_version=v1.0).
"""
import json
import os
import shutil
import sys

# canonical converter lives in the susvibes eval harness (single source of truth)
import importlib.util  # noqa: E402
_spec = importlib.util.spec_from_file_location(
    "oh_convert", "/home/songwenzhao/susvibes/evaluation_harness/openhands/convert.py")
conv = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(conv)

REPO = "/home/songwenzhao/susvibes-leaderboard"
OH = "/home/songwenzhao/OpenHands/OpenHands-0.54/evaluation/evaluation_outputs/outputs/susvibes/CodeActAgent"
SUM = "/home/songwenzhao/susvibes/logs/run_evaluation/openhands/generic"
DATASET = "/home/songwenzhao/susvibes/datasets/default/susvibes_dataset.jsonl"

# submission -> (output.jsonl run dir, summary dir, model name)
JOBS = {
    "claude-4-sonnet_openhands_default_2025-12-29": (
        "claude-sonnet-4-20250514_maxiter_200_N_run_evaluation_generic_instances",
        "default__claude-sonnet-4-20250514_maxiter_200_N_run_evaluation_generic_instances",
        "Claude 4 Sonnet",
    ),
    "gemini-2.5-pro_openhands_default_2025-12-29": (
        "gemini-2.5-pro_maxiter_200_N_run_evaluation_generic_instances",
        "default__gemini-2.5-pro_maxiter_200_N_run_evaluation_generic_instances",
        "Gemini 2.5 Pro",
    ),
    "gemini-3-pro_openhands_default_2025-12-29": (
        "gemini-3-pro-preview_maxiter_200_N_run_evaluation_generic_instances",
        "default__gemini-3-pro-preview_maxiter_200_N_run_evaluation_generic_instances",
        "Gemini 3 Pro",
    ),
    "kimi-k2_openhands_default_2025-12-29": (
        "kimi-k2-0711-preview_maxiter_200_N_run_evaluation_generic_instances",
        "default__kimi-k2-0711-preview_maxiter_200_N_run_evaluation_generic_instances",
        "Kimi K2",
    ),
}


def main():
    keep_ids = {json.loads(l)["instance_id"] for l in open(DATASET)}
    assert len(keep_ids) == 186, len(keep_ids)

    for sub, (run, sum_dir, model) in JOBS.items():
        sub_dir = os.path.join(REPO, "public/submissions", sub)
        traj_dir = os.path.join(sub_dir, "trajectories")
        out_jsonl = os.path.join(OH, run, "output.jsonl")
        sum_path = os.path.join(SUM, sum_dir, "summary.json")
        assert os.path.isdir(traj_dir), traj_dir
        assert os.path.isfile(out_jsonl), out_jsonl
        assert os.path.isfile(sum_path), sum_path

        # 1) rewrite the split trials/ folder (wipe stale, write 186 fresh)
        trials_sub = os.path.join(traj_dir, "trials")
        if os.path.isdir(trials_sub):
            shutil.rmtree(trials_sub)
        os.makedirs(trials_sub)

        index, n_msgs, empty = [], 0, 0
        seen = set()
        with open(out_jsonl, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                rec = json.loads(line)
                iid = rec.get("instance_id")
                if iid not in keep_ids or iid in seen:
                    continue
                seen.add(iid)
                history = rec.get("history", []) or []
                messages = conv.history_to_messages(history)
                n_assistant = sum(1 for m in messages if m.get("role") == "assistant")
                result = conv.build_result(rec, history, n_assistant)
                patch = (rec.get("test_result") or {}).get("git_patch", "") or ""
                if not patch.strip():
                    empty += 1

                rel = f"trials/{iid}.json"
                with open(os.path.join(traj_dir, rel), "w", encoding="utf-8") as mf:
                    json.dump(messages, mf, ensure_ascii=False, indent=1)
                index.append({"instance_id": iid, "model_patch": patch,
                              "model_name_or_path": model, "run_metadata": result, "messages": rel})
                n_msgs += len(messages)

        ids = {r["instance_id"] for r in index}
        assert ids == keep_ids, f"{sub}: {len(ids)} != 186 (missing {len(keep_ids-ids)})"
        index.sort(key=lambda x: x["instance_id"])
        json.dump(index, open(f"{traj_dir}/{sub}.trials.json", "w"),
                  ensure_ascii=False, indent=1)

        # 2) summary (raw v1 + reward-hack parity fields)
        summary = json.load(open(sum_path))
        summary["num_reward_hack_removed"] = 0
        summary["details"]["reward_hack_removed"] = []
        json.dump(summary, open(f"{traj_dir}/{sub}.summary.json", "w"),
                  ensure_ascii=False, indent=1)

        # 3) submission.json scores + version
        sp = os.path.join(sub_dir, "submission.json")
        meta = json.load(open(sp))
        fp = round(summary["func_pass"] * 100, 1)
        sc = round(summary["sec_pass"] * 100, 1)
        meta["results"]["python"]["func_pass_1"] = fp
        meta["results"]["python"]["sec_pass_1"] = sc
        meta["methodology"]["susvibes_version"] = "v1.0"
        json.dump(meta, open(sp, "w"), ensure_ascii=False, indent=2)

        print(f"{sub}: trials=186 (empty_patch={empty}) msgs={n_msgs} "
              f"func={fp}% sec={sc}% v1.0  [{model}]")


if __name__ == "__main__":
    main()
