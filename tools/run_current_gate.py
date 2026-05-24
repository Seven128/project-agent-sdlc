#!/usr/bin/env python3
import subprocess

from harness_utils import load_lifecycle, load_phase_contracts, require, run_main, ROOT


def main() -> None:
    lifecycle = load_lifecycle()
    phases = load_phase_contracts()
    phase_name = lifecycle.get("current_phase")
    require(phase_name in phases, f"Current phase not found in phase contracts: {phase_name}")
    gates = phases[phase_name].get("gates") or []
    if not gates:
        print(f"No gate configured for phase {phase_name}")
        return

    for gate in gates:
        print(f"Running {gate}")
        proc = subprocess.run(gate, cwd=ROOT, shell=True)
        result = "PASS" if proc.returncode == 0 else "FAIL"
        print(f"{gate}: {result}")
        require(proc.returncode == 0, f"Gate failed for {phase_name}: {gate}")


if __name__ == "__main__":
    run_main(main)
