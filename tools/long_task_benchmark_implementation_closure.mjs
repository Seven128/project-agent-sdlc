import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import {
  BENCHMARK_IMPLEMENTATION_EXTENSIONS,
  localImplementationDependencies,
} from "./long_task_benchmark_implementation_closure_dependencies.mjs";

const execFileAsync = promisify(execFile);
const codeExtensions = new Set([".cjs", ".js", ".mjs"]);
const admittedExtensions = new Set(BENCHMARK_IMPLEMENTATION_EXTENSIONS);
const shaPattern = /^[a-f0-9]{40}$/u;

export async function assertBenchmarkImplementationClosureAtWorkingTree(
  options,
) {
  assertExactOptions(options, ["implementationPaths", "repositoryRoot"]);
  const repositoryRoot = path.resolve(options.repositoryRoot);
  return assertClosure({
    implementationPaths: options.implementationPaths,
    load: async (repositoryPath) =>
      readFile(resolveRepositoryPath(repositoryRoot, repositoryPath)),
  });
}

export async function assertBenchmarkImplementationClosureAtCommit(options) {
  assertExactOptions(options, [
    "commit",
    "implementationPaths",
    "repositoryRoot",
  ]);
  if (!shaPattern.test(options.commit))
    throw new Error("benchmark_implementation_closure_commit");
  const repositoryRoot = path.resolve(options.repositoryRoot);
  return assertClosure({
    implementationPaths: options.implementationPaths,
    load: async (repositoryPath) => {
      try {
        const result = await execFileAsync(
          "git",
          ["show", `${options.commit}:${repositoryPath}`],
          {
            cwd: repositoryRoot,
            windowsHide: true,
            encoding: "buffer",
            timeout: 30_000,
            maxBuffer: 8 * 1024 * 1024,
          },
        );
        if (result.stderr.length !== 0)
          throw new Error("benchmark_implementation_closure_git_stderr");
        return Buffer.from(result.stdout);
      } catch (error) {
        throw new Error(
          `benchmark_implementation_closure_missing:${repositoryPath}`,
          { cause: error },
        );
      }
    },
  });
}

async function assertClosure({ implementationPaths, load }) {
  const paths = validateImplementationPaths(implementationPaths);
  const admitted = new Set(paths);
  const resolvedDependencies = new Set();
  for (const repositoryPath of paths) {
    let bytes;
    try {
      bytes = await load(repositoryPath);
    } catch (error) {
      if (String(error?.message).startsWith("benchmark_implementation_closure_"))
        throw error;
      throw new Error(
        `benchmark_implementation_closure_missing:${repositoryPath}`,
        { cause: error },
      );
    }
    if (!Buffer.isBuffer(bytes) || bytes.length === 0)
      throw new Error(
        `benchmark_implementation_closure_empty:${repositoryPath}`,
      );
    if (!codeExtensions.has(path.posix.extname(repositoryPath))) continue;
    let source;
    try {
      source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch (error) {
      throw new Error(
        `benchmark_implementation_closure_utf8:${repositoryPath}`,
        { cause: error },
      );
    }
    for (const dependency of localImplementationDependencies(
      source,
      repositoryPath,
    )) {
      resolvedDependencies.add(dependency);
      if (!admitted.has(dependency))
        throw new Error(
          `benchmark_implementation_closure_unlisted:${repositoryPath}:${dependency}`,
        );
    }
  }
  return Object.freeze({
    implementation_path_count: paths.length,
    local_dependency_count: resolvedDependencies.size,
  });
}

function validateImplementationPaths(value) {
  if (!Array.isArray(value) || value.length === 0)
    throw new Error("benchmark_implementation_closure_paths");
  const seen = new Set();
  const result = [];
  for (const repositoryPath of value) {
    if (
      typeof repositoryPath !== "string" ||
      repositoryPath.length === 0 ||
      repositoryPath.includes("\\") ||
      repositoryPath.startsWith("/") ||
      repositoryPath.split("/").some((segment) => !segment || segment === "..") ||
      !admittedExtensions.has(path.posix.extname(repositoryPath)) ||
      seen.has(repositoryPath)
    )
      throw new Error("benchmark_implementation_closure_paths");
    seen.add(repositoryPath);
    result.push(repositoryPath);
  }
  return result;
}

function resolveRepositoryPath(repositoryRoot, repositoryPath) {
  const resolved = path.resolve(
    repositoryRoot,
    ...repositoryPath.split("/"),
  );
  const relative = path.relative(repositoryRoot, resolved);
  if (
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  )
    throw new Error("benchmark_implementation_closure_escape");
  return resolved;
}

function assertExactOptions(value, expectedKeys) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).sort().join(",") !==
      [...expectedKeys].sort().join(",") ||
    typeof value.repositoryRoot !== "string"
  )
    throw new Error("benchmark_implementation_closure_options");
}
