#!/usr/bin/env python3
from __future__ import annotations

import argparse
import datetime as _dt
import fnmatch
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]

TASK_STATUSES = {
    "pending",
    "in_progress",
    "done",
    "blocked",
    "pending_revision",
    "cancelled",
}

OPEN_TASK_STATUSES = {"pending", "in_progress", "blocked", "pending_revision"}


class HarnessError(RuntimeError):
    pass


def repo_path(relative: str | Path) -> Path:
    return ROOT / relative


def read_text(relative: str | Path) -> str:
    path = repo_path(relative)
    if not path.exists():
        raise HarnessError(f"Missing required file: {relative}")
    return path.read_text(encoding="utf-8")


def load_yaml(relative: str | Path) -> Any:
    path = repo_path(relative)
    if not path.exists():
        raise HarnessError(f"Missing required YAML file: {relative}")
    text = path.read_text(encoding="utf-8")
    if not text.strip():
        return {}
    try:
        import yaml  # type: ignore

        data = yaml.safe_load(text)
        return {} if data is None else data
    except Exception:
        pass
    try:
        return json.loads(text)
    except Exception:
        return parse_simple_yaml(text)


def parse_yaml_text(text: str) -> Any:
    if not text.strip():
        return {}
    try:
        import yaml  # type: ignore

        data = yaml.safe_load(text)
        return {} if data is None else data
    except Exception:
        pass
    try:
        return json.loads(text)
    except Exception:
        return parse_simple_yaml(text)


def dump_yaml(data: Any, relative: str | Path) -> None:
    path = repo_path(relative)
    path.write_text(to_simple_yaml(data).rstrip() + "\n", encoding="utf-8")


def parse_simple_yaml(text: str) -> Any:
    lines: list[tuple[int, str, int]] = []
    for lineno, raw in enumerate(text.splitlines(), start=1):
        if not raw.strip() or raw.lstrip().startswith("#"):
            continue
        indent = len(raw) - len(raw.lstrip(" "))
        lines.append((indent, raw.strip(), lineno))

    if not lines:
        return {}

    data, index = _parse_block(lines, 0, lines[0][0])
    if index != len(lines):
        _, stripped, lineno = lines[index]
        raise HarnessError(f"Could not parse YAML near line {lineno}: {stripped}")
    return data


def _parse_block(lines: list[tuple[int, str, int]], index: int, indent: int) -> tuple[Any, int]:
    if index >= len(lines):
        return {}, index
    current_indent, stripped, _ = lines[index]
    if current_indent < indent:
        return {}, index
    if stripped.startswith("-"):
        return _parse_list(lines, index, current_indent)
    return _parse_dict(lines, index, current_indent)


def _parse_dict(lines: list[tuple[int, str, int]], index: int, indent: int) -> tuple[dict[str, Any], int]:
    result: dict[str, Any] = {}
    while index < len(lines):
        current_indent, stripped, lineno = lines[index]
        if current_indent < indent:
            break
        if current_indent > indent:
            raise HarnessError(f"Unexpected indentation near line {lineno}: {stripped}")
        if stripped.startswith("-"):
            break
        if ":" not in stripped:
            raise HarnessError(f"Expected key/value near line {lineno}: {stripped}")
        key, raw_value = stripped.split(":", 1)
        key = key.strip()
        raw_value = raw_value.strip()
        index += 1

        if raw_value:
            result[key] = parse_scalar(raw_value)
        elif index < len(lines) and lines[index][0] > current_indent:
            value, index = _parse_block(lines, index, lines[index][0])
            result[key] = value
        else:
            result[key] = {}
    return result, index


def _parse_list(lines: list[tuple[int, str, int]], index: int, indent: int) -> tuple[list[Any], int]:
    result: list[Any] = []
    while index < len(lines):
        current_indent, stripped, lineno = lines[index]
        if current_indent < indent:
            break
        if current_indent > indent:
            raise HarnessError(f"Unexpected list indentation near line {lineno}: {stripped}")
        if not stripped.startswith("-"):
            break

        content = stripped[1:].strip()
        index += 1

        if not content:
            if index < len(lines) and lines[index][0] > current_indent:
                value, index = _parse_block(lines, index, lines[index][0])
            else:
                value = None
        elif _looks_like_inline_mapping(content):
            key, raw_value = content.split(":", 1)
            item: dict[str, Any] = {}
            raw_value = raw_value.strip()
            if raw_value:
                item[key.strip()] = parse_scalar(raw_value)
            elif index < len(lines) and lines[index][0] > current_indent:
                nested, index = _parse_block(lines, index, lines[index][0])
                item[key.strip()] = nested
            else:
                item[key.strip()] = {}

            if index < len(lines) and lines[index][0] > current_indent:
                continuation, index = _parse_block(lines, index, lines[index][0])
                if not isinstance(continuation, dict):
                    raise HarnessError(f"Expected mapping continuation near line {lineno}: {stripped}")
                item.update(continuation)
            value = item
        else:
            value = parse_scalar(content)

        result.append(value)
    return result, index


