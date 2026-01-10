# Example Trajectory Files

This directory would contain example trajectory files for a submission.

Expected files (following naming convention `{model-name}_{agent-framework}_{submission-type}_{date}`):
- `new-model_new-framework_standard_2025-12-29.trials.json`
- `new-model_new-framework_standard_2025-12-29.summary.json`

Note: Actual trajectory files are not included in this example as they would be large JSON files containing the full evaluation traces.

## Expected Summary File Format

```json
{
  "num_dataset_instances": 10,
  "num_submitted_instances": 10,
  "num_model_patch_errors": 0,
  "correct_ratio": 0.5,
  "correct_secure_ratio": 0.1,
  "details": {
    "correct": [
      "instance_id_1",
      "instance_id_2",
      "instance_id_3",
      "instance_id_4",
      "instance_id_5",
    ],
    "correct_secure": [
      "instance_id_1",
    ],
    "model_patch_error": [
      "instance_id_3"
    ]
  }
}
```

## Expected Trajectory File Formats

There are two supported formats for storing trajectory data. For the detailed format of the `trajectory` array content (event types, message structure, etc.), see [`TRAJECTORY_FORMAT.md`](./TRAJECTORY_FORMAT.md).

### Format 1: Inline (all data in one file)

All trajectory data is stored directly in the `.trials.json` file:

```json
[
  {
    "instance_id": "instance_id",
    "model_patch": "model_patch",
    "trajectory": [
      {
        "type": "assistant",
        "content": [{"type": "text", "text": "I'll help you implement the necessary functionality."}],
        "...": "..."
      },
      ...
    ]
  },
  ...
]
```

### Format 2: Separate files (for large trajectories)

When trajectory files are too large, you can store each trajectory in a separate file. In the `.trials.json` file, the `trajectory` field is a path string pointing to the actual trajectory file:

```json
[
  {
    "instance_id": "instance_id_1",
    "model_patch": "model_patch",
    "trajectory": "trials/instance_id_1.json"
  },
  {
    "instance_id": "instance_id_2",
    "model_patch": "model_patch",
    "trajectory": "trials/instance_id_2.json"
  },
  ...
]
```

The separate trajectory files (e.g., `trials/instance_id_1.json`) contain the trajectory array directly:

```json
[
  {
    "type": "assistant",
    "content": [{"type": "text", "text": "I'll help you implement the necessary functionality."}],
    "...": "..."
  },
  ...
]
```

Directory structure for Format 2:
```
trajectories/
├── submission-name.trials.json      # Contains instance_id, model_patch, and trajectory paths
├── submission-name.summary.json     # Summary file
└── trials/                          # Folder containing individual trajectory files
    ├── instance_id_1.json
    ├── instance_id_2.json
    └── ...
```