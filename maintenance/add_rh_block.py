"""Post-prologue step: inject the per-instance anti-reward-hack protected names into
each SWE-agent instance file. SWE-agent's `block_reward_hack_network` (config/susvibes_eval.yaml)
reads problem_statement.extra_fields.reward_hack_network_project_names and blocks any action
containing BOTH a protected name AND a network keyword (clone/curl/pip install/http/...).

protected list = [ "<owner/repo>" ] + short names from
datasets/default/reward_hack_network_project_names.json (matches the rh_block_test format).

The standard `python -m susvibes.eval.core --prologue` does NOT add this, so run this after it:
    cd /home/songwenzhao/susvibes && conda activate sv
    python add_rh_block.py logs/agent_runs/susvibes.eval.core_*_generic_instances.yaml
"""
import json
import sys
import glob

from susvibes.core.utils import load_file, save_file

RH = "datasets/default/reward_hack_network_project_names.json"
DS = "datasets/default/susvibes_dataset.jsonl"

rh = json.load(open(RH))
project_of = {json.loads(l)["instance_id"]: json.loads(l).get("project")
              for l in open(DS)}

paths = []
for arg in (sys.argv[1:] or ["logs/agent_runs/susvibes.eval.core_*_generic_instances.yaml"]):
    paths.extend(glob.glob(arg))

for f in sorted(set(paths)):
    insts = load_file(f)
    miss = 0
    for it in insts:
        ps = it["problem_statement"]
        project = project_of.get(ps["id"])
        names = []
        if project:
            names.append(project)
            for nm in rh.get(project, []):
                if nm not in names:
                    names.append(nm)
        else:
            miss += 1
        ps["extra_fields"] = {"reward_hack_network_project_names": names}
    save_file(insts, f)
    sample = insts[0]["problem_statement"]["extra_fields"]["reward_hack_network_project_names"]
    print(f"{f}: {len(insts)} instances injected (missing project: {miss}); e.g. {sample}")
