#!/usr/bin/env python3
from harness_utils import contains_any, read_text, require, run_main


def main() -> None:
    text = read_text(".docs/07_test/TEST_PLAN.md")
    require(contains_any(text, ["matrix", "矩阵"]), "Test plan must include a test matrix")
    require(contains_any(text, ["regression", "回归"]), "Test plan must include regression coverage")
    require(contains_any(text, ["coverage gap", "覆盖缺口", "gap"]), "Test plan must include coverage gaps")
    require(contains_any(text, ["pass", "blocked", "通过", "阻塞"]), "Test plan must include PASS/BLOCKED decision")
    print("Test plan OK")


if __name__ == "__main__":
    run_main(main)
