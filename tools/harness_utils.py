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
PARALLEL_TRIGGERS = {"user_requested", "workflow_default"}
PARALLEL_RUNTIME_PROVIDERS = {"codex_native_subagents", "user_orchestrated", "codex_exec_worktree"}
PARALLEL_ALLOWED_PHASES = {
    "REQUIREMENT_GATHERING",
    "ARCHITECTING",
    "SPRINTING",
    "REVIEWING",
    "TESTING",
    "RELEASING",
    "RFC_RECALIBRATION",
}
PARALLEL_READ_ONLY_PHASES = {"REQUIREMENT_GATHERING", "ARCHITECTING", "REVIEWING", "RELEASING", "RFC_RECALIBRATION"}
PARALLEL_PROTECTED_WRITE_PATTERNS = {
    ".codex/state/**",
    "<harnessRoot>/state/**",
    ".docs/INDEX.md",
    ".docs/**/overview.md",
    ".docs/04_implementation/**",
    ".docs/06_review/**",
    ".docs/08_release/**",
}
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


EVIDENCE_PLACEHOLDER_TERMS = ["pending", "tbd", "todo", "placeholder", "待填", "待补", "待确认"]
APPLICATION_READINESS_TASK_TERMS = [
    "service",
    "agent",
    "runtime",
    "http",
    "server",
    "worker",
    "provider",
    "adapter",
    "live mode",
    "live",
    "external integration",
    "webhook",
    "bot",
    "机器人",
    "常驻",
    "云端",
    "入口",
    "出口",
]
PAGE_TASK_TERMS = ["frontend", "front-end", "browser", "page", "页面", "前端", "按钮", "表单", "跳转"]
CALLABLE_TASK_TERMS = [
    "api",
    "endpoint",
    "cli",
    "command",
    "worker",
    "route",
    "server action",
    "adapter",
    "provider",
    "rpa",
    "bot",
    "机器人",
    "队列",
]
SELF_TEST_CONTRACT_STATUSES = {"required", "not_applicable"}
RESUME_CAPSULE_REQUIRED_EVIDENCE_LEVELS = {"external_provider_live", "deployed_runtime", "business_handoff_ready"}
RESUME_CAPSULE_REQUIRED_TARGET_KINDS = {"cloud_vm", "managed_service", "browser", "worker"}
RESUME_CAPSULE_FIELDS = [
    "task_id",
    "state",
    "canonical_path",
    "next_step",
    "blocker",
    "last_passed_gate",
    "do_not_retry",
    "recovery_refs",
]
RUNBOOK_DOC_PREFIX = ".docs/09_runbooks/"
MAX_WORKING_NOTES = 8


def as_string_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str) and value.strip():
        return [value.strip()]
    return []


def is_placeholder_evidence(value: str) -> bool:
    normalized = value.strip().lower()
    if not normalized or normalized in {"-", "n/a", "na", "none", "null", "不适用", "无"}:
        return True
    return any(term == normalized or term in normalized for term in EVIDENCE_PLACEHOLDER_TERMS)


def task_text_for_contract(task: dict[str, Any]) -> str:
    parts = [str(task.get(key) or "") for key in ["id", "title", "summary", "phase"] if task.get(key)]
    docs = task.get("docs")
    if isinstance(docs, dict):
        for value in docs.values():
            parts.extend(as_string_list(value))
    return "\n".join(parts)


def needs_runnable_task_contract(task: dict[str, Any]) -> bool:
    if task.get("phase") != "SPRINTING":
        return False
    evidence_level = task.get("evidence_level")
    target_runtime = task.get("target_runtime_environment")
    if (
        isinstance(evidence_level, dict)
        and isinstance(target_runtime, dict)
        and evidence_level.get("required") == "unit"
        and target_runtime.get("kind") == "not_applicable"
    ):
        return False
    context = task_text_for_contract(task).lower()
    return contains_any(context, APPLICATION_READINESS_TASK_TERMS + PAGE_TASK_TERMS + CALLABLE_TASK_TERMS)


def requires_resume_capsule(task: dict[str, Any]) -> bool:
    if task.get("phase") != "SPRINTING":
        return False
    evidence_level = task.get("evidence_level")
    target_runtime = task.get("target_runtime_environment")
    required = str(evidence_level.get("required") or "") if isinstance(evidence_level, dict) else ""
    kind = str(target_runtime.get("kind") or "") if isinstance(target_runtime, dict) else ""
    return required in RESUME_CAPSULE_REQUIRED_EVIDENCE_LEVELS or kind in RESUME_CAPSULE_REQUIRED_TARGET_KINDS


