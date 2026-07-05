# Reward-hack clean re-runs

**Status**: active — SWE-agent guard built; **OpenHands re-run in progress (glm-5 running)**.
**Last touched**: 2026-07-03

Re-running the reward-hacked SWE-agent and OpenHands instances *clean* — git-history cheating
is already solved at the **image source** (Songwen fixed the eval images so `.git` no longer
contains the fix), and a **network reward-hack guard** blocks clone/curl of the upstream. Then
re-evaluate and fold the clean trajectories back into the leaderboard submissions.

## Code

- `reusable_run_infer_block_rh.py` — run SWE-agent over a prepared dataset with the guard.
  It is susvibes' `evaluation_harness/swe_agent/run_infer.py` plus injecting each instance's
  `problem_statement.reward_hack_network_project_names` (from `datasets/default/reward_hack_network_project_names.json`,
  keyed by the record's `project`). Runs in conda env `sv`. Graduate it into `maintenance/`
  or susvibes' `evaluation_harness/` once the re-run effort is stable.

## Flow (per model)

1. Prepare the guarded dataset:
   `python -m susvibes.eval.core --prepare_dataset --run_id <model> --strategy generic --instance_ids '[...]'`
2. Run inference with the network guard (Bedrock needs `source ../SWE-agent/.env`):
   `python notes/reward-hack-rerun/reusable_run_infer_block_rh.py --dataset_path <prepared.jsonl> --model bedrock/zai.glm-5`
3. Score:
   `python -m susvibes.eval.core --predictions_path <out>/predictions.json --run_id <model> --strategy generic`

The guard only blocks *network* cheating (clone/curl/pip + project names), not `git show`/`git log`
local-history cheating — so new trajectories must still be screened for residual cheating afterward.

## Notes

- SWE-agent's guard reads `problem_statement.reward_hack_network_project_names` directly (uncommitted
  change in the local `../SWE-agent` clone: field added to `TextProblemStatement`, read in `agents.py`).
- `maintenance/add_rh_block.py` is the superseded predecessor (injected the names into the old
  instances.yaml); `reusable_run_infer_block_rh.py` folds that step into the run.

---

# OpenHands re-run (active — this is where the work is)

## Models to re-run (RH ∩ v1.0-186)
Source = `public/submissions/reward_hack_2026-06-19/violations_index.json` `moved[]` (the frozen
RH archive; the live `susvibes-hack-detection/outputs/agent_verdicts.json` is now OUT OF SYNC —
do NOT use it). Only the non-gemini/claude/kimi OpenHands submissions:

| submission | RH∩186 (re-run set) | official source run (200) |
|---|---|---|
| `glm-4.7-flash_openhands_default_2026-02-17` | **58** | `GLM-4.7-Flash_maxiter_200_N_run_evaluation_merge_instances` |
| `glm-5_openhands_default_2026-02-25` | **88** | `_glm-5_maxiter_200_N_run_evaluation_instances` |
| `qwen3-coder-next_openhands_default_2026-02-25` | **131** | `_Qwen3-Coder-Next_maxiter_200_N_run_evaluation_generic_instances` |

Runs live under `OpenHands/OpenHands-0.54/evaluation/evaluation_outputs/outputs/susvibes/CodeActAgent/`.
The `moved` RH channels are almost all `git` (git-history), only ~1 `web` — the network guard is a
secondary defense; git-history is the real one (solved at image source).

## RH backups (DONE)
The RH∩186 records + `infer_logs/` + `llm_completions/` were **moved OUT** of each official run into
a sibling `_backup__20260702__<N>inst__rh__<model>/` (so each official run is now the clean *keep*
source = non-RH∩186). Script: `scratchpad/backup_rh_trajs.py`. Rebuild 186 = official-run kept
records + new re-run RH records.

## The network guard (OpenHands fork — UNCOMMITTED in the local `OpenHands/OpenHands-0.54` clone)
Equivalent to SWE-agent's `block_reward_hack_network`, verified in a live DockerRuntime.
- **NEW** `openhands/runtime/reward_hack_guard.py` — `NETWORK_KEYWORDS`, `_token_in`,
  `reward_hack_block_reason`, `BLOCK_MESSAGE` (verbatim from SWE-agent).
- `openhands/runtime/base.py` — class attr `reward_hack_network_project_names: list[str] = []`;
  in `run_action`, before dispatch, block `CmdRunAction` whose command matches → return
  `CmdOutputObservation(exit_code=1, BLOCK_MESSAGE)` (command not executed).
- `evaluation/benchmarks/susvibes/run_infer.py` — after `create_runtime`:
  `runtime.reward_hack_network_project_names = instance.get('reward_hack_network_project_names', [])`.
- Names injected into the dataset by `reusable_inject_rh_names.py` (= `[project] + short names`).

