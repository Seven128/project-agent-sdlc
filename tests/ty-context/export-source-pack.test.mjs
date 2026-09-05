import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { runSourcePackExport } from "../../packages/ty-context/dist/lib/source-pack-export.js";

const execFileAsync = promisify(execFile);

test("source-pack preserves unlisted user files and refuses edited generated outputs",async(t)=>{
 const root=await createSourcePackProject();t.after(()=>rm(root,{recursive:true,force:true}));
 const report=await runSourcePackExport(root,{mode:"source-pack"});
 await writeFile(path.join(report.outputDirectory,"user-notes.md"),"Keep my notes");
 await runSourcePackExport(root,{mode:"source-pack"});
 assert.equal(await readFile(path.join(report.outputDirectory,"user-notes.md"),"utf8"),"Keep my notes");
 await writeFile(path.join(report.outputDirectory,"code-index.md"),"User-edited index");
 await assert.rejects(runSourcePackExport(root,{mode:"source-pack"}),/export_conflict/);
 assert.equal(await readFile(path.join(report.outputDirectory,"code-index.md"),"utf8"),"User-edited index");
});

test("source-pack refuses an output directory junction without deleting or changing its target",async(t)=>{
 const root=await createSourcePackProject(),outside=await mkdtemp(path.join(os.tmpdir(),"tiny-export-outside-"));
 t.after(()=>rm(root,{recursive:true,force:true}));t.after(()=>rm(outside,{recursive:true,force:true}));
 await writeFile(path.join(outside,"original.md"),"Outside bytes");
 await mkdir(path.join(root,"tmp/ty-context/context-exports"),{recursive:true});
 await symlink(outside,path.join(root,"tmp/ty-context/context-exports/latest"),process.platform==="win32"?"junction":"dir");
 await assert.rejects(runSourcePackExport(root,{mode:"source-pack"}),/unsafe_repository_directory|symlink/);
 assert.deepEqual(await readdir(outside),["original.md"]);
 assert.equal(await readFile(path.join(outside,"original.md"),"utf8"),"Outside bytes");
});
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const cliPath = path.join(repoRoot, "packages", "ty-context", "dist", "cli.js");

