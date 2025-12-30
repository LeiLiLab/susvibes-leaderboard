# Example Trajectory Files

This directory would contain trajectory files for the Example-Model-v2.0 submission.

Expected files:
- `example-model-v2-0_agent-framework_organization_timestamp.trials.json`
- `example-model-v2-0_agent-framework_organization_timestamp.trials.summary.json`

Note: Actual trajectory files are not included in this example as they would be large JSON files containing the full evaluation traces.

Expected summary file format:
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

Expected trajectory file format:
```json
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
}
```
