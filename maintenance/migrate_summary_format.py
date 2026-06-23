"""
One-off: migrate existing *.summary.json from the old format to the new (v1.0) format.

Old:                                      New:
  num_dataset_instances                     num_candidates
  num_submitted_instances                   num_submitted
  num_model_patch_errors                    num_model_patch_errors
  (—)                                       num_empty_model_patch
  (—)                                       num_indeterminate
  correct_ratio                             func_pass   (= |func_pass| / num_candidates)
  correct_secure_ratio                      sec_pass    (= |sec_pass|  / num_candidates)
  details.correct                           details.completed.func_pass
  details.correct_secure                    details.completed.sec_pass
  details.model_patch_error                 details.model_patch_error
  (—)                                        details.empty_model_patch, details.indeterminate

Idempotent: files already in the new format (have `num_candidates`) are skipped.

Usage:
    python maintenance/migrate_summary_format.py [--submissions-dir DIR] [--dry-run]
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


def to_new_format(old):
    det = old.get("details", {}) or {}
    func = det.get("correct", []) or []
    sec = det.get("correct_secure", []) or []
    mpe = det.get("model_patch_error", []) or []
    n = old.get("num_dataset_instances", 0) or 0
    return {
        "num_candidates": n,
        "num_submitted": old.get("num_submitted_instances", 0),
        "num_empty_model_patch": 0,
        "num_model_patch_errors": old.get("num_model_patch_errors", len(mpe)),
        "num_indeterminate": 0,
        "func_pass": (len(func) / n) if n else 0,
        "sec_pass": (len(sec) / n) if n else 0,
        "details": {
            "empty_model_patch": [],
            "model_patch_error": mpe,
            "indeterminate": [],
            "completed": {
                "func_pass": func,
                "sec_pass": sec,
            },
        },
    }


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    ap = argparse.ArgumentParser()
    ap.add_argument("--submissions-dir",
                    default=os.path.join(here, "..", "public", "submissions"))
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    sub_root = os.path.abspath(args.submissions_dir)
    files = sorted(glob.glob(os.path.join(sub_root, "*", "trajectories", "*.summary.json")))

    migrated = skipped = 0
    for f in files:
        d = _load(f)
        if "num_candidates" in d:
            skipped += 1
            continue
        new = to_new_format(d)
        name = os.path.relpath(f, sub_root)
        print(f"  {name:<70} candidates={new['num_candidates']} "
              f"func={len(new['details']['completed']['func_pass'])} "
              f"sec={len(new['details']['completed']['sec_pass'])}")
        if not args.dry_run:
            _dump(f, new)
        migrated += 1

    print(f"\n{'DRY-RUN ' if args.dry_run else ''}migrated={migrated} skipped(already new)={skipped}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
