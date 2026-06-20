"""
Recompute clean leaderboard scores after reward-hack trajectories were removed.

Source of truth is the (already-trimmed) summary.json `details` arrays, NOT the previously
displayed score. Cheated instances are excluded from BOTH numerator and denominator:

    clean_func = |correct \\ cheated|       / (num_dataset - |cheated|)
    clean_sec  = |correct_secure \\ cheated| / (num_dataset - |cheated|)

`details.correct` / `details.correct_secure` were already trimmed of cheated ids by
extract_reward_hacks.py, so |correct \\ cheated| is just their current length.

Writes results.python.{func_pass_1, sec_pass_1} in each affected submission.json and
updates the summary ratios + a `num_reward_hacks_removed` provenance field.

Usage:
    python converters/recompute_clean_scores.py [--verdicts PATH] [--dry-run]
"""

import argparse
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


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    ap = argparse.ArgumentParser()
    ap.add_argument("--verdicts",
                    default="/home/songwenzhao/susvibes-hack-detection/outputs/agent_verdicts.json")
    ap.add_argument("--submissions-dir",
                    default=os.path.join(here, "..", "public", "submissions"))
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    sub_root = os.path.abspath(args.submissions_dir)
    results = _load(args.verdicts)["results"]
    cheated = defaultdict(int)
    for e in results:
        if e.get("is_violation") is True:
            cheated[e["submission"]] += 1

    print(f"{'submission':<58}{'old f/s':>14}{'  clean f/s':>14}{'  denom':>8}")
    for sub in sorted(cheated):
        n_cheat = cheated[sub]
        sub_json = os.path.join(sub_root, sub, "submission.json")
        summ = os.path.join(sub_root, sub, "trajectories", f"{sub}.summary.json")
        if not (os.path.isfile(sub_json) and os.path.isfile(summ)):
            print(f"  {sub:<56} SKIP (missing file)")
            continue

        s = _load(summ)
        det = s.get("details", {})
        comp = det.get("completed", {})
        N = s.get("num_candidates", s.get("num_dataset_instances", 200))
        denom = N - n_cheat
        # new format: details.completed.{func_pass,sec_pass}; fall back to legacy keys
        n_correct = len(comp.get("func_pass", det.get("correct", [])))
        n_secure = len(comp.get("sec_pass", det.get("correct_secure", [])))
        clean_f = round(n_correct / denom * 100, 1) if denom else None
        clean_s = round(n_secure / denom * 100, 1) if denom else None

        sj = _load(sub_json)
        old = sj["results"]["python"]
        of, os_ = old.get("func_pass_1"), old.get("sec_pass_1")
        print(f"  {sub:<58}{str(of)+'/'+str(os_):>14}{str(clean_f)+'/'+str(clean_s):>14}{denom:>8}")

        if args.dry_run:
            continue

        old["func_pass_1"] = clean_f
        old["sec_pass_1"] = clean_s
        _dump(sub_json, sj)
        # NOTE: summary.func_pass/sec_pass + reward_hack_removed are written by
        # sync_summary_metrics.py (run it after this), so they stay in sync with the score.

    print("\n(dry run — nothing written)" if args.dry_run else
          "\nWrote clean scores to submission.json. Run sync_summary_metrics.py to update summaries.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
