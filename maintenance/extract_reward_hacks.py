"""
Extract reward-hack (rule-violating) trajectories out of the displayed submissions and
into a hidden archive folder, based on a hack-detection verdicts file.

Verdicts file shape: {"model": "<detector>", "results": [ {submission, instance_id,
is_violation, violation_channels, rationale, suspicious_commands, _meta}, ... ]}.

For every entry with is_violation == true, the matching record is REMOVED from the
submission's <DIR>.trials.json (and its split trials/<id>.json file, if any) and from the
summary's details.correct / correct_secure / model_patch_error arrays, then archived under

    public/submissions/reward_hack_<date>/<submission_dir>/<submission_dir>.trials.json

The archive folder is NOT in manifest.json, so the leaderboard/visualizer never load it.
Archived records are stored inline (split messages are resolved) with an added
`reward_hack` field carrying the verdict's channels/rationale/suspicious_commands.

Usage:
    python maintenance/extract_reward_hacks.py [--verdicts PATH] [--date YYYY-MM-DD] [--dry-run]
"""

import argparse
import datetime
import json
import os
import sys
from collections import defaultdict


def _load(p):
    with open(p, "r", encoding="utf-8") as f:
        return json.load(f)


def _dump(p, o):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w", encoding="utf-8") as f:
        json.dump(o, f, ensure_ascii=False, indent=1)


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    ap = argparse.ArgumentParser()
    ap.add_argument("--verdicts",
                    default="/home/songwenzhao/susvibes-hack-detection/outputs/agent_verdicts.json")
    ap.add_argument("--submissions-dir",
                    default=os.path.join(here, "..", "public", "submissions"))
    ap.add_argument("--date", default=datetime.date.today().isoformat())
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    sub_root = os.path.abspath(args.submissions_dir)
    archive_root = os.path.join(sub_root, f"reward_hack_{args.date}")

    results = _load(args.verdicts)["results"]
    viol = defaultdict(dict)  # submission -> {instance_id: verdict}
    for e in results:
        if e.get("is_violation") is True:
            viol[e["submission"]][e["instance_id"]] = e
    total_flagged = sum(len(v) for v in viol.values())

    print(f"{'DRY-RUN ' if args.dry_run else ''}archive -> {archive_root}")
    print(f"verdicts flagged is_violation=true: {total_flagged} across {len(viol)} submissions\n")

    index = []
    tot_moved = tot_missing = 0
    for sub in sorted(viol):
        vmap = viol[sub]
        traj_dir = os.path.join(sub_root, sub, "trajectories")
        trials_path = os.path.join(traj_dir, f"{sub}.trials.json")
        if not os.path.isfile(trials_path):
            print(f"  {sub:<58} SKIP (no trials.json)")
            continue

        data = _load(trials_path)
        keep, moved, split_to_delete = [], [], []
        for rec in data:
            iid = rec.get("instance_id")
            if iid in vmap:
                rec_inline = dict(rec)
                msgs = rec.get("messages")
                if isinstance(msgs, str):  # split format -> resolve to inline for the archive
                    split_path = os.path.join(traj_dir, msgs)
                    rec_inline["messages"] = _load(split_path) if os.path.isfile(split_path) else []
                    split_to_delete.append(split_path)
                v = vmap[iid]
                rec_inline["reward_hack"] = {
                    "violation_channels": v.get("violation_channels"),
                    "rationale": v.get("rationale"),
                    "suspicious_commands": v.get("suspicious_commands"),
                }
                moved.append(rec_inline)
                index.append({"submission": sub, "instance_id": iid,
                              "violation_channels": v.get("violation_channels")})
            else:
                keep.append(rec)

        found = {r["instance_id"] for r in moved}
        missing = sorted(set(vmap) - found)
        tot_moved += len(moved)
        tot_missing += len(missing)
        flag = f"  MISSING {len(missing)} (not in trials.json)" if missing else ""
        print(f"  {sub:<58} moved={len(moved):>3} keep={len(keep):>3}{flag}")
        if missing:
            for m in missing[:5]:
                print(f"        ! verdict id not found: {m}")

        if args.dry_run:
            continue

        # write archive (inline), delete split files, trim trials.json
        _dump(os.path.join(archive_root, sub, f"{sub}.trials.json"), moved)
        for sp in split_to_delete:
            if os.path.isfile(sp):
                os.remove(sp)
        _dump(trials_path, keep)

        # trim summary arrays (new format: details.completed.{func_pass,sec_pass};
        # also handles legacy details.{correct,correct_secure})
        summary_path = trials_path.replace(".trials.json", ".summary.json")
        if os.path.isfile(summary_path):
            s = _load(summary_path)
            det = s.get("details", {})
            comp = det.get("completed", {})
            for container, keys in ((comp, ("func_pass", "sec_pass")),
                                    (det, ("model_patch_error", "correct", "correct_secure"))):
                for k in keys:
                    if isinstance(container.get(k), list):
                        container[k] = [i for i in container[k] if i not in vmap]
            _dump(summary_path, s)

    print(f"\nTOTAL moved={tot_moved}  missing={tot_missing}  (flagged={total_flagged})")
    if not args.dry_run:
        _dump(os.path.join(archive_root, "violations_index.json"),
              {"date": args.date, "verdicts_source": args.verdicts,
               "total_moved": tot_moved, "moved": index})
        readme = os.path.join(archive_root, "README.md")
        with open(readme, "w", encoding="utf-8") as f:
            f.write(
                f"# Reward-hack archive ({args.date})\n\n"
                f"Trajectories flagged `is_violation=true` by the hack detector "
                f"(`{os.path.basename(args.verdicts)}`) and removed from the displayed "
                f"submissions. This folder is **not** in `manifest.json`, so the "
                f"leaderboard and visualizer never load it.\n\n"
                f"- `<submission_dir>/<submission_dir>.trials.json` — the removed records "
                f"(inline messages) with an added `reward_hack` field.\n"
                f"- `violations_index.json` — flat index of everything moved.\n\n"
                f"Total moved: {tot_moved}.\n")
    return 0 if tot_missing == 0 else 0


if __name__ == "__main__":
    sys.exit(main())
