#!/usr/bin/env python3
from harness_utils import combined_text, contains_any, markdown_deliverables, require, run_main


def main() -> None:
    docs = markdown_deliverables(".docs/01_product")
    require(docs, "No PRD deliverables found in .docs/01_product/")
    text = combined_text(docs)
    require(contains_any(text, ["acceptance", "验收"]), "PRD must include acceptance criteria")
    require(contains_any(text, ["out of scope", "out of scope", "不做", "边界"]), "PRD must include out-of-scope boundaries")
    require(contains_any(text, ["open questions", "未决", "待确认"]), "PRD must include open questions")
    print(f"PRD artifacts OK: {len(docs)} file(s)")


if __name__ == "__main__":
    run_main(main)