def self_test_contract_errors_for_task(task: dict[str, Any]) -> list[str]:
    task_id = str(task.get("id") or "Task")
    required_for_runnable = needs_runnable_task_contract(task)
    contract = task.get("self_test_contract")
    errors: list[str] = []
    if required_for_runnable and not isinstance(contract, dict):
        return [f"{task_id} runtime/app task must define self_test_contract"]
    if contract is None:
        return []
    if not isinstance(contract, dict):
        return [f"{task_id} self_test_contract must be a mapping"]

    status = str(contract.get("status") or "")
    if status not in SELF_TEST_CONTRACT_STATUSES:
        errors.append(f"{task_id} self_test_contract.status must be required or not_applicable")
    if required_for_runnable and status != "required":
        errors.append(f"{task_id} runnable boundary task self_test_contract.status must be required")

    if status == "not_applicable":
        reason = str(contract.get("not_applicable_reason") or "").strip()
        if len(reason) < 24 or is_placeholder_evidence(reason):
            errors.append(f"{task_id} self_test_contract.not_applicable_reason must explain why self-test is not applicable")
        return errors
    if status != "required":
        return errors

    for field in ["source", "runnable_entry", "observable_exit", "module_key_test_path"]:
        value = str(contract.get(field) or "").strip()
        if not value or is_placeholder_evidence(value):
            errors.append(f"{task_id} self_test_contract.{field} must be concrete")
    if not as_string_list(contract.get("capability_refs")):
        errors.append(f"{task_id} self_test_contract.capability_refs must be a non-empty list")

    required_gates = as_string_list(contract.get("required_gates"))
    if not required_gates:
        errors.append(f"{task_id} self_test_contract.required_gates must be a non-empty list")
    task_gates = set(as_string_list(task.get("required_gates")))
    for gate in required_gates:
        if gate not in task_gates:
            errors.append(f"{task_id} self_test_contract.required_gates must also appear in task required_gates: {gate}")

    scenarios = contract.get("scenarios")
    if not isinstance(scenarios, list) or not scenarios:
        errors.append(f"{task_id} self_test_contract.scenarios must be a non-empty list")
        return errors
    seen: set[str] = set()
    for index, scenario in enumerate(scenarios):
        if not isinstance(scenario, dict):
            errors.append(f"{task_id} self_test_contract.scenarios[{index}] must be a mapping")
            continue
        scenario_id = str(scenario.get("id") or "").strip()
        if not scenario_id:
            errors.append(f"{task_id} self_test_contract.scenarios[{index}].id must be set")
        elif scenario_id in seen:
            errors.append(f"{task_id} self_test_contract scenario id must be unique: {scenario_id}")
        seen.add(scenario_id)
        for field in ["entry", "expected_exit", "evidence"]:
            value = str(scenario.get(field) or "").strip()
            if not value or is_placeholder_evidence(value):
                errors.append(f"{task_id} self_test_contract.scenarios[{scenario_id or index}].{field} must be concrete")
    return errors


TESTING_DISALLOWED_ALLOWED_PATHS = [
    "package.json",
    "**/package.json",
    "package-lock.json",
    "**/package-lock.json",
    "npm-shrinkwrap.json",
    "**/npm-shrinkwrap.json",
    "pnpm-lock.yaml",
    "**/pnpm-lock.yaml",
    "yarn.lock",
    "**/yarn.lock",
    "bun.lock",
    "**/bun.lock",
    "bun.lockb",
    "**/bun.lockb",
    "src/**",
    "app/**",
    "lib/**",
    "server/**",
    "bin/**",
    "cli/**",
    "runtime/**",
    "scripts/**",
    "tools/**",
    "deploy/**",
    "deployment/**",
    "infra/**",
    "ops/**",
    "systemd/**",
    ".github/workflows/**",
    "dockerfile",
    "dockerfile.*",
    "docker-compose*.yml",
    "docker-compose*.yaml",
    "*.service",
    "tests/runtime/**",
    "tests/**/runtime/**",
]

TESTING_DISALLOWED_CHANGED_PATHS = TESTING_DISALLOWED_ALLOWED_PATHS + [
    "scripts/**",
    "tools/**",
]

TESTING_RUNTIME_FILE_TERMS = [
    "bootstrap",
    "cloud",
    "daemon",
    "poller",
    "provider",
    "runtime",
    "service",
    "systemd",
]

TESTING_ALLOWED_TEST_FILE_TERMS = [
    "assertion",
    "fixture",
    "mock",
    "smoke",
]

