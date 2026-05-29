#!/usr/bin/env python3
from harness_utils import (
    changed_files,
    contains_any,
    load_lifecycle,
    load_plan,
    repo_path,
    read_text,
    require,
    run_main,
    testing_boundary_errors_for_changed_files,
    validate_plan_contract,
)

TEST_REPORT_PATH = ".docs/07_test/TEST_REPORT.md"
PLACEHOLDER_TERMS = ["pending", "tbd", "todo", "待填", "待补", "placeholder"]
MISSING_READINESS_TERMS = [
    "missing entry",
    "missing exit",
    "missing runnable",
    "missing development evidence",
    "no runnable",
    "no entry",
    "no exit",
    "入口缺失",
    "出口缺失",
    "缺少入口",
    "缺少出口",
    "缺少 development evidence",
    "尚未交付",
    "未交付",
    "不存在",
]


def read_test_report() -> tuple[str, str]:
    require(
        repo_path(TEST_REPORT_PATH).exists(),
        f"Missing test report: expected executed evidence at {TEST_REPORT_PATH}",
    )
    return read_text(TEST_REPORT_PATH), TEST_REPORT_PATH


def main() -> None:
    validate_plan_contract(load_plan(), allow_open=False)
    text, source = read_test_report()
    require(
        not contains_any(text, PLACEHOLDER_TERMS),
        "Test report must contain executed evidence, not pending/TBD/TODO/placeholder content",
    )
    require(contains_any(text, ["matrix", "矩阵"]), "Test report must include a test matrix")
    require(contains_any(text, ["regression", "回归"]), "Test report must include regression evidence")
    require(contains_any(text, ["coverage gap", "覆盖缺口", "gap"]), "Test report must include coverage gaps")
    require(
        contains_any(text, ["entry/exit", "entrypoint", "入口", "出口", "runnable", "可运行"]),
        "Test report must state existing runnable entry/exit coverage or blocker status",
    )
    require(contains_any(text, ["pass", "blocked", "通过", "阻塞"]), "Test report must include PASS/BLOCKED decision")
    if contains_any(text, ["decision\n\npass", "decision: pass", "decision: `pass`", "final decision: pass"]):
        require(
            not contains_any(text, MISSING_READINESS_TERMS),
            "Test report cannot PASS while runnable entry/exit or Development Evidence is missing; use BLOCKED with recovery conditions",
        )
    if load_lifecycle().get("current_phase") == "TESTING":
        for error in testing_boundary_errors_for_changed_files(changed_files()):
            require(False, error)
    print(f"Test report OK: {source}")


if __name__ == "__main__":
    run_main(main)
