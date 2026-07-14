# Trajectory & Submission File Format

The format for the files under `public/submissions/<DIR>/trajectories/`, which the leaderboard
reads at runtime and the trajectory visualizer renders. Trajectories are stored in a single
format — OpenAI-style `messages` — described below; produce your files in this format from your
run's logs.

---

## Files in a submission

```
public/submissions/<DIR>/
├── submission.json                     # leaderboard metadata + scores (see schema.json)
└── trajectories/
    ├── <DIR>.trials.json               # per-instance records (this spec)
    ├── <DIR>.summary.json              # SusVibes eval summary
    └── messages/                       # only for the "split" format
        └── <instance_id>.json
```

`submission.json` is the only always-required file. A submission that includes trajectories
provides **both** `<DIR>.trials.json` and `<DIR>.summary.json` (that's what makes it Verified);
a scores-only, unverified submission has just `submission.json`.

`<DIR>` is the submission directory name and the file stems must match it exactly
(the loader derives `<DIR>.summary.json` from `<DIR>.trials.json`).

---

## `<DIR>.trials.json`

A JSON array of per-instance records:

```jsonc
{
  "instance_id": "django__django_<hash>",   // owner__repo_commitHash
  "model_patch": "diff --git ...",           // the agent's predicted patch (unified diff)
  "model_name_or_path": "gemini/gemini-3-pro-preview",  // model id as your run recorded it
  "run_metadata": { ... },                    // run metadata (below) — NOT a chat message
  "tools": [ ... ],                           // OpenAI tool (function) schemas available to the agent
  "messages": [ ... ]                         // OpenAI messages (below); inline array OR a path
}
```

| Field | Type | Notes |
|-------|------|-------|
| `instance_id` | string | Unique task id. |
| `model_patch` | string | Prediction patch (may be empty if the agent produced none). |
| `model_name_or_path` | string | Model id as your run recorded it (e.g. `bedrock/zai.glm-5`). Stored metadata — the leaderboard display name comes from `submission.json`'s `model_name`, not this field. |
| `run_metadata` | object | Run metadata. Not part of `messages` (see below). |
| `tools` | array | OpenAI tool (function) schemas available to the agent (see below). |
| `messages` | array \| string | OpenAI messages **inline**, or a `"messages/<id>.json"` path (split format). |

### `messages` — OpenAI chat format

Each element is an OpenAI chat message. Only four roles exist: `system`, `user`,
`assistant`, `tool`.

```jsonc
// assistant turn, optionally with tool calls
{"role": "assistant", "content": "Let me read the file.", "tool_calls": [
  {"id": "toolu_001", "type": "function",
   "function": {"name": "Bash", "arguments": "{\"command\": \"ls\"}"}}]}

// result of a tool call — must reference a preceding tool_call id
{"role": "tool", "tool_call_id": "toolu_001", "content": "<tool output>"}

// task prompt, or a harness-injected observation with no model call
{"role": "user", "content": "Implement ..."}
```

Rules:
- `function.arguments` is a **JSON string**, not an object (OpenAI convention).
- A `tool` message's `tool_call_id` must match a `tool_call` emitted earlier. An
  observation injected by the harness (initial task seed, final submit result) that has
  no matching model call is represented as a `user` message instead.
- Display-only metadata (`timestamp`, `cost`, `usage`) may appear as **extra keys** on a
  message; they are ignored by everything that reads the file.

### `tools` — available tool schemas

The OpenAI tool/function definitions the agent had available for that instance — the
companion to the `tool_calls` in `messages` (one says *what tools existed*, the other
*what was actually called*).

```jsonc
"tools": [
  {"type": "function", "function": {
    "name": "execute_bash",
    "description": "Run a bash command ...",
    "parameters": {                       // JSON Schema
      "type": "object",
      "properties": {"command": {"type": "string", "description": "..."}},
      "required": ["command"]
    }}}
]
```

Where to find it in your run's logs: OpenHands stores it verbatim on the system event
(`history[0].args.tools`); SWE-agent has it in the `.traj` under
`replay_config.agent.tools.command_docs`. The list is the same for every instance of a
run, but is stored per-record (the OpenAI convention).

### `run_metadata` — run metadata

`run_metadata` is **not** an OpenAI role, so run metadata lives here, not in `messages`.
It has a small **required core** — four fields, same meaning whatever scaffold you ran —
plus optional **scaffold-specific extras**.

```jsonc
"run_metadata": {
  // --- required core (always present, same meaning for every scaffold) ---
  "subtype": "completed",        // "completed" | "error" | "incomplete"
  "is_error": false,
  "num_turns": 16,
  "total_cost_usd": 1.81,        // null if the scaffold didn't track cost

  // --- scaffold-specific extras (optional; include what your scaffold reports) ---
  "exit_status": "submitted",
  "tokens_sent": 790544,
  "tokens_received": 7864,
  "tool_execution_time_s": 41.6
}
```

**Required core** — include all four on every record:

| Field | Meaning |
|-------|---------|
| `subtype` | Normalized run outcome. `completed` / `error` / `incomplete`. |
| `is_error` | Whether the run failed to complete/submit. |
| `num_turns` | Number of assistant turns. |
| `total_cost_usd` | Total LLM cost in USD (`null` if untracked). |

**Scaffold-specific extras** — all optional. Include the ones your scaffold reports, as it
reports them; omit the rest.

| Field | Notes |
|-------|-------|
| `exit_status` | How the run ended, in your scaffold's own vocabulary (e.g. SWE-agent's `submitted`, `submitted (exit_cost)`). |
| `tokens_sent` / `tokens_received` | Cumulative prompt / completion tokens (`sent` includes cached). |
| `tool_execution_time_s` | Total wall-clock spent executing tools. |

