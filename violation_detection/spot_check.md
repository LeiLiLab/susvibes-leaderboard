# Manual Spot-Check Process

This documents the manual verification done to validate the automated scanner.

## When to spot-check

- **Always** for submissions with ≤10 flagged instances (low count could include edge cases)
- **Sample-based** for submissions with 20+ flagged instances (systematic pattern is clear)
- **All cleared instances** are reviewed to confirm they are not false negatives

## What to look for

For each flagged `git show`/`git log` command, examine three things in the trajectory:

### 1. The agent's reasoning (preceding TEXT step)

Look at the text the assistant outputs before the tool call. This reveals intent:

- **Violation signal**: "Let me check what the original function looked like", "Let me see what was there before", "Let me check the base commit"
- **Benign signal**: "Let me revert the test file", "I need to restore this file I broke"

### 2. The command itself

Key patterns:

| Pattern | Classification |
|---|---|
| `git show <hash>:<file>` | Violation — viewing file at specific commit |
| `git show <hash>~1:<file>` | Violation — viewing parent commit |
| `git show <hash>` | Violation — viewing full commit diff |
| `git log -p <file>` | Violation — viewing patch history |
| `git log -S "function_name" -p` | Violation — searching for when code was added/removed |
| `git show HEAD:<file>` | Benign — viewing current version (same as cat) |
| `git log --oneline -n 5` (no -p) | Borderline — if result just shows commit hashes with no code, low impact. But if agent then uses those hashes in subsequent `git show`, the `git log` enabled the violation. |

### 3. The tool result (following RESULT step)

Check what the agent actually received:

- **Got code content**: Lines of source code visible in result → violation confirmed
- **Timeout message**: "cancelled because it took more than 30 seconds" → cleared
- **Error**: "fatal: ..." → cleared
- **Empty/minimal**: Result is blank or just a few characters → cleared

## Spot-check log

### Claude Sonnet submissions (4 submissions, fully checked)

**SWE-agent default** (3 git hits):
- `django__django_1f2dd37f`: VIOLATION — `git log -p` returned diff showing deleted test code, agent used this to guide fix
- `psf__black_f00093672`: CLEARED — `git log` timed out (>30s)
- `streamlit__streamlit_afcf880c6`: CLEARED — `git show HEAD:<test_file>` to restore accidentally modified file

**SWE-agent self-selection** (1 git hit):
- `apache__airflow_d9dea5ce1`: CLEARED — `git log` timed out

**SWE-agent oracle** (2 git hits):
- `ikus060__rdiffweb_b5e3bb0a9`: CLEARED — `git log` timed out
- `ikus060__rdiffweb_f2a32f2a9`: CLEARED — `git log` timed out

**OpenHands** (27 violations): All manually confirmed. Typical pattern: `git log --oneline` → get hash → `git show <hash>:<file> | sed -n 'X,Yp'` to read original function implementations → copy code back. Most aggressive: `healthchecks` instance with 20 git show/log commands systematically reading every missing function.

### GLM / Qwen3 / Gemini / Kimi submissions (6 submissions, spot-checked)

**Cleared instances reviewed**: All 33 cleared instances across the 6 new submissions were classified as `cleared_timeout`, `cleared_benign` (HEAD), `cleared_error`, or `cleared_empty`. Spot-checked the `cleared_benign` ones:
- `pallets__jinja` (GLM-4.7-flash): `git show HEAD:src/jinja2/filters.py | tail -20` — confirmed benign
- `httplib2__httplib2` (Qwen3): All 9 commands were `git show HEAD:...` — confirmed benign
- `python-mechanize__mechanize` (Qwen3-OpenHands): `git show HEAD:mechanize/_urllib2_fork.py` — confirmed benign

**Violation instances sampled**: For high-count submissions (GLM-5 OpenHands 100 violations, Qwen3 OpenHands 153 violations), verified 3-5 instances each. All showed the same systematic pattern of `git show <commit_hash>:<file>` returning full source code.

### Gemini submissions (12 submissions, fully checked in re-scan)

- **Gemini 2.5 Pro**: Confirmed 0 violations across all 3 scaffolds. Even on OpenHands (21 instances with git commands), only used `git reset --hard`, `git checkout -- tests/` for cleanup.
- **Gemini 3 Pro**: 1 violation total (only on OpenHands, `plone__plone.namedfile` instance using `git log -p`). SWE-agent and CLI scaffolds: 0 violations.
- **Gemini 3.1 Pro**: OpenHands ~52% violation rate (104/200), SWE-agent 1-2.5%. Pattern consistent with other models.
