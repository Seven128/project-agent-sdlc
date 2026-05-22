#!/usr/bin/env python3
from harness_utils import contains_any, read_text, require, run_main


def main() -> None:
    text = read_text(".docs/06_review/REVIEW_REPORT.md")
    require(contains_any(text, ["finding", "发现", "风险"]), "Review report must include findings or risks")
    require(contains_any(text, ["test gap", "测试缺口", "coverage"]), "Review report must include test gaps or coverage notes")
    require(contains_any(text, ["pass", "blocked", "通过", "阻塞"]), "Review report must include PASS/BLOCKED decision")
    print("Review report OK")


if __name__ == "__main__":
    run_main(main)
