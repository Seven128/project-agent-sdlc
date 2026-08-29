import { designMdToolAdapter } from "./design-md-tool-adapter.js";
import { parseStrictYaml } from "./strict-codec.js";
import { acquireDesignAuthorityText } from "./design-authority-files.js";
import { DESIGN_AUTHORITY_ENTRY_PATH } from "./design-authority-types.js";

export function projectDesignAuthorityTokens(
  content: string,
): { success: true; content: string } | { success: false; error: string } {
  const result = designMdToolAdapter.exportTokens(content, "dtcg");
  return result.success
    ? { success: true, content: result.content }
    : { success: false, error: result.error };
}

export async function projectDesignAuthorityTokensFromEntry(
  repository: string,
): Promise<ReturnType<typeof projectDesignAuthorityTokens>> {
  const entry = await acquireDesignAuthorityText(
    repository,
    DESIGN_AUTHORITY_ENTRY_PATH,
    "design_authority_entry",
  );
  return projectDesignAuthorityTokens(entry.content);
}

export function designAuthorityRevision(content: string): string | null {
  const frontMatter = extractFrontMatter(content);
  if (frontMatter === null) return null;
  try {
    const value = parseStrictYaml(frontMatter);
    if (!value || typeof value !== "object" || Array.isArray(value))
      return null;
    const revision = (value as Record<string, unknown>).version;
    if (typeof revision === "string" && revision.trim()) return revision;
    if (typeof revision === "number" && Number.isFinite(revision))
      return String(revision);
  } catch {
    // Revision is diagnostic only; closure identity still binds the exact bytes.
  }
  return null;
}

function extractFrontMatter(content: string): string | null {
  const normalized = content.replace(/\r\n?/gu, "\n");
  if (!normalized.startsWith("---\n")) return null;
  const end = normalized.indexOf("\n---", 4);
  if (end < 0) return null;
  const boundary = end + 4;
  if (boundary < normalized.length && normalized[boundary] !== "\n")
    return null;
  return normalized.slice(4, end);
}
