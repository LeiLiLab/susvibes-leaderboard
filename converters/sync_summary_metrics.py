"""
Sync each summary.json's func_pass / sec_pass ratios to the leaderboard score in the
sibling submission.json (so summary and the displayed score agree exactly), and append a
`reward_hack_removed` record (count + the removed instance_ids) at the end of the summary.

- summary.func_pass = submission.results.python.func_pass_1 / 100   (exact match, no
  denominator guessing — the submission score already excludes reward-hack instances).
- summary.sec_pass  = submission.results.python.sec_pass_1 / 100
- summary.reward_hack_removed = {"num": N, "instance_ids": [...]}, sourced from the
  reward_hack_<date>/violations_index.json archive (num 0 / empty when nothing was removed).

Idempotent. Run after extract_reward_hacks.py + recompute_clean_scores.py.

Usage:
    python converters/sync_summary_metrics.py [--submissions-dir DIR] [--dry-run]
"""

import argparse
import glob
import json
import os
import sys
from collections import defaultdict


def _load(p):
    with open(p, "r", encoding="utf-8") as f:
        return json.load(f)


def _dump(p, o):
    with open(p, "w", encoding="utf-8") as f:
        json.dump(o, f, ensure_ascii=False, indent=2)


def load_removed(sub_root):
    """submission_dir -> sorted list of removed (reward-hack) instance_ids, from any
    reward_hack_<date>/violations_index.json archives."""
    removed = defaultdict(set)
    for idx in glob.glob(os.path.join(sub_root, "reward_hack_*", "violations_index.json")):
        for m in _load(idx).get("moved", []):
            removed[m["submission"]].add(m["instance_id"])
    return {k: sorted(v) for k, v in removed.items()}


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    ap = argparse.ArgumentParser()
    ap.add_argument("--submissions-dir",
                    default=os.path.join(here, "..", "public", "submissions"))
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    sub_root = os.path.abspath(args.submissions_dir)
    removed = load_removed(sub_root)

    n_done = 0
    for summ_path in sorted(glob.glob(os.path.join(sub_root, "*", "trajectories", "*.summary.json"))):
        sub_dir = os.path.basename(os.path.dirname(os.path.dirname(summ_path)))
        sub_json = os.path.join(sub_root, sub_dir, "submission.json")
        if not os.path.isfile(sub_json):
            continue

        s = _load(summ_path)
        score = _load(sub_json).get("results", {}).get("python", {})
        f, sec = score.get("func_pass_1"), score.get("sec_pass_1")
        det = s.get("details", {}) or {}
        ids = removed.get(sub_dir, [])

        # Rebuild in the canonical order, mirroring the existing summary shape: a
        # num_* count alongside the other counts, and the instance-id list under
        # `details` (like model_patch_error / indeterminate / completed).
        new = {
            "num_candidates": s.get("num_candidates"),
            "num_submitted": s.get("num_submitted"),
            "num_empty_model_patch": s.get("num_empty_model_patch", 0),
            "num_model_patch_errors": s.get("num_model_patch_errors", 0),
            "num_indeterminate": s.get("num_indeterminate", 0),
            "num_reward_hack_removed": len(ids),
            "func_pass": round(f / 100, 4) if isinstance(f, (int, float)) else s.get("func_pass"),
            "sec_pass": round(sec / 100, 4) if isinstance(sec, (int, float)) else s.get("sec_pass"),
            "details": {
                "empty_model_patch": det.get("empty_model_patch", []),
                "model_patch_error": det.get("model_patch_error", []),
                "indeterminate": det.get("indeterminate", []),
                "completed": det.get("completed", {}),
                "reward_hack_removed": ids,
            },
        }

        print(f"  {sub_dir:<58} func/sec={new['func_pass']}/{new['sec_pass']}  removed={len(ids)}")
        if not args.dry_run:
            _dump(summ_path, new)
        n_done += 1

    print(f"\n{'DRY-RUN ' if args.dry_run else ''}synced {n_done} summaries")
    return 0


if __name__ == "__main__":
    sys.exit(main())
