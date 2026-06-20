# Converters & data tooling

Scripts that produce and maintain the leaderboard's trajectory data. They are data
tooling only — outside `src/` and `public/`, so they are not bundled into the site and do
not trigger the GitHub Pages deploy.

Everything targets the canonical stored format — per-instance records of
`{instance_id, model_patch, model, result, messages}` where `messages` is an OpenAI /
ms-swift chat list — specified in **[../docs/TRAJECTORY_FORMAT.md](../docs/TRAJECTORY_FORMAT.md)**.

## Layout

```
converters/
├── scaffolds/                      # (1) raw scaffold run logs  ->  canonical trials.json
│   └── swe_agent.py                #     SWE-agent .traj  ->  trials.json
├── migrate_legacy_trajectories.py  # (2) one-off: migrate already-stored trials.json (old format) -> messages
├── legacy_event_lib.py             #     library used by the migration (event-format -> OpenAI + verify)
├── migrate_summary_format.py       # (2) one-off: migrate *.summary.json old -> new (num_candidates / details.completed)
├── extract_reward_hacks.py         # (3) remove flagged trajectories into a hidden archive
├── recompute_clean_scores.py       # (3) recompute submission.json scores after removal
└── sync_summary_metrics.py         # (3) sync summary func_pass/sec_pass to the score + record removed ids
```

### (1) `scaffolds/` — ingest raw logs (the normal, ongoing path)

One script per agent scaffold. Reads that scaffold's native run output and writes a
canonical `trials.json`. This is how a NEW submission's trajectories are produced.

```bash
# SWE-agent: <raw> is the run dir containing <instance>/<instance>.traj subfolders
python3 converters/scaffolds/swe_agent.py --input-dir <raw> --output trials.json [--model NAME]
```

`swe_agent.py` reads each `.traj`'s full `history` (the complete message list — system
prompt, initial task, and every assistant/tool turn through the end) so nothing is
dropped, and fills `result` from `info` (`exit_status`, `model_stats` → num_turns / cost /
tokens, summed `execution_time`). To add another scaffold, drop a `scaffolds/<name>.py`
that emits the same record shape.

### (2) `migrate_legacy_trajectories.py` — one-time format migration (already run)

The existing submissions were originally stored in an Anthropic-style **event** format
(`trajectory: [{type, message:{role, content:[blocks]}}]`). This walked
`public/submissions/`, rewrote each `trajectory` into OpenAI `messages` **in place**, and
attached `model` / unified `result`. It is idempotent (records already in `messages` form
are skipped) and fail-safe (a submission with any verification failure isn't written
without `--force`). Kept for reference / if any old-format data reappears.

```bash
python3 converters/migrate_legacy_trajectories.py --dry-run     # convert + verify, write nothing
python3 converters/migrate_legacy_trajectories.py               # migrate in place
python3 converters/migrate_legacy_trajectories.py --strip-meta  # pure OpenAI (drop timestamp/cost/usage)
```

`legacy_event_lib.py` holds its mapping (`convert_events`, handling the Anthropic-nested
and gemini-cli-flat event schemas), `normalize_result`, and `verify`.

### (3) Leaderboard maintenance ops

```bash
# Move reward-hack trajectories (is_violation=true in a verdicts file) into a hidden,
# not-in-manifest archive: public/submissions/reward_hack_<date>/
python3 converters/extract_reward_hacks.py --verdicts <verdicts.json> [--dry-run]

# Recompute clean submission.json scores after removal:
# clean = |func_pass \ cheated| / (num_candidates - cheated), source of truth = the
# (trimmed) summary.json details.completed arrays.
python3 converters/recompute_clean_scores.py [--dry-run]

# Sync each summary's func_pass/sec_pass to the (clean) submission.json score, and append a
# reward_hack_removed = {num, instance_ids} record (from the reward_hack_<date> archive).
python3 converters/sync_summary_metrics.py [--dry-run]
```

Run order after re-running a submission: `extract_reward_hacks` → `recompute_clean_scores`
→ `sync_summary_metrics`.

## Verification

The conversions self-check each instance: assistant `tool_use` count == emitted
`tool_calls`; every `tool` message's `tool_call_id` matches a prior `tool_call`; all
`function.arguments` are valid JSON; no human-readable text is lost.
