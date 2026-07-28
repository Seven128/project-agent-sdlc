import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
  cp,
  mkdtemp,
  readFile,
  rename,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {
  loadActiveLongTaskAuthority,
  readProgressRecords,
} from "../../packages/ty-context/dist/lib/long-task-state.js";
import {
  commitCandidate,
  createDeliveryFixture,
  parseCliJson,
  pathExists,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";

const exec = promisify(execFile);
const repository = fileURLToPath(new URL("../..", import.meta.url));
const sourcePackage = path.join(repository, "packages", "ty-context");
const dependencyRoot = path.join(repository, "node_modules");
test("Verifier relocation is automatic while content changes require approval", async () => {
  const packagesRoot = await mkdtemp(
    path.join(os.tmpdir(), "ty-context-verifier-packages-"),
  );
  const fixture = await createDeliveryFixture();
  try {
    const packageA = await copyPackage(packagesRoot, "package-a");
    fixture.contract.outcomes[0].product.owner.path_globs.push(
      ".codex/hooks.json",
    );
    fixture.contract.outcomes[0].technical.allowed_support_paths.push(
      ".codex/hooks.json",
    );
    await writeContract(fixture.workdir, fixture.contract);
    await runPackageCli(packageA, fixture.root, ["enable", "long-task"]);
    const first = await runPackageCli(packageA, fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
    ]);
    await runPackageCli(packageA, fixture.root, [
      "long-task",
      "verify",
      fixture.workdir,
    ]);
    await commitCandidate(fixture.root);
    const accepted = await runPackageCli(packageA, fixture.root, [
      "long-task",
      "final-gate",
      fixture.workdir,
    ]);
    assert.equal(accepted.workflow_status, "machine_accepted");
    const initialBase = (
      await loadActiveLongTaskAuthority(fixture.root)
    ).authority.initial_task_base;
    const packageB = path.join(packagesRoot, "package-b");
    await rename(packageA, packageB);
    await runPackageCli(packageB, fixture.root, ["enable", "long-task"]);
    await assertPackageFailure(
      packageB,
      fixture.root,
      ["long-task", "verify", fixture.workdir],
      /verifier_authority_migration_required/u,
    );
    await assertPackageFailure(
      packageB,
      fixture.root,
      ["long-task", "final-gate", fixture.workdir],
      /verifier_authority_migration_required/u,
    );
    await assertPackageFailure(
      packageB,
      fixture.root,
      ["long-task", "stop-check", fixture.workdir],
      /verifier_authority_migration_required/u,
    );
    await assertPackageFailure(
      packageB,
      fixture.root,
      ["long-task", "close", fixture.workdir],
      /verifier_authority_migration_required/u,
    );
    await assertPackageFailure(
      packageB,
      fixture.root,
      ["long-task", "compile", fixture.workdir],
      /authority_revision_requires_revise_flag/u,
    );
    const relocated = await runPackageCli(packageB, fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
      "--revise",
    ]);
    assert.equal(relocated.authority_revision, 2);
    let active = (
      await loadActiveLongTaskAuthority(fixture.root)
    ).authority;
    assert.equal(
      path.resolve(active.verifier_identity.package_root),
      path.resolve(packageB),
    );
    assert.deepEqual(active.initial_task_base, initialBase);
    assert.deepEqual(await readProgressRecords(fixture.workdir), {});
    assert.equal(
      await pathExists(
        path.join(fixture.workdir, ".ty-context", "final-receipt.json"),
      ),
      false,
    );
    const packageC = path.join(packagesRoot, "package-c");
    await rename(packageB, packageC);
    await setPackageVersion(packageC, "0.6.0-relocated.0");
    await runPackageCli(packageC, fixture.root, ["enable", "long-task"]);
    await assertPackageFailure(
      packageC,
      fixture.root,
      ["long-task", "compile", fixture.workdir],
      /authority_revision_requires_revise_flag/u,
    );
    const versionRelocated = await runPackageCli(packageC, fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
      "--revise",
    ]);
    assert.equal(versionRelocated.authority_revision, 3);
    active = (await loadActiveLongTaskAuthority(fixture.root)).authority;
    assert.equal(
      active.verifier_identity.package_version,
      "0.6.0-relocated.0",
    );
    assert.deepEqual(active.initial_task_base, initialBase);
    const changedPackage = path.join(packagesRoot, "package-changed");
    await rename(packageC, changedPackage);
    for (const [index, scenario] of [
      {
        name: "bundle",
        relativeFile: "dist/lib/long-task-status-projection.js",
        mutate: async (file) => {
          await writeFile(
            file,
            `${await readFile(file, "utf8")}\n// verifier bundle change\n`,
          );
        },
        expectedFile: "lib/long-task-status-projection.js",
      },
      {
        name: "schema",
        relativeFile:
          "dist/schemas/long-task-delivery-v2/long-task-delivery-v2.schema.json",
        mutate: async (file) => {
          const schema = JSON.parse(await readFile(file, "utf8"));
          schema.$comment = "verifier schema change";
          await writeFile(file, `${JSON.stringify(schema)}\n`);
        },
        expectedFile: "<schema>",
      },
      {
        name: "hook",
        relativeFile: "dist/long-task-hook.js",
        mutate: async (file) => {
          await writeFile(
            file,
            `${await readFile(file, "utf8")}\n// verifier hook change\n`,
          );
        },
        expectedFile: "<hook>",
      },
    ].entries()) {
      const changedFile = path.join(
        changedPackage,
        ...scenario.relativeFile.split("/"),
      );
      const original = await readFile(changedFile);
      try {
        await scenario.mutate(changedFile);
        await runPackageCli(changedPackage, fixture.root, [
          "enable",
          "long-task",
        ]);
        if (index === 0)
          await assertPackageFailure(
            changedPackage,
            fixture.root,
            ["long-task", "verify", fixture.workdir],
            /verifier_authority_migration_required/u,
          );
        await assertPackageFailure(
          changedPackage,
          fixture.root,
          ["long-task", "compile", fixture.workdir, "--revise"],
          /authority_change_requires_user_decision/u,
        );
        const pending = JSON.parse(
          await readFile(
            path.join(
              fixture.workdir,
              ".ty-context",
              "authority-revision-pending.json",
            ),
            "utf8",
          ),
        );
        assert.equal(pending.revision_diff.verifier_content_changed, true);
        assert.equal(
          pending.revision_diff.verifier_runtime_locator_changed,
          true,
        );
        assert.ok(
          pending.revision_diff.verifier_files_changed.includes(
            scenario.expectedFile,
          ),
        );
        assert.ok(
          pending.revision_diff.reduction_reasons.includes(
            "verifier_content_changed",
          ),
        );
        assert.equal(
          pending.revision_diff.previous_verifier.package_version,
          "0.6.0-relocated.0",
        );
        assert.ok(pending.revision_diff.next_verifier.package_version);
      } finally {
        await writeFile(changedFile, original);
      }
    }
    await rename(changedPackage, packageC);
    await runPackageCli(packageC, fixture.root, ["enable", "long-task"]);
    await runPackageCli(packageC, fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
    ]);

    assert.equal(first.authority_revision, 1);
    assert.deepEqual(
      (await loadActiveLongTaskAuthority(fixture.root)).authority
        .initial_task_base,
      initialBase,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
    await rm(packagesRoot, { recursive: true, force: true });
  }
});

async function copyPackage(root, name) {
  const target = path.join(root, name);
  await cp(sourcePackage, target, {
    recursive: true,
    filter: (source) => path.basename(source) !== "node_modules",
  });
  await symlink(
    dependencyRoot,
    path.join(target, "node_modules"),
    process.platform === "win32" ? "junction" : "dir",
  );
  return target;
}

async function setPackageVersion(packageRoot, version) {
  const packageFile = path.join(packageRoot, "package.json");
  const packageJson = JSON.parse(await readFile(packageFile, "utf8"));
  packageJson.version = version;
  await writeFile(packageFile, `${JSON.stringify(packageJson, null, 2)}\n`);
}

async function runPackageCli(packageRoot, cwd, args) {
  const result = await exec(
    process.execPath,
    [path.join(packageRoot, "dist", "cli.js"), ...args],
    { cwd, windowsHide: true },
  );
  return parseCliJson(result.stdout);
}

async function assertPackageFailure(packageRoot, cwd, args, pattern) {
  await assert.rejects(
    () => runPackageCli(packageRoot, cwd, args),
    (error) => {
      assert.match(`${error.stdout ?? ""}\n${error.stderr ?? ""}`, pattern);
      return true;
    },
  );
}
