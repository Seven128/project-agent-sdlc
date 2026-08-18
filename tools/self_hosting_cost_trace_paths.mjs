const SKILL_ROOTS = [
  ".codex/skills/",
  ".codex/ty-context-managed/skills/",
];

export function normalizeRepositoryRelativePath(value) {
  if (typeof value !== "string" || value.length === 0 || value.trim() !== value)
    fail("unsafe_opened_file_path");
  if (/[\u0000-\u001f\u007f]/u.test(value)) fail("unsafe_opened_file_path");
  const normalized = value.replace(/\\/gu, "/");
  if (
    normalized.startsWith("/") ||
    /^[A-Za-z]:/u.test(normalized) ||
    /^[A-Za-z][A-Za-z0-9+.-]*:/u.test(normalized)
  )
    fail("unsafe_opened_file_path");
  const parts = normalized.split("/");
  if (
    parts.some(
      (part) =>
        part.length === 0 || part === "." || part === ".." || part.includes(":"),
    )
  )
    fail("unsafe_opened_file_path");
  return parts.join("/");
}

export function validateOpenedFileKind(kind, normalized) {
  const skillSegments = skillRelativeSegments(normalized);
  const skill =
    skillSegments !== null &&
    skillSegments.length >= 2 &&
    !skillSegments.includes("references") &&
    skillSegments.at(-1) === "SKILL.md";
  const referenceIndex = skillSegments?.indexOf("references") ?? -1;
  const reference =
    referenceIndex > 0 &&
    referenceIndex < skillSegments.length - 1 &&
    skillSegments.at(-1).endsWith(".md") &&
    skillSegments.at(-1) !== "SKILL.md";
  if (kind === "context" && !normalized.startsWith("project_context/"))
    fail("invalid_context_path");
  if (kind === "skill" && !skill) fail("invalid_skill_path");
  if (kind === "reference" && !reference) fail("invalid_reference_path");
  if (
    kind === "source" &&
    (normalized.startsWith("project_context/") || skill || reference)
  )
    fail("invalid_source_path");
}

function skillRelativeSegments(value) {
  const root = SKILL_ROOTS.find((candidate) => value.startsWith(candidate));
  return root ? value.slice(root.length).split("/") : null;
}

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}
