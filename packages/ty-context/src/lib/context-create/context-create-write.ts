import { randomUUID } from "node:crypto";
import { link, open, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { CLI_EXIT_CODES, CliCommandError } from "../cli-exit.js";
import {
  assertSafeRepositoryFilePath,
  ensureSafeRepositoryDirectory,
} from "../repository-path-safety.js";

export async function publishContextScaffold(
  repository: string,
  relativePath: string,
  bytes: Uint8Array,
): Promise<void> {
  const parent = path.posix.dirname(relativePath);
  const directory = await ensureSafeRepositoryDirectory(
    repository,
    parent,
    "context_create_parent",
  ).catch(asIoFailure);
  const destination = await assertSafeRepositoryFilePath(
    repository,
    relativePath,
    "context_create_target",
    { destinationMayBeAbsent: true },
  ).catch(asIoFailure);
  if (destination.status) collision(relativePath);

  const temporary = path.join(
    directory.absolute,
    `.${path.basename(destination.absolute)}.ty-context-create-${randomUUID()}.tmp`,
  );
  let temporaryExists = false;
  let published = false;
  try {
    const handle = await open(temporary, "wx", 0o666);
    temporaryExists = true;
    try {
      await handle.writeFile(bytes);
      await handle.sync();
    } finally {
      await handle.close();
    }
    const staged = await readFile(temporary);
    if (!Buffer.from(bytes).equals(staged))
      throw new Error("context_create_temporary_readback_mismatch");
    await assertDestinationAbsent(repository, relativePath);
    try {
      await link(temporary, destination.absolute);
      published = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST")
        collision(relativePath);
      throw error;
    }
    await unlink(temporary);
    temporaryExists = false;
    const finalBytes = await readFile(destination.absolute);
    if (!Buffer.from(bytes).equals(finalBytes))
      throw new Error("context_create_final_readback_mismatch");
  } catch (error) {
    const cleanup = temporaryExists
      ? await removeTemporary(temporary)
      : undefined;
    if (cleanup)
      throw new AggregateError(
        [error, cleanup],
        published
          ? `context create published ${relativePath}, but temporary cleanup failed`
          : `context create failed and temporary cleanup failed for ${relativePath}`,
      );
    if (error instanceof CliCommandError) throw error;
    throw new CliCommandError(
      CLI_EXIT_CODES.io,
      published
        ? `context create published ${relativePath}, but final verification failed: ${message(error)}`
        : `unable to create Context scaffold ${relativePath}: ${message(error)}`,
      { cause: error },
    );
  }
}

async function assertDestinationAbsent(
  repository: string,
  relativePath: string,
): Promise<void> {
  const destination = await assertSafeRepositoryFilePath(
    repository,
    relativePath,
    "context_create_target",
    { destinationMayBeAbsent: true },
  ).catch(asIoFailure);
  if (destination.status) collision(relativePath);
}

async function removeTemporary(temporary: string): Promise<unknown> {
  try {
    await unlink(temporary);
    return undefined;
  } catch (error) {
    return error;
  }
}

function collision(relativePath: string): never {
  throw new CliCommandError(
    CLI_EXIT_CODES.io,
    `context create refuses to overwrite existing target: ${relativePath}`,
  );
}

function asIoFailure(error: unknown): never {
  if (error instanceof CliCommandError) throw error;
  throw new CliCommandError(CLI_EXIT_CODES.io, message(error), {
    cause: error,
  });
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
