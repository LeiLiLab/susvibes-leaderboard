"""Inject per-instance network reward-hack protected names into a prepared dataset.

Adds `reward_hack_network_project_names` = [project] + short names (from
`datasets/default/reward_hack_network_project_names.json`, keyed by the record's `project`)
to each record, so OpenHands' guard (`runtime.reward_hack_network_project_names`, set in the
susvibes `run_infer.py`) can block network cheating — equivalent to SWE-agent's
`block_reward_hack_network`. Run between `susvibes.eval.core --prepare_dataset` and OpenHands
`run_infer.py`. Runs in conda env `sv`.

Usage:
    python notes/reward-hack-rerun/reusable_inject_rh_names.py --dataset_path <prepared.jsonl> \
        [--output_path <out.jsonl>]
"""

import argparse
from pathlib import Path

import susvibes.core.utils
from susvibes.core.utils import load_file, save_file

SUSVIBES_DIR = Path(susvibes.core.utils.__file__).parents[2]
RH_NAMES_PATH = SUSVIBES_DIR / "datasets/default/reward_hack_network_project_names.json"


def reward_hack_names(project: str, name_map: dict) -> list:
    names = [project]
    for name in name_map.get(project, []):
        if name not in names:
            names.append(name)
    return names


def inject(dataset_path: Path, output_path: Path = None) -> Path:
    name_map = load_file(RH_NAMES_PATH)
    dataset = load_file(dataset_path)
    for record in dataset:
        record["reward_hack_network_project_names"] = reward_hack_names(record["project"], name_map)
    output_path = output_path or dataset_path.with_name(dataset_path.stem + "_rh" + dataset_path.suffix)
    save_file(dataset, output_path)
    print(f"Injected reward-hack names into {len(dataset)} records; saved to {output_path}.")
    return output_path


def main():
    parser = argparse.ArgumentParser(
        description="Inject per-instance network reward-hack protected names into a prepared dataset.")
    parser.add_argument(
        "--dataset_path",
        type=Path,
        required=True,
        help="Prepared dataset JSONL to inject into.",
    )
    parser.add_argument(
        "--output_path",
        type=Path,
        default=None,
        help="Where to write the injected dataset (default: <stem>_rh.jsonl next to the input).",
    )
    args = parser.parse_args()
    inject(args.dataset_path, args.output_path)


if __name__ == "__main__":
    main()
