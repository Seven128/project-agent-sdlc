#!/usr/bin/env python3
from harness_utils import combined_text, contains_any, markdown_deliverables, require, run_main


def main() -> None:
    architecture_docs = markdown_deliverables(".docs/02_architecture")
    tech_plan_docs = markdown_deliverables(".docs/03_tech_plan")
    require(architecture_docs, "No architecture deliverables found in .docs/02_architecture/")
    require(tech_plan_docs, "No technical plan deliverables found in .docs/03_tech_plan/")

    text = combined_text(architecture_docs + tech_plan_docs)
    require(contains_any(text, ["prd", "requirement", "需求"]), "Design must cite product requirements")
    require(contains_any(text, ["api", "interface", "接口", "contract", "契约"]), "Design must describe interfaces or contracts")
    require(contains_any(text, ["task", "任务", "breakdown"]), "Design must include task breakdown")
    print(f"Design artifacts OK: {len(architecture_docs)} architecture, {len(tech_plan_docs)} tech plan")


if __name__ == "__main__":
    run_main(main)
