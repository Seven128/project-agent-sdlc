#!/usr/bin/env python3
from __future__ import annotations

import argparse
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
PARALLEL_MODES = {"runtime_managed", "user_orchestrated"}
PARALLEL_ALLOWED_PHASES = {"REQUIREMENT_GATHERING", "SPRINTING", "TESTING"}
TASK_ID_PATTERN = re.compile(r"^[A-Z]+-(\d+)$")
TASK_PHASES = {
    "REQUIREMENT_GATHERING",
    "ARCHITECTING",
    "SPRINTING",
    "REVIEWING",
    "TESTING",
    "RELEASING",
    "RFC_RECALIBRATION",
}


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
        if path.name.upper() not in {"README.MD", "OVERVIEW.MD"} and not path.name.startswith(".")
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
    data = load_yaml(".codex/state/lifecycle.yaml")
    require(isinstance(data, dict), "lifecycle.yaml must be a mapping")
    return data


def load_phase_contracts() -> dict[str, Any]:
    data = load_yaml(".codex/pjsdlc_managed/policies/phase_contracts.yaml")
    require(isinstance(data, dict) and isinstance(data.get("phases"), dict), "phase_contracts.yaml must contain phases")
    return data["phases"]


def load_plan(path: str = ".codex/state/plan.yaml") -> dict[str, Any]:
    data = load_yaml(path)
    require(isinstance(data, dict), f"{path} must be a mapping")
    tasks = data.get("tasks", [])
    require(isinstance(tasks, list), f"{path} must contain a tasks list")
    return data


def validate_task_shape(task: dict[str, Any], index: int) -> None:
    prefix = f"Task #{index + 1}"
    for field in ["id", "title", "status", "summary"]:
        require(field in task, f"{prefix} missing field: {field}")
    task_id = str(task.get("id") or "")
    require(TASK_ID_PATTERN.match(task_id), f"{task_id or prefix} id must match PREFIX-###")
    if task_id.startswith("TASK-"):
        require(task.get("phase") in TASK_PHASES, f"{task_id} must define valid phase")
    elif task.get("phase") is not None:
        require(task.get("phase") in TASK_PHASES, f"{task_id} has invalid phase: {task.get('phase')}")
    require(task["status"] in TASK_STATUSES, f"{task.get('id', prefix)} has invalid status: {task.get('status')}")
    require(isinstance(task["summary"], str) and task["summary"].strip(), f"{task['id']} must define summary")
    has_implementation_doc = isinstance(task.get("implementation_doc"), str) and task["implementation_doc"].strip()
    has_result_docs = isinstance(task.get("result_docs"), list) and bool(task["result_docs"])
    require(has_implementation_doc or has_result_docs, f"{task['id']} must define implementation_doc or result_docs")
    if task["status"] in OPEN_TASK_STATUSES:
        require("gate_result" not in task, f"{task['id']} open task must not define gate_result")
        for field in ["docs", "allowed_paths", "required_gates", "acceptance_criteria"]:
            require(field in task, f"{task['id']} open task missing field: {field}")
        require(isinstance(task["docs"], dict), f"{task['id']} docs must be a mapping")
        require(isinstance(task["allowed_paths"], list) and task["allowed_paths"], f"{task['id']} must define allowed_paths")
        require(isinstance(task["required_gates"], list) and task["required_gates"], f"{task['id']} must define required_gates")
        require(isinstance(task["acceptance_criteria"], list) and task["acceptance_criteria"], f"{task['id']} must define acceptance_criteria")
    else:
        for field in ["docs", "allowed_paths", "required_gates", "acceptance_criteria", "working_notes", "gate_result", "result_docs"]:
            require(field not in task, f"{task['id']} closed task must not retain {field}")


def task_sequence_number(task_id: str) -> int:
    match = TASK_ID_PATTERN.match(task_id)
    return int(match.group(1)) if match else 0


