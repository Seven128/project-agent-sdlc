import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  access,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { createWindowsJobSupervisorRequest } from "../../packages/ty-context/dist/lib/long-task-windows-job-supervisor-protocol.js";
import {
  parsePackJson,
  runCommand,
} from "../../tools/release_publish_helpers.mjs";
import {
  assertNoProcessCommandLineToken,
  execFileAsync,
  helperNames,
  packagedHelperRoot,
  repositoryRoot,
  runPowerShellHelper,
  windowsPowerShellExecutable,
} from "./long-task-windows-job-supervisor-test-support.mjs";
import { runOwnedChildProcess } from "./helpers/owned-child-process.mjs";

export async function assertAssignFailureCannotResume() {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "windows-job-assign-failure-"),
  );
  const helperRoot = path.join(root, "helper");
  await mkdir(helperRoot);
  try {
    for (const name of helperNames)
      await copyFile(
        path.join(packagedHelperRoot, name),
        path.join(helperRoot, name),
      );
    const nativeRun = path.join(
      helperRoot,
      "formal_process_supervisor_native_run.cs",
    );
    const source = await readFile(nativeRun, "utf8");
    const injected = source.replace(
      'Check(AssignProcessToJobObject(job, process.hProcess), "assign_process_to_job");',
      'Check(false, "assign_process_to_job_injected");',
    );
    assert.notEqual(injected, source, "assign fault injection point missing");
    await writeFile(nativeRun, injected, "utf8");

    const marker = path.join(root, "resumed.txt");
    const token = `assign-failure-${randomUUID()}`;
    const request = createWindowsJobSupervisorRequest({
      requestId: token,
      executable: process.execPath,
      argv: [
        "-e",
        "require('node:fs').writeFileSync(process.argv[1], 'resumed')",
        marker,
        token,
      ],
      cwd: root,
      stdoutPath: path.join(root, "stdout.bin"),
      stderrPath: path.join(root, "stderr.bin"),
      timeoutMs: 5_000,
      combinedOutputLimitBytes: 2 * 1024 * 1024,
      environment: process.env,
    });
    const response = await runPowerShellHelper(
      await windowsPowerShellExecutable(),
      path.join(helperRoot, "windows_job_process_supervisor.ps1"),
      [JSON.stringify(request)],
    );
    const failure = JSON.parse(response.stdout.trim());
    assert.equal(failure.RequestId, token);
    assert.match(
      failure.Error,
      /formal_process_supervisor_assign_process_to_job_injected/u,
    );
    await assert.rejects(access(marker), { code: "ENOENT" });
    await assertNoProcessCommandLineToken(token);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

export async function assertPackedTarballUsesPackageHelper() {
  const root = await mkdtemp(path.join(os.tmpdir(), "windows-job-tarball-"));
  try {
    const packed = await runCommand(
      "npm",
      [
        "pack",
        "--json",
        "--workspace",
        "project-tiny-context-harness",
        "--pack-destination",
        root,
        "--ignore-scripts",
      ],
      { cwd: repositoryRoot, capture: true },
    );
    const pack = parsePackJson(packed.output);
    const packedPaths = new Set(pack.files.map((entry) => entry.path));
    for (const name of helperNames)
      assert.ok(
        packedPaths.has(`assets/runtime/windows-job-supervisor/${name}`),
        `${name} missing from tarball`,
      );
    const extracted = path.join(root, "extracted");
    await mkdir(extracted);
    await execFileAsync(
      process.platform === "win32" ? "tar.exe" : "tar",
      ["-xzf", path.join(root, pack.filename), "-C", extracted],
      { maxBuffer: 2 * 1024 * 1024 },
    );
    await symlink(
      path.join(repositoryRoot, "node_modules"),
      path.join(extracted, "package", "node_modules"),
      "junction",
    );
    const moduleUrl = `${
      pathToFileURL(
        path.join(
          extracted,
          "package",
          "dist",
          "lib",
          "long-task-command-process.js",
        ),
      ).href
    }?tarball=${Date.now()}`;
    const script = path.join(root, "tarball-product.mjs");
    await writeFile(script, 'console.log("tarball-helper")\n', "utf8");
    const child = await runOwnedChildProcess(
      process.execPath,
      [
        fileURLToPath(
          new URL(
            "./long-task-windows-job-supervisor-package-child.mjs",
            import.meta.url,
          ),
        ),
        moduleUrl,
        script,
        root,
      ],
      {
        timeoutMs: 30_000,
      },
    );
    assert.equal(child.status, 0, child.stderr);
    const execution = JSON.parse(child.stdout);
    assert.equal(execution.exit_code, 0);
    assert.equal(
      Buffer.from(execution.stdout_base64, "base64").toString("utf8"),
      "tarball-helper\n",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
