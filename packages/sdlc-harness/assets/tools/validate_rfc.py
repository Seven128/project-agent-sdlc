#!/usr/bin/env python3
from __future__ import annotations
import re

from harness_utils import (
    combined_text,
    contains_any,
    load_plan,
    markdown_deliverables,
    read_text,
    repo_path,
    require,
    run_main,
    validate_plan_contract,
)


TEST_FACT_SOURCE_REF = re.compile(r"\.docs/07_test/[^\s`,)]+")
SELF_TEST_TRIGGER_TERMS = [
    "entry/exit",
    "runnable entry",
    "runnable exit",
    "runnable entry/exit",
    "runtime",
    "environment",
    "target_runtime_environment",
    "target runtime",
    "required_gates",
    "gate",
    "handoff",
    "blocker",
    "module key test path",
    "test route",
    "test path",
    "debug path",
    "测试路径",
    "测试链路",
    "自测链路",
    "模块关键测试路径",
    "入口",
    "出口",
    "运行环境",
    "阻塞",
]
SELF_TEST_IMPACT_TERMS = ["development self-test impact", "开发自测影响"]


def superseded_test_docs(docs) -> list[str]:
    paths: set[str] = set()
    for doc in docs:
        for line in doc.read_text(encoding="utf-8").splitlines():
            lowered = line.lower()
            if "superseded" not in lowered and "被替代" not in lowered and "失效" not in lowered:
                continue
            for match in TEST_FACT_SOURCE_REF.findall(line):
                paths.add(match.rstrip(".,;:"))
    return sorted(paths)


def main() -> None:
    validate_plan_contract(load_plan(), allow_open=False)
    docs = markdown_deliverables(".docs/rfc")
    require(docs, "No RFC documents found in .docs/rfc/")
    text = combined_text(docs)
    require(contains_any(text, ["background", "背景"]), "RFC must include background")
    require(contains_any(text, ["product impact", "产品影响"]), "RFC must include product impact")
    require(contains_any(text, ["technical impact", "技术影响"]), "RFC must include technical impact candidates")
    require(contains_any(text, ["regression", "回归"]), "RFC must include regression requirements")
    require(
        contains_any(text, ["test fact source impact", "测试事实源影响"]),
        "RFC must include Test Fact Source Impact",
    )
    index_text = read_text(".docs/INDEX.md")
    for path in superseded_test_docs(docs):
        require(not repo_path(path).exists(), f"Superseded test doc still exists in current facts: {path}")
        require(path not in index_text, f"Superseded test doc still linked from .docs/INDEX.md: {path}")
    statuses = re.findall(r"Status:\s*([A-Z_]+)", text)
    require(statuses, "RFC must include a Status line")
    allowed = {"DRAFT", "APPLIED", "VERIFIED", "ARCHIVED"}
    invalid = [status for status in statuses if status not in allowed]
    require(not invalid, "Invalid RFC status: " + ", ".join(invalid))
    validate_development_self_test_impact(docs)
    print(f"RFC artifacts OK: {len(docs)} file(s)")


def validate_development_self_test_impact(docs) -> None:
    for doc in docs:
        number = rfc_number(doc.name)
        if number is not None and number < 23:
            continue
        text = doc.read_text(encoding="utf-8")
        if contains_any(text, SELF_TEST_TRIGGER_TERMS):
            require(
                contains_any(text, SELF_TEST_IMPACT_TERMS),
                f"{doc.relative_to(repo_path('.')).as_posix()} must include Development Self-Test Impact when RFC changes entry/exit, runtime, gates, handoff, or blockers",
            )


def rfc_number(file_name: str) -> int | None:
    match = re.match(r"^RFC[_-](\d+)", file_name, re.IGNORECASE)
    return int(match.group(1)) if match else None


if __name__ == "__main__":
    run_main(main)
