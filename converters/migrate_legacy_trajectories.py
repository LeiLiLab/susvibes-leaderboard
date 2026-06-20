"""
Convert every trajectory under public/submissions/ from the Anthropic event format
to the OpenAI / ms-swift `messages` format, IN PLACE.

Per-instance schema before:  {instance_id, model_patch, trajectory: [events] | "trials/x.json"}
Per-instance schema after:   {instance_id, model_patch, messages:    [msgs]   | "trials/x.json"}

For split submissions, the referenced trials/<id>.json file (which holds the raw event
list) is rewritten to hold the converted messages list; the pointer field is renamed
trajectory -> messages but keeps the same path.

The script is idempotent: instances already carrying a `messages` field are skipped.
Every converted instance is verified; any problems are reported and (unless --force)
abort the write for that submission.

Usage:
    python converters/migrate_legacy_trajectories.py [--submissions-dir DIR] [--dry-run] [--strip-meta]
                                     [--only SUBMISSION_DIR ...] [--force]
"""

import argparse
import json
import os
import sys

from legacy_event_lib import (convert_events, verify, is_already_messages,
                            normalize_result)


def _attach_meta(item, events, messages, model_name):
    """Attach instance-level metadata, kept out of `messages` (since `result` is not an
    OpenAI role). `model` is the authoritative model name from submission.json; `result`
    carries the unified core (subtype/is_error/num_turns) plus scaffold-specific extras."""
    if model_name:
        item["model"] = model_name
    item["result"] = normalize_result(events, messages)


def _load(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _dump(path, obj):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)


def find_trials_files(submissions_dir, only):
    out = []
    for name in sorted(os.listdir(submissions_dir)):
        if only and name not in only:
            continue
        traj_dir = os.path.join(submissions_dir, name, "trajectories")
        if not os.path.isdir(traj_dir):
            continue
        for fn in sorted(os.listdir(traj_dir)):
            if fn.endswith(".trials.json"):
                out.append((name, os.path.join(traj_dir, fn)))
    return out


def _submission_model(trials_path):
    """Read the authoritative model name from the submission's submission.json."""
    sub_dir = os.path.dirname(os.path.dirname(trials_path))
    try:
        return _load(os.path.join(sub_dir, "submission.json")).get("model_name")
    except (OSError, ValueError):
        return None


def convert_submission(sub_name, trials_path, dry_run, strip_meta, force):
    traj_dir = os.path.dirname(trials_path)
    model_name = _submission_model(trials_path)
    data = _load(trials_path)
    if not isinstance(data, list):
        return {"submission": sub_name, "status": "skip", "reason": "trials.json not a list"}

    n_inline = n_split = n_skip = n_fail = 0
    pending_writes = []          # (path, obj) applied only if the whole submission verifies
    problems = []

    for item in data:
        if "messages" in item and "trajectory" not in item:
            n_skip += 1
            continue

        traj = item.get("trajectory")

        # split format: trajectory is a path to a file holding the event list
        if isinstance(traj, str):
            split_path = os.path.join(traj_dir, traj)
            events = _load(split_path)
            if is_already_messages(events):
                item["messages"] = traj
                item.pop("trajectory", None)
                n_skip += 1
                continue
            messages = convert_events(events, strip_meta=strip_meta)
            probs = verify(events, messages)
            if probs:
                n_fail += 1
                problems.append((item.get("instance_id"), probs))
            _attach_meta(item, events, messages, model_name)
            pending_writes.append((split_path, messages))
            item["messages"] = traj           # same path, content becomes messages
            item.pop("trajectory", None)
            n_split += 1

        # inline format: trajectory is the event list
        elif isinstance(traj, list):
            if is_already_messages(traj):
                item["messages"] = traj
                item.pop("trajectory", None)
                n_skip += 1
                continue
            messages = convert_events(traj, strip_meta=strip_meta)
            probs = verify(traj, messages)
            if probs:
                n_fail += 1
                problems.append((item.get("instance_id"), probs))
            _attach_meta(item, traj, messages, model_name)
            item["messages"] = messages
            item.pop("trajectory", None)
            n_inline += 1
        else:
            n_skip += 1

    status = "ok" if n_fail == 0 else "FAIL"
    result = {
        "submission": sub_name, "status": status,
        "inline": n_inline, "split": n_split, "skipped": n_skip, "failed": n_fail,
        "problems": problems[:10],
    }

    if dry_run:
        return result
    if n_fail and not force:
        result["status"] = "FAIL (not written)"
        return result

    # commit writes: split files first, then the trials.json index
    for path, obj in pending_writes:
        _dump(path, obj)
    _dump(trials_path, data)
    return result


def main():
    ap = argparse.ArgumentParser()
    here = os.path.dirname(os.path.abspath(__file__))
    ap.add_argument("--submissions-dir",
                    default=os.path.join(here, "..", "public", "submissions"))
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--strip-meta", action="store_true",
                    help="drop timestamp/cost/usage; emit pure OpenAI messages")
    ap.add_argument("--only", nargs="*", default=None,
                    help="convert only these submission dir names")
    ap.add_argument("--force", action="store_true",
                    help="write even if some instances fail verification")
    args = ap.parse_args()

    sub_dir = os.path.abspath(args.submissions_dir)
    files = find_trials_files(sub_dir, set(args.only) if args.only else None)
    if not files:
        print("No *.trials.json files found under", sub_dir)
        return 1

    print(f"{'DRY-RUN ' if args.dry_run else ''}converting {len(files)} trials file(s)\n")
    tot = {"inline": 0, "split": 0, "skipped": 0, "failed": 0}
    any_fail = False
    for sub_name, path in files:
        r = convert_submission(sub_name, path, args.dry_run, args.strip_meta, args.force)
        for k in tot:
            tot[k] += r.get(k, 0)
        flag = "" if r["status"] == "ok" else f"  <-- {r['status']}"
        print(f"  {sub_name:<58} inline={r.get('inline',0):>3} "
              f"split={r.get('split',0):>4} skip={r.get('skipped',0):>4} "
              f"fail={r.get('failed',0):>3}{flag}")
        if r.get("problems"):
            any_fail = True
            for iid, probs in r["problems"]:
                print(f"      ! {iid}: {'; '.join(probs)}")

    print(f"\nTOTAL  inline={tot['inline']}  split={tot['split']}  "
          f"skipped={tot['skipped']}  failed={tot['failed']}")
    if any_fail:
        print("Some instances failed verification.")
        return 2
    print("All converted instances passed verification." if not args.dry_run
          else "Dry run complete (no files written).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