test("code-index check reports planned artifacts without source bodies or writes", async () => {
  const root = await createSourcePackProject();
  try {
    const report = await runSourcePackExport(root, {
      mode: "code-index",
      check: true,
      now: new Date("2026-06-07T08:09:10.000Z")
    });
    assert.equal(report.wrote, false);
    assert.equal(report.artifacts.length, 2);
    await assert.rejects(stat(report.outputDirectory));

    const codeIndex = report.artifacts.find((artifact) => artifact.name === "code-index.md");
    assert.ok(codeIndex);
    const planned = path.join(root, ...codeIndex.path.split("/"));
    await assert.rejects(stat(planned));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("source-pack writes bounded latest artifacts with manifest schema", async () => {
  const root = await createSourcePackProject();
  try {
    await mkdir(path.join(root, "tmp", "ty-context", "context-exports", "latest"), { recursive: true });
    await writeFile(path.join(root, "tmp", "ty-context", "context-exports", "latest", "stale.md"), "old\n", "utf8");
    await mkdir(path.join(root, "tmp", "ty-context", "context-exports", "20260601T080910Z"), { recursive: true });
    await writeFile(path.join(root, "tmp", "ty-context", "context-exports", "20260601T080910Z", "old.md"), "old\n", "utf8");
    const report = await runSourcePackExport(root, {
      mode: "source-pack",
      now: new Date("2026-06-07T08:09:10.000Z"),
      command: "ty-context export-context --source-pack"
    });
    assert.equal(report.wrote, true);
    assert.equal(report.outputRelativePath, "tmp/ty-context/context-exports/latest");
    assert.ok(report.artifacts.length <= 5);
    assert.ok((await listFiles(report.outputDirectory)).length <= 6); // generated files plus the unowned note
    assert.equal(await readFile(path.join(report.outputDirectory,"stale.md"),"utf8"),"old\n");
    assert.equal(await readFile(path.join(root,"tmp/ty-context/context-exports/20260601T080910Z/old.md"),"utf8"),"old\n");
    await assert.rejects(stat(path.join(root, "tmp", "ty-context", "context-exports", "20260607T080910Z")));

    const manifest = JSON.parse(await readFile(path.join(report.outputDirectory, "source-pack-manifest.json"), "utf8"));
    assert.equal(manifest.schema_version, "source-pack-v1");
    assert.equal(manifest.max_pack_files, 5);
    assert.equal(manifest.command, "ty-context export-context --source-pack");
    assert.ok(manifest.recommended_upload_sets.daily_planning.includes("tmp/ty-context/context-exports/latest/code-index.md"));
    assert.ok(manifest.recommended_upload_sets.cross_module_review.length <= 4);
    assert.equal(manifest.artifacts.some((artifact) => path.isAbsolute(artifact.path)), false);
    assert.equal(manifest.artifacts.every((artifact) => artifact.path.startsWith("tmp/ty-context/context-exports/latest/")), true);
    for (const artifact of manifest.artifacts) {
      const content = await readFile(path.join(root, ...artifact.path.split("/")), "utf8");
      assert.equal(artifact.sha256, createHash("sha256").update(content, "utf8").digest("hex"));
    }

    const codeIndex = await readFile(path.join(report.outputDirectory, "code-index.md"), "utf8");
    assert.match(codeIndex, /## Repository Shape/);
    assert.match(codeIndex, /## Context Area Mapping/);
    assert.match(codeIndex, /export routing only/);
    assert.match(codeIndex, /## API \/ Route Index/);
    assert.match(codeIndex, /## Source File Index/);
    assert.match(codeIndex, /Path \| Type \| Lines \| Characters \| SHA256 \| Summary \| Bundle \| Tags/);
    assert.doesNotMatch(codeIndex, /return "ok"/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("task-context uses profile selectors, includes verification text, and does not execute it", async () => {
  const root = await createSourcePackProject();
  try {
    const report = await runSourcePackExport(root, {
      mode: "task-context",
      taskName: "Demo Task",
      profile: "demo",
      now: new Date("2026-06-07T08:09:10.000Z")
    });
    assert.ok(report.artifacts.length <= 5);
    const taskContext = await readFile(path.join(report.outputDirectory, "task-contexts", "task-context-demo-task.md"), "utf8");
    assert.match(taskContext, /# Task Context: Demo Task/);
    assert.match(taskContext, /project_context\/areas\/main\.md/);
    assert.match(taskContext, /packages\/app\/src\/index\.ts/);
    assert.match(taskContext, /Verification Entry Points/);
    assert.match(taskContext, /node should-not-run\.js/);
    await assert.rejects(stat(path.join(root, "should-not-run.txt")));

    const explicit = await runSourcePackExport(root, {
      mode: "task-context",
      taskName: "Explicit",
      includeContext: ["project_context/areas/main/verification.md"],
      includeCode: ["packages/app/src/worker.ts"],
      now: new Date("2026-06-07T08:10:10.000Z")
    });
    const explicitTask = await readFile(path.join(explicit.outputDirectory, "task-contexts", "task-context-explicit.md"), "utf8");
    assert.match(explicitTask, /project_context\/areas\/main\/verification\.md/);
    assert.match(explicitTask, /packages\/app\/src\/worker\.ts/);
    assert.doesNotMatch(explicitTask, /packages\/app\/src\/index\.ts/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("redaction strict fails before writing and profile paths cannot escape", async () => {
  const root = await createSourcePackProject();
  try {
    await assert.rejects(
      runSourcePackExport(root, { mode: "source-pack", redactionStrict: true, now: new Date("2026-06-07T08:09:10.000Z") }),
      /redaction-strict/
    );
    await assert.rejects(stat(path.join(root, "tmp", "ty-context", "context-exports", "20260607T080910Z")));

    await writeFile(
      path.join(root, ".agent", "config.yaml"),
      'core:\n  package: project-tiny-context-harness\n  schema_version: "5"\nsource_packs:\n  bad:\n    code:\n      - "../outside.ts"\n',
      "utf8"
    );
    await assert.rejects(runSourcePackExport(root, { mode: "task-context", taskName: "bad", profile: "bad" }), /repo-relative/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("source-pack output is deterministic for fixed timestamp and keeps only latest", async () => {
  const root = await createSourcePackProject();
  try {
    const first = await runSourcePackExport(root, { mode: "source-pack", now: new Date("2026-06-07T08:09:10.000Z") });
    const firstIndex = await readFile(path.join(first.outputDirectory, "code-index.md"), "utf8");
    const second = await runSourcePackExport(root, { mode: "source-pack", now: new Date("2026-06-07T08:09:10.000Z") });
    assert.equal(await readFile(path.join(second.outputDirectory, "code-index.md"), "utf8"), firstIndex);

    await runSourcePackExport(root, { mode: "source-pack", now: new Date("2026-06-08T08:09:10.000Z"), prune: 1 });
    await assert.rejects(stat(path.join(root, "tmp", "ty-context", "context-exports", "20260607T080910Z")));
    await assert.rejects(stat(path.join(root, "tmp", "ty-context", "context-exports", "20260608T080910Z")));
    await stat(path.join(root, "tmp", "ty-context", "context-exports", "latest"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("CLI help and parser reject invalid Source Pack invocations", async () => {
  const help = await execFileAsync(process.execPath, [cliPath, "export-context", "--help"], { encoding: "utf8" });
  assert.match(help.stdout, /--source-pack/);
  assert.match(help.stdout, /--task-context <name>/);
  assert.match(help.stdout, /--redaction-strict/);

  const root = await createSourcePackProject();
  try {
    const conflict = await execFileAsync(process.execPath, [cliPath, "export-context", "--full", "--source-pack"], {
      cwd: root,
      encoding: "utf8"
    }).catch((error) => error);
    assert.notEqual(conflict.code, 0);
    assert.match(conflict.stderr, /exactly one mode/);

    const output = await execFileAsync(process.execPath, [cliPath, "export-context", "--source-pack", "--output", "tmp/ty-context/context-exports/x.md"], {
      cwd: root,
      encoding: "utf8"
    }).catch((error) => error);
    assert.notEqual(output.code, 0);
    assert.match(output.stderr, /--output is only supported/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function createSourcePackProject() {
  const root = await mkdtemp(path.join(os.tmpdir(), "ty-context-source-pack-"));
  await mkdir(path.join(root, ".agent"), { recursive: true });
  await mkdir(path.join(root, "project_context", "areas", "main"), { recursive: true });
  await mkdir(path.join(root, "packages", "app", "src", "views"), { recursive: true });
  await mkdir(path.join(root, "packages", "app", "test"), { recursive: true });
  await writeFile(path.join(root, "AGENTS.md"), "# AGENTS\n\nRead project_context first.\n", "utf8");
  await writeFile(path.join(root, "README.md"), "# README\n", "utf8");
  await writeFile(path.join(root, "Makefile"), "test:\n\tnpm test\nvalidate:\n\tnpm run build\n", "utf8");
  await writeFile(
    path.join(root, ".agent", "config.yaml"),
    'core:\n  package: project-tiny-context-harness\n  schema_version: "5"\nsource_packs:\n  demo:\n    context:\n      - "project_context/areas/main.md"\n    code:\n      - "packages/app/src/**"\n    exclude:\n      - "**/*.generated.*"\n    verification:\n      - "node should-not-run.js"\n    max_bundle_characters: 200000\n',
    "utf8"
  );
  await writeFile(path.join(root, ".env.example"), "API_TOKEN=super-secret-value\n", "utf8");
  await writeFile(path.join(root, "secret-config.ts"), "export const hidden = 'no';\n", "utf8");
  await writeFile(path.join(root, "project_context", "global.md"), "# Global\n\n## Verification Entry Points\n\n- make test\n", "utf8");
  await writeFile(path.join(root, "project_context", "architecture.md"), "# Architecture Context\n", "utf8");
  await writeFile(path.join(root, "project_context", "context.toml"), '[[areas]]\nid = "main"\nroot = "packages/app"\ncontext = "project_context/areas/main.md"\ndefault = true\n', "utf8");
  await writeFile(path.join(root, "project_context", "areas", "main.md"), "# Main\n\n## Code Entry Points\n\n- packages/app/src/index.ts\n", "utf8");
  await writeFile(path.join(root, "project_context", "areas", "main", "verification.md"), "# Verification\n\n## Verification Paths\n\n- make test\n", "utf8");
  await writeFile(path.join(root, "packages", "app", "package.json"), '{"name":"fixture-app","scripts":{"test":"node test/index.test.js"}}\n', "utf8");
  await writeFile(path.join(root, "packages", "app", "src", "index.ts"), 'export function start(app) {\n  app.get("/health", () => {\n    return "ok";\n  });\n}\n', "utf8");
  await writeFile(path.join(root, "packages", "app", "src", "worker.ts"), "export function runWorker() { return true; }\n", "utf8");
  await writeFile(path.join(root, "packages", "app", "src", "views", "HomeView.tsx"), "export const HomeView = () => <main />;\n", "utf8");
  await writeFile(path.join(root, "packages", "app", "test", "index.test.ts"), "import { start } from '../src/index';\nexport const ok = start;\n", "utf8");
  return root;
}

async function listFiles(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(target)));
    else files.push(target);
  }
  return files;
}
