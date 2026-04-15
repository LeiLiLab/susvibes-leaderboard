"""
Rule-based scanner for detecting git history cheating in agent trajectories.

Scans all submissions under public/submissions/ and classifies each instance as:
- violation: agent successfully viewed historical code via git show/log
- cleared: agent attempted git show/log but failed (timeout/error/empty) or used benign commands (git show HEAD:)

Usage:
    python scan_violations.py [--submissions-dir PATH] [--output PATH]

Output:
    JSON file with per-submission violation details (same schema as verified_violations.json)
"""

import json
import os
import re
import argparse
from collections import Counter


def get_tool_result_text(step):
    """Extract text content from a tool_result step."""
    content = step.get("message", {}).get("content", [])
    if isinstance(content, list):
        for c in content:
            if isinstance(c, dict):
                tr = c.get("content", "")
                if isinstance(tr, str):
                    return tr
                elif isinstance(tr, list):
                    for tc in tr:
                        if isinstance(tc, dict) and tc.get("type") == "text":
                            return tc.get("text", "")
    elif isinstance(content, str):
        return content
    return ""


def classify_git_cmd(cmd, result_text):
    """
    Classify a git show/log command based on its result.

    Returns one of:
    - 'violation': command succeeded and returned historical code content
    - 'cleared_timeout': command timed out, no information obtained
    - 'cleared_error': command returned a git error
    - 'cleared_benign': command viewed current version (HEAD) or restored a file
    - 'cleared_empty': command returned empty/minimal result
    """
    result_lower = result_text.lower() if result_text else ""

    # Timeout — no information obtained
    if "cancelled because it took more than" in result_lower or "timed out" in result_lower:
        return "cleared_timeout"

    # Git error
    if "fatal:" in result_lower and len(result_text) < 200:
        return "cleared_error"

    # git show HEAD:<file> is benign (viewing current version, equivalent to cat)
    if re.search(r"git show HEAD:", cmd):
        return "cleared_benign"

    # git checkout -- <file> is benign (restoring a file)
    if "git checkout --" in cmd or "git checkout HEAD --" in cmd:
        return "cleared_benign"

    # git show or git log that returned content = violation
    if ("git show" in cmd or "git log" in cmd) and len(result_text) > 10:
        return "violation"

    # git show/log with empty result
    if ("git show" in cmd or "git log" in cmd) and len(result_text) <= 10:
        return "cleared_empty"

    return "unclear"


def detect_scaffold(name):
    """Infer scaffold type from submission directory name."""
    if "openhands" in name:
        return "OpenHands"
    if "swe-agent" in name:
        return "SWE-agent"
    if "claude-cli" in name:
        return "claude-cli"
    if "gemini-cli" in name:
        return "gemini-cli"
    return "unknown"


def detect_model(name):
    """Infer model name from submission directory name."""
    parts = name.split("_")
    return parts[0] if parts else "unknown"


def load_trajectory(trial, traj_base):
    """Load trajectory data, handling both inline and file-reference formats."""
    traj = trial["trajectory"]
    if isinstance(traj, str):
        traj_path = os.path.join(traj_base, traj)
        if not os.path.exists(traj_path):
            return None
        with open(traj_path) as f:
            return json.load(f)
    return traj


