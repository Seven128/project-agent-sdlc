import { readFile, lstat } from "node:fs/promises";
import path from "node:path";
import { harnessConfigPath } from "./harness-root.js";
import { parseYaml } from "./yaml.js";
import { assertProtectedRepositoryFile } from "./repository-path-safety.js";
import { CANONICAL_NPX_COMMAND, CURRENT_SCHEMA_VERSION } from "./constants.js";

export async function assertSupportedSchema(
  projectRoot: string,
  commandName: string,
): Promise<void> {
  if (commandName !== "upgrade") {
    try {
      await lstat(
        path.join(projectRoot, "tmp/ty-context/upgrade-schema-5.json"),
      );
      throw new Error(
        "upgrade_incomplete: resume the explicit schema-5 upgrade before other writes",
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  const version = await rawSchemaVersion(projectRoot);
  if (version === undefined) return;
  const message = unsupportedSchemaMessage(version, commandName);
  if (message) {
    throw new Error(message);
  }
  if (version !== CURRENT_SCHEMA_VERSION && commandName !== "upgrade")
    throw new Error(
      `upgrade_required: schema ${version}; run explicit ty-context upgrade before ${commandName}. No files were changed by this guard.`,
    );
}

export async function rawSchemaVersion(
  projectRoot: string,
): Promise<string | undefined> {
  const relative = await harnessConfigPath(projectRoot);
  const file = path.join(projectRoot, relative);
  try {
    await lstat(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
  await assertProtectedRepositoryFile(projectRoot, file, "harness_config");
  const raw = parseYaml(await readFile(file, "utf8")) as {
    core?: { schema_version?: unknown };
  } | null;
  const version = raw?.core?.schema_version;
  if (
    (typeof version !== "string" && typeof version !== "number") ||
    !/^\d+$/.test(String(version))
  )
    throw new Error(
      `${relative}: missing or invalid raw core.schema_version; repair explicitly before writing`,
    );
  if (
    String(version) === CURRENT_SCHEMA_VERSION &&
    raw &&
    ("profiles" in raw || "modularity" in raw)
  )
    throw new Error(
      `${relative}: retired_config_fields; schema 5 cannot run old profiles/modularity. Reconcile unsupported old-CLI changes before writing.`,
    );
  return String(version);
}

export function unsupportedSchemaMessage(
  schemaVersion: string,
  commandName: string,
): string | undefined {
  const projectMajor = schemaMajor(schemaVersion);
  const supportedMajor = schemaMajor(CURRENT_SCHEMA_VERSION);
  if (
    projectMajor !== undefined &&
    supportedMajor !== undefined &&
    projectMajor <= supportedMajor
  ) {
    return undefined;
  }
  return [
    `unsupported Harness schema version ${schemaVersion}; this CLI supports schema ${CURRENT_SCHEMA_VERSION}`,
    `Refusing to run ${commandName} because older CLI versions must not rewrite newer projects`,
    `Use the canonical latest CLI: ${CANONICAL_NPX_COMMAND} ${commandName}`,
  ].join(". ");
}

export function schemaMajor(schemaVersion: string): number | undefined {
  const match = /^(\d+)$/.exec(String(schemaVersion).trim());
  if (!match) {
    return undefined;
  }
  return Number.parseInt(match[1], 10);
}
