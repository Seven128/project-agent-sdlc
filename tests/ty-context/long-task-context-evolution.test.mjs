import assert from "node:assert/strict";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { captureContextGraphSnapshot } from "../../packages/ty-context/dist/lib/context-graph-snapshot.js";
import { normalizeContextAuthoritySnapshot } from "../../packages/ty-context/dist/lib/long-task-context-authority.js";
import { deliveryCompileFreshness } from "../../packages/ty-context/dist/lib/long-task-freshness.js";
import {
  createDeliveryFixture,
  pathExists,
  runCli,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";

const SUPPORTING_CONTEXT = "project_context/areas/main/implementation-index.md";

async function addTransitiveContext(
  fixture,
  {
    relative = SUPPORTING_CONTEXT,
    role = "implementation-index",
    content = "# Implementation index\n\nInitial navigation.\n",
  } = {},
) {
  const manifestFile = path.join(
    fixture.root,
    "project_context",
    "context.toml",
  );
  const contextFile = path.join(fixture.root, ...relative.split("/"));
  await mkdir(path.dirname(contextFile), { recursive: true });
  await writeFile(contextFile, content);
  const manifest = await readFile(manifestFile, "utf8");
  await writeFile(
    manifestFile,
    `${manifest}
[[context]]
path = "project_context/areas/main.md"
role = "area"
read_policy = "default"
default_children = ["${relative}"]

[[context]]
path = "${relative}"
role = "${role}"
read_policy = "on-demand"
`,
  );
  return { contextFile, manifestFile };
}

async function addUnselectedContext(fixture, manifestFile) {
  const relative = "project_context/areas/other/contract.md";
  const contextFile = path.join(fixture.root, ...relative.split("/"));
  await mkdir(path.dirname(contextFile), { recursive: true });
  await writeFile(contextFile, "# Other contract\n\nUnselected durable contract.\n");
  const manifest = await readFile(manifestFile, "utf8");
  await writeFile(
    manifestFile,
    `${manifest}
[[context]]
path = "${relative}"
role = "contract"
read_policy = "on-demand"
triggers = ["other contract"]
`,
  );
  return { relative, contextFile };
}

test("legacy Context snapshots fail closed with every file controlling", () => {
  const normalized = normalizeContextAuthoritySnapshot({
    mode: "referenced",
    topology_sha256: "topology",
    files: ["project_context/global.md", SUPPORTING_CONTEXT],
    sha256: {
      "project_context/global.md": "global",
      [SUPPORTING_CONTEXT]: "support",
    },
  });
  assert.deepEqual(normalized.controlling_files, [
    SUPPORTING_CONTEXT,
    "project_context/global.md",
  ]);
  assert.deepEqual(normalized.supporting_files, []);
});

test("full Context revisions invalidate scoped Progress without requiring approval", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const { contextFile: supportFile } = await addTransitiveContext(fixture);
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);

    const compiledFile = path.join(
      fixture.workdir,
      ".ty-context",
      "compiled-contract.json",
    );
    let compiled = JSON.parse(await readFile(compiledFile, "utf8"));
    assert.deepEqual(compiled.context_snapshot.supporting_files, []);
    assert.ok(
      compiled.context_snapshot.controlling_files.includes(
        SUPPORTING_CONTEXT,
      ),
    );
    assert.ok(
      compiled.context_snapshot.controlling_files.includes(
        "project_context/areas/main.md",
      ),
    );

    await runCli(fixture.root, [
      "long-task",
      "verify",
      fixture.workdir,
      "--outcome",
      "first",
    ]);
    let status = await runCli(fixture.root, [
      "long-task",
      "status",
      fixture.workdir,
    ]);
    assert.equal(status.outcomes.first, "progress_passing");

    await runCli(fixture.root, ["long-task", "final-gate", fixture.workdir]);
    const finalReceiptFile = path.join(
      fixture.workdir,
      ".ty-context",
      "final-receipt.json",
    );
    assert.equal(await pathExists(finalReceiptFile), true);

    await writeFile(
      supportFile,
      "# Implementation index\n\nUpdated navigation discovered during execution.\n",
    );
    await assert.rejects(
      () => runCli(fixture.root, ["long-task", "compile", fixture.workdir]),
      /authority_revision_requires_revise_flag/u,
    );
    const revised = await runCli(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
      "--revise",
    ]);
    assert.equal(revised.progress_preserved, false);
    assert.equal(revised.authority_revision, 2);
    assert.equal(await pathExists(finalReceiptFile), false);

    status = await runCli(fixture.root, [
      "long-task",
      "status",
      fixture.workdir,
    ]);
    assert.equal(status.outcomes.first, "unverified");
    compiled = JSON.parse(await readFile(compiledFile, "utf8"));
    assert.equal(
      compiled.context_snapshot.sha256[SUPPORTING_CONTEXT],
      compiled.authority_materials.context_snapshot.sha256[SUPPORTING_CONTEXT],
    );

    const controllingFile = path.join(
      fixture.root,
      "project_context",
      "areas",
      "main.md",
    );
    await writeFile(
      controllingFile,
      "# Main\n\nChanged owning boundary discovered during execution.\n",
    );
    const controllingRevision = await runCli(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
      "--revise",
    ]);
    assert.ok(
      controllingRevision.authority_revision_change.approval_summary
        .mechanically_bounded_reasons.includes("context_authority_changed"),
    );
    assert.equal(
      controllingRevision.authority_revision_change.user_decision_required,
      false,
    );
    assert.equal(controllingRevision.progress_preserved, false);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("retrieval-only manifest edits preserve full Context authority while any Context role edit stales it", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const { manifestFile } = await addTransitiveContext(fixture);
    const unselected = await addUnselectedContext(fixture, manifestFile);
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    await runCli(fixture.root, [
      "long-task",
      "verify",
      fixture.workdir,
      "--outcome",
      "first",
    ]);

    const compiledFile = path.join(
      fixture.workdir,
      ".ty-context",
      "compiled-contract.json",
    );
    const compiled = JSON.parse(await readFile(compiledFile, "utf8"));
    const before = await captureContextGraphSnapshot(
      fixture.root,
      fixture.contract.task.context_refs,
    );
    const manifest = await readFile(manifestFile, "utf8");
    await writeFile(
      manifestFile,
      manifest.replace(
        `path = "${SUPPORTING_CONTEXT}"
role = "implementation-index"
read_policy = "on-demand"`,
        `path = "${SUPPORTING_CONTEXT}"
role = "implementation-index"
read_when = "Navigation or entry-point discovery changes."
read_policy = "optional"
triggers = ["navigation", "entry point"]`,
      ),
    );

    const afterRetrievalEdit = await captureContextGraphSnapshot(
      fixture.root,
      fixture.contract.task.context_refs,
    );
    assert.equal(afterRetrievalEdit.topology_sha256, before.topology_sha256);
    assert.equal(
      afterRetrievalEdit.sha256["project_context/context.toml"],
      before.sha256["project_context/context.toml"],
    );
    assert.deepEqual(await deliveryCompileFreshness(compiled), []);

    let status = await runCli(fixture.root, [
      "long-task",
      "status",
      fixture.workdir,
    ]);
    assert.equal(status.outcomes.first, "progress_passing");
    assert.ok(
      !status.findings.some((finding) =>
        finding.code.startsWith("context_changed_after_compile"),
      ),
    );

    const withUnselectedEdit = (await readFile(manifestFile, "utf8")).replace(
      `path = "${unselected.relative}"
role = "contract"`,
      `path = "${unselected.relative}"
role = "foundation"`,
    );
    await writeFile(manifestFile, withUnselectedEdit);
    const afterUnselectedEdit = await captureContextGraphSnapshot(
      fixture.root,
      fixture.contract.task.context_refs,
    );
    assert.equal(afterUnselectedEdit.topology_sha256, before.topology_sha256);
    assert.ok(
      (await deliveryCompileFreshness(compiled)).some((finding) =>
        finding.startsWith("context_changed_after_compile"),
      ),
    );

    const structurallyChanged = (await readFile(manifestFile, "utf8")).replace(
      `role = "implementation-index"`,
      `role = "contract"`,
    );
    await writeFile(manifestFile, structurallyChanged);
    const afterAuthorityEdit = await captureContextGraphSnapshot(
      fixture.root,
      fixture.contract.task.context_refs,
    );
    assert.notEqual(afterAuthorityEdit.topology_sha256, before.topology_sha256);
    assert.ok(
      (await deliveryCompileFreshness(compiled)).some((finding) =>
        finding.startsWith("context_changed_after_compile"),
      ),
    );

    status = await runCli(fixture.root, [
      "long-task",
      "status",
      fixture.workdir,
    ]);
    assert.ok(
      status.findings.some((finding) =>
        finding.code.startsWith("context_changed_after_compile"),
      ),
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("full Context snapshots classify every selected file as controlling", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await addTransitiveContext(fixture);
    fixture.contract.task.context_snapshot_mode = "full";
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const compiled = JSON.parse(
      await readFile(
        path.join(fixture.workdir, ".ty-context", "compiled-contract.json"),
        "utf8",
      ),
    );
    assert.deepEqual(compiled.context_snapshot.supporting_files, []);
    assert.ok(
      compiled.context_snapshot.controlling_files.includes(SUPPORTING_CONTEXT),
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("explicitly referenced supporting roles remain controlling", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await addTransitiveContext(fixture);
    fixture.contract.task.context_refs.push(SUPPORTING_CONTEXT);
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const compiled = JSON.parse(
      await readFile(
        path.join(fixture.workdir, ".ty-context", "compiled-contract.json"),
        "utf8",
      ),
    );
    assert.ok(
      compiled.context_snapshot.controlling_files.includes(SUPPORTING_CONTEXT),
    );
    assert.ok(
      !compiled.context_snapshot.supporting_files.includes(SUPPORTING_CONTEXT),
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("[critical:context-freshness] verification Context remains controlling in referenced mode", async () => {
  const fixture = await createDeliveryFixture();
  const verificationContext = "project_context/areas/main/verification.md";
  try {
    await addTransitiveContext(fixture, {
      relative: verificationContext,
      role: "verification",
      content: "# Verification\n\nCurrent executable checks.\n",
    });
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const compiled = JSON.parse(
      await readFile(
        path.join(fixture.workdir, ".ty-context", "compiled-contract.json"),
        "utf8",
      ),
    );
    assert.ok(
      compiled.context_snapshot.controlling_files.includes(verificationContext),
    );
    assert.ok(
      !compiled.context_snapshot.supporting_files.includes(verificationContext),
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});
