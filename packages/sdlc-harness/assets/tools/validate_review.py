#!/usr/bin/env python3
from harness_utils import contains_any, load_plan, read_text, require, run_main, validate_plan_contract

READINESS_FIELDS = [
    "Runnable Entry",
    "Observable Exit",
    "Initialization",
    "Config Contract",
    "Testing Handoff Readiness",
]
RUNTIME_MISMATCH_TERMS = [
    "not deployed",
    "not initialized",
    "local only",
    "localhost only",
    "fake adapter",
    "fake send",
    "未部署",
    "未初始化",
    "只在本地",
    "仅本地",
    "本地跑通",
]


def main() -> None:
    validate_plan_contract(load_plan(), allow_open=False)
    text = read_text(".docs/06_review/REVIEW_REPORT.md")
    require(contains_any(text, ["finding", "发现", "风险"]), "Review report must include findings or risks")
    require(contains_any(text, ["test gap", "测试缺口", "coverage"]), "Review report must include test gaps or coverage notes")
    require(
        contains_any(text, ["entry/exit", "entrypoint", "入口", "出口", "runnable", "可运行"]),
        "Review report must assess runnable entry/exit readiness before TESTING",
    )
    lowered = text.lower()
    for field in READINESS_FIELDS:
        field_lower = field.lower()
        has_status = (
            f"{field_lower}: pass" in lowered
            or f"{field_lower}: `pass`" in lowered
            or f"{field_lower}: blocked" in lowered
            or f"{field_lower}: `blocked`" in lowered
        )
        require(has_status, f"Review report must include {field}: PASS/BLOCKED")
        require(
            f"{field_lower}: blocked" not in lowered and f"{field_lower}: `blocked`" not in lowered,
            f"Review readiness is BLOCKED: {field}",
        )
    require(contains_any(text, ["pass", "blocked", "通过", "阻塞"]), "Review report must include PASS/BLOCKED decision")
    if contains_any(lowered, ["decision: pass", "decision: `pass`", "final decision: pass"]):
        require(
            not contains_any(lowered, RUNTIME_MISMATCH_TERMS),
            "Review report cannot PASS while target runtime or handoff evidence is missing or lower-level only",
        )
    print("Review report OK")


if __name__ == "__main__":
    run_main(main)
