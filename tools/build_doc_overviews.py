#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import html
import re
import sys
from pathlib import Path
from typing import Iterable

from harness_utils import ROOT, HarnessError, require, run_main


DOCS_ROOT = ROOT / ".docs"
OUTPUT_NAME = "overview.html"


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
        if path.name == OUTPUT_NAME:
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


def slug(value: str) -> str:
    lowered = value.lower()
    replaced = re.sub(r"[^a-z0-9\u4e00-\u9fff]+", "-", lowered).strip("-")
    return replaced or hashlib.sha1(value.encode("utf-8")).hexdigest()[:10]


def inline_markdown(text: str) -> str:
    escaped = html.escape(text)
    escaped = re.sub(r"`([^`]+)`", lambda m: f"<code>{m.group(1)}</code>", escaped)
    escaped = re.sub(
        r"\[([^\]]+)\]\(([^)]+)\)",
        lambda m: f'<a href="{html.escape(m.group(2), quote=True)}">{m.group(1)}</a>',
        escaped,
    )
    return escaped


def is_table_separator(line: str) -> bool:
    stripped = line.strip()
    return bool(stripped.startswith("|") and stripped.endswith("|") and re.fullmatch(r"[\s|:.-]+", stripped))


def split_table_row(line: str) -> list[str]:
    stripped = line.strip().strip("|")
    return [cell.strip() for cell in stripped.split("|")]


def render_table(lines: list[str], start: int) -> tuple[str, int]:
    header = split_table_row(lines[start])
    index = start + 2
    rows = []
    while index < len(lines) and lines[index].strip().startswith("|") and lines[index].strip().endswith("|"):
        rows.append(split_table_row(lines[index]))
        index += 1

    parts = ["<table>", "<thead><tr>"]
    for cell in header:
        parts.append(f"<th>{inline_markdown(cell)}</th>")
    parts.append("</tr></thead>")
    if rows:
        parts.append("<tbody>")
        for row in rows:
            parts.append("<tr>")
            for cell in row:
                parts.append(f"<td>{inline_markdown(cell)}</td>")
            parts.append("</tr>")
        parts.append("</tbody>")
    parts.append("</table>")
    return "\n".join(parts), index


def render_list(lines: list[str], start: int) -> tuple[str, int]:
    parts = ["<ul>"]
    index = start
    while index < len(lines):
        match = re.match(r"^\s*-\s+(.*)$", lines[index])
        if not match:
            break
        item = match.group(1)
        checkbox = re.match(r"^\[( |x|X)\]\s+(.*)$", item)
        if checkbox:
            checked = " checked" if checkbox.group(1).lower() == "x" else ""
            item_html = f'<input type="checkbox" disabled{checked}> {inline_markdown(checkbox.group(2))}'
        else:
            item_html = inline_markdown(item)
        parts.append(f"<li>{item_html}</li>")
        index += 1
    parts.append("</ul>")
    return "\n".join(parts), index


def render_markdown(markdown: str) -> str:
    lines = markdown.splitlines()
    parts: list[str] = []
    index = 0
    in_code = False
    code_lines: list[str] = []
    code_lang = ""

    while index < len(lines):
        line = lines[index]
        stripped = line.strip()

        if stripped.startswith("```"):
            if in_code:
                language_class = f' class="language-{html.escape(code_lang, quote=True)}"' if code_lang else ""
                parts.append(f"<pre><code{language_class}>{html.escape(chr(10).join(code_lines))}</code></pre>")
                code_lines = []
                code_lang = ""
                in_code = False
            else:
                code_lang = stripped[3:].strip()
                in_code = True
            index += 1
            continue

        if in_code:
            code_lines.append(line)
            index += 1
            continue

        if not stripped:
            index += 1
            continue

        heading = re.match(r"^(#{1,6})\s+(.+)$", line)
        if heading:
            level = len(heading.group(1))
            title = heading.group(2).strip()
            parts.append(f'<h{level} id="{slug(title)}">{inline_markdown(title)}</h{level}>')
            index += 1
            continue

        if index + 1 < len(lines) and stripped.startswith("|") and is_table_separator(lines[index + 1]):
            table_html, index = render_table(lines, index)
            parts.append(table_html)
            continue

        if re.match(r"^\s*-\s+", line):
            list_html, index = render_list(lines, index)
            parts.append(list_html)
            continue

        paragraph = [stripped]
        index += 1
        while index < len(lines):
            next_line = lines[index]
            next_stripped = next_line.strip()
            if (
                not next_stripped
                or next_stripped.startswith("```")
                or re.match(r"^(#{1,6})\s+(.+)$", next_line)
                or re.match(r"^\s*-\s+", next_line)
                or (index + 1 < len(lines) and next_stripped.startswith("|") and is_table_separator(lines[index + 1]))
            ):
                break
            paragraph.append(next_stripped)
            index += 1
        parts.append(f"<p>{inline_markdown(' '.join(paragraph))}</p>")

    if in_code:
        language_class = f' class="language-{html.escape(code_lang, quote=True)}"' if code_lang else ""
        parts.append(f"<pre><code{language_class}>{html.escape(chr(10).join(code_lines))}</code></pre>")

    return "\n".join(parts)


