import { AsyncLocalStorage } from "node:async_hooks";
import path from "node:path";
import type { ActiveAuthorityLockToken } from "./long-task-state.js";

const activeAuthorityLockTokens = new WeakSet<object>();
const activeAuthorityLockContext =
  new AsyncLocalStorage<ActiveAuthorityLockToken>();

export async function runWithActiveAuthorityLockToken<T>(
  token: ActiveAuthorityLockToken,
  action: () => Promise<T>,
): Promise<T> {
  activeAuthorityLockTokens.add(token);
  try {
    return await activeAuthorityLockContext.run(token, action);
  } finally {
    activeAuthorityLockTokens.delete(token);
  }
}

export function assertActiveAuthorityLockToken(
  token: ActiveAuthorityLockToken,
  repositoryRoot: string,
): void {
  if (
    !activeAuthorityLockTokens.has(token) ||
    normalizePath(token.repository_root) !== normalizePath(repositoryRoot)
  )
    throw new Error("active_authority_lock_token_invalid");
}

export function currentActiveAuthorityLockToken(
  repositoryRoot: string,
): ActiveAuthorityLockToken | null {
  const token = activeAuthorityLockContext.getStore();
  if (!token) return null;
  assertActiveAuthorityLockToken(token, repositoryRoot);
  return token;
}

function normalizePath(value: string): string {
  const normalized = path.resolve(value).replace(/\\/gu, "/");
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}
