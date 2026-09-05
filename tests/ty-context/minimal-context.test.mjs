import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { selectDefaultContextPaths } from "../../packages/ty-context/dist/lib/context-catalog/catalog-default-footprint.js";
import { loadContextCatalog } from "../../packages/ty-context/dist/lib/context-catalog/catalog-load.js";
import { runValidator } from "../../packages/ty-context/dist/lib/validators.js";
import { replaceContextManifestPath } from "../../packages/ty-context/dist/lib/context-mutation/manifest-lossless-patch.js";
import { runInit } from "../../packages/ty-context/dist/lib/init.js";
import { runSync } from "../../packages/ty-context/dist/lib/sync-engine.js";
import { withMaintenanceLock } from "../../packages/ty-context/dist/lib/maintenance-lock.js";
import { migrateDefaultBodySelection } from "../../packages/ty-context/dist/lib/retirement-defaults.js";
import { assertLegacyContextTransactionSettled } from "../../packages/ty-context/dist/lib/retirement-preflight.js";

const cli = fileURLToPath(new URL("../../packages/ty-context/dist/cli.js", import.meta.url));
async function fixture(t, manifest = "# Optional routing\n") {
  const root = await mkdtemp(path.join(os.tmpdir(), "tiny-minimal-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, "project_context"));
  await writeFile(path.join(root, "project_context/context.toml"), manifest);
  await writeFile(path.join(root, "project_context/global.md"), "TODO\n\nVersion 1 tests passed on a historical environment.\n[Example](missing-example.md)\n");
  return root;
}

test("minimal Context allows no architecture, Area, title or mandatory headings", async (t) => {
  const root = await fixture(t);
  const catalog = await loadContextCatalog(root);
  assert.deepEqual(catalog.diagnostics.filter((x) => x.severity === "error"), []);
  assert.deepEqual([...catalog.default_footprint.keys()], ["project_context/global.md"]);
  assert.deepEqual((await runValidator(root, "validate-context")).errors, []);
  assert.ok((await runValidator(root, "validate-harness")).errors.length);
});

test("direct defaults preserve inert children and legacy policies keep their actual meaning", () => {
  const node = (name, policy, children = []) => ({path: `project_context/${name}.md`, role: "domain", read_policy: policy, default_children: children.map((x) => `project_context/${x}.md`), triggers: []});
  const manifest = { areas: [], default_files: ["project_context/architecture.md"], contexts: [node("architecture", "on-demand", ["inert"]), node("inert", "on-demand"), node("old", "always"), node("root", "default", ["child"]), node("child", "never-default")] };
  assert.deepEqual([...selectDefaultContextPaths(manifest).keys()], ["project_context/architecture.md", "project_context/child.md", "project_context/global.md", "project_context/root.md"]);
});

test("default query reports invalid manifests as incomplete and exits nonzero", async (t) => {
  const root = await fixture(t, "invalid = [\n");
  const result = spawnSync(process.execPath, [cli, "context", "list", "--default", "--json"], {cwd: root, encoding: "utf8"});
  assert.notEqual(result.status, 0);
  assert.equal(JSON.parse(result.stdout).complete, false);
});

test("default query lists minimal defaults without requiring more scaffolding", async (t) => {
  const root = await fixture(t);
  const result = spawnSync(process.execPath, [cli, "context", "list", "--default", "--json"], {cwd: root, encoding: "utf8"});
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout).files.map((x) => x.path), ["project_context/global.md"]);
});

test("registered defaults reject escaping and missing paths but ignore prose examples", async (t) => {
  const root = await fixture(t, 'default_files = ["../outside.md", "project_context/missing.md"]\n');
  const errors = (await runValidator(root, "validate-context")).errors.join("\n");
  assert.match(errors, /must be relative/);
  assert.match(errors, /missing.md/);
  assert.doesNotMatch(errors, /missing-example/);
});

