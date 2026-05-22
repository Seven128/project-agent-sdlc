#!/usr/bin/env python3
from harness_utils import combined_text, contains_any, markdown_deliverables, require, run_main


def main() -> None:
    docs = markdown_deliverables(".docs/08_release")
    require(docs, "No release deliverables found in .docs/08_release/")
    text = combined_text(docs)
    require(contains_any(text, ["release", "发布"]), "Release docs must include release notes")
    require(contains_any(text, ["smoke", "冒烟"]), "Release docs must include smoke test evidence")
    require(contains_any(text, ["rollback", "回滚"]), "Release docs must include rollback plan")
    print(f"Release artifacts OK: {len(docs)} file(s)")


if __name__ == "__main__":
    run_main(main)
