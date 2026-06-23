"""Merge v1.0 SWE-agent re-runs with the old non-reward-hack trajectories.

For each model the final v1.0 set = the 186 v1 dataset, where:
  - reward-hacked (re-run) instances come from the NEW Bedrock run dir, and
  - all other instances come from the OLD official run dir.

This script (a) copies each needed old per-instance directory into the NEW run
dir so it becomes a complete 186-instance trajectory dir (used later by the
swe-agent converter in the eval harness to build the submission), and (b) writes a
merged predictions file (a JSON list, model_name_or_path normalised to a single
value) that can be fed straight to:

    python -m susvibes.eval.core --predictions_path <merged> --run_id <model> \
        --strategy generic --max_workers N --force

Run from the leaderboard repo root (any env with python3).
"""
import json
import shutil
from pathlib import Path

DATASET = Path("/home/songwenzhao/susvibes/datasets/default/susvibes_dataset.jsonl")
TRAJ_ROOT = Path("/home/songwenzhao/SWE-agent/trajectories/songwenzhao")
OUT_DIR = Path("/home/songwenzhao/susvibes-leaderboard/maintenance/_merged_preds")

# model key -> (new run dir, old official dir, normalised model_name_or_path)
MODELS = {
    "glm-5": (
        "susvibes_eval__bedrock/zai.glm-5__t-0.00__p-1.00__c-0.00___susvibes.eval.core_glm-5_swe-agent_default_generic_instances",
        "susvibes_eval__zai/glm-5__t-0.00__p-1.00__c-0.00___run_evaluation_generic_instances",
        "glm-5",
    ),
    "glm-4.7-flash": (
        "susvibes_eval__bedrock/zai.glm-4.7-flash__t-0.00__p-1.00__c-0.00___susvibes.eval.core_glm-4.7-flash_swe-agent_default_generic_instances",
        "susvibes_eval__openai/zai-org/GLM-4.7-Flash__t-0.00__p-1.00__c-0.00___run_evaluation_generic_instances_merge",
        "glm-4.7-flash",
    ),
    "qwen3-coder-next": (
        "susvibes_eval__bedrock/qwen.qwen3-coder-next__t-0.00__p-1.00__c-0.00___susvibes.eval.core_qwen3-coder-next_swe-agent_default_generic_instances",
        "susvibes_eval__openai/Qwen/Qwen3-Coder-Next-FP8__t-0.00__p-1.00__c-0.00___run_evaluation_generic_instances",
        "qwen3-coder-next",
    ),
}


def instance_dirs(d: Path):
    return {p.name for p in d.iterdir() if p.is_dir()}


def main():
    dataset_ids = {json.loads(l)["instance_id"] for l in DATASET.open()}
    assert len(dataset_ids) == 186, len(dataset_ids)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    for key, (new_rel, old_rel, mname) in MODELS.items():
        new_dir = TRAJ_ROOT / new_rel
        old_dir = TRAJ_ROOT / old_rel
        assert new_dir.is_dir(), new_dir
        assert old_dir.is_dir(), old_dir

        new_ids = instance_dirs(new_dir)
        assert new_ids <= dataset_ids, f"{key}: new ids not in 186: {new_ids - dataset_ids}"
        old_needed = dataset_ids - new_ids
        old_have = instance_dirs(old_dir)
        missing = old_needed - old_have
        assert not missing, f"{key}: old dir missing {len(missing)} needed: {sorted(missing)[:5]}"

        # (a) copy old per-instance dirs into the new dir -> complete 186 traj dir
        copied = 0
        for iid in sorted(old_needed):
            dst = new_dir / iid
            if not dst.exists():
                shutil.copytree(old_dir / iid, dst)
                copied += 1

        # (b) build merged predictions list (186), normalised model_name_or_path.
        # Read each instance's own .pred from the now-complete 186 traj dir;
        # an instance with no .pred (no patch generated) gets an empty patch.
        merged = []
        for iid in sorted(dataset_ids):
            pred_file = new_dir / iid / f"{iid}.pred"
            patch = ""
            if pred_file.exists():
                patch = json.load(pred_file.open()).get("model_patch", "") or ""
            merged.append({
                "model_name_or_path": mname,
                "instance_id": iid,
                "model_patch": patch,
            })
        out_path = OUT_DIR / f"{key}_v1_preds.json"
        json.dump(merged, out_path.open("w"), indent=1)

        final_dirs = len(instance_dirs(new_dir))
        empty = sum(1 for m in merged if not (m["model_patch"] or "").strip())
        print(f"{key}: new={len(new_ids)} copied_old={copied} -> traj_dir={final_dirs} "
              f"preds={len(merged)} (empty_patch={empty}) -> {out_path}")


if __name__ == "__main__":
    main()
