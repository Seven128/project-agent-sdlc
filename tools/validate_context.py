#!/usr/bin/env python3
"""Standalone Minimal Context validator installed with the portable profile."""

from pathlib import Path, PureWindowsPath
import json
import os
import re
import subprocess
import sys
import unicodedata

try:
    import tomllib
except ImportError:  # Python 3.10 compatibility; Node is already required by ty-context.
    tomllib = None


ROOT = Path.cwd().resolve()
CONTEXT_ROOT = ROOT / "project_context"

# The portable validator is a UTF-8 command-line surface on every supported
# platform.  Windows pipe encodings otherwise depend on the active locale and
# can corrupt the canonical NFC paths that TypeScript and Python are required
# to report identically.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="strict")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="strict")


def load_context_rules():
    rules_path = Path(__file__).resolve().with_name("context_rules.json")
    try:
        value = json.loads(rules_path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as error:
        raise RuntimeError(f"unable to load portable Context rules from {rules_path.name}: {error}") from error
    required_arrays = (
        "roles",
        "read_policies",
        "legacy_read_policies",
        "top_level_fields",
        "area_fields",
        "context_fields",
    )
    for field in required_arrays:
        entries = value.get(field)
        if (
            not isinstance(entries, list)
            or any(not isinstance(entry, str) or not entry.strip() for entry in entries)
            or len(entries) != len(set(entries))
        ):
            raise RuntimeError(f"portable Context rules field {field} must contain unique non-empty strings")
    aliases = value.get("role_aliases")
    if not isinstance(aliases, dict) or any(
        not isinstance(key, str)
        or not key.strip()
        or not isinstance(target, str)
        or target not in value["roles"]
        for key, target in aliases.items()
    ):
        raise RuntimeError("portable Context rules role_aliases are invalid")
    if any(policy not in value["read_policies"] for policy in value["legacy_read_policies"]):
        raise RuntimeError("portable Context legacy read policies must be a subset of read_policies")
    return value


CONTEXT_RULES = load_context_rules()

GLOBAL_CHECKS = [
    ("project goal", ["project goal", "项目目标", "目标"]),
    ("boundaries", ["non-goals", "boundaries", "非目标", "边界"]),
    ("design rationale", ["design rationale", "设计思路", "设计原因"]),
    ("architecture context", ["architecture context", "架构上下文", "architecture.md"]),
    ("verification entry points", ["verification entry", "验证入口", "测试入口"]),
    ("current state", ["current state", "当前状态"]),
    ("next safe action", ["next safe action", "下一步安全动作"]),
    ("context index", ["context index", "module index", "上下文索引", "模块索引"]),
]

ARCHITECTURE_CHECKS = [
    ("system boundary", ["system boundary", "系统边界", "边界"]),
    ("component map", ["component map", "组件", "模块关系"]),
    ("data or control flow", ["data / control flow", "data flow", "control flow", "数据流", "控制流"]),
    ("design rationale", ["design rationale", "设计思路", "设计原因"]),
    ("verification implications", ["verification implications", "验证影响", "验证入口"]),
]

VALID_ROLES = set(CONTEXT_RULES["roles"])
ROLE_ALIASES = CONTEXT_RULES["role_aliases"]
READ_POLICIES = set(CONTEXT_RULES["read_policies"])
LEGACY_READ_POLICIES = set(CONTEXT_RULES["legacy_read_policies"])
TOP_LEVEL_FIELDS = set(CONTEXT_RULES["top_level_fields"])
AREA_FIELDS = set(CONTEXT_RULES["area_fields"])
CONTEXT_FIELDS = set(CONTEXT_RULES["context_fields"])
CONFIG_CANDIDATES = [
    ".agent/config.yaml",
    ".codex/config.yaml",
    ".harness/config.yaml",
    ".claude/config.yaml",
    ".cursor/config.yaml",
    ".cline/config.yaml",
    ".roo/config.yaml",
    ".gemini/config.yaml",
]
FAKE_VERIFICATION_PATTERNS = [
    re.compile(r"\btests?\s+(?:pass(?:ed|es)?|green)\b", re.I),
    re.compile(r"\bverified\b", re.I),
    re.compile(r"\bdeployed\s+successfully\b", re.I),
    re.compile(r"\bvalidation\s+passed\b", re.I),
    re.compile(r"测试(?:已)?通过"),
    re.compile(r"验证(?:已)?通过"),
    re.compile(r"部署(?:已)?成功"),
]
PLACEHOLDER = re.compile(r"^(?:todo|tbd|placeholder|coming soon|待补充|占位|暂无)[.!。…\s-]*$", re.I)


def has_any(text, terms):
    lower = text.lower()
    return any(term.lower() in lower for term in terms)


def normalize_role(value):
    role = ROLE_ALIASES.get(value.strip().lower(), value.strip().lower())
    return role if role in VALID_ROLES else None


def normalize_context_path_spelling(value):
    return value.replace("\\", "/").removeprefix("./")


def normalize_context_path(value):
    return unicodedata.normalize("NFC", normalize_context_path_spelling(value))


def portable_context_path_case_key(value):
    return normalize_context_path(value).lower()


def parse_front_matter(text):
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return {}
    result = {}
    for line in lines[1:]:
        if line.strip() == "---":
            return result
        match = re.match(r"^([A-Za-z0-9_-]+):\s*(.+?)\s*$", line.strip())
        if match:
            result[match.group(1)] = match.group(2).strip().strip("\"'")
    return result


def table_lines(content, table):
    return [
        index
        for index, line in enumerate(content.splitlines(), start=1)
        if line.strip() == f"[[{table}]]"
    ]


def parse_manifest(path, errors):
    content = path.read_text(encoding="utf-8")
    try:
        parsed = parse_toml(content)
    except (ValueError, RuntimeError) as error:
        errors.append(f"project_context/context.toml is not valid TOML: {error}")
        return {"areas": [], "context": []}
    for key in parsed:
        if key not in TOP_LEVEL_FIELDS:
            errors.append(f"project_context/context.toml has unknown top-level field {key}")
    manifest = {}
    for table, allowed in (("areas", AREA_FIELDS), ("context", CONTEXT_FIELDS)):
        entries = parsed.get(table, [])
        if not isinstance(entries, list) or any(not isinstance(entry, dict) for entry in entries):
            errors.append(f"project_context/context.toml field [[{table}]] must be an array of TOML tables")
            entries = []
        lines = table_lines(content, table)
        manifest[table] = []
        for index, raw in enumerate(entries):
            entry = dict(raw)
            entry["line"] = lines[index] if index < len(lines) else 1
            for key in raw:
                if key not in allowed:
                    errors.append(f"project_context/context.toml line {entry['line']} has unknown field {key}")
            manifest[table].append(entry)
    return manifest


def parse_toml(content):
    if tomllib is not None:
        try:
            return tomllib.loads(content)
        except tomllib.TOMLDecodeError as error:
            raise ValueError(str(error)) from error
    script = """
import('node:module').then(async ({ createRequire }) => {
  const { pathToFileURL } = await import('node:url');
  const { resolve } = await import('node:path');
  const roots = JSON.parse(process.env.TY_CONTEXT_NODE_SEARCH_ROOTS || '[]');
  let modulePath;
  for (const root of roots) {
    try {
      modulePath = createRequire(resolve(root, 'package.json')).resolve('smol-toml');
      break;
    } catch {}
  }
  if (!modulePath) throw new Error('unable to resolve smol-toml from the project or portable-tool ancestors');
  const { parse } = await import(pathToFileURL(modulePath).href);
  let source = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => source += chunk);
  process.stdin.on('end', () => process.stdout.write(JSON.stringify(parse(source))));
}).catch(error => {
  console.error(error.message);
  process.exit(1);
});
"""
    search_roots = []
    for candidate in (ROOT, *Path(__file__).resolve().parents):
        value = str(candidate)
        if value not in search_roots:
            search_roots.append(value)
    environment = dict(os.environ)
    environment["TY_CONTEXT_NODE_SEARCH_ROOTS"] = json.dumps(search_roots)
    result = subprocess.run(
        ["node", "--input-type=module", "--eval", script],
        input=content,
        text=True,
        encoding="utf-8",
        errors="strict",
        capture_output=True,
        cwd=ROOT,
        env=environment,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(f"formal TOML parser unavailable: {result.stderr.strip()}")
    return json.loads(result.stdout)


def required_string(entry, key, errors):
    value = entry.get(key)
    if not isinstance(value, str) or not value.strip():
        errors.append(f"project_context/context.toml line {entry['line']} must include non-empty string field {key}")
        return None
    return value


def optional_string(entry, key, errors):
    value = entry.get(key)
    if value is None:
        return None
    if not isinstance(value, str) or not value.strip():
        errors.append(f"project_context/context.toml line {entry['line']} field {key} must be a non-empty string")
        return None
    return value


def string_array(entry, key, errors):
    value = entry.get(key, [])
    if not isinstance(value, list) or any(not isinstance(item, str) or not item.strip() for item in value):
        errors.append(f"project_context/context.toml line {entry['line']} {key} must be an array of non-empty strings")
        return []
    return value


def is_relative_to(target, root):
    try:
        target.relative_to(root)
        return True
    except ValueError:
        return False


def safe_manifest_path(raw, allowed_root, label, expected, errors, physical_files=None):
    normalized = normalize_context_path_spelling(raw)
    if Path(raw).is_absolute() or PureWindowsPath(raw).is_absolute() or ".." in normalized.split("/"):
        errors.append(f"project_context/context.toml {label} path must be relative and must not contain '..': {raw}")
        return None
    target = (
        physical_files.get(normalize_context_path(raw))
        if expected == "context file" and physical_files is not None
        else None
    )
    if target is None:
        target = ROOT.joinpath(*normalized.split("/"))
    if not target.exists():
        errors.append(f"project_context/context.toml references missing {expected}: {normalized}")
        return None
    resolved_root = allowed_root.resolve()
    resolved_target = target.resolve()
    if not is_relative_to(resolved_target, resolved_root):
        errors.append(f"project_context/context.toml {label} resolves outside its allowed root: {raw}")
        return None
    if expected == "context file" and not resolved_target.is_file():
        errors.append(f"project_context/context.toml {label} must reference a regular file: {raw}")
        return None
    if expected == "area root" and not resolved_target.is_dir():
        errors.append(f"project_context/context.toml {label} must reference a directory: {raw}")
        return None
    return resolved_target


def validate_area_entry(area, area_ids, registered, roles, policies, errors, physical_files):
    area_id = required_string(area, "id", errors)
    area_root = required_string(area, "root", errors)
    context_path = required_string(area, "context", errors)
    optional_string(area, "kind", errors)
    if "default" in area and not isinstance(area["default"], bool):
        errors.append(f"project_context/context.toml line {area['line']} default must be a boolean")
    string_array(area, "forbidden_runtime_dependencies", errors)
    if area_id:
        canonical_area_id = unicodedata.normalize("NFC", area_id)
        previous_area_id = area_ids.get(canonical_area_id)
        if previous_area_id is not None:
            if previous_area_id == area_id:
                errors.append(f"project_context/context.toml has duplicate area id: {area_id}")
            else:
                aliases = sorted((previous_area_id, area_id), key=lambda value: value.encode("utf-8"))
                errors.append(
                    "project_context/context.toml area ids "
                    f"{', '.join(aliases)} normalize to the same NFC id {canonical_area_id}"
                )
        else:
            area_ids[canonical_area_id] = area_id
    label = f"area {area_id or area['line']}"
    if area_root:
        safe_manifest_path(area_root, ROOT, f"{label} root", "area root", errors)
    if context_path:
        register_context_path(
            context_path,
            "area",
            None,
            label,
            registered,
            roles,
            policies,
            errors,
            physical_files,
        )


def validate_context_entry(entry, registered, roles, policies, errors, warnings, physical_files):
    context_path = required_string(entry, "path", errors)
    raw_role = required_string(entry, "role", errors)
    optional_string(entry, "read_when", errors)
    read_policy = optional_string(entry, "read_policy", errors)
    string_array(entry, "triggers", errors)
    string_array(entry, "default_children", errors)
    role = normalize_role(raw_role) if raw_role else None
    if raw_role and role is None:
        errors.append(f"project_context/context.toml line {entry['line']} has unsupported context role: {raw_role}")
    if read_policy and read_policy not in READ_POLICIES:
        errors.append(f"project_context/context.toml line {entry['line']} has unsupported read_policy: {read_policy}")
    if read_policy in LEGACY_READ_POLICIES:
        warnings.append(
            f"project_context/context.toml line {entry['line']} uses legacy read_policy {read_policy}; "
            "Schema v4 preserves its current selection behavior and migration must be explicit"
        )
    if context_path and role:
        register_context_path(
            context_path,
            role,
            read_policy,
            f"context {context_path}",
            registered,
            roles,
            policies,
            errors,
            physical_files,
        )


def validate_default_children(contexts, registered, errors, warnings):
    contexts_by_path = {
        normalize_context_path(entry["path"]): entry
        for entry in contexts
        if isinstance(entry.get("path"), str) and entry["path"].strip()
    }
    for entry in contexts:
        for child in entry.get("default_children", []):
            normalized = normalize_context_path(child)
            if normalized not in registered["paths"]:
                errors.append(f"project_context/context.toml line {entry['line']} default_children references unregistered Context path: {child}")
            elif contexts_by_path.get(normalized, {}).get("read_policy") == "never-default":
                warnings.append(
                    f"project_context/context.toml line {entry['line']} default_children selects {normalized} even though its current "
                    "read_policy is never-default; Schema v4 preserves this behavior and a future migration must remove the edge or "
                    "change the policy explicitly"
                )


def validate_manifest(errors, warnings, physical_files):
    manifest_path = CONTEXT_ROOT / "context.toml"
    roles = {}
    policies = {}
    if not manifest_path.exists():
        if schema_requires_manifest():
            errors.append("missing project_context/context.toml; run ty-context upgrade to create the Schema v4 Context graph manifest")
        return roles, policies
    manifest = parse_manifest(manifest_path, errors)
    areas = manifest["areas"]
    contexts = manifest["context"]
    if not areas:
        errors.append("project_context/context.toml must declare at least one [[areas]] entry")
    defaults = [entry for entry in areas if entry.get("default") is True]
    if areas and len(defaults) != 1:
        errors.append(f"project_context/context.toml must mark exactly one [[areas]] entry with default = true; found {len(defaults)}")
    area_ids = {}
    registered = {"paths": set(), "spellings": {}, "cases": {}}

    for area in areas:
        validate_area_entry(area, area_ids, registered, roles, policies, errors, physical_files)
    for entry in contexts:
        validate_context_entry(entry, registered, roles, policies, errors, warnings, physical_files)
    validate_default_children(contexts, registered, errors, warnings)
    return roles, policies


def register_context_path(
    raw,
    role,
    read_policy,
    label,
    registered,
    roles,
    policies,
    errors,
    physical_files,
):
    normalized = normalize_context_path(raw)
    raw_spelling = normalize_context_path_spelling(raw)
    previous = registered["spellings"].get(normalized)
    if previous is not None:
        if previous == raw_spelling:
            errors.append(f"project_context/context.toml has duplicate Context path: {normalized}")
        else:
            aliases = sorted((previous, raw_spelling), key=lambda value: value.encode("utf-8"))
            errors.append(
                "project_context/context.toml Context paths "
                f"{', '.join(aliases)} normalize to the same NFC repository path {normalized}"
            )
    else:
        registered["spellings"][normalized] = raw_spelling
    case_key = portable_context_path_case_key(normalized)
    previous_case = registered["cases"].get(case_key)
    if previous_case is not None and previous_case != normalized:
        aliases = sorted((previous_case, normalized), key=lambda value: value.encode("utf-8"))
        errors.append(
            "project_context/context.toml Context paths "
            f"{', '.join(aliases)} collide on a case-insensitive filesystem"
        )
    else:
        registered["cases"][case_key] = normalized
    registered["paths"].add(normalized)
    if not normalized.startswith("project_context/") or not normalized.endswith(".md"):
        errors.append(f"project_context/context.toml {label} must reference a markdown file under project_context/: {raw}")
        return
    if safe_manifest_path(
        raw,
        CONTEXT_ROOT,
        label,
        "context file",
        errors,
        physical_files,
    ) is None:
        return
    roles[normalized] = role
    if read_policy:
        policies[normalized] = read_policy


def schema_requires_manifest():
    schema_version = "4"
    for candidate in CONFIG_CANDIDATES:
        path = ROOT / candidate
        if not path.exists():
            continue
        match = re.search(r'schema_version:\s*["\']?([^"\'\s]+)', path.read_text(encoding="utf-8"))
        if match:
            schema_version = match.group(1)
            break
    try:
        return int(schema_version.split(".", 1)[0]) >= 4
    except ValueError:
        return True


def validate_checks(rel, text, checks, errors):
    for label, terms in checks:
        if not has_any(text, terms):
            errors.append(f"{rel} must include {label}")


def section_bodies(text):
    headings = list(re.finditer(r"^(#{2,6})\s+(.+?)\s*$", text, re.M))
    for index, match in enumerate(headings):
        end = headings[index + 1].start() if index + 1 < len(headings) else len(text)
        yield match.group(2), text[match.end():end].strip()


def validate_no_fake_verification(rel, text, errors):
    for heading, body in section_bodies(text):
        if not re.search(r"verification|tests?|deployment|验证|测试|部署", heading, re.I):
            continue
        if any(pattern.search(body) for pattern in FAKE_VERIFICATION_PATTERNS):
            errors.append(f"{rel} must list verification entry points, not claim tests were already executed")
            return


def validate_minimum_recoverability(rel, text, errors):
    if not re.search(r"^#\s+\S.+$", text, re.M):
        errors.append(f"{rel} must contain a non-empty level-one title")
    body = re.sub(r"^---\s*\n[\s\S]*?\n---\s*\n?", "", text, count=1)
    facts = []
    for line in body.splitlines():
        value = line.strip()
        if not value or value.startswith(("#", "```", "<!--")):
            continue
        value = re.sub(r"^[-*+>]\s*", "", value).strip()
        if len(value) >= 8 and not PLACEHOLDER.fullmatch(value):
            facts.append(value)
    if not facts:
        errors.append(f"{rel} must contain at least one concrete fact paragraph and cannot be only TODO or placeholder text")


def validate_role_recoverability(rel, text, role, errors):
    if role == "verification" and not re.search(r"`[^`\r\n]+`|(?:npm|pnpm|yarn|make|node|python|pytest|cargo|go)\s+\S+|(?:^|\s)(?:\./|[\w.-]+/)[\w./-]+", text, re.I | re.M):
        errors.append(f"{rel} verification Context must contain a command, repository path or repeatable entry point")
    if role == "implementation-index":
        candidates = [match.group(1) for match in re.finditer(r"`([^`]+)`", text) if ("/" in match.group(1) or "\\" in match.group(1)) and " " not in match.group(1)]
        if not any(repository_path_exists(candidate) for candidate in candidates):
            errors.append(f"{rel} implementation-index Context must contain at least one existing repository path")
    if role == "contract" and not re.search(r"producer|consumer|input|output|schema|compatibility|constraint|must|shall|禁止|必须|输入|输出|兼容", text, re.I):
        errors.append(f"{rel} contract Context must state at least one constraint or input/output semantic")
    if role == "decision-rationale":
        has_decision = re.search(r"^##\s+(?:(?:Decision|Current Design Choice|Design Choice)(?:\b|\s|$)|决定(?:\s|$)|当前设计选择(?:\s|$))", text, re.I | re.M)
        has_reason = re.search(r"^##\s+(?:(?:Reason|Rationale|Why)(?:\b|\s|$)|原因(?:\s|$)|理由(?:\s|$)|为什么(?:\s|$))", text, re.I | re.M)
        if not has_decision or not has_reason:
            errors.append(f"{rel} decision-rationale Context must contain both a Decision and a Reason")


def repository_path_exists(candidate):
    clean = candidate.rstrip(".:,;").replace("\\", "/")
    if Path(clean).is_absolute() or PureWindowsPath(clean).is_absolute() or ".." in clean.split("/"):
        return False
    target = ROOT.joinpath(*clean.split("/"))
    return target.exists() and is_relative_to(target.resolve(), ROOT)


def validate_context_file(rel, text, role, errors):
    validate_no_fake_verification(rel, text, errors)
    validate_minimum_recoverability(rel, text, errors)
    if role:
        validate_role_recoverability(rel, text, role, errors)


def discover_context_markdown(errors):
    paths = (
        [
            candidate
            for candidate in CONTEXT_ROOT.rglob("*")
            if candidate.is_file() and candidate.suffix.lower() == ".md"
        ]
        if CONTEXT_ROOT.exists()
        else []
    )
    rows = []
    for context_path in paths:
        physical = context_path.relative_to(ROOT).as_posix()
        canonical = normalize_context_path(physical)
        rows.append((canonical, physical, context_path))
    rows.sort(key=lambda row: (row[0].encode("utf-8"), row[1].encode("utf-8")))

    grouped = {}
    for canonical, physical, context_path in rows:
        grouped.setdefault(canonical, []).append((physical, context_path))

    public_rows = []
    physical_files = {}
    case_groups = {}
    for canonical in sorted(grouped, key=lambda value: value.encode("utf-8")):
        candidates = sorted(
            grouped[canonical],
            key=lambda row: row[0].encode("utf-8"),
        )
        spellings = [physical for physical, _path in candidates]
        if len(spellings) > 1:
            errors.append(
                f"Context files {', '.join(spellings)} normalize to the same NFC repository path {canonical}"
            )
        physical, context_path = candidates[0]
        public_rows.append((canonical, physical, context_path))
        physical_files[canonical] = context_path
        case_key = portable_context_path_case_key(canonical)
        case_groups.setdefault(case_key, []).append(canonical)

    for canonical_paths in case_groups.values():
        aliases = sorted(set(canonical_paths), key=lambda value: value.encode("utf-8"))
        if len(aliases) > 1:
            errors.append(
                f"Context files {', '.join(aliases)} collide on a case-insensitive filesystem"
            )
    return public_rows, physical_files


def main():
    errors = []
    warnings = []
    global_path = CONTEXT_ROOT / "global.md"
    architecture_path = CONTEXT_ROOT / "architecture.md"
    if not global_path.exists():
        errors.append("missing project_context/global.md")
    else:
        text = global_path.read_text(encoding="utf-8")
        validate_checks("project_context/global.md", text, GLOBAL_CHECKS, errors)
        validate_context_file("project_context/global.md", text, "global", errors)
    if not architecture_path.exists():
        errors.append("missing project_context/architecture.md")
    else:
        text = architecture_path.read_text(encoding="utf-8")
        validate_checks("project_context/architecture.md", text, ARCHITECTURE_CHECKS, errors)
        validate_context_file("project_context/architecture.md", text, "architecture", errors)

    context_rows, physical_files = discover_context_markdown(errors)
    manifest_roles, manifest_policies = validate_manifest(
        errors,
        warnings,
        physical_files,
    )
    checked = 0
    for rel, _physical, path in context_rows:
        if rel in {"project_context/global.md", "project_context/architecture.md"}:
            continue
        text = path.read_text(encoding="utf-8")
        front_matter = parse_front_matter(text)
        declared_role = front_matter.get("context_role")
        front_role = normalize_role(declared_role) if declared_role else None
        if declared_role and front_role is None:
            errors.append(f"{rel} has unsupported context_role: {declared_role}")
        front_policy = front_matter.get("read_policy")
        if front_policy and front_policy not in READ_POLICIES:
            errors.append(f"{rel} has unsupported read_policy: {front_policy}")
        manifest_role = manifest_roles.get(rel)
        manifest_policy = manifest_policies.get(rel)
        if manifest_role and front_role and manifest_role != front_role:
            errors.append(f"{rel} front matter context_role {front_role} does not match manifest role {manifest_role}")
        if manifest_policy and front_policy and manifest_policy != front_policy:
            errors.append(f"{rel} front matter read_policy {front_policy} does not match manifest read_policy {manifest_policy}")
        if not manifest_role:
            warnings.append(f"{rel} is an unregistered Context Markdown file; add it to project_context/context.toml or move it out of project_context/**")
        role = manifest_role or front_role
        validate_context_file(rel, text, role, errors)
        checked += 1

    for warning in warnings:
        print(f"warning: {warning}", file=sys.stderr)
    if errors:
        for error in errors:
            print(f"error: {error}", file=sys.stderr)
        return 1
    print(f"Context OK: {2 + checked} context file(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
