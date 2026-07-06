# SusVibes Leaderboard Submission Guide

Community submissions are added to the leaderboard through pull requests. A submission is one
directory under `public/submissions/` containing these files:

```
public/submissions/<DIR>/
├── submission.json                 # metadata + scores (schema: public/submissions/schema.json)
└── trajectories/
    ├── <DIR>.trials.json           # your per-instance trajectories (see TRAJECTORY_FORMAT.md)
    └── <DIR>.summary.json          # the SusVibes eval summary for your run, verbatim
```

and one line added to `public/submissions/manifest.json`. Here's how it works:

## Submission Types: Standard vs Custom

The leaderboard distinguishes between two types of submissions:

### Standard Submissions (Default)
Standard submissions use the **default SusVibes evaluation pipeline**:
- A single base LLM as the agent
- Only the tools SusVibes provides by default
- Default prompts and evaluation protocol

If you ran SusVibes as documented — without modifications and without any advanced security
strategy — your submission is **standard**. You don't need to specify `submission_type` in your
JSON (it defaults to `"standard"`).

### Custom Submissions
Custom submissions use **a modified pipeline or approach**, such as:
- Multi-model routers or model ensembles
- Additional tools beyond the standard SusVibes tool set
- Modified agent orchestration or control flow
- Any other modifications to the default evaluation setup

**⚠️ Requirements for Custom Submissions:**

Custom submissions **must** include detailed methodology documentation:

1. **Set `submission_type` to `"custom"`** in your submission.json

2. **Provide a `custom_label`** — a short, unique identifier for your approach (e.g., `"prompt-strategy"`, `"reflection"`, `"ensemble"`). This label is used in the directory name and leaderboard display. Must be lowercase alphanumeric with hyphens only (e.g., `multi-turn`).

3. **Provide comprehensive `methodology.notes`** explaining:
   - What modifications were made to the default pipeline
   - Why these modifications were made
   - How the custom system works at a high level

4. **Link to your implementation** in the `references` array:
   - Include a GitHub link to your code/fork
   - Provide documentation or a blog post if available

5. **Set `methodology.verification.modified_prompts` to `true`** if you modified any prompts

Example methodology section for a custom submission:
```json
{
  "submission_type": "custom",
  "custom_label": "prompt-strategy",
  "methodology": {
    "evaluation_date": "2025-12-29",
    "susvibes_version": "v1.0",
    "notes": "This submission uses an advanced prompting strategy and a custom reflection step after each tool call. See our GitHub repo for full implementation details.",
    "verification": {
      "modified_prompts": true,
      "omitted_questions": false,
      "details": "Modified the agent system prompt to include reflection instructions. No questions were omitted."
    }
  },
  "references": [
    {
      "title": "Our Custom Agent Implementation",
      "url": "https://github.com/example/custom-tau-agent",
      "type": "github"
    }
  ]
}
```

---

## How to Submit Results