TEST_FACT_SOURCE_PHASES = {"TESTING", "RFC_RECALIBRATION"}
TEST_FACT_SOURCE_PATTERNS = [".docs/07_test/**", ".docs/07_test/"]


def test_fact_source_errors_for_task(task: dict[str, Any]) -> list[str]:
    phase = str(task.get("phase") or "")
    if phase in TEST_FACT_SOURCE_PHASES:
        return []
    candidates = [str(path) for path in task.get("allowed_paths") or []]
    candidates.extend(str(path) for path in task.get("result_docs") or [])
    blocked = [
        path
        for path in candidates
        if matches_any(path.replace("\\", "/"), TEST_FACT_SOURCE_PATTERNS)
        or path.replace("\\", "/").startswith(".docs/07_test/")
    ]
    if not blocked:
        return []
    return [
        "Only TESTING or RFC_RECALIBRATION tasks may target current test fact sources under .docs/07_test/**: "
        + ", ".join(blocked)
    ]


def testing_boundary_errors_for_allowed_paths(task: dict[str, Any]) -> list[str]:
    if task.get("phase") != "TESTING":
        return []
    blocked = []
    for raw_path in task.get("allowed_paths") or []:
        path = str(raw_path)
        lowered = path.lower()
        if matches_any(lowered, TESTING_DISALLOWED_ALLOWED_PATHS) or lowered in {
            "package.json",
            "package-lock.json",
            "pnpm-lock.yaml",
            "yarn.lock",
            "bun.lock",
            "bun.lockb",
        }:
            blocked.append(path)
    if not blocked:
        return []
    return [
        "TESTING task allowed_paths must not include product runtime, package/deploy config, or long-running runtime paths: "
        + ", ".join(blocked)
    ]


def testing_boundary_errors_for_changed_files(files: list[str]) -> list[str]:
    blocked = [path for path in files if is_testing_runtime_boundary_change(path)]
    if not blocked:
        return []
    return [
        "TESTING changes must use existing product entrypoints only; move runtime, bootstrap, provider, deploy, or package script changes to SPRINTING/RFC: "
        + ", ".join(blocked)
    ]


def is_testing_runtime_boundary_change(path: str) -> bool:
    normalized = path.replace("\\", "/")
    lowered = normalized.lower()
    if matches_any(lowered, TESTING_DISALLOWED_CHANGED_PATHS):
        return True
    if lowered.startswith("tests/"):
        name = Path(lowered).name
        if any(term in name for term in TESTING_ALLOWED_TEST_FILE_TERMS):
            return False
        return any(term in name for term in TESTING_RUNTIME_FILE_TERMS)
    return False


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
    for error in test_fact_source_errors_for_task(task):
        require(False, f"{task['id']} {error}")
    if task["status"] in OPEN_TASK_STATUSES:
        require("gate_result" not in task, f"{task['id']} open task must not define gate_result")
        for field in ["docs", "allowed_paths", "required_gates", "acceptance_criteria"]:
            require(field in task, f"{task['id']} open task missing field: {field}")
        require(isinstance(task["docs"], dict), f"{task['id']} docs must be a mapping")
        require(isinstance(task["allowed_paths"], list) and task["allowed_paths"], f"{task['id']} must define allowed_paths")
        require(isinstance(task["required_gates"], list) and task["required_gates"], f"{task['id']} must define required_gates")
        require(isinstance(task["acceptance_criteria"], list) and task["acceptance_criteria"], f"{task['id']} must define acceptance_criteria")
        if "working_notes" in task:
            require(
                isinstance(task["working_notes"], (list, str)),
                f"{task['id']} working_notes must be a short string or list with at most {MAX_WORKING_NOTES} items",
            )
            note_count = len(task["working_notes"]) if isinstance(task["working_notes"], list) else (1 if str(task["working_notes"]).strip() else 0)
            require(
                note_count <= MAX_WORKING_NOTES,
                f"{task['id']} working_notes must stay resume-first and contain at most {MAX_WORKING_NOTES} items; found {note_count}",
            )
        for error in self_test_contract_errors_for_task(task):
            require(False, error)
        for error in testing_boundary_errors_for_allowed_paths(task):
            require(False, f"{task['id']} {error}")
    else:
        for field in ["docs", "allowed_paths", "required_gates", "acceptance_criteria", "working_notes", "gate_result", "result_docs"]:
            require(field not in task, f"{task['id']} closed task must not retain {field}")


def task_sequence_number(task_id: str) -> int:
    match = TASK_ID_PATTERN.match(task_id)
    return int(match.group(1)) if match else 0


