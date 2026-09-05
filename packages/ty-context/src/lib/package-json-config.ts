import path from "node:path";
import { pathExists, readText, writeTextIfChanged } from "./fs.js";
import { normalizeHarnessFolderName, harnessRoot } from "./harness-root.js";
import { captureMutationFileState } from "./context-mutation/mutation-file-state.js";
import { assertSupportedSchema, rawSchemaVersion } from "./schema-guard.js";
import { withMaintenanceLock } from "./maintenance-lock.js";
import { writeMaintenanceText } from "./maintenance-write.js";

export async function packageHarnessRoot(
  projectRoot: string,
): Promise<string | undefined> {
  const packagePath = path.join(projectRoot, "package.json");
  if (!(await pathExists(packagePath))) {
    return undefined;
  }
  const packageJson = parsePackageJson(await readText(packagePath));
  const config = packageJson.tyContext;
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return undefined;
  }
  const value = (config as Record<string, unknown>).harnessFolderName;
  return typeof value === "string" && value.trim()
    ? normalizeHarnessFolderName(value)
    : undefined;
}

export async function writePackageHarnessRoot(
  projectRoot: string,
  folderName: string,
): Promise<boolean> {
  await assertSupportedSchema(projectRoot, "init");
  return withMaintenanceLock(projectRoot, "sync", async () => {
    await assertSupportedSchema(projectRoot, "init");
    const normalized = normalizeHarnessFolderName(folderName);
    const current = await harnessRoot(projectRoot);
    if (
      current !== normalized &&
      ((await rawSchemaVersion(projectRoot)) !== undefined ||
        (
          await captureMutationFileState(
            projectRoot,
            `${normalized}/config.yaml`,
          )
        ).exists)
    )
      throw new Error(
        "init cannot relocate or switch an existing installation; preserve both configurations and migrate the root explicitly",
      );
    const before = await captureMutationFileState(projectRoot, "package.json");
    const packageJson = before.exists
      ? parsePackageJson(
          Buffer.from(before.bytes_base64!, "base64").toString("utf8"),
        )
      : {};
    const existingConfig = packageJson.tyContext;
    const nextConfig =
      existingConfig &&
      typeof existingConfig === "object" &&
      !Array.isArray(existingConfig)
        ? {
            ...(existingConfig as Record<string, unknown>),
            harnessFolderName: normalized,
          }
        : { harnessFolderName: normalized };
    const next = {
      ...packageJson,
      tyContext: nextConfig,
    };
    return writeMaintenanceText(
      projectRoot,
      "package.json",
      `${JSON.stringify(next, null, 2)}\n`,
      before,
    );
  });
}

function parsePackageJson(content: string): Record<string, unknown> {
  const parsed = JSON.parse(content) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("package.json must contain a JSON object");
  }
  return parsed as Record<string, unknown>;
}
