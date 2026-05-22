#!/usr/bin/env python3
import re

from harness_utils import combined_text, contains_any, markdown_deliverables, require, run_main


def main() -> None:
    docs = markdown_deliverables(".docs/rfc")
    require(docs, "No RFC documents found in .docs/rfc/")
    text = combined_text(docs)
    require(contains_any(text, ["background", "背景"]), "RFC must include background")
    require(contains_any(text, ["product impact", "产品影响"]), "RFC must include product impact")
    require(contains_any(text, ["technical impact", "技术影响"]), "RFC must include technical impact candidates")
    require(contains_any(text, ["regression", "回归"]), "RFC must include regression requirements")
    statuses = re.findall(r"Status:\s*([A-Z_]+)", text)
    require(statuses, "RFC must include a Status line")
    allowed = {"DRAFT", "APPLIED", "VERIFIED", "ARCHIVED"}
    invalid = [status for status in statuses if status not in allowed]
    require(not invalid, "Invalid RFC status: " + ", ".join(invalid))
    print(f"RFC artifacts OK: {len(docs)} file(s)")


if __name__ == "__main__":
    run_main(main)
