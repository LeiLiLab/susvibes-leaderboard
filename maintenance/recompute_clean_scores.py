"""
Recompute leaderboard scores with reward-hack instances counted as FAILURES.

Reward-hack trajectories were removed from each submission's numerator (the
`details.completed.{func_pass,sec_pass}` arrays were trimmed by extract_reward_hacks.py)
but are KEPT in the denominator: the score divides by the full candidate set
(`num_candidates`), so reward hacking lowers the score instead of being scored away.

    func_pass_1 = |details.completed.func_pass| / num_candidates
    sec_pass_1  = |details.completed.sec_pass|  / num_candidates

The source of truth is each submission's summary.json (already trimmed), so this is
independent of any live verdict file. Writes results.python.{func_pass_1, sec_pass_1} in
every submission.json; run sync_summary_metrics.py afterwards to mirror the ratios (and the
reward-hack provenance) into the summaries.

Usage:
    python maintenance/recompute_clean_scores.py [--submissions-dir DIR] [--dry-run]
"""

import argparse
import glob
import json
import os
import sys


def _load(p):
    with open(p, "r", encoding="utf-8") as f:
        return json.load(f)


def _dump(p, o):
    with open(p, "w", encoding="utf-8") as f:
        json.dump(o, f, ensure_ascii=False, indent=2)


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    ap = argparse.ArgumentParser()
    ap.add_argument("--submissions-dir",
                    default=os.path.join(here, "..", "public", "submissions"))
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    sub_root = os.path.abspath(args.submissions_dir)
    print(f"{'submission':<58}{'old f/s':>14}{'  new f/s':>14}{'  denom':>8}")
    n_done = n_changed = 0
    for summ in sorted(glob.glob(os.path.join(sub_root, "*", "trajectories", "*.summary.json"))):
        sub_dir = os.path.basename(os.path.dirname(os.path.dirname(summ)))
        sub_json = os.path.join(sub_root, sub_dir, "submission.json")
        if not os.path.isfile(sub_json):
            continue

        s = _load(summ)
        comp = s.get("details", {}).get("completed", {}) or {}
        N = s.get("num_candidates", s.get("num_dataset_instances"))
        if not N:
            print(f"  {sub_dir:<56} SKIP (no num_candidates)")
            continue
        n_correct = len(comp.get("func_pass", []))
        n_secure = len(comp.get("sec_pass", []))
        new_f = round(n_correct / N * 100, 1)
        new_s = round(n_secure / N * 100, 1)

        sj = _load(sub_json)
        score = sj.setdefault("results", {}).setdefault("python", {})
        of, os_ = score.get("func_pass_1"), score.get("sec_pass_1")
        changed = (of != new_f or os_ != new_s)
        n_changed += changed
        flag = "  <-- changed" if changed else ""
        print(f"  {sub_dir:<58}{str(of)+'/'+str(os_):>14}{str(new_f)+'/'+str(new_s):>14}{N:>8}{flag}")

        if not args.dry_run:
            score["func_pass_1"] = new_f
            score["sec_pass_1"] = new_s
            _dump(sub_json, sj)
        n_done += 1

    print(f"\n{'DRY-RUN ' if args.dry_run else ''}recomputed {n_done} submissions ({n_changed} changed).")
    if not args.dry_run:
        print("Run sync_summary_metrics.py to mirror the scores into the summaries.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
