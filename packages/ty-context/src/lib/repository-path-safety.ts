import type { Stats } from "node:fs";
import { lstat, mkdir, realpath } from "node:fs/promises";
import path from "node:path";

export interface SafeRepositoryPath {
  repository: string;
  absolute: string;
  relative: string;
}

export function resolveInsideRepository(
  rootInput: string,
  relativeInput: string,
  label: string,
): string {
  if (!relativeInput || path.isAbsolute(relativeInput))
    throw new Error(`unsafe_path:${label}:${relativeInput}`);
  const normalized = relativeInput.replace(/\\/gu, "/");
  if (
    normalized.split("/").some((segment) => segment === "..") ||
    normalized.startsWith("//") ||
    /^[A-Za-z]:/u.test(normalized)
  )
    throw new Error(`unsafe_path:${label}:${relativeInput}`);
  const root = path.resolve(rootInput);
  const resolved = path.resolve(root, ...normalized.split("/"));
  if (!inside(root, resolved))
    throw new Error(`unsafe_path:${label}:${relativeInput}`);
  return resolved;
}

export async function assertProtectedRepositoryFile(
  repositoryInput: string,
  fileInput: string,
  label: string,
): Promise<string> {
  const repositoryPath = path.resolve(repositoryInput);
  const repository = await realpath(repositoryPath);
  const candidate = path.resolve(fileInput);
  assertInside(repositoryPath, candidate, label, fileInput);
  await assertExistingParents(repositoryPath, repository, candidate, label);
  const info = await lstatOrNull(candidate);
  if (!info)
    throw new Error(`protected_input_not_found:${label}:${display(fileInput)}`);
  assertRegularNoFollow(info, label, fileInput);
  const resolved = await realpath(candidate);
  assertInside(repository, resolved, label, fileInput);
  return resolved;
}

export async function assertProtectedRepositoryDirectory(
  repositoryInput: string,
  directoryInput: string,
  label: string,
): Promise<string> {
  const repositoryPath = path.resolve(repositoryInput);
  const repository = await realpath(repositoryPath);
  const candidate = path.resolve(directoryInput);
  assertInside(repositoryPath, candidate, label, directoryInput);
  await assertExistingParents(repositoryPath, repository, candidate, label);
  const info = await lstatOrNull(candidate);
  if (!info)
    throw new Error(
      `protected_input_not_found:${label}:${display(directoryInput)}`,
    );
  if (info.isSymbolicLink())
    throw new Error(
      `protected_input_symlink_not_allowed:${label}:${display(directoryInput)}`,
    );
  if (!info.isDirectory())
    throw new Error(
      `protected_input_not_directory:${label}:${display(directoryInput)}`,
    );
  const resolved = await realpath(candidate);
  assertInside(repository, resolved, label, directoryInput);
  return resolved;
}

export async function assertProtectedRepositoryPath(
  repositoryInput: string,
  pathInput: string,
  label: string,
): Promise<string> {
  const repositoryPath = path.resolve(repositoryInput);
  const repository = await realpath(repositoryPath);
  const candidate = path.resolve(pathInput);
  assertInside(repositoryPath, candidate, label, pathInput);
  await assertExistingParents(repositoryPath, repository, candidate, label);
  const info = await lstatOrNull(candidate);
  if (!info)
    throw new Error(`protected_input_not_found:${label}:${display(pathInput)}`);
  if (info.isSymbolicLink())
    throw new Error(
      `protected_input_symlink_not_allowed:${label}:${display(pathInput)}`,
    );
  if (!info.isFile() && !info.isDirectory())
    throw new Error(
      `protected_input_not_file_or_directory:${label}:${display(pathInput)}`,
    );
  if (info.isFile() && typeof info.nlink === "number" && info.nlink > 1)
    throw new Error(
      `protected_input_hardlink_not_allowed:${label}:${display(pathInput)}`,
    );
  const resolved = await realpath(candidate);
  assertInside(repository, resolved, label, pathInput);
  return resolved;
}

