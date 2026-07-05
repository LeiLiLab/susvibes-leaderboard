# Notes index

Topic-based working areas. Each `notes/<topic>/` has a `README.md` as the through-line for that topic — open it first when revisiting. This is for work logs and investigations, distinct from `docs/` (published guides) and `maintenance/` (durable data-pipeline tooling).

## Conventions

- **Status header**: every topic's `README.md` opens with `**Status**: active | paused | done | superseded by <link>` and `**Last touched**: YYYY-MM-DD`. Skim this index before drilling in.
- **Code in topic dirs**:
  - `scratch_*.py` — one-off / experimental scripts. Throwaway by default.
  - `reusable_*.py` — candidates for promotion. If it stays useful, graduate it into `maintenance/` (pipeline tooling) or `src/` (frontend).
- **Promotion path**: scratch → reusable → proper location. A topic shouldn't host long-term production code.

## Topics

| Topic | Status | Last touched | Summary |
|---|---|---|---|
| [reward-hack-rerun](reward-hack-rerun/) | active | 2026-07-02 | Clean re-runs of reward-hacked SWE-agent/OpenHands instances with the network guard on, then re-eval. |
