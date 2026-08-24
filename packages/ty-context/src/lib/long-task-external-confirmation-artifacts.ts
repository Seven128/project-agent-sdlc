import { readFile } from "node:fs/promises";
import path from "node:path";
import { assertProtectedRepositoryFile } from "./repository-path-safety.js";
import { sha256Hex } from "./strict-codec.js";

export async function externalArtifactIntegrityIssues(
  repository: string,
  artifacts: Record<string, string>,
): Promise<string[]> {
  const issues: string[] = [];
  for (const [relative, expectedHash] of Object.entries(artifacts)) {
    try {
      const file = await assertProtectedRepositoryFile(
        repository,
        path.resolve(repository, ...relative.split("/")),
        `external_confirmation_artifact:${relative}`,
      );
      const actualHash = sha256Hex(await readFile(file));
      if (actualHash !== expectedHash)
        issues.push(`artifact_content_changed:${relative}`);
    } catch (error) {
      issues.push(`artifact_invalid:${relative}:${message(error)}`);
    }
  }
  return issues;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
