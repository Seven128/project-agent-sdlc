#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

from harness_utils import ROOT, HarnessError, load_yaml, require, run_main


SKILL_REQUIRED_SECTIONS = ["## 目的", "## 角色提示词", "## 输入", "## 规则", "## 完成检查"]
ARTIFACT_SKILLS_REQUIRE_SEMANTIC_SLICING = {
    "pm_prd",
    "architect_design",
    "dev_sprint",
    "implementation_doc",
    "reviewer",
    "tester",
    "release_manager",
    "rfc_recalibrate",
}
SKILL_FORBIDDEN_HEADINGS = [
    "## Purpose",
    "## Required Inputs",
    "## Outputs",
    "## Rules",
    "## Completion Checklist",
]

MACHINE_IDENTIFIERS = [
    "current_phase",
    "active_skill",
    "allowed_paths",
    "required_gates",
    "implementation_doc",
    "REQUIREMENT_GATHERING",
    "ARCHITECTING",
    "SPRINTING",
    "REVIEWING",
    "TESTING",
    "RELEASING",
    "RFC_RECALIBRATION",
    "BLOCKED",
    "pending",
    "in_progress",
    "done",
    "pending_revision",
]

REQUIRED_AGENTS_TERMS = [
    "Prompt Language Contract",
    "中文解释 + 英文精确标识符",
    ".agent/state/lifecycle.yaml",
    ".agent/state/plan.yaml",
    "make validate-current",
]

YAML_KEYWORDS = {
    "lifecycle": [
        "project_name",
        "version",
        "current_phase",
        "active_role",
        "active_skill",
        "current_milestone",
        "allowed_next_phases",
        "history",
    ],
    "plan": [
        "current_phase",
        "current_task_id",
        "tasks",
    ],
    "phase_contracts": ["phases"],
}


def text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def validate_agents() -> None:
    content = text(ROOT / "AGENTS.md")
    for term in REQUIRED_AGENTS_TERMS:
        require(term in content, f"AGENTS.md missing prompt language contract term: {term}")
    for identifier in MACHINE_IDENTIFIERS:
        require(identifier in content, f"AGENTS.md should preserve machine identifier: {identifier}")


def validate_skills() -> None:
    skill_files = sorted((ROOT / ".agent/skills").glob("*/SKILL.md"))
    require(skill_files, "No skill files found under .agent/skills/")

    for path in skill_files:
        content = text(path)
        for section in SKILL_REQUIRED_SECTIONS:
            require(section in content, f"{path.relative_to(ROOT)} missing Chinese section: {section}")
        for heading in SKILL_FORBIDDEN_HEADINGS:
            require(heading not in content, f"{path.relative_to(ROOT)} still uses English prompt heading: {heading}")
        require("name:" in content and "description:" in content, f"{path.relative_to(ROOT)} must keep frontmatter name/description")
        skill_name = path.parent.name
        if skill_name in ARTIFACT_SKILLS_REQUIRE_SEMANTIC_SLICING:
            require("## 语义切片" in content, f"{path.relative_to(ROOT)} missing semantic slicing section: ## 语义切片")


def validate_skill_template() -> None:
    path = ROOT / ".agent/managed/templates/SKILL_TEMPLATE.md"
    require(path.exists(), "Missing .agent/managed/templates/SKILL_TEMPLATE.md")
    content = text(path)
    for section in SKILL_REQUIRED_SECTIONS:
        require(section in content, f"SKILL_TEMPLATE.md missing Chinese section: {section}")
    require("## 语义切片" in content, "SKILL_TEMPLATE.md missing semantic slicing section: ## 语义切片")
    require("current_phase" in content and "make validate-current" in content, "SKILL_TEMPLATE.md must demonstrate English machine identifiers")


def validate_yaml_keys() -> None:
    lifecycle = load_yaml(".agent/state/lifecycle.yaml")
    tasks = load_yaml(".agent/state/plan.yaml")
    phase_contracts = load_yaml(".agent/managed/policies/phase_contracts.yaml")

    for key in YAML_KEYWORDS["lifecycle"]:
        require(key in lifecycle, f"lifecycle.yaml key was removed or translated: {key}")
    for key in YAML_KEYWORDS["plan"]:
        require(key in tasks, f"plan.yaml key was removed or translated: {key}")
    for key in YAML_KEYWORDS["phase_contracts"]:
        require(key in phase_contracts, f"phase_contracts.yaml key was removed or translated: {key}")


def main() -> None:
    try:
        validate_agents()
        validate_skills()
        validate_skill_template()
        validate_yaml_keys()
    except HarnessError:
        raise
    print("Prompt language contract OK")


if __name__ == "__main__":
    run_main(main)