def _looks_like_inline_mapping(content: str) -> bool:
    if ":" not in content:
        return False
    if content.startswith(("'", '"')):
        return False
    return bool(re.match(r"^[A-Za-z0-9_.-]+\s*:", content))


def parse_scalar(raw: str) -> Any:
    raw = raw.strip()
    if raw in {"[]", "[ ]"}:
        return []
    if raw in {"{}", "{ }"}:
        return {}
    if raw.lower() in {"null", "none", "~"}:
        return None
    if raw.lower() == "true":
        return True
    if raw.lower() == "false":
        return False
    if raw.startswith("[") and raw.endswith("]"):
        try:
            return json.loads(raw)
        except Exception:
            inner = raw[1:-1].strip()
            return [] if not inner else [parse_scalar(part.strip()) for part in inner.split(",")]
    if raw.startswith(('"', "'")) and raw.endswith(('"', "'")):
        try:
            return json.loads(raw)
        except Exception:
            return raw[1:-1]
    if re.match(r"^-?\d+$", raw):
        return int(raw)
    return raw


def to_simple_yaml(data: Any, indent: int = 0) -> str:
    pad = " " * indent
    if isinstance(data, dict):
        lines: list[str] = []
        for key, value in data.items():
            if _is_scalar(value) or value == [] or value == {}:
                lines.append(f"{pad}{key}: {_format_scalar(value)}")
            else:
                lines.append(f"{pad}{key}:")
                lines.append(to_simple_yaml(value, indent + 2))
        return "\n".join(lines)
    if isinstance(data, list):
        if not data:
            return f"{pad}[]"
        lines = []
        for item in data:
            if _is_scalar(item) or item == [] or item == {}:
                lines.append(f"{pad}- {_format_scalar(item)}")
            elif isinstance(item, dict):
                item_lines = list(item.items())
                first_key, first_value = item_lines[0]
                if _is_scalar(first_value) or first_value == [] or first_value == {}:
                    lines.append(f"{pad}- {first_key}: {_format_scalar(first_value)}")
                else:
                    lines.append(f"{pad}- {first_key}:")
                    lines.append(to_simple_yaml(first_value, indent + 2))
                for key, value in item_lines[1:]:
                    if _is_scalar(value) or value == [] or value == {}:
                        lines.append(f"{pad}  {key}: {_format_scalar(value)}")
                    else:
                        lines.append(f"{pad}  {key}:")
                        lines.append(to_simple_yaml(value, indent + 4))
            else:
                raise HarnessError(f"Cannot serialize YAML item of type {type(item).__name__}")
        return "\n".join(lines)
    return f"{pad}{_format_scalar(data)}"


def _is_scalar(value: Any) -> bool:
    return value is None or isinstance(value, (str, int, float, bool))


def _format_scalar(value: Any) -> str:
    if value == []:
        return "[]"
    if value == {}:
        return "{}"
    if value is None:
        return "null"
    if value is True:
        return "true"
    if value is False:
        return "false"
    if isinstance(value, (int, float)):
        return str(value)
    return json.dumps(str(value), ensure_ascii=False)


def markdown_deliverables(relative_dir: str) -> list[Path]:
    directory = repo_path(relative_dir)
    if not directory.exists():
        raise HarnessError(f"Missing required directory: {relative_dir}")
    return sorted(
        path
        for path in directory.rglob("*.md")
        if path.name.upper() != "README.MD" and not path.name.startswith(".")
    )


def require(condition: Any, message: str) -> None:
    if not condition:
        raise HarnessError(message)


def require_paths(paths: list[str]) -> None:
    for relative in paths:
        require(repo_path(relative).exists(), f"Missing required path: {relative}")


