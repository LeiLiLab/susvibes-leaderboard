# Trajectory & Submission File Format

Authoritative spec for the files under `public/submissions/<DIR>/trajectories/`.
The leaderboard reads these at runtime; the trajectory visualizer renders them; the
training exporters consume them. There is **one** stored format — OpenAI-style
`messages` — described here.

> Converting scaffold-native logs into this format is done by the tools in
> [`converters/`](../converters/README.md).

---

## Files in a submission

```
public/submissions/<DIR>/
├── submission.json                     # leaderboard metadata + scores (see schema.json)
└── trajectories/
    ├── <DIR>.trials.json               # per-instance records (this spec)
    ├── <DIR>.summary.json              # correctness summary (optional but recommended)
    └── trials/                         # only for the "split" format
        └── <instance_id>.json
```

`<DIR>` is the submission directory name and the file stems must match it exactly
(the loader derives `<DIR>.summary.json` from `<DIR>.trials.json`).

---

## `<DIR>.trials.json`

A JSON array of per-instance records:

```jsonc
{
  "instance_id": "django__django_<hash>",   // owner__repo_commitHash
  "model_patch": "diff --git ...",           // the agent's predicted patch (unified diff)
  "model": "Gemini 3.1 Pro",                 // authoritative model name
  "result": { ... },                          // run metadata (below) — NOT a chat message
  "messages": [ ... ]                         // OpenAI messages (below); inline array OR a path
}
```

| Field | Type | Notes |
|-------|------|-------|
| `instance_id` | string | Unique task id. |
| `model_patch` | string | Prediction patch (may be empty if the agent produced none). |
| `model` | string | Authoritative model name (taken from `submission.json`'s `model_name`). |
| `result` | object | Run metadata. Not part of `messages` (see below). |
| `messages` | array \| string | OpenAI messages **inline**, or a `"trials/<id>.json"` path (split format). |

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
  message. ms-swift reads only `role`/`content`/`tool_calls`/`tool_call_id` and ignores
  the rest, so the same file feeds both training and the visualizer.

Inline `<DIR>.trials.json` files are directly loadable by ms-swift (it reads each
record's `messages` key and ignores `instance_id`/`model_patch`/`model`/`result`).

### `result` — run metadata

`result` is **not** an OpenAI role, so run metadata lives here, not in `messages`. It has
a small **unified core** that every converter normalises and emits identically, plus
optional **scaffold-specific extras** that each converter keeps as-is (not aligned across
scaffolds, present only when that scaffold provides them).

```jsonc
"result": {
  // --- unified core (always present, same meaning for every scaffold) ---
  "subtype": "completed",        // "completed" | "error" | "incomplete"
  "is_error": false,
  "num_turns": 16,
  "total_cost_usd": 1.81,        // null if the scaffold didn't track cost

  // --- scaffold-specific extras (kept as-is; may differ or be absent) ---
  "exit_status": "submitted",
  "tokens_sent": 790544,
  "tokens_received": 7864,
  "tool_execution_time_s": 41.6
}
```

**Unified core** — guaranteed on every record:

| Field | Meaning |
|-------|---------|
| `subtype` | Normalized run outcome. `completed` / `error` / `incomplete`. |
| `is_error` | Whether the run failed to complete/submit. |
| `num_turns` | Number of assistant turns. |
| `total_cost_usd` | Total LLM cost in USD (`null` if untracked). |

**Scaffold-specific extras** — preserved verbatim by each converter, *not* a cross-scaffold
contract (semantics/availability vary; consumers must treat them as best-effort):

| Field | Notes |
|-------|-------|
| `exit_status` | Native for SWE-agent (`submitted`, `submitted (exit_cost)`, ...). Derived for OpenHands: `submitted` iff a `finish` action exists (≡ `error is None`), else the `error` string maps to `max_iterations` / `stuck_in_loop` / `error`. |
| `tokens_sent` / `tokens_received` | Cumulative prompt / completion tokens (`sent` includes cached). |
| `tool_execution_time_s` | Summed tool wall-clock (SWE-agent per-step `execution_time`; OpenHands action→observation timestamp deltas). |

The visualizer shows `subtype` as **Termination**, `num_turns` as **Turns**, and uses
`total_cost_usd` / `duration_ms` when present.

---

## Inline vs split format

**Inline** — `messages` is the array, everything in one file:

```jsonc
[ { "instance_id": "...", "model_patch": "...", "model": "...", "result": {...},
    "messages": [ {"role": "assistant", ...}, {"role": "tool", ...} ] } ]
```

**Split** — for large submissions, `messages` is a path; the referenced file holds the
messages array:

```jsonc
// <DIR>.trials.json
[ { "instance_id": "...", "model_patch": "...", "model": "...", "result": {...},
    "messages": "trials/<instance_id>.json" } ]

// trajectories/trials/<instance_id>.json
[ {"role": "assistant", ...}, {"role": "tool", ...} ]
```

Both are supported; a single submission may mix them.

---

## `<DIR>.summary.json`

Drives the per-instance correctness badges in the visualizer. Optional — without it,
trajectories still render but every instance shows as not-correct.

```jsonc
{
  "num_candidates": 200,            // dataset size for this version (v0.0=200, v1.0=186)
  "num_submitted": 178,
  "num_empty_model_patch": 0,
  "num_model_patch_errors": 3,
  "num_indeterminate": 0,
  "num_reward_hack_removed": 1,     // reward-hack trajectories removed (0 if none)
  "func_pass": 0.67,
  "sec_pass": 0.26,
  "details": {
    "empty_model_patch": [],
    "model_patch_error": ["<instance_id>", "..."],
    "indeterminate": [],
    "completed": {
      "func_pass": ["<instance_id>", "..."],   // FuncPass instances
      "sec_pass":  ["<instance_id>", "..."]     // SecPass instances
    },
    "reward_hack_removed": ["<instance_id>", "..."]   // removed reward-hack instances
  }
}
```

Only `details.completed.func_pass` and `details.completed.sec_pass` are read by the
visualizer (matched by `instance_id`). The `func_pass` / `sec_pass` ratios are kept equal
to the leaderboard score in `submission.json` (= score / 100), which already excludes any
reward-hack instances; the removed ones are recorded under `details.reward_hack_removed`
(count in `num_reward_hack_removed`).
