import path from "node:path";
import { listFiles } from "./fs.js";

export const CONTEXT_MANIFEST_PATH = "project_context/context.toml";

export function defaultContextManifestTemplate(): string {
  return '# Tiny Context routing. global.md is always read.\n# Add optional [[areas]] or [[context]] nodes only when useful.\n# read_policy = "default" traverses default_children; default_files selects files only.\n';
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