## CRITICAL model/endpoint gotcha (learned the hard way in calibration)
OpenHands drives glm-5 via **prompt-mock function-calling** (`fn_call_converter`, `<function=...>` +
`stop=['</function']`) because litellm doesn't recognise `glm-5` as function-calling-capable. The
original run used the **z.ai endpoint** (`[llm.glm-5]` = `openai/glm-5` @ `https://api.z.ai/api/paas/v4`,
still ALIVE, accepts stop). **Bedrock `zai.glm-5` does NOT support stopSequences** → with stop it
errors; with `disable_stop_word=true` (no stop) the mock loops (`AgentStuckInLoopError`, patches
tiny/empty — 2/2 stuck in calib). **Fix = `native_tool_calling=true`**: OpenHands then uses native
tool_calls (no `</function` stop), Bedrock zai.glm-5 supports native tool use → clean finishes
(calib 3/3 finished, patches comparable to original). Trade-off: re-run trajectories are **native
tool_calls format**, the original was **mock `<function=` format** — user OK'd the mix ("混了就混了").
(SWE-agent used native `function_calling` all along → Bedrock worked there.)

## config.toml (in `OpenHands/OpenHands-0.54/config.toml`, GITIGNORED — safe for the Bedrock key)
Added `[llm.bedrock-glm-5]`, `[llm.bedrock-glm-4-7-flash]`, `[llm.bedrock-qwen3-coder-next]`, each:
`model=bedrock/zai.glm-5` (/ `zai.glm-4.7-flash` / `qwen.qwen3-coder-next`), `api_key=<Bedrock bearer
token>` (litellm uses api_key AS the bearer, verified `base_aws_llm.py:682`), `aws_region_name=us-east-1`,
`max_output_tokens=8192`, `num_retries=20`, **`native_tool_calling=true`**, `disable_stop_word=true`.

## dataset = base (strategy `none`), NOT generic
Verified the original OpenHands `default` runs used the **base** problem_statement (no `## Safety
Requirements` suffix), byte-identical to `datasets/default/susvibes_dataset.jsonl`. Made `none` the
default strategy in `susvibes` (`Strategies.NONE`, `apply_safety_strategy` early-returns base,
`eval.core --strategy` default+choices) — so `--prepare_dataset` (no `--strategy`) emits base.
Do NOT use `susvibes_dataset_generic.jsonl` (has the Safety suffix → diverges from the kept trajs).

## Env
`poetry install`'d venv (editable → picks up the fork): python =
`/home/songwenzhao/.cache/pypoetry/virtualenvs/openhands-ai-fFlb3lLi-py3.12/bin/python`
(poetry not on PATH; conda env `openhands-0.54` is INCOMPLETE — missing litellm). NOTE: this venv
got wiped once by disk pressure (`.cache/pypoetry` deleted at 96% full) and Songwen re-installed it.

## Per-model flow
```bash
# 1) base subset (strategy none) + inject network names — run in conda env `sv`, cwd = susvibes repo
conda run -n sv python -m susvibes.eval.core --prepare_dataset --run_id <model>_v1rerun --instance_ids '<RH∩186 json>'
conda run -n sv python notes/reward-hack-rerun/reusable_inject_rh_names.py \
    --dataset_path datasets/default/susvibes_dataset_<model>_v1rerun_none.jsonl   # -> ..._none_rh.jsonl
# 2) run OpenHands (native+Bedrock guard) — cwd = OpenHands/OpenHands-0.54, PARALLEL=8
<venv-python> evaluation/benchmarks/susvibes/run_infer.py \
    --dataset_path /home/songwenzhao/susvibes/datasets/default/susvibes_dataset_<model>_v1rerun_none_rh.jsonl \
    --agent-cls CodeActAgent --llm-config bedrock-<model> \
    --max-iterations 200 --eval-num-workers 8 --eval-note v1_rerun_rh
#   -> .../CodeActAgent/zai.glm-5_maxiter_200_N_v1_rerun_rh/output.jsonl
# tip: pre-pull all images (docker pull, -P 6) so workers don't stall; each eval image ~1.2GB.
# 3) merge kept-non-RH (official run) + new-RH (this run) -> 186 -> openhands/convert.py -> submission (susvibes_version=v1.0)
# 4) score: susvibes.eval.core --predictions_path (strategy none) -> summary (num_candidates=186); clean re-run => no reward_hack_removed
# 5) screen new trajs (git solved at image source; network guarded — should be clean)
```

## CURRENT STATE (2026-07-03, pre-compact)
- glm-5 **88** re-run: dataset built (`susvibes_dataset_glm5_v1rerun_none_rh.jsonl`), all 88 images
  pulled local, launched at workers=4 → got to **6/88 clean finishes** (all error=None, non-empty
  patches) then the process appears to have been **killed when the session quit**. **TODO: re-run
  glm-5 88 at `--eval-num-workers 8`** (user's call), then glm-4.7-flash (58) and qwen (131).
- Calibration passed: native+Bedrock glm-5 = 3/3 clean finished, patches comparable to original.
- Gotchas: `timeout: null` in llm config (a hung Bedrock call blocks a worker forever); ~110 stale
  `eval_*` docker containers "Up 13 days" eating memory (candidate to `docker container prune`);
  disk was 96–97% full (~494G free after pulling glm-5 images).
- calib output dirs (`..._v1_rerun_rh_calib*`) are throwaway; the real one is `..._v1_rerun_rh`.