def validate_resume_capsule_contract(data: dict[str, Any]) -> None:
    current_task_id = str(data.get("current_task_id") or "")
    current_task = task_by_id(data, current_task_id) if current_task_id else None
    if not current_task or current_task.get("status") not in OPEN_TASK_STATUSES or current_task.get("phase") != "SPRINTING":
        require("resume_capsule" not in data, "plan.yaml resume_capsule must only be present for the current open SPRINTING task")
        return

    capsule = data.get("resume_capsule")
    if not requires_resume_capsule(current_task):
        if capsule is not None:
            require(isinstance(capsule, dict), f"{current_task_id} resume_capsule must be a mapping when present")
        return

    require(isinstance(capsule, dict), f"{current_task_id} high-risk runtime task must define top-level resume_capsule")
    for field in RESUME_CAPSULE_FIELDS:
        require(field in capsule, f"{current_task_id} resume_capsule missing field: {field}")

    require(str(capsule.get("task_id") or "").strip() == current_task_id, f"{current_task_id} resume_capsule.task_id must match current_task_id")
    for field in ["state", "canonical_path", "next_step", "blocker", "last_passed_gate"]:
        value = str(capsule.get(field) or "").strip()
        require(value and not is_placeholder_evidence(value), f"{current_task_id} resume_capsule.{field} must contain concrete recovery information")

    do_not_retry = as_string_list(capsule.get("do_not_retry"))
    require(
        do_not_retry and not any(is_placeholder_evidence(item) for item in do_not_retry),
        f"{current_task_id} resume_capsule.do_not_retry must list concrete paths or attempts not to repeat",
    )

    refs = as_string_list(capsule.get("recovery_refs"))
    require(refs, f"{current_task_id} resume_capsule.recovery_refs must link implementation doc and runbook/evidence documents")
    implementation_doc = str(current_task.get("implementation_doc") or "").strip()
    if implementation_doc:
        require(
            implementation_doc in refs,
            f"{current_task_id} resume_capsule.recovery_refs must include current implementation_doc {implementation_doc}",
        )
    require(
        any(ref.startswith(RUNBOOK_DOC_PREFIX) for ref in refs),
        f"{current_task_id} resume_capsule.recovery_refs must include a runbook/evidence document under {RUNBOOK_DOC_PREFIX}",
    )
    for ref in refs:
        require(
            ref.startswith(".docs/04_implementation/") or ref.startswith(RUNBOOK_DOC_PREFIX),
            f"{current_task_id} resume_capsule.recovery_refs may only point to implementation docs or runbook/evidence docs: {ref}",
        )
        require(repo_path(ref).exists(), f"{current_task_id} resume_capsule recovery_ref does not exist: {ref}")


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
    validate_resume_capsule_contract(data)

    open_tasks = [task.get("id") for task in tasks if task.get("status") in OPEN_TASK_STATUSES]
    if not allow_open:
        require(not open_tasks, f"Open tasks remain: {', '.join(open_tasks)}")


