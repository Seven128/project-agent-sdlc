#!/usr/bin/env python3
import json
import re
from pathlib import Path

from harness_utils import ROOT, make_arg_parser, repo_path, require, run_main


def tokens(text: str) -> set[str]:
    raw = re.findall(r"[A-Za-z0-9_./-]{3,}|[\u4e00-\u9fff]{2,}", text)
    stop = {"the", "and", "for", "with", "status", "draft", "added", "changed", "removed"}
    return {item.lower() for item in raw if item.lower() not in stop}


def score_file(path: Path, query_tokens: set[str]) -> int:
    try:
        content = path.read_text(encoding="utf-8", errors="ignore").lower()
    except Exception:
        return 0
    return sum(1 for token in query_tokens if token in content)


def main() -> None:
    parser = make_arg_parser("Generate candidate impact scope for an RFC")
    parser.add_argument("--rfc", required=True, help="RFC path relative to repository root")
    parser.add_argument("--top", type=int, default=30, help="Maximum candidates to print")
    args = parser.parse_args()

    rfc_path = repo_path(args.rfc)
    require(rfc_path.exists(), f"RFC file not found: {args.rfc}")
    query_tokens = tokens(rfc_path.read_text(encoding="utf-8"))
    require(query_tokens, "RFC does not contain enough analyzable terms")

    candidates = []
    roots = [".docs", "src", "tests"]
    for root in roots:
        base = repo_path(root)
        if not base.exists():
            continue
        for path in base.rglob("*"):
            if path.is_file() and path.name != ".gitkeep":
                score = score_file(path, query_tokens)
                if score:
                    candidates.append({"path": str(path.relative_to(ROOT)), "score": score})

    candidates.sort(key=lambda item: (-item["score"], item["path"]))
    print(json.dumps({"rfc": args.rfc, "candidates": candidates[: args.top]}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    run_main(main)
