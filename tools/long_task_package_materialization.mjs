import { createHash } from "node:crypto";
import { mkdir, readFile, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { npmCommandSpec } from "./npm_command_spec.mjs";
import { readPackedPackageIdentity } from "./long_task_packed_package_identity.mjs";
import { FORMAL_EVIDENCE_CAPACITY } from "./long_task_real_process_schema_policy.mjs";
import {
  rawGitText,
  removeGitWorktree,
  recordedGitText,
  recordedText,
  requireMaterializationSuccess,
  runMaterializationCommand,
} from "./long_task_package_materialization_commands.mjs";

const protocol = "npm-ci-build-check-source-pack-v1";
const commitPattern = /^[a-f0-9]{40}$/u;

export async function materializeLongTaskPackage(options) {
  assertExactOptions(options);
  const repositoryRoot = path.resolve(options.repositoryRoot);
  const checkout = path.resolve(options.checkout);
  const outputDir = path.resolve(options.outputDir);
  const commit = options.commit;
  if (!commitPattern.test(commit))
    throw new Error("long_task_package_materialization_commit");
  assertDistinctTargets(repositoryRoot, checkout, outputDir);
  await mkdir(path.dirname(outputDir), { recursive: true });
  await mkdir(outputDir, { recursive: false });
  const commandRecords = [];
  let worktreeAdded = false;
  try {
    const add = await runMaterializationCommand({
      command: "git",
      args: ["worktree", "add", "--detach", checkout, commit],
      cwd: repositoryRoot,
      outputDir,
      label: "git-worktree-add",
      timeout: 120_000,
    });
    commandRecords.push(add);
    requireMaterializationSuccess(add, "worktree_add");
    worktreeAdded = true;

    const head = await recordedGitText(
      checkout,
      ["rev-parse", "HEAD"],
      outputDir,
      "candidate-head",
      commandRecords,
    );
    const tree = await recordedGitText(
      checkout,
      ["rev-parse", "HEAD^{tree}"],
      outputDir,
      "candidate-tree",
      commandRecords,
    );
    if (head !== commit || !commitPattern.test(tree))
      throw new Error("long_task_package_materialization_git_identity");

    const npmCi = npmCommandSpec(["ci"]);
    commandRecords.push(
      await runMaterializationCommand({
        command: npmCi.command,
        args: npmCi.args,
        cwd: checkout,
        outputDir,
        label: "npm-ci",
        timeout: 10 * 60_000,
      }),
    );
    requireMaterializationSuccess(commandRecords.at(-1), "npm_ci");

    const build = npmCommandSpec([
      "run",
      "build",
      "--workspace",
      "project-tiny-context-harness",
    ]);
    commandRecords.push(
      await runMaterializationCommand({
        command: build.command,
        args: build.args,
        cwd: checkout,
        outputDir,
        label: "package-build",
        timeout: 10 * 60_000,
      }),
    );
    requireMaterializationSuccess(commandRecords.at(-1), "build");

    commandRecords.push(
      await runMaterializationCommand({
        command: process.execPath,
        args: ["packages/ty-context/dist/cli.js", "package", "check-source"],
        cwd: checkout,
        outputDir,
        label: "package-check-source",
        timeout: 10 * 60_000,
      }),
    );
    requireMaterializationSuccess(commandRecords.at(-1), "check_source");

    const packDir = path.join(outputDir, "pack");
    await mkdir(packDir, { recursive: false });
    const pack = npmCommandSpec([
      "pack",
      "--workspace",
      "project-tiny-context-harness",
      "--pack-destination",
      packDir,
      "--ignore-scripts",
    ]);
    commandRecords.push(
      await runMaterializationCommand({
        command: pack.command,
        args: pack.args,
        cwd: checkout,
        outputDir,
        label: "package-pack",
        timeout: 10 * 60_000,
      }),
    );
    requireMaterializationSuccess(commandRecords.at(-1), "pack");

    const npmVersion = await recordedText(
      npmCommandSpec(["--version"]),
      checkout,
      outputDir,
      "npm-version",
      commandRecords,
    );
    const status = await recordedGitText(
      checkout,
      ["status", "--porcelain=v1", "--untracked-files=no"],
      outputDir,
      "candidate-status",
      commandRecords,
    );
    const finalHead = await rawGitText(checkout, ["rev-parse", "HEAD"]);
    const finalTree = await rawGitText(checkout, ["rev-parse", "HEAD^{tree}"]);
    if (status !== "" || finalHead !== head || finalTree !== tree)
      throw new Error("long_task_package_materialization_tracked_drift");

    const tarballs = (await readdir(packDir)).filter((name) =>
      name.endsWith(".tgz"),
    );
    if (tarballs.length !== 1)
      throw new Error(
        `long_task_package_materialization_pack_count:${tarballs.length}`,
      );
    const tarballPath = path.join(packDir, tarballs[0]);
    const tarballBytes = await readFile(tarballPath);
    if (
      tarballBytes.length === 0 ||
      tarballBytes.length >
        FORMAL_EVIDENCE_CAPACITY.maximum_package_tarball_bytes
    )
      throw new Error("long_task_package_materialization_tarball_budget");
    const packed = readPackedPackageIdentity(tarballBytes);
    const [lockfileBytes, nodeExecutableBytes] = await Promise.all([
      readFile(path.join(checkout, "package-lock.json")),
      readFile(process.execPath),
    ]);
    const record = Object.freeze({
      schema_version: "long-task-package-materialization-v1",
      commit: head,
      tree,
      package_name: packed.package_name,
      package_version: packed.package_version,
      package_sha256: packed.package_sha256,
      package_file_set_sha256: packed.package_file_set_sha256,
      lockfile_sha256: digest(lockfileBytes),
      node_version: process.version,
      node_executable_sha256: digest(nodeExecutableBytes),
      npm_version: npmVersion,
      protocol,
      command_records: Object.freeze(commandRecords.map(Object.freeze)),
    });
    return Object.freeze({
      checkout,
      tarball_path: tarballPath,
      tarball_bytes: Buffer.from(tarballBytes),
      record,
    });
  } catch (error) {
    if (worktreeAdded)
      try {
        await removeGitWorktree(repositoryRoot, checkout);
      } catch (cleanupError) {
        error.cause ??= cleanupError;
      }
    throw error;
  }
}

export const LONG_TASK_PACKAGE_MATERIALIZATION_PROTOCOL = protocol;

function assertExactOptions(options) {
  if (
    !options ||
    typeof options !== "object" ||
    Array.isArray(options) ||
    Object.keys(options).sort().join(",") !==
      "checkout,commit,outputDir,repositoryRoot"
  )
    throw new Error("long_task_package_materialization_options");
}

function assertDistinctTargets(repositoryRoot, checkout, outputDir) {
  const normalize = (value) =>
    process.platform === "win32" ? value.toLowerCase() : value;
  const repository = normalize(repositoryRoot);
  const checkoutTarget = normalize(checkout);
  const outputTarget = normalize(outputDir);
  const temporaryRoot = normalize(path.resolve(os.tmpdir()));
  if (
    checkoutTarget === repository ||
    outputTarget === repository ||
    checkoutTarget === outputTarget ||
    checkoutTarget.startsWith(`${repository}${path.sep}`) ||
    outputTarget.startsWith(`${checkoutTarget}${path.sep}`) ||
    checkoutTarget.startsWith(`${outputTarget}${path.sep}`) ||
    !checkoutTarget.startsWith(`${temporaryRoot}${path.sep}`) ||
    path.relative(temporaryRoot, checkoutTarget).split(path.sep).length < 2
  )
    throw new Error("long_task_package_materialization_paths");
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}