def html_document(stage: Path, files: list[Path]) -> str:
    stage_name = stage.relative_to(ROOT).as_posix()
    digest = source_hash(files, stage)
    nav_items = []
    articles = []

    for path in files:
        relative = path.relative_to(stage).as_posix()
        section_id = slug(relative)
        nav_items.append(f'<li><a href="#{section_id}">{html.escape(relative)}</a></li>')
        source_html = html.escape(relative, quote=True)
        rendered = render_markdown(path.read_text(encoding="utf-8"))
        articles.append(
            "\n".join(
                [
                    f'<article class="doc-slice" id="{section_id}">',
                    "<header>",
                    f"<h2>{html.escape(relative)}</h2>",
                    f'<a class="source-link" href="{source_html}">Source Markdown</a>',
                    "</header>",
                    rendered if rendered.strip() else '<p class="empty">空文档。</p>',
                    "</article>",
                ]
            )
        )

    if not files:
        nav = '<p class="empty">当前阶段还没有 Markdown slice。</p>'
        body = '<article class="doc-slice"><p class="empty">当前阶段还没有 Markdown slice。</p></article>'
    else:
        nav = "<ol>\n" + "\n".join(nav_items) + "\n</ol>"
        body = "\n".join(articles)

    return f"""<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="generator" content="AI SDLC Harness build_doc_overviews.py">
  <meta name="source-hash" content="{digest}">
  <title>{html.escape(stage_name)} overview</title>
  <style>
    :root {{
      color-scheme: light dark;
      --bg: #f8fafc;
      --panel: #ffffff;
      --text: #18202f;
      --muted: #64748b;
      --border: #d7dee8;
      --accent: #0f766e;
      --code: #eef2f7;
    }}
    @media (prefers-color-scheme: dark) {{
      :root {{
        --bg: #10141d;
        --panel: #171d28;
        --text: #e5e7eb;
        --muted: #a5b4c4;
        --border: #303949;
        --accent: #5eead4;
        --code: #232c3a;
      }}
    }}
    body {{
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font: 15px/1.65 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }}
    main {{
      width: min(1120px, calc(100% - 32px));
      margin: 0 auto;
      padding: 32px 0 56px;
    }}
    .hero, .doc-slice {{
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 20px 24px;
      margin-bottom: 18px;
    }}
    h1, h2, h3, h4 {{
      line-height: 1.25;
      margin: 0 0 12px;
    }}
    h1 {{ font-size: 28px; }}
    h2 {{ font-size: 21px; margin-top: 6px; }}
    h3 {{ font-size: 18px; margin-top: 20px; }}
    p {{ margin: 10px 0; }}
    a {{ color: var(--accent); }}
    .meta {{
      color: var(--muted);
      margin: 6px 0;
    }}
    .source-list ol {{
      margin: 8px 0 0;
      padding-left: 24px;
    }}
    .doc-slice header {{
      display: flex;
      gap: 12px;
      align-items: baseline;
      justify-content: space-between;
      border-bottom: 1px solid var(--border);
      margin-bottom: 16px;
      padding-bottom: 10px;
    }}
    .source-link {{
      white-space: nowrap;
      font-size: 13px;
    }}
    code, pre {{
      background: var(--code);
      border-radius: 6px;
    }}
    code {{
      padding: 1px 5px;
    }}
    pre {{
      overflow-x: auto;
      padding: 14px;
    }}
    pre code {{
      padding: 0;
      background: transparent;
    }}
    table {{
      border-collapse: collapse;
      width: 100%;
      margin: 14px 0;
      font-size: 14px;
    }}
    th, td {{
      border: 1px solid var(--border);
      padding: 8px 10px;
      vertical-align: top;
    }}
    th {{
      text-align: left;
      background: color-mix(in srgb, var(--code), transparent 20%);
    }}
    .empty {{
      color: var(--muted);
    }}
  </style>
</head>
<body>
  <main>
    <section class="hero">
      <h1>{html.escape(stage_name)} overview</h1>
      <p class="meta">Generated artifact. Markdown slices remain the source of truth.</p>
      <p class="meta">Source hash: <code>{digest}</code></p>
      <div class="source-list">
        <h2>Source Slices</h2>
        {nav}
      </div>
    </section>
    {body}
  </main>
</body>
</html>
"""


def write_overview(stage: Path, check: bool) -> bool:
    files = markdown_files(stage)
    output = stage / OUTPUT_NAME
    rendered = html_document(stage, files)
    if check:
        if not output.exists():
            print(f"Missing {output.relative_to(ROOT)}")
            return False
        existing = output.read_text(encoding="utf-8")
        if existing != rendered:
            print(f"Outdated {output.relative_to(ROOT)}")
            return False
        print(f"OK {output.relative_to(ROOT)}")
        return True
    output.write_text(rendered, encoding="utf-8")
    print(f"Wrote {output.relative_to(ROOT)}")
    return True


def selected_stages(args: argparse.Namespace) -> list[Path]:
    if args.stage:
        return [resolve_stage(value) for value in args.stage]
    return stage_dirs()


def main() -> None:
    parser = argparse.ArgumentParser(description="Build deterministic HTML overviews for .docs stage slices")
    parser.add_argument("--stage", action="append", help="Stage directory, e.g. .docs/01_product or 01_product")
    parser.add_argument("--all", action="store_true", help="Build all .docs stage directories")
    parser.add_argument("--check", action="store_true", help="Check whether overview.html files are up to date")
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