### Step 1: Evaluate Your Model and Generate Trajectories
Use the [SusVibes framework](https://github.com/LeiLiLab/susvibes) to evaluate your model. This
produces both your performance metrics (the summary) and the run logs you'll turn into
trajectory files. The leaderboard supports results on **either dataset version** — `v0.0`
(200 tasks) or `v1.0` (186 tasks); record which you ran in `methodology.susvibes_version`.

### Step 2: Document Any Framework Modifications or Task Omissions
If you made any changes to the SusVibes framework or evaluation protocol, you **must** document these in your pull request:

#### Framework Modifications
If you modified the SusVibes framework (prompts, evaluation logic, etc.):
1. **Fork Documentation**: Provide a link to your SusVibes fork if you made any code changes
2. **Change Summary**: Clearly describe what was modified and why in your pull request description
3. **Code References**: Link to specific commits, files, or line numbers where changes were made
4. **Reproducibility**: Ensure others can reproduce your results using your modified framework

#### Task Omissions
If you omitted any tasks from your evaluation runs:
1. **List Omitted Tasks**: Specify which tasks were skipped (by task ID or description)
2. **Reason for Omission**: Clearly explain why these tasks were omitted (e.g., technical limitations, resource constraints, model capabilities)
3. **Impact Assessment**: Describe how this might affect the interpretation of your results

**Important**: We strongly prefer submissions that link to SusVibes forks rather than describing changes in text, as this ensures full transparency and reproducibility.

### Step 3: Create Your Submission Directory
1. Navigate to the `public/submissions/` directory
2. Create a new directory following the naming convention:
   - Standard: `{model-name}_{agent-framework}_default_{date}`
   - Custom: `{model-name}_{agent-framework}_custom-{label}_{date}`
3. Inside your submission directory, create:
   - `submission.json` - Your submission metadata (using schema defined in `public/submissions/schema.json`)
   - `trajectories/` directory - For your trajectory files

**Important:** If you made any modifications to the default SusVibes evaluation pipeline, set `"submission_type": "custom"`, provide a `"custom_label"`, and include detailed methodology documentation. See [Submission Types](#submission-types-standard-vs-custom) above.

Example directory structure:
```
# Standard submission
public/submissions/my-awesome-model_agent-framework_default_2025-12-29/
├── submission.json
└── trajectories/
    ├── my-awesome-model_agent-framework_default_2025-12-29.trials.json
    └── my-awesome-model_agent-framework_default_2025-12-29.summary.json

# Custom submission
public/submissions/my-awesome-model_agent-framework_custom-prompt-strategy_2025-12-29/
├── submission.json
└── trajectories/
    ├── my-awesome-model_agent-framework_custom-prompt-strategy_2025-12-29.trials.json
    └── my-awesome-model_agent-framework_custom-prompt-strategy_2025-12-29.summary.json
```

### Step 4: Add Your Trajectory Files
Your `trajectories/` directory holds **two files**, both named after the submission directory
(here written `<DIR>`):

- **`<DIR>.trials.json`** — your per-instance trajectories.
- **`<DIR>.summary.json`** — the SusVibes eval summary for your run.

The exact format of both is specified in **[TRAJECTORY_FORMAT.md](TRAJECTORY_FORMAT.md)**. Upload
raw JSON; do not compress or archive.

### Step 5: Update the Manifest
Add your directory name to the `submissions` array in `public/submissions/manifest.json`:

```json
{
  "submissions": [
    "existing-submission-1_framework_standard_2024-12-01",
    "existing-submission-2_framework_standard_2024-12-15",
    "my-awesome-model_agent-framework_standard_2025-12-29"
  ],
  "last_updated": "2025-12-29T12:00:00Z"
}
```

### Step 6: Submit Pull Request
1. Fork the [SusVibes Page repository](https://github.com/LeiLiLab/susvibes-leaderboard)
2. Add your submission directory with submission.json, trajectory files, and update the manifest in the `public/submissions/` directory
3. Submit a pull request with:
   - Clear description of your model and results
   - The complete submission directory, including the `trajectories/` files
   - Documentation of any SusVibes modifications or task omissions (link to your fork, describe changes/omissions)
   - Link to your model/paper if available
   - Contact information for questions

### Step 7: Review Process
We review each submission for schema compliance, data consistency, and formatting.

**Verification status.** The leaderboard automatically shows each submission as ✅ Verified or
⚠️ Unverified, computed from the fields you provide. A submission is **Verified** when it:
- has trajectories (`trajectories_available: true`),
- omitted no tasks (`methodology.verification.omitted_questions: false`), and
- for standard submissions, did not modify prompts
  (`methodology.verification.modified_prompts: false`) — custom submissions are exempt from this
  last condition.

Anything else shows the ⚠️ caution badge. Fill these fields honestly; reviewers cross-check them
against your trajectories.

**Reward-hack screening.** Trajectories may be screened for reward hacking: obtaining the
reference solution instead of solving the task. Any trajectory found to reward-hack is pulled
from the displayed submission and **counts as a failure**.

## Before you open the PR — checklist

Self-check (maintainers review against the same list):

- [ ] `submission.json` validates against [`schema.json`](../public/submissions/schema.json)
- [ ] Directory name follows the convention; `manifest.json` lists it
- [ ] Contact info is provided
- [ ] `submission_type` is `"standard"` or `"custom"`
- [ ] **If custom:** `custom_label` is provided and matches the directory name;
      `methodology.notes` explains the modifications; `references` links to the implementation;
      `methodology.verification.modified_prompts` is set appropriately
- [ ] Any framework modifications / task omissions are documented in the PR description
- [ ] `trajectories/` contains `<DIR>.trials.json` **and** `<DIR>.summary.json` in the
      [required format](TRAJECTORY_FORMAT.md), covering every instance you evaluated
- [ ] `func_pass` / `sec_pass` in the summary match the scores in `submission.json`
- [ ] Raw JSON files (not compressed/archived); no duplicate submission

## Example

See [`public/submissions/A_EXAMPLE_new-model_new-framework_standard_2025-12-29/`](../public/submissions/A_EXAMPLE_new-model_new-framework_standard_2025-12-29/)
for a reference submission directory. The leaderboard auto-loads every directory listed in
`manifest.json` — no code changes are needed for a new submission.