export async function assertSafeRepositoryFilePath(
  repositoryInput: string,
  relativeInput: string,
  label: string,
  options: { destinationMayBeAbsent?: boolean } = {},
): Promise<SafeRepositoryPath & { status: Stats | null }> {
  const repositoryPath = path.resolve(repositoryInput);
  const repository = await realpath(repositoryPath);
  const absolute = resolveInsideRepository(
    repositoryPath,
    relativeInput,
    label,
  );
  await assertExistingParents(repositoryPath, repository, absolute, label);
  const status = await lstatOrNull(absolute);
  if (!status && !options.destinationMayBeAbsent)
    throw new Error(
      `protected_input_not_found:${label}:${display(relativeInput)}`,
    );
  if (status) {
    assertRegularNoFollow(status, label, relativeInput);
    assertInside(repository, await realpath(absolute), label, relativeInput);
  }
  return {
    repository,
    absolute,
    relative: repositoryRelative(repositoryPath, absolute, label),
    status,
  };
}

export async function ensureSafeRepositoryDirectory(
  repositoryInput: string,
  relativeInput: string,
  label: string,
): Promise<SafeRepositoryPath> {
  const repositoryPath = path.resolve(repositoryInput);
  const repository = await realpath(repositoryPath);
  const absolute = resolveInsideRepository(
    repositoryPath,
    relativeInput,
    label,
  );
  const relative = repositoryRelative(repositoryPath, absolute, label);
  let cursor = repositoryPath;
  for (const segment of relative.split(path.sep)) {
    cursor = path.join(cursor, segment);
    let status = await lstatOrNull(cursor);
    if (!status) {
      await mkdir(cursor).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== "EEXIST") throw error;
      });
      status = await lstatOrNull(cursor);
    }
    if (!status || status.isSymbolicLink() || !status.isDirectory())
      throw new Error(
        `unsafe_repository_directory:${label}:${display(relativeInput)}`,
      );
    assertInside(repository, await realpath(cursor), label, relativeInput);
  }
  return { repository, absolute, relative: relative.replace(/\\/gu, "/") };
}

async function assertExistingParents(
  lexicalRepository: string,
  canonicalRepository: string,
  candidate: string,
  label: string,
): Promise<void> {
  const relative = repositoryRelative(
    lexicalRepository,
    path.dirname(candidate),
    label,
  );
  if (!relative) return;
  let cursor = lexicalRepository;
  for (const segment of relative.split(path.sep)) {
    cursor = path.join(cursor, segment);
    const status = await lstatOrNull(cursor);
    if (!status)
      throw new Error(
        `protected_input_parent_not_found:${label}:${display(cursor)}`,
      );
    if (status.isSymbolicLink())
      throw new Error(
        `protected_input_parent_symlink_not_allowed:${label}:${display(cursor)}`,
      );
    if (!status.isDirectory())
      throw new Error(
        `protected_input_parent_not_directory:${label}:${display(cursor)}`,
      );
    assertInside(canonicalRepository, await realpath(cursor), label, cursor);
  }
}

function assertRegularNoFollow(
  info: Stats,
  label: string,
  original: string,
): void {
  if (info.isSymbolicLink())
    throw new Error(
      `protected_input_symlink_not_allowed:${label}:${display(original)}`,
    );
  if (!info.isFile())
    throw new Error(
      `protected_input_not_regular_file:${label}:${display(original)}`,
    );
  if (typeof info.nlink === "number" && info.nlink > 1)
    throw new Error(
      `protected_input_hardlink_not_allowed:${label}:${display(original)}`,
    );
}

function repositoryRelative(
  repository: string,
  candidate: string,
  label: string,
): string {
  const relative = path.relative(repository, candidate);
  if (!inside(repository, candidate))
    throw new Error(
      `protected_input_realpath_outside_repository:${label}:${display(candidate)}`,
    );
  return relative;
}

function assertInside(
  repository: string,
  candidate: string,
  label: string,
  original: string,
): void {
  if (!inside(repository, candidate))
    throw new Error(
      `protected_input_realpath_outside_repository:${label}:${display(original)}`,
    );
}

function inside(repository: string, candidate: string): boolean {
  const relative = path.relative(repository, candidate);
  return (
    relative === "" ||
    (relative !== ".." &&
      !relative.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relative))
  );
}

async function lstatOrNull(target: string): Promise<Stats | null> {
  try {
    return await lstat(target);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

function display(file: string): string {
  return file.replace(/\\/gu, "/");
}