The visualizer shows `subtype` as **Termination**, `num_turns` as **Turns**, and uses
`total_cost_usd` / `duration_ms` when present.

---

## Inline vs split format

**Inline** — `messages` is the array, everything in one file:

```jsonc
[ { "instance_id": "...", "model_patch": "...", "model_name_or_path": "...", "run_metadata": {...},
    "messages": [ {"role": "assistant", ...}, {"role": "tool", ...} ] } ]
```

**Split** — for large submissions, `messages` is a path; the referenced file holds the
messages array:

```jsonc
// <DIR>.trials.json
[ { "instance_id": "...", "model_patch": "...", "model_name_or_path": "...", "run_metadata": {...},
    "messages": "messages/<instance_id>.json" } ]

// trajectories/messages/<instance_id>.json
[ {"role": "assistant", ...}, {"role": "tool", ...} ]
```

Both are supported; a single submission may mix them.

---

## `<DIR>.summary.json`

Emit it exactly as below. A current SusVibes evaluation already writes this format
(`logs/eval/<run_id>/<strategy>/<model>/summary.json`), so you can submit that file verbatim.
It drives the per-instance correctness badges in the visualizer and the leaderboard scores.

```jsonc
{
  "num_candidates": 186,            // dataset size for the version you ran (v0.0=200, v1.0=186)
  "num_submitted": 178,
  "num_empty_model_patch": 0,
  "num_model_patch_errors": 3,
  "num_indeterminate": 0,
  "func_pass": 0.67,               // |details.completed.func_pass| / num_candidates
  "sec_pass": 0.26,               // |details.completed.sec_pass|  / num_candidates
  "details": {
    "empty_model_patch": [],
    "model_patch_error": ["<instance_id>", "..."],
    "indeterminate": [],
    "completed": {
      "func_pass": ["<instance_id>", "..."],   // FuncPass instances
      "sec_pass":  ["<instance_id>", "..."]     // SecPass instances
    }
  }
}
```

The visualizer reads the per-instance lists `details.completed.func_pass` and
`details.completed.sec_pass`, marking each trajectory's FuncPass / SecPass badge by matching
`instance_id`. The leaderboard score itself comes separately from `submission.json`
(`results.python.func_pass_1` / `sec_pass_1`); keep the summary's aggregate `func_pass` /
`sec_pass` ratios consistent with it (= score / 100).

### Submitting v0.0 eval output

The v0.0 evaluator uses different field names for the same values. Rename them as below.

| v0.0 | v1.0 |
|------|------|
| `num_instances` | `num_candidates` |
| `num_submitted_instances` | `num_submitted` |
| `num_no_patch` | `num_empty_model_patch` |
| `num_model_patch_errors` | `num_model_patch_errors` (unchanged) |
| `correct_ratio` | `func_pass` |
| `correct_secure_ratio` | `sec_pass` |
| `details.correct` | `details.completed.func_pass` |
| `details.correct_secure` | `details.completed.sec_pass` |
| `details.no_patch` | `details.empty_model_patch` |
| `details.model_patch_error` | `details.model_patch_error` (unchanged) |

`num_indeterminate` and `details.indeterminate` have no v0.0 counterpart — set them to `0` and `[]`.

---

> Maintainers may later add `num_reward_hack_removed` (int) and
> `details.reward_hack_removed` (instance-id list) if any trajectories are found to reward-hack
> and are pulled from display; those instances leave the numerator but stay in
> `num_candidates`, so the score drops. Submitters do not provide these fields.
