#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import sys
from pathlib import Path

from harness_utils import ROOT, HarnessError, require, run_main


DOCS_ROOT = ROOT / ".docs"
OUTPUT_NAME = "overview.md"
LEGACY_OUTPUT_NAME = "overview.html"


def stage_dirs() -> list[Path]:
    require(DOCS_ROOT.exists(), "Missing .docs directory")
    return sorted(path for path in DOCS_ROOT.iterdir() if path.is_dir() and not path.name.startswith("."))


def resolve_stage(value: str) -> Path:
    raw = Path(value)
    path = raw if raw.is_absolute() else ROOT / raw
    if not path.exists() and not value.startswith(".docs/"):
        path = DOCS_ROOT / value
    require(path.exists() and path.is_dir(), f"Stage directory not found: {value}")
    require(DOCS_ROOT in path.parents or path == DOCS_ROOT, f"Stage must be under .docs/: {value}")
    return path


def markdown_files(stage: Path) -> list[Path]:
    files = []
    for path in sorted(stage.rglob("*.md")):
        if any(part.startswith(".") for part in path.relative_to(stage).parts):
            continue
        if path.name in {OUTPUT_NAME, LEGACY_OUTPUT_NAME}:
            continue
        files.append(path)
    return files


def source_hash(files: list[Path], stage: Path) -> str:
    digest = hashlib.sha256()
    for path in files:
        relative = path.relative_to(stage).as_posix()
        digest.update(relative.encode("utf-8"))
        digest.update(b"\0")
        digest.update(path.read_bytes())
        digest.update(b"\0")
    return digest.hexdigest()[:16]


def markdown_link(label: str, target: str) -> str:
    escaped_label = label.replace("[", "\\[").replace("]", "\\]")
    escaped_target = target.replace(" ", "%20")
    return f"[{escaped_label}]({escaped_target})"


def markdown_document(stage: Path, files: list[Path]) -> str:
    stage_name = stage.relative_to(ROOT).as_posix()
    digest = source_hash(files, stage)
    parts = [
        f"# {stage_name} overview",
        "",
        "<!-- generated-by: AI SDLC Harness build_doc_overviews.py -->",
        f"<!-- source-hash: {digest} -->",
        "",
        "Generated artifact. Markdown slices remain the source of truth.",
        "",
        f"Source hash: `{digest}`",
        "",
        "## Source Slices",
        "",
    ]

    if not files:
        parts.extend(["当前阶段还没有 Markdown slice。", ""])
    else:
        for index, path in enumerate(files, start=1):
            relative = path.relative_to(stage).as_posix()
            parts.append(f"{index}. {markdown_link(relative, relative)}")
        parts.append("")

    for path in files:
        relative = path.relative_to(stage).as_posix()
        content = path.read_text(encoding="utf-8").strip()
        parts.extend(
            [
                "---",
                "",
                f"## {relative}",
                "",
                f"Source: {markdown_link(relative, relative)}",
                "",
                content if content else "空文档。",
                "",
            ]
        )

    return "\n".join(parts).rstrip() + "\n"


def write_overview(stage: Path, check: bool) -> bool:
    files = markdown_files(stage)
    output = stage / OUTPUT_NAME
    legacy_output = stage / LEGACY_OUTPUT_NAME
    rendered = markdown_document(stage, files)
    if check:
        if legacy_output.exists():
            print(f"Legacy {legacy_output.relative_to(ROOT)} remains")
            return False
        if not output.exists():
            print(f"Missing {output.relative_to(ROOT)}")
            return False
        existing = output.read_text(encoding="utf-8")
        if existing != rendered:
            print(f"Outdated {output.relative_to(ROOT)}")
            return False
        print(f"OK {output.relative_to(ROOT)}")
        return True
    if legacy_output.exists():
        legacy_output.unlink()
    output.write_text(rendered, encoding="utf-8")
    print(f"Wrote {output.relative_to(ROOT)}")
    return True


def selected_stages(args: argparse.Namespace) -> list[Path]:
    if args.stage:
        return [resolve_stage(value) for value in args.stage]
    return stage_dirs()


def main() -> None:
    parser = argparse.ArgumentParser(description="Build deterministic Markdown overviews for .docs stage slices")
    parser.add_argument("--stage", action="append", help="Stage directory, e.g. .docs/01_product or 01_product")
    parser.add_argument("--all", action="store_true", help="Build all .docs stage directories")
    parser.add_argument("--check", action="store_true", help="Check whether overview.md files are up to date")
    args = parser.parse_args()

    stages = selected_stages(args)
    require(stages, "No .docs stage directories found")
    ok = True
    for stage in stages:
        ok = write_overview(stage, args.check) and ok
    if not ok:
        sys.exit(1)


if __name__ == "__main__":
    run_main(main)
