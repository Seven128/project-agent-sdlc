#!/usr/bin/env python3
from harness_utils import load_lifecycle, load_phase_contracts, load_yaml, repo_path, require, require_paths, run_main


def main() -> None:
    required_files = [
        "AGENTS.md",
        "Makefile",
        ".docs/INDEX.md",
        ".codex/state/lifecycle.yaml",
        ".codex/state/plan.yaml",
        ".codex/state/plan.draft.yaml",
        ".codex/state/memory.md",
        ".codex/pjsdlc_managed/templates/PLAN_TEMPLATE.yaml",
        ".codex/pjsdlc_managed/policies/phase_contracts.yaml",
        ".codex/pjsdlc_managed/policies/gates.yaml",
        ".codex/pjsdlc_managed/policies/allowed_paths.yaml",
        ".codex/pjsdlc_managed/policies/risk_matrix.yaml",
        "tools/build_doc_overviews.py",
        "tools/validate_plan.py",
    ]
    required_dirs = [
        ".docs/00_raw",
        ".docs/01_product",
        ".docs/02_architecture",
        ".docs/03_tech_plan",
        ".docs/04_implementation",
        ".docs/05_decisions",
        ".docs/06_review",
        ".docs/07_test",
        ".docs/08_release",
        ".docs/09_runbooks",
        ".docs/rfc",
        ".codex/skills",
        "tools",
    ]
    require_paths(required_files + required_dirs)

    lifecycle = load_lifecycle()
    phases = load_phase_contracts()
    load_yaml(".codex/pjsdlc_managed/policies/gates.yaml")
    load_yaml(".codex/pjsdlc_managed/policies/allowed_paths.yaml")
    load_yaml(".codex/pjsdlc_managed/policies/risk_matrix.yaml")

    current_phase = lifecycle.get("current_phase")
    require(current_phase in phases, f"Lifecycle current_phase is not declared: {current_phase}")

    for phase_name, contract in phases.items():
        skill = contract.get("skill")
        require(skill, f"{phase_name} missing skill")
        skill_file = repo_path(f".codex/skills/{skill}/SKILL.md")
        require(skill_file.exists(), f"Missing skill file for {phase_name}: {skill_file.relative_to(repo_path('.'))}")
        require("inputs" in contract, f"{phase_name} missing inputs")
        require("outputs" in contract, f"{phase_name} missing outputs")
        require("gates" in contract, f"{phase_name} missing gates")

    print("Harness scaffold OK")


if __name__ == "__main__":
    run_main(main)
