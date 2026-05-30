#!/usr/bin/env python3
from harness_utils import (
    combined_text,
    contains_any,
    load_plan,
    markdown_deliverables,
    repo_path,
    require,
    run_main,
    validate_plan_contract,
)


CURRENT_RELEASE_REPORT = ".docs/08_release/CURRENT_RELEASE.md"


def release_deliverables():
    current = repo_path(CURRENT_RELEASE_REPORT)
    if current.exists():
        return [current], CURRENT_RELEASE_REPORT
    docs = markdown_deliverables(".docs/08_release")
    return docs, "legacy .docs/08_release/*.md"


def main() -> None:
    validate_plan_contract(load_plan(), allow_open=False)
    docs, source = release_deliverables()
    require(docs, f"Missing current release report: expected {CURRENT_RELEASE_REPORT} or legacy .docs/08_release/*.md")
    text = combined_text(docs)
    require(contains_any(text, ["release", "发布"]), "Current release report must include release notes")
    require(contains_any(text, ["smoke", "冒烟"]), "Current release report must include smoke test evidence")
    require(contains_any(text, ["rollback", "回滚"]), "Current release report must include rollback plan")
    print(f"Current release status OK: {source}")


if __name__ == "__main__":
    run_main(main)
