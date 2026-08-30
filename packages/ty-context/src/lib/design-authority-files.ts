import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import {
  assertProtectedRepositoryDirectory,
  assertProtectedRepositoryFile,
} from "./repository-path-safety.js";
import {
  DESIGN_AUTHORITY_LIMITS,
  DESIGN_AUTHORITY_MANIFEST_PATH,
} from "./design-authority-types.js";

export interface AcquiredDesignAuthorityText {
  path: string;
  content: string;
  normalized: Buffer;
  raw: Buffer;
}

export async function acquireDesignAuthorityManifest(
  repository: string,
): Promise<AcquiredDesignAuthorityText | null> {
  const directory = path.join(repository, "design_system");
  if (!(await designAuthorityPathExists(directory))) return null;
  await assertProtectedRepositoryDirectory(
    repository,
    directory,
    "design_authority_directory",
  );
  const manifest = path.join(repository, DESIGN_AUTHORITY_MANIFEST_PATH);
  if (!(await designAuthorityPathExists(manifest))) return null;
  return acquireDesignAuthorityText(
    repository,
    DESIGN_AUTHORITY_MANIFEST_PATH,
    "design_authority_manifest",
  );
}

export async function acquireDesignAuthorityText(
  repository: string,
  relative: string,
  label: string,
): Promise<AcquiredDesignAuthorityText> {
  const absolute = await assertProtectedRepositoryFile(
    repository,
    path.resolve(repository, ...relative.split("/")),
    label,
  );
  await assertExactDesignAuthorityPath(repository, relative, label);
  const bytes = await readFile(absolute);
  if (bytes.length > DESIGN_AUTHORITY_LIMITS.max_file_bytes)
    invalid(`file_limit_exceeded:${relative}:${bytes.length}`);
  if (bytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])))
    invalid(`utf8_bom_not_allowed:${relative}`);
  let content: string;
  try {
    content = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    invalid(`invalid_utf8:${relative}`);
  }
  return {
    path: relative,
    content,
    normalized: Buffer.from(content.replace(/\r\n?/gu, "\n"), "utf8"),
    raw: bytes,
  };
}

async function assertExactDesignAuthorityPath(
  repository: string,
  relative: string,
  label: string,
): Promise<void> {
  let parent = path.resolve(repository);
  for (const segment of relative.split("/")) {
    const entries = await readdir(parent);
    if (!entries.includes(segment))
      invalid(`${label}_path_case_mismatch:${relative}`);
    parent = path.join(parent, segment);
  }
}

export async function designAuthorityPathExists(
  target: string,
): Promise<boolean> {
  try {
    await lstat(target);
    return true;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: unknown }).code === "ENOENT"
    )
      return false;
    throw error;
  }
}

function invalid(reason: string): never {
  throw new Error(`design_authority_invalid:${reason}`);
}