def validate_plan_contract(data: dict[str, Any], allow_open: bool) -> None:
    lifecycle = load_lifecycle()
    current_phase = str(lifecycle.get("current_phase") or "")
    require("current_phase" not in data, "plan.yaml must not define current_phase; lifecycle.yaml is the single source for current_phase")
    validate_parallel_execution_contract(data, current_phase)
    tasks = data.get("tasks", [])
    next_task_sequence = data.get("next_task_sequence")
    require(isinstance(next_task_sequence, int) and next_task_sequence > 0, "plan.yaml must define positive integer next_task_sequence")

    for index, task in enumerate(tasks):
        require(isinstance(task, dict), f"Task #{index + 1} must be a mapping")
        validate_task_shape(task, index)
        require(task.get("status") in OPEN_TASK_STATUSES, f"Completed task {task.get('id')} must not remain in plan.yaml")

    max_sequence = 0
    for task in tasks:
        task_id = str(task.get("id") or "")
        max_sequence = max(max_sequence, task_sequence_number(task_id))
    require(next_task_sequence > max_sequence, "next_task_sequence must be greater than task ids currently in plan.yaml")

    current_task_id = data.get("current_task_id") or ""
    if current_task_id:
        require(task_by_id(data, current_task_id), f"current_task_id does not match a task: {current_task_id}")

    open_tasks = [task.get("id") for task in tasks if task.get("status") in OPEN_TASK_STATUSES]
    if not allow_open:
        require(not open_tasks, f"Open tasks remain: {', '.join(open_tasks)}")


def validate_parallel_execution_contract(data: dict[str, Any], current_phase: str) -> None:
    contract = data.get("parallel_execution")
    if contract is None:
        return

    require(isinstance(contract, dict), "parallel_execution must be a mapping")
    require(contract.get("enabled") is True, "parallel_execution.enabled must be true when present")
    require(contract.get("trigger") == "user_requested", 'parallel_execution.trigger must be "user_requested"')
    require(contract.get("mode") in PARALLEL_MODES, "parallel_execution.mode must be runtime_managed or user_orchestrated")
    require("phase" not in contract, "parallel_execution must not define phase; lifecycle.yaml is the single source for current_phase")
    require("linked_task_id" not in contract, "parallel_execution must not define linked_task_id; use plan.yaml current_task_id")
    require(current_phase in PARALLEL_ALLOWED_PHASES, "parallel_execution is only supported during REQUIREMENT_GATHERING, SPRINTING, or TESTING")
    require(contract.get("coordinator") == "main_agent", 'parallel_execution.coordinator must be "main_agent"')

    if current_phase == "SPRINTING":
        require(data.get("current_task_id"), "SPRINTING parallel_execution requires plan.yaml current_task_id")

    workers = contract.get("workers")
    require(isinstance(workers, list) and workers, "parallel_execution.workers must be a non-empty list")
    seen_ids: set[str] = set()
    for index, worker in enumerate(workers):
        prefix = f"parallel_execution.workers[{index}]"
        require(isinstance(worker, dict), f"{prefix} must be a mapping")
        worker_id = worker.get("id")
        require(isinstance(worker_id, str) and worker_id.strip(), f"{prefix}.id must be a non-empty string")
        require(worker_id not in seen_ids, f"parallel_execution worker id must be unique: {worker_id}")
        seen_ids.add(worker_id)
        require(isinstance(worker.get("writes_repo"), bool), f"{prefix}.writes_repo must be a boolean")
        for field in ["owned_paths", "forbidden_paths", "expected_output", "required_gates"]:
            require(isinstance(worker.get(field), list), f"{prefix}.{field} must be a list")
        require(worker.get("expected_output"), f"{prefix}.expected_output must not be empty")
        require(worker.get("required_gates"), f"{prefix}.required_gates must not be empty")
        if worker.get("writes_repo") is True:
            require(isinstance(worker.get("branch"), str) and worker["branch"].strip(), f"{prefix}.branch is required when writes_repo is true")
            require(isinstance(worker.get("worktree"), str) and worker["worktree"].strip(), f"{prefix}.worktree is required when writes_repo is true")
            require(worker.get("owned_paths"), f"{prefix}.owned_paths must not be empty when writes_repo is true")

    integration = contract.get("integration")
    require(isinstance(integration, dict), "parallel_execution.integration must be a mapping")
    require(integration.get("owner") == "main_agent", 'parallel_execution.integration.owner must be "main_agent"')
    require(isinstance(integration.get("merge_strategy"), str) and integration["merge_strategy"].strip(), "parallel_execution.integration.merge_strategy must be a non-empty string")
    require(isinstance(integration.get("required_gates"), list) and integration["required_gates"], "parallel_execution.integration.required_gates must be a non-empty list")
    require(isinstance(integration.get("fact_source_updates"), list) and integration["fact_source_updates"], "parallel_execution.integration.fact_source_updates must be a non-empty list")


def expand_harness_root(patterns: list[str], root: str = ".codex") -> list[str]:
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


def run_main(main) -> None:
    try:
        main()
    except HarnessError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)


def make_arg_parser(description: str) -> argparse.ArgumentParser:
    return argparse.ArgumentParser(description=description)
