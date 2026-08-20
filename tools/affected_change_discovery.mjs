import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { normalizeRepositoryPath } from "./test_suite_policy.mjs";

const exec = promisify(execFile);

export async function resolveAffectedChanges(options = {}) {
  const explicitPaths = options.explicitPaths ?? [];
  if (explicitPaths.length > 0) {
    return result(explicitPaths, {
      source: "explicit-paths",
      base: null,
      includes_worktree: false,
    });
  }

  const repository = options.repository ?? process.cwd();
  const environment = options.environment ?? process.env;
  const git = options.git ?? createGitDiscoveryClient(repository);
  const worktree = await workingTreeChanges(git);
  const ignoredUntrackedLocalArtifacts = isCi(environment)
    ? []
    : unique(worktree.untracked.filter(isIgnoredUntrackedLocalArtifact));
  const includedUntracked = isCi(environment)
    ? worktree.untracked
    : worktree.untracked.filter(
        (path) => !isIgnoredUntrackedLocalArtifact(path),
      );
  const workingPaths = unique([...worktree.tracked, ...includedUntracked]);
  const localArtifactDiscovery = ignoredUntrackedLocalArtifacts.length
    ? { ignored_untracked_local_artifacts: ignoredUntrackedLocalArtifacts }
    : {};
  const requestedBase = requestedComparisonBase(
    options.explicitBase ?? null,
    environment,
  );

  if (requestedBase) {
    await requireBase(git, requestedBase.base);
    const comparisonPaths = await git.comparisonPaths(requestedBase.base);
    return result([...comparisonPaths, ...workingPaths], {
      source: requestedBase.source,
      base: requestedBase.base,
      includes_worktree: workingPaths.length > 0,
      ...localArtifactDiscovery,
    });
  }

  if (!isCi(environment) && workingPaths.length > 0) {
    return result(workingPaths, {
      source: "local-worktree",
      base: null,
      includes_worktree: true,
      ...localArtifactDiscovery,
    });
  }

  const fallbackBase = "HEAD^";
  if (await git.refExists(fallbackBase)) {
    const comparisonPaths = await git.comparisonPaths(fallbackBase);
    return result([...comparisonPaths, ...workingPaths], {
      source: isCi(environment) ? "ci-head-parent" : "local-head-parent",
      base: fallbackBase,
      includes_worktree: workingPaths.length > 0,
      ...localArtifactDiscovery,
    });
  }

  return result(workingPaths, {
    source: workingPaths.length > 0 ? "worktree-no-parent" : "empty-history",
    base: null,
    includes_worktree: workingPaths.length > 0,
    ...localArtifactDiscovery,
  });
}

function requestedComparisonBase(explicitBase, environment) {
  if (explicitBase)
    return { source: "explicit-base", base: explicitBase.trim() };
  if (environment.AFFECTED_BASE)
    return {
      source: "environment-base",
      base: environment.AFFECTED_BASE.trim(),
    };
  if (isCi(environment) && environment.GITHUB_BASE_SHA)
    return {
      source: "ci-base-sha",
      base: environment.GITHUB_BASE_SHA.trim(),
    };
  if (isCi(environment) && environment.GITHUB_BASE_REF)
    return {
      source: "ci-base-ref",
      base: `origin/${environment.GITHUB_BASE_REF.trim()}`,
    };
  return null;
}

async function requireBase(git, base) {
  if (!(await git.refExists(base)))
    throw new Error(`affected-test base ref does not exist: ${base}`);
}

function createGitDiscoveryClient(repository) {
  return {
    async workingTreeChanges() {
      const tracked = await gitLines(repository, [
        "diff",
        "--name-only",
        "--diff-filter=ACMRTD",
        "HEAD",
      ]);
      const untracked = await gitLines(repository, [
        "ls-files",
        "--others",
        "--exclude-standard",
      ]);
      return { tracked, untracked };
    },
    async comparisonPaths(base) {
      return gitLines(repository, [
        "diff",
        "--name-only",
        "--diff-filter=ACMRTD",
        `${base}...HEAD`,
      ]);
    },
    async refExists(ref) {
      try {
        await exec("git", ["rev-parse", "--verify", `${ref}^{commit}`], {
          cwd: repository,
          windowsHide: true,
        });
        return true;
      } catch {
        return false;
      }
    },
  };
}

async function workingTreeChanges(git) {
  if (typeof git.workingTreeChanges === "function")
    return git.workingTreeChanges();
  return { tracked: await git.workingTreePaths(), untracked: [] };
}

export function isIgnoredUntrackedLocalArtifact(value) {
  const normalized = normalizeRepositoryPath(value);
  return (
    normalized === ".work_products" ||
    normalized.startsWith(".work_products/")
  );
}

async function gitLines(repository, args) {
  const output = await exec("git", args, {
    cwd: repository,
    windowsHide: true,
  });
  return output.stdout.split(/\r?\n/u).filter(Boolean);
}

function result(paths, discovery) {
  return {
    paths: unique(paths),
    discovery,
  };
}

function unique(paths) {
  return [
    ...new Set(paths.map(normalizeRepositoryPath).filter(Boolean)),
  ].sort();
}

function isCi(environment) {
  return environment.CI === "true" || environment.CI === "1";
}
