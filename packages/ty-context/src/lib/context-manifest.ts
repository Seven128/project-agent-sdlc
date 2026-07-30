import path from "node:path";
import { listFiles } from "./fs.js";

export const CONTEXT_MANIFEST_PATH = "project_context/context.toml";

export function defaultContextManifestTemplate(): string {
  return [
    "# Schema v4 Minimal Context graph manifest.",
    "# Keep the default product/domain area for ordinary projects. Role context nodes",
    "# are read-purpose slices owned by an area or, only when cross-domain, by the project root.",
    "# An area is a durable ownership/discovery unit, not a read/edit ACL or a required",
    "# one-to-one workspace mapping. One area may own several code/workspace roots.",
    "# Default/on-demand selection defines the starting read set, not a maximum;",
    "# widen to any relevant area/shared Context when task dependencies require it.",
    "# Monorepos need no additional manifest fields; record useful code/workspace",
    "# ownership in area or architecture Context and use project-owned scope checks.",
    "# When migrating deep files under project_context/areas/**, refine obvious",
    "# contract/foundation/subdomain/verification/deployment/implementation-index/",
    "# decision-rationale/archive files into [[context]] entries instead of keeping",
    "# every Markdown file as an [[areas]] product owner.",
    "",
    "[[areas]]",
    'id = "main"',
    'root = "."',
    'context = "project_context/areas/main.md"',
    'kind = "app"',
    "default = true",
    "",
    "[[context]]",
    'path = "project_context/areas/main/verification.md"',
    'role = "verification"',
    'read_policy = "default"',
    'triggers = ["test", "verify", "verification", "smoke", "ci"]',
    "",
    "# Example optional node:",
    "# [[context]]",
    '# path = "project_context/areas/main/deployment.md"',
    '# role = "deployment"',
    '# read_policy = "on-demand"',
    '# triggers = ["deploy", "deployment", "runtime", "cloud", "docker"]',
    "",
  ].join("\n");
}

export async function contextManifestFromExistingAreas(
  projectRoot: string,
): Promise<string> {
  const areasRoot = path.join(projectRoot, "project_context", "areas");
  const areas = (await listFiles(areasRoot))
    .filter((file) => file.endsWith(".md"))
    .sort();

  if (areas.length === 0) {
    return defaultContextManifestTemplate();
  }

  const lines = [
    "# Schema v4 Minimal Context graph manifest.",
    "# Auto-created by upgrade from existing project_context/areas/**/*.md files.",
    "# Review deep or non-area context and move it to explicit [[context]] role entries",
    "# such as subdomain, contract, foundation, verification, deployment, archive,",
    "# implementation-index or decision-rationale when needed.",
    "",
  ];

  const areaEntries: Array<{ contextPath: string; id: string }> = [];
  const contextEntries: Array<{
    path: string;
    role: "verification" | "deployment";
    triggers: string[];
  }> = [];

  for (const areaPath of areas) {
    const relativeToAreas = path
      .relative(areasRoot, areaPath)
      .split(path.sep)
      .join("/");
    const contextPath = `project_context/areas/${relativeToAreas}`;
    const id = contextUnitId(relativeToAreas);
    const role = inferredRoleContext(relativeToAreas);
    if (role) {
      contextEntries.push({
        path: contextPath,
        role,
        triggers:
          role === "verification"
            ? ["test", "verify", "verification", "smoke", "ci"]
            : ["deploy", "deployment", "runtime", "cloud", "docker"],
      });
    } else {
      areaEntries.push({ contextPath, id });
    }
  }

  const defaultId = areaEntries.some((entry) => entry.id === "main")
    ? "main"
    : areaEntries[0]?.id;

  for (const { contextPath, id } of areaEntries) {
    lines.push(
      "[[areas]]",
      `id = "${id}"`,
      'root = "."',
      `context = "${contextPath}"`,
      `kind = "${id === "main" ? "app" : "context-unit"}"`,
      id === defaultId ? "default = true" : "default = false",
      "",
    );
  }

  for (const context of contextEntries) {
    lines.push(
      "[[context]]",
      `path = "${context.path}"`,
      `role = "${context.role}"`,
      context.role === "verification"
        ? 'read_policy = "default"'
        : 'read_policy = "on-demand"',
      `triggers = [${context.triggers.map((trigger) => `"${trigger}"`).join(", ")}]`,
      "",
    );
  }

  return lines.join("\n");
}

function inferredRoleContext(
  relativeToAreas: string,
): "verification" | "deployment" | undefined {
  const normalized = relativeToAreas.toLowerCase();
  if (
    normalized.endsWith("/verification.md") ||
    normalized === "verification.md"
  ) {
    return "verification";
  }
  if (normalized.endsWith("/deployment.md") || normalized === "deployment.md") {
    return "deployment";
  }
  return undefined;
}

function contextUnitId(relativeToAreas: string): string {
  const withoutExtension = relativeToAreas.replace(/\.md$/i, "");
  const parts = withoutExtension.split("/");
  const last = parts.at(-1)?.toLowerCase();
  const semanticParts =
    last === "readme" || last === "index" ? parts.slice(0, -1) : parts;
  const raw = (semanticParts.length > 0 ? semanticParts : ["main"]).join("-");
  const slug = raw
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "main";
}
