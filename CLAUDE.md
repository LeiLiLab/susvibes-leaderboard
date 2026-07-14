# SusVibes Leaderboard

Results website for the SusVibes benchmark: a React/Vite frontend plus Python maintenance
scripts under `maintenance/`. Detailed Python code-style rules follow the `susvibes` repo's
`.claude/rules/code-style.md` — read it before substantially implementing a feature.

## Coding principles
- **Think before coding.** State your assumptions explicitly and surface tradeoffs; don't assume, don't hide confusion. If uncertain, ask before implementing.
- **Simplicity first.** The minimum code that solves the problem — nothing speculative, no features beyond what was asked. If a senior engineer would call it overcomplicated, simplify; 200 lines that could be 50, rewrite.
- **Consistency is paramount.** I hold the strictest bar on matching the existing codebase in every detail — naming, structure, idiom. Before adding anything new, find a counterpart already in the repo and mirror it.
- **Write for the reader.** Before writing any doc, comment, or displayed message, name who reads it and what they need from it. Cut what they can't act on or can't parse.

## Environment
- Node/npm/build/dev commands run in conda env `sv-ld` (e.g. `conda run -n sv-ld npm run dev`).
- Python `maintenance/` scripts that import `susvibes` run in env `sv`; standalone ones use plain `python3`.
- After web edits, load every route in a headless browser and confirm a clean render (Playwright, `/tmp/smoke.mjs`).

## Session protocol
- **Sub-agents.** Before launching ANY, report its full spec (exact prompt, `subagent_type`, allowed tools/permissions, recommended model, `run_in_background`) and wait for my approval. Write goal-driven prompts — nail the goal, don't over-specify steps. Don't full-batch first: launch a few, watch their trajectories, calibrate against any known-answer cases, then expand.
- **Long tasks.** Never run a long-running command in the foreground that blocks me (sub-agent fan-out, long builds/scripts, anything waiting on background work). Run it with `run_in_background: true` so I keep control and can interrupt.

## Topic logs
Topic-based work logs (active investigations, decisions, throwaway analysis code) live under `notes/<topic>/`. Start at `notes/INDEX.md` to see active topics and the structure conventions (status header, `scratch_*` / `reusable_*` code prefixes, graduation path). Durable data-pipeline tooling belongs in `maintenance/`, not a topic dir.