def combined_text(paths: list[Path]) -> str:
    return "\n".join(path.read_text(encoding="utf-8") for path in paths)


def contains_any(text: str, terms: list[str]) -> bool:
    lowered = text.lower()
    return any(term.lower() in lowered for term in terms)


def load_lifecycle() -> dict[str, Any]:
    data = load_yaml(".agent/state/lifecycle.yaml")
    require(isinstance(data, dict), "lifecycle.yaml must be a mapping")
    return data


def load_phase_contracts() -> dict[str, Any]:
    data = load_yaml(".agent/pjsdlc_managed/policies/phase_contracts.yaml")
    require(isinstance(data, dict) and isinstance(data.get("phases"), dict), "phase_contracts.yaml must contain phases")
    return data["phases"]


def load_plan(path: str = ".agent/state/plan.yaml") -> dict[str, Any]:
    data = load_yaml(path)
    require(isinstance(data, dict), f"{path} must be a mapping")
    tasks = data.get("tasks", [])
    require(isinstance(tasks, list), f"{path} must contain a tasks list")
    return data


def validate_task_shape(task: dict[str, Any], index: int) -> None:
    prefix = f"Task #{index + 1}"
    for field in ["id", "title", "status", "summary", "implementation_doc"]:
        require(field in task, f"{prefix} missing field: {field}")
    require(task["status"] in TASK_STATUSES, f"{task.get('id', prefix)} has invalid status: {task.get('status')}")
    require(isinstance(task["summary"], str) and task["summary"].strip(), f"{task['id']} must define summary")
    if task["status"] in OPEN_TASK_STATUSES:
        for field in ["docs", "allowed_paths", "required_gates", "acceptance_criteria"]:
            require(field in task, f"{task['id']} open task missing field: {field}")
        require(isinstance(task["docs"], dict), f"{task['id']} docs must be a mapping")
        require(isinstance(task["allowed_paths"], list) and task["allowed_paths"], f"{task['id']} must define allowed_paths")
        require(isinstance(task["required_gates"], list) and task["required_gates"], f"{task['id']} must define required_gates")
        require(isinstance(task["acceptance_criteria"], list) and task["acceptance_criteria"], f"{task['id']} must define acceptance_criteria")
    else:
        for field in ["docs", "allowed_paths", "required_gates", "acceptance_criteria", "working_notes"]:
            require(field not in task, f"{task['id']} closed task must not retain {field}")


def expand_harness_root(patterns: list[str], root: str = ".agent") -> list[str]:
    return [str(pattern).replace("<harnessRoot>", root) for pattern in patterns]


def task_by_id(plan_data: dict[str, Any], task_id: str) -> dict[str, Any] | None:
    for task in plan_data.get("tasks", []):
        if isinstance(task, dict) and task.get("id") == task_id:
            return task
    return None


def changed_files() -> list[str]:
    files: set[str] = set()
    commands = [
        ["git", "diff", "--name-only"],
        ["git", "diff", "--cached", "--name-only"],
        ["git", "ls-files", "--others", "--exclude-standard"],
    ]
    for command in commands:
        proc = subprocess.run(command, cwd=ROOT, text=True, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
        if proc.returncode == 0:
            files.update(line.strip() for line in proc.stdout.splitlines() if line.strip())
    return sorted(files)


def matches_any(path: str, patterns: list[str]) -> bool:
    normalized = path.replace("\\", "/")
    for pattern in patterns:
        clean = str(pattern).replace("\\", "/")
        if fnmatch.fnmatch(normalized, clean) or fnmatch.fnmatch(normalized, clean.rstrip("/") + "/**"):
            return True
    return False


def now_utc() -> str:
    return _dt.datetime.now(_dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def append_gate_result(phase: str, gate: str, result: str, note: str = "") -> None:
    line = f"{now_utc()} phase={phase} gate={json.dumps(gate)} result={result}"
    if note:
        line += f" note={json.dumps(note, ensure_ascii=False)}"
    with repo_path(".agent/state/gate_results.log").open("a", encoding="utf-8") as handle:
        handle.write(line + "\n")


def run_main(main) -> None:
    try:
        main()
    except HarnessError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)


def make_arg_parser(description: str) -> argparse.ArgumentParser:
    return argparse.ArgumentParser(description=description)
