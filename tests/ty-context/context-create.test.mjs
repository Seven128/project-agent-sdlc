import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  appendFile,
  lstat,
  readFile,
  readdir,
  rm,
  symlink,
} from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { loadContextCatalog } from "../../packages/ty-context/dist/lib/context-catalog/catalog-load.js";
import { CONTEXT_ROLES } from "../../packages/ty-context/dist/lib/context-catalog/catalog-portable-contract.js";
import { createContextScaffold } from "../../packages/ty-context/dist/lib/context-create/context-create.js";
import { renderContextCreateScaffold } from "../../packages/ty-context/dist/lib/context-create/context-create-template.js";
import { createContextProject } from "./context-manifest-fixtures.mjs";

const repository = fileURLToPath(new URL("../..", import.meta.url));
const cli = path.join(repository, "packages", "ty-context", "dist", "cli.js");

test("every Schema v4 Role has a deterministic TODO-only unregistered scaffold", () => {
  for (const role of CONTEXT_ROLES) {
    const contextPath = `project_context/generated/${role}.md`;
    const first = renderContextCreateScaffold(contextPath, role);
    assert.equal(renderContextCreateScaffold(contextPath, role), first);
    assert.match(
      first,
      new RegExp(
        `<!-- ty-context-scaffold role=${escapeRegex(role)} registration=unregistered -->`,
        "u",
      ),
    );
    assert.match(first, /^# .+ Context: .+$/mu);
    assert.doesNotMatch(first, /\r/u);
    assert.ok(
      first.split("\n").filter((line) => line === "- TODO").length >= 3,
    );
  }
});
test("context create publishes one nested unregistered scaffold without changing Manifest or default footprint", async () => {
  const root = await createContextProject();
  const contextPath = "project_context/areas/main/weather/current.md";
  try {
    const manifestPath = path.join(root, "project_context", "context.toml");
    const manifestBefore = await readFile(manifestPath);
    const catalogBefore = await loadContextCatalog(root);
    const result = await createContextScaffold({
      project_root: root,
      context_path: contextPath,
      role: "domain",
    });
    const content = await readFile(
      path.join(root, ...contextPath.split("/")),
      "utf8",
    );
    const status = await lstat(path.join(root, ...contextPath.split("/")));
    const catalogAfter = await loadContextCatalog(root);

    assert.equal(result.created, true);
    assert.equal(result.registration, "unregistered");
    assert.equal(result.manifest_modified, false);
    assert.equal(result.default_footprint.changed, false);
    assert.deepEqual(
      result.default_footprint.after,
      result.default_footprint.before,
    );
    assert.equal(result.bytes, Buffer.byteLength(content));
    assert.equal(status.isFile(), true);
    assert.equal(status.nlink, 1);
    assert.deepEqual(await readFile(manifestPath), manifestBefore);
    assert.deepEqual(
      [...catalogAfter.default_footprint],
      [...catalogBefore.default_footprint],
    );
    assert.ok(
      catalogAfter.unregistered_context_files.some(
        (entry) => entry.path === contextPath,
      ),
    );
    assert.match(content, /role=domain registration=unregistered/u);
    assert.deepEqual(
      (
        await readdir(path.dirname(path.join(root, ...contextPath.split("/"))))
      ).filter((name) => name.includes("ty-context-create")),
      [],
    );

    await assert.rejects(
      createContextScaffold({
        project_root: root,
        context_path: contextPath,
        role: "deployment",
      }),
      (error) => error?.exit_code === 5,
    );
    assert.equal(
      await readFile(path.join(root, ...contextPath.split("/")), "utf8"),
      content,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("concurrent creators use no-replace publication and exactly one complete Role scaffold wins", async () => {
  const root = await createContextProject();
  const contextPath = "project_context/areas/main/race.md";
  try {
    const attempts = await Promise.allSettled([
      createContextScaffold({
        project_root: root,
        context_path: contextPath,
        role: "domain",
      }),
      createContextScaffold({
        project_root: root,
        context_path: contextPath,
        role: "deployment",
      }),
    ]);
    const fulfilled = attempts.filter((entry) => entry.status === "fulfilled");
    const rejected = attempts.filter((entry) => entry.status === "rejected");
    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 1);
    assert.equal(rejected[0].reason?.exit_code, 5);
    const winner = fulfilled[0].value;
    const content = await readFile(
      path.join(root, ...contextPath.split("/")),
      "utf8",
    );
    assert.equal(
      content,
      renderContextCreateScaffold(contextPath, winner.role),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("context create rejects registered targets and its scaffold cannot satisfy recoverability", async () => {
  const registeredPath = "project_context/areas/main/registered.md";
  const registered = await createContextProject({
    manifest: `${baseManifest()}\n[[context]]\npath = "${registeredPath}"\nrole = "domain"\nread_policy = "on-demand"\n`,
  });
  const root = await createContextProject();
  try {
    await assert.rejects(
      createContextScaffold({
        project_root: registered,
        context_path: registeredPath,
        role: "domain",
      }),
      (error) => error?.exit_code === 3,
    );

    const scaffoldPath = "project_context/areas/main/scaffold-contract.md";
    await createContextScaffold({
      project_root: root,
      context_path: scaffoldPath,
      role: "contract",
    });
    await appendFile(
      path.join(root, "project_context", "context.toml"),
      `\n[[context]]\npath = "${scaffoldPath}"\nrole = "contract"\nread_policy = "on-demand"\n`,
      "utf8",
    );
    const validation = runCli(root, ["validate-context"]);
    assert.equal(validation.status, 1);
    assert.match(
      `${validation.stdout}\n${validation.stderr}`,
      /cannot be only TODO or placeholder text/u,
    );
  } finally {
    await rm(registered, { recursive: true, force: true });
    await rm(root, { recursive: true, force: true });
  }
});
test("context create CLI classifies arguments, Catalog, collisions and symlink parents", async (t) => {
  const root = await createContextProject();
  const invalid = await createContextProject({ manifest: "not = [valid" });
  try {
    const help = runCli(root, ["context", "create", "--help"]);
    assert.equal(help.status, 0);
    assert.match(help.stdout, /never edits context\.toml/u);
    assert.equal(
      runCli(root, ["context", "create", "--role", "domain"]).status,
      2,
    );
    assert.equal(
      runCli(root, [
        "context",
        "create",
        "--path",
        "../outside.md",
        "--role",
        "domain",
      ]).status,
      2,
    );
    assert.equal(
      runCli(root, [
        "context",
        "create",
        "--path",
        "project_context/new.md",
        "--role",
        "unknown",
      ]).status,
      2,
    );
    assert.equal(
      runCli(invalid, [
        "context",
        "create",
        "--path",
        "project_context/new.md",
        "--role",
        "domain",
      ]).status,
      3,
    );

    const created = runCli(root, [
      "context",
      "create",
      "--path",
      "project_context/created.md",
      "--role",
      "decision_rationale",
      "--format",
      "json",
    ]);
    assert.equal(created.status, 0, created.stderr);
    assert.equal(JSON.parse(created.stdout).role, "decision-rationale");
    assert.equal(
      runCli(root, [
        "context",
        "create",
        "--path",
        "project_context/created.md",
        "--role",
        "domain",
      ]).status,
      5,
    );

    const linked = path.join(root, "project_context", "linked");
    try {
      await symlink(
        path.join(root, "project_context", "areas"),
        linked,
        "junction",
      );
    } catch (error) {
      if (error?.code === "EPERM" || error?.code === "ENOENT") {
        t.diagnostic("directory symlink creation unavailable on this host");
        return;
      }
      throw error;
    }
    assert.equal(
      runCli(root, [
        "context",
        "create",
        "--path",
        "project_context/linked/unsafe.md",
        "--role",
        "domain",
      ]).status,
      5,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(invalid, { recursive: true, force: true });
  }
});

function baseManifest() {
  return `[[areas]]
id = "main"
root = "."
context = "project_context/areas/main.md"
kind = "repository"
default = true
`;
}

function runCli(cwd, args) {
  return spawnSync(process.execPath, [cli, ...args], {
    cwd,
    encoding: "utf8",
    windowsHide: true,
  });
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