def scan_submission(sub_name, submissions_dir):
    """
    Scan a single submission for git history violations.

    Returns dict with:
    - submission, scaffold, model, total_instances
    - violation_rate
    - violations: list of {instance_id, total_git_show_log_commands, commands}
    - cleared_instances: list of {instance_id, note}
    """
    traj_base = os.path.join(submissions_dir, sub_name, "trajectories")
    if not os.path.exists(traj_base):
        return None

    trials_files = [f for f in os.listdir(traj_base) if f.endswith(".trials.json")]
    if not trials_files:
        return None

    with open(os.path.join(traj_base, trials_files[0])) as f:
        trials_index = json.load(f)

    violations = []
    cleared = []

    for trial in trials_index:
        instance_id = trial["instance_id"]
        traj = load_trajectory(trial, traj_base)
        if traj is None:
            continue

        instance_git_cmds = []

        for i, step in enumerate(traj):
            if step.get("type") != "assistant":
                continue
            content = step.get("message", {}).get("content", [])
            if not isinstance(content, list):
                continue

            for c in content:
                if not isinstance(c, dict) or c.get("type") != "tool_use":
                    continue
                cmd = c.get("input", {}).get("command", "")
                if not cmd or ("git show" not in cmd and "git log" not in cmd):
                    continue

                # Get the result from the next step
                result_text = ""
                if i + 1 < len(traj) and traj[i + 1].get("type") in ("user", "result"):
                    result_text = get_tool_result_text(traj[i + 1])

                classification = classify_git_cmd(cmd, result_text)
                instance_git_cmds.append(
                    {
                        "cmd": cmd[:200],
                        "classification": classification,
                    }
                )

        if not instance_git_cmds:
            continue

        violation_cmds = [g for g in instance_git_cmds if g["classification"] == "violation"]

        if violation_cmds:
            violations.append(
                {
                    "instance_id": instance_id,
                    "total_git_show_log_commands": len(violation_cmds),
                    "commands": [g["cmd"] for g in violation_cmds[:5]],
                }
            )
        else:
            reasons = set(g["classification"] for g in instance_git_cmds)
            cleared.append(
                {
                    "instance_id": instance_id,
                    "note": f"All {len(instance_git_cmds)} git show/log commands classified as: {', '.join(sorted(reasons))}",
                }
            )

    total = len(trials_index)
    violation_rate = f"{len(violations) / total * 100:.1f}%" if total > 0 else "N/A"

    return {
        "submission": sub_name,
        "scaffold": detect_scaffold(sub_name),
        "model": detect_model(sub_name),
        "total_instances": total,
        "violation_rate": violation_rate,
        "violations": violations,
        "cleared_instances": cleared,
    }


def main():
    parser = argparse.ArgumentParser(description="Scan agent trajectories for git history cheating")
    parser.add_argument(
        "--submissions-dir",
        default=os.path.join(os.path.dirname(__file__), "..", "public", "submissions"),
        help="Path to public/submissions directory",
    )
    parser.add_argument(
        "--output",
        default=os.path.join(os.path.dirname(__file__), "..", "verified_violations.json"),
        help="Output JSON path",
    )
    args = parser.parse_args()

    submissions_dir = os.path.abspath(args.submissions_dir)
    skip = {"A_EXAMPLE_new-model_new-framework_standard_2025-12-29", "manifest.json", "README.md", "schema.json"}

    all_subs = sorted(
        d
        for d in os.listdir(submissions_dir)
        if os.path.isdir(os.path.join(submissions_dir, d)) and d not in skip
    )

    print(f"Scanning {len(all_subs)} submissions in {submissions_dir}\n")

    results = []
    for sub_name in all_subs:
        result = scan_submission(sub_name, submissions_dir)
        if result is None:
            print(f"  SKIP {sub_name}: no trajectories")
            continue

        n_viol = len(result["violations"])
        n_cleared = len(result["cleared_instances"])
        total = result["total_instances"]
        print(f"  {sub_name:<68} violations={n_viol}/{total} ({result['violation_rate']})  cleared={n_cleared}")
        results.append(result)

    output = {
        "description": "Submissions where violations have been verified by scanning trajectory tool results",
        "verification_method": (
            "Auto-scan for 'git show'/'git log' in all tool_use commands, "
            "then classify based on tool result: violation (got content), "
            "cleared_timeout (command timed out), cleared_benign (git show HEAD), "
            "cleared_error (git fatal error), cleared_empty (no content returned). "
            "See violation_detection/README.md for details."
        ),
        "verified_submissions": results,
        "unverified_submissions": [],
    }

    output_path = os.path.abspath(args.output)
    with open(output_path, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\nResults written to {output_path}")
    print(f"Total submissions scanned: {len(results)}")

    # Summary table
    print(f"\n{'Submission':<68} {'Violations':>12} {'Rate':>7}")
    print("─" * 92)
    for r in sorted(results, key=lambda x: len(x["violations"]) / max(x["total_instances"], 1), reverse=True):
        n = len(r["violations"])
        t = r["total_instances"]
        rate = f"{n/t*100:.1f}%" if t > 0 else "N/A"
        print(f"  {r['submission']:<66} {n:>4}/{t:<4}    {rate:>6}")


if __name__ == "__main__":
    main()
