import { link, open, unlink } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { canonicalJson } from "../strict-codec.js";
import type { ContextMutationJournal } from "./mutation-types.js";

const WINDOWS_IO_ATTEMPTS = 32;

export async function writeJournalTemporary(
  temporary: string,
  journal: ContextMutationJournal,
): Promise<void> {
  const handle = await open(temporary, "wx", 0o600);
  try {
    await handle.writeFile(canonicalJson(journal), "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
}

export async function linkJournalTemporary(
  source: string,
  target: string,
): Promise<void> {
  await retryWindowsIo(() => link(source, target), false);
}

export async function unlinkJournalPath(target: string): Promise<void> {
  await retryWindowsIo(() => unlink(target), true);
}

export async function syncJournalDirectory(directory: string): Promise<void> {
  let handle;
  try {
    handle = await open(directory, "r");
    await handle.sync();
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (
      process.platform === "win32" &&
      ["EACCES", "EINVAL", "EPERM"].includes(code ?? "")
    )
      return;
    throw error;
  } finally {
    await handle?.close();
  }
}

async function retryWindowsIo(
  operation: () => Promise<void>,
  missingIsSuccess: boolean,
): Promise<void> {
  const retryable = new Set(["EACCES", "EBUSY", "EPERM"]);
  const attempts = process.platform === "win32" ? WINDOWS_IO_ATTEMPTS : 1;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      await operation();
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code ?? "";
      if (missingIsSuccess && code === "ENOENT") return;
      if (attempt + 1 === attempts || !retryable.has(code)) throw error;
      await delay(Math.min(250, 10 * 2 ** attempt));
    }
  }
}
