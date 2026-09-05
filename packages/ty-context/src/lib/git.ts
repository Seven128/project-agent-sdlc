import { spawn } from "node:child_process";
import { realpath, stat } from "node:fs/promises";
import path from "node:path";

export class GitCommandError extends Error {
  readonly exitCode: number | null;
  readonly signal: NodeJS.Signals | null;
  readonly stdoutBytes: number;
  readonly stderrBytes: number;

  constructor(
    exitCode: number | null,
    signal: NodeJS.Signals | null,
    argv: string[],
    stdout: Buffer,
    stderr: Buffer,
  ) {
    const stderrText = stderr.toString("utf8").trim();
    super(
      `git_exit:${exitCode ?? "null"}:${argv.join(" ")}:signal=${signal ?? "none"}:stdout_bytes=${stdout.length}:stderr=${stderrText}`,
    );
    this.name = "GitCommandError";
    this.exitCode = exitCode;
    this.signal = signal;
    this.stdoutBytes = stdout.length;
    this.stderrBytes = stderr.length;
  }
}

export async function repositoryRoot(start: string): Promise<string> {
  const resolved = path.resolve(start);
  const gitEntry = await stat(path.join(resolved, ".git")).catch(() => null);
  if (gitEntry?.isDirectory() || gitEntry?.isFile()) return realpath(resolved);
  return realpath(
    path.resolve(await gitOutput(resolved, ["rev-parse", "--show-toplevel"])),
  );
}

export async function gitCommonDir(root: string): Promise<string> {
  return path.resolve(
    await gitOutput(root, [
      "rev-parse",
      "--path-format=absolute",
      "--git-common-dir",
    ]),
  );
}

export async function currentGitState(root: string): Promise<{
  head: string;
  tree: string;
  dirty: string[];
}> {
  const [head, tree, raw] = await Promise.all([
    gitOutput(root, ["rev-parse", "HEAD"]),
    gitOutput(root, ["rev-parse", "HEAD^{tree}"]),
    gitOutput(root, ["status", "--short", "--untracked-files=all"]),
  ]);
  return {
    head,
    tree,
    dirty: raw ? raw.split(/\r?\n/u).filter(Boolean) : [],
  };
}

export async function currentGitTree(root: string): Promise<string> {
  return gitOutput(root, ["rev-parse", "HEAD^{tree}"]);
}

export async function gitPath(root: string, pathSpec: string): Promise<string> {
  return path.resolve(
    await gitOutput(root, [
      "rev-parse",
      "--path-format=absolute",
      "--git-path",
      pathSpec,
    ]),
  );
}

export async function gitConfigGet(
  root: string,
  name: string,
): Promise<string | null> {
  try {
    return await gitOutput(root, ["config", "--local", "--get", name]);
  } catch (error) {
    if (error instanceof GitCommandError && error.exitCode === 1) return null;
    throw error;
  }
}

export async function gitEffectiveConfigGet(
  root: string,
  name: string,
): Promise<string | null> {
  try {
    return await gitOutput(root, ["config", "--get", name]);
  } catch (error) {
    if (error instanceof GitCommandError && error.exitCode === 1) return null;
    throw error;
  }
}

export async function gitConfigSet(
  root: string,
  name: string,
  value: string,
): Promise<void> {
  await gitVoid(root, ["config", "--local", name, value]);
}

export async function gitConfigUnset(
  root: string,
  name: string,
): Promise<void> {
  try {
    await gitVoid(root, ["config", "--local", "--unset-all", name]);
  } catch (error) {
    if (!(error instanceof GitCommandError) || error.exitCode !== 5)
      throw error;
  }
}

export function repoRelative(rootInput: string, fileInput: string): string {
  const value = path
    .relative(path.resolve(rootInput), path.resolve(fileInput))
    .replace(/\\/gu, "/");
  if (value.startsWith("../") || path.isAbsolute(value))
    throw new Error(`path_outside_repository:${fileInput}`);
  return value;
}

export async function gitOutput(root: string, argv: string[]): Promise<string> {
  return (await gitBuffer(root, argv)).toString("utf8").trim();
}

export async function gitVoid(root: string, argv: string[]): Promise<void> {
  await gitBuffer(root, argv);
}

export async function gitBuffer(root: string, argv: string[]): Promise<Buffer> {
  return gitBufferInput(root, argv);
}

export async function gitBufferInput(
  root: string,
  argv: string[],
  input?: Buffer,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn("git", argv, {
      cwd: root,
      shell: false,
      windowsHide: true,
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
    child.on("error", reject);
    child.stdin.end(input);
    child.on("close", (code, signal) => {
      const stdoutBytes = Buffer.concat(stdout);
      const stderrBytes = Buffer.concat(stderr);
      if (code === 0) resolve(stdoutBytes);
      else
        reject(
          new GitCommandError(
            code,
            signal as NodeJS.Signals | null,
            argv,
            stdoutBytes,
            stderrBytes,
          ),
        );
    });
  });
}

export function splitGitZero(value: Buffer): string[] {
  return value.toString("utf8").split("\0").filter(Boolean);
}
