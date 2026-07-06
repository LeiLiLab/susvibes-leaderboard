# Example Trajectory Files

A real submission's `trajectories/` directory contains:

```
trajectories/
├── <DIR>.trials.json     # per-instance records (instance_id, model_patch, model_name_or_path, run_metadata, tools, messages)
├── <DIR>.summary.json    # correctness summary (details.completed.func_pass / sec_pass)
└── messages/             # only for the "split" format: <instance_id>.json files
```

where `<DIR>` is the submission directory name (e.g.
`new-model_new-framework_standard_2025-12-29`).

Actual files are omitted from this example because they are large. For the complete
file format — record fields, the OpenAI `messages` schema, `run_metadata`, the
inline vs split layouts, and the summary format — see
**[docs/TRAJECTORY_FORMAT.md](../../../../docs/TRAJECTORY_FORMAT.md)**.
