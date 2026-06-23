# Submission-data migration & maintenance

Scripts that migrate and maintain the leaderboard's trajectory data. They are data
tooling only — outside `src/` and `public/`, so they are not bundled into the site and do
not trigger the GitHub Pages deploy. (The scaffold→format converters themselves live in
the SusVibes eval harness, not here — see section (1) below.)

Everything targets the canonical stored format — per-instance records of
`{instance_id, model_patch, model, run_metadata, messages}` where `messages` is an OpenAI /
ms-swift chat list — specified in **[../docs/TRAJECTORY_FORMAT.md](../docs/TRAJECTORY_FORMAT.md)**.

## Layout

```
maintenance/
├── migrate_legacy_trajectories.py  # (2) one-off: migrate already-stored trials.json (old format) -> messages
├── legacy_event_lib.py             #     library used by the migration (event-format -> OpenAI + verify)
├── migrate_summary_format.py       # (2) one-off: migrate *.summary.json old -> new (num_candidates / details.completed)
├── extract_reward_hacks.py         # (3) remove flagged trajectories into a hidden archive
├── recompute_clean_scores.py       # (3) recompute submission.json scores after removal
└── sync_summary_metrics.py         # (3) sync summary func_pass/sec_pass to the score + record removed ids
```

(v1-migration helpers — `merge_v1_traj.py`, `apply_v1_*_runs.py`, `regen_v1_split.py`,
`add_rh_block.py` — also live here; they are one-shot tools that have already run.)

### (1) Ingest raw scaffold logs — the converters live in the eval harness

The per-scaffold converters that turn a scaffold's native run output into the canonical
format are the **single source of truth** in the SusVibes eval harness, not here:
`susvibes/evaluation_harness/<scaffold>/convert.py` (`swe_agent`, `openhands`). This is how
a NEW submission's trajectories are produced.

```bash
# in the eval harness; <raw> is the run dir of <instance>/<instance>.traj subfolders
python3 evaluation_harness/swe_agent/convert.py --input-dir <raw> [--output <dir>] [--model NAME]
```

Each converter reads the full per-instance history so nothing is dropped, fills
`run_metadata` (subtype / is_error / num_turns / total_cost_usd + scaffold extras), and
writes the **split** layout (an index `<stem>.trials.json` whose `messages` is a path, plus
`messages/<id>.json` per instance). The leaderboard helper scripts here import those
converters directly from the eval harness.

### (2) `migrate_legacy_trajectories.py` — one-time format migration (already run)

The existing submissions were originally stored in an Anthropic-style **event** format
(`trajectory: [{type, message:{role, content:[blocks]}}]`). This walked
`public/submissions/`, rewrote each `trajectory` into OpenAI `messages` **in place**, and
attached `model` / unified `run_metadata`. It is idempotent (records already in `messages` form
are skipped) and fail-safe (a submission with any verification failure isn't written
without `--force`). Kept for reference / if any old-format data reappears.

```bash
python3 maintenance/migrate_legacy_trajectories.py --dry-run     # convert + verify, write nothing
python3 maintenance/migrate_legacy_trajectories.py               # migrate in place
python3 maintenance/migrate_legacy_trajectories.py --strip-meta  # pure OpenAI (drop timestamp/cost/usage)
```

`legacy_event_lib.py` holds its mapping (`convert_events`, handling the Anthropic-nested
and gemini-cli-flat event schemas), `normalize_result`, and `verify`.

### (3) Leaderboard maintenance ops

```bash
# Move reward-hack trajectories (is_violation=true in a verdicts file) into a hidden,
# not-in-manifest archive: public/submissions/reward_hack_<date>/
python3 maintenance/extract_reward_hacks.py --verdicts <verdicts.json> [--dry-run]

# Recompute clean submission.json scores after removal:
# clean = |func_pass \ cheated| / (num_candidates - cheated), source of truth = the
# (trimmed) summary.json details.completed arrays.
python3 maintenance/recompute_clean_scores.py [--dry-run]

# Sync each summary's func_pass/sec_pass to the (clean) submission.json score, and append a
# reward_hack_removed = {num, instance_ids} record (from the reward_hack_<date> archive).
python3 maintenance/sync_summary_metrics.py [--dry-run]
```

Run order after re-running a submission: `extract_reward_hacks` → `recompute_clean_scores`
→ `sync_summary_metrics`.

## Verification

The conversions self-check each instance: assistant `tool_use` count == emitted
`tool_calls`; every `tool` message's `tool_call_id` matches a prior `tool_call`; all
`function.arguments` are valid JSON; no human-readable text is lost.