test("moving a registered direct default updates the declaration losslessly", () => {
  const before = '# note\r\ndefault_files = ["project_context/a.md"] # keep\r\n\r\n[[context]]\r\npath = "project_context/a.md"\r\nrole = "domain"\r\n';
  const result = replaceContextManifestPath(before, "project_context/a.md", "project_context/b.md");
  assert.equal(result.content, before.replaceAll("project_context/a.md", "project_context/b.md"));
});

test("initialization installs only the short contract and minimal Context, and sync is idempotent", async (t) => {
  const root = await fixture(t);
  await rm(path.join(root, "project_context"), {recursive:true});
  await runInit(root, {adopt:false, force:false});
  assert.deepEqual((await readdir(path.join(root, "project_context"))).sort(), ["context.toml", "global.md"]);
  for (const retired of ["DESIGN.md", "tools", "Makefile", ".github", ".agent/skills", ".agent/hooks.json"])
    await assert.rejects(readFile(path.join(root, retired)), {code:"ENOENT"});
  assert.match(await readFile(path.join(root,"AGENTS.md"),"utf8"), /Tiny Context development contract/);
  assert.deepEqual((await runSync(root)).changed, []);
});

test("old and malformed raw schemas refuse sync without replacing instructions", async (t) => {
  const root = await fixture(t);
  await mkdir(path.join(root,".agent"));
  await writeFile(path.join(root,"AGENTS.md"),"User instructions\n");
  for (const config of ['core:\n  schema_version: "4"\n', 'core: {}\n']) {
    await writeFile(path.join(root,".agent/config.yaml"),config);
    await assert.rejects(runSync(root), /upgrade_required|invalid raw/);
    assert.equal(await readFile(path.join(root,"AGENTS.md"),"utf8"),"User instructions\n");
    assert.equal(await readFile(path.join(root,".agent/config.yaml"),"utf8"),config);
  }
});

test("the extracted maintenance lock excludes concurrent maintenance and releases on failure", async (t) => {
  const root = await fixture(t);
  await assert.rejects(withMaintenanceLock(root,"sync", async () => {
    await assert.rejects(withMaintenanceLock(root,"context_mutation",async () => assert.fail("must not run")), /lock_unavailable:live_owner/);
    throw new Error("action failed");
  }), /action failed/);
  assert.equal(await withMaintenanceLock(root,"sync",async () => "released"),"released");
});

test("schema-4 default migration preserves exact paths without promoting architecture edges", () => {
  const source = `# user comment\n[[context]]\npath = "project_context/architecture.md"\nrole = "architecture"\nread_policy = "on-demand"\ndefault_children = ["project_context/inert.md"]\n[[context]]\npath = "project_context/old.md"\nrole = "domain"\nread_policy = "always"\n[[context]]\npath = "project_context/root.md"\nrole = "domain"\nread_policy = "default"\ndefault_children = ["project_context/child.md"]\n[[context]]\npath = "project_context/child.md"\nrole = "domain"\nread_policy = "never-default"\n`;
  const result = migrateDefaultBodySelection(source);
  assert.deepEqual(result.before,["project_context/architecture.md","project_context/child.md","project_context/global.md","project_context/root.md"]);
  assert.deepEqual(result.after,result.before);
  assert.equal(result.content.slice(result.content.indexOf("# user comment")),source);
  assert.deepEqual(result.added,[]); assert.deepEqual(result.removed,[]);
});

test("unreadable old journal is a retirement blocker, not an absent transaction", async (t) => {
  const root = await fixture(t);
  const folder = path.join(root,"tmp/ty-context/context-transactions");
  await mkdir(folder,{recursive:true});
  await writeFile(path.join(folder,"journal-000000.json"),"broken JSON");
  await assert.rejects(assertLegacyContextTransactionSettled(root),/retirement_blocked: cannot read existing Context transaction/);
  assert.equal(await readFile(path.join(folder,"journal-000000.json"),"utf8"),"broken JSON");
});