def validate_parallel_execution_contract(data: dict[str, Any], current_phase: str) -> None:
    contract = data.get("parallel_execution")
    if contract is None:
        return

    require(isinstance(contract, dict), "parallel_execution must be a mapping")
    require(contract.get("enabled") is True, "parallel_execution.enabled must be true when present")
    require(contract.get("trigger") in PARALLEL_TRIGGERS, "parallel_execution.trigger must be user_requested or workflow_default")
    require(contract.get("mode") in PARALLEL_MODES, "parallel_execution.mode must be runtime_managed or user_orchestrated")
    provider = parallel_runtime_provider(contract)
    if provider:
        require(provider in PARALLEL_RUNTIME_PROVIDERS, "parallel_execution.runtime.provider must be codex_native_subagents, user_orchestrated, or codex_exec_worktree")
    if contract.get("trigger") == "workflow_default":
        require(provider == "codex_native_subagents", 'parallel_execution.runtime.provider must be "codex_native_subagents" when trigger is workflow_default')
    require("phase" not in contract, "parallel_execution must not define phase; lifecycle.yaml is the single source for current_phase")
    require("linked_task_id" not in contract, "parallel_execution must not define linked_task_id; use plan.yaml current_task_id")
    require(
        current_phase in PARALLEL_ALLOWED_PHASES,
        "parallel_execution is only supported during REQUIREMENT_GATHERING, ARCHITECTING, SPRINTING, REVIEWING, TESTING, RELEASING, or RFC_RECALIBRATION",
    )
    require(contract.get("coordinator") == "main_agent", 'parallel_execution.coordinator must be "main_agent"')

    if current_phase == "SPRINTING":
        require(data.get("current_task_id"), "SPRINTING parallel_execution requires plan.yaml current_task_id")

    workers = contract.get("workers")
    require(isinstance(workers, list) and workers, "parallel_execution.workers must be a non-empty list")
    seen_ids: set[str] = set()
    write_owned_paths: list[tuple[int, str]] = []
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
        if current_phase in PARALLEL_READ_ONLY_PHASES:
            require(worker.get("writes_repo") is False, f"{prefix}.writes_repo must be false during {current_phase}")
        if worker.get("writes_repo") is True:
            if provider != "codex_native_subagents":
                require(isinstance(worker.get("branch"), str) and worker["branch"].strip(), f"{prefix}.branch is required when writes_repo is true outside codex_native_subagents runtime")
                require(isinstance(worker.get("worktree"), str) and worker["worktree"].strip(), f"{prefix}.worktree is required when writes_repo is true outside codex_native_subagents runtime")
            require(worker.get("owned_paths"), f"{prefix}.owned_paths must not be empty when writes_repo is true")
            validate_parallel_worker_path_lock(data, worker, index)
            for owned in expand_harness_root(list(worker.get("owned_paths") or [])):
                write_owned_paths.append((index, owned))

    for left_pos, (left_index, left_path) in enumerate(write_owned_paths):
        for right_index, right_path in write_owned_paths[left_pos + 1 :]:
            require(
                not glob_patterns_overlap(left_path, right_path),
                f"parallel_execution write worker owned_paths must not overlap: workers[{left_index}] {left_path} vs workers[{right_index}] {right_path}",
            )

    integration = contract.get("integration")
    require(isinstance(integration, dict), "parallel_execution.integration must be a mapping")
    require(integration.get("owner") == "main_agent", 'parallel_execution.integration.owner must be "main_agent"')
    require(isinstance(integration.get("merge_strategy"), str) and integration["merge_strategy"].strip(), "parallel_execution.integration.merge_strategy must be a non-empty string")
    require(isinstance(integration.get("required_gates"), list) and integration["required_gates"], "parallel_execution.integration.required_gates must be a non-empty list")
    require(isinstance(integration.get("fact_source_updates"), list) and integration["fact_source_updates"], "parallel_execution.integration.fact_source_updates must be a non-empty list")


def parallel_runtime_provider(contract: dict[str, Any]) -> str:
    runtime = contract.get("runtime")
    if runtime is None:
        return ""
    require(isinstance(runtime, dict), "parallel_execution.runtime must be a mapping when present")
    provider = runtime.get("provider")
    return str(provider or "")


def validate_parallel_worker_path_lock(data: dict[str, Any], worker: dict[str, Any], index: int) -> None:
    current_task = task_by_id(data, str(data.get("current_task_id") or ""))
    if current_task is None:
        return
    task_allowed = expand_harness_root(list(current_task.get("allowed_paths") or []))
    worker_owned = expand_harness_root(list(worker.get("owned_paths") or []))
    worker_forbidden = expand_harness_root(list(worker.get("forbidden_paths") or []))
    protected = expand_harness_root(list(PARALLEL_PROTECTED_WRITE_PATTERNS))
    prefix = f"parallel_execution.workers[{index}]"
    for owned in worker_owned:
        require(matches_any(owned, task_allowed), f"{prefix}.owned_paths must be within current task allowed_paths: {owned}")
        for forbidden in [*worker_forbidden, *protected]:
            require(not glob_patterns_overlap(owned, forbidden), f"{prefix}.owned_paths must not overlap forbidden paths: {owned} vs {forbidden}")


def glob_prefix(pattern: str) -> str:
    normalized = pattern.replace("\\", "/").replace("<harnessRoot>", ".codex")
    wildcard_positions = [pos for pos in (normalized.find("*"), normalized.find("["), normalized.find("?")) if pos >= 0]
    if wildcard_positions:
        normalized = normalized[: min(wildcard_positions)]
    return normalized.rstrip("/")


def glob_patterns_overlap(left: str, right: str) -> bool:
    left_clean = left.replace("\\", "/").replace("<harnessRoot>", ".codex")
    right_clean = right.replace("\\", "/").replace("<harnessRoot>", ".codex")
    if fnmatch.fnmatch(left_clean, right_clean) or fnmatch.fnmatch(right_clean, left_clean):
        return True
    left_prefix = glob_prefix(left_clean)
    right_prefix = glob_prefix(right_clean)
    if not left_prefix or not right_prefix:
        return left_prefix == right_prefix
    return left_prefix.startswith(right_prefix + "/") or right_prefix.startswith(left_prefix + "/") or left_prefix == right_prefix


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
