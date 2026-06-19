# Example Trajectory Files

A real submission's `trajectories/` directory contains:

```
trajectories/
├── <DIR>.trials.json     # per-instance records (instance_id, model_patch, model, result, messages)
├── <DIR>.summary.json    # correctness summary (details.correct / details.correct_secure)
└── trials/               # only for the "split" format: <instance_id>.json files
```

where `<DIR>` is the submission directory name (e.g.
`new-model_new-framework_standard_2025-12-29`).

Actual files are omitted from this example because they are large. For the complete
file format — record fields, the OpenAI `messages` schema, `result` metadata, the
inline vs split layouts, and the summary format — see
**[docs/TRAJECTORY_FORMAT.md](../../../../docs/TRAJECTORY_FORMAT.md)**.
