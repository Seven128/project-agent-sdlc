import assert from "node:assert/strict";
import {
  access,
  appendFile,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { loadContextCatalog } from "../../packages/ty-context/dist/lib/context-catalog/catalog-load.js";
import {
  moveContext,
  planContextMove,
} from "../../packages/ty-context/dist/lib/context-move/context-move.js";
import { executeContextMutationPlan } from "../../packages/ty-context/dist/lib/context-mutation/mutation-commit.js";
import { captureMutationFileState } from "../../packages/ty-context/dist/lib/context-mutation/mutation-cas.js";
import { readContextMutationJournal } from "../../packages/ty-context/dist/lib/context-mutation/mutation-journal.js";
import {
  completeContextMutation,
  contextMutationStatus,
  rollbackContextMutation,
} from "../../packages/ty-context/dist/lib/context-mutation/mutation-recovery.js";
import { runValidator } from "../../packages/ty-context/dist/lib/validators.js";
import { createContextProject } from "./context-manifest-fixtures.mjs";
import {
  from,
  moveInput,
  moveProject,
  runMoveCli,
  to,
} from "./context-move-fixture.mjs";

test("context move dry-run stages a new directory, Manifest owner, child edge and explicit links without writes", async () => {
  const root = await moveProject();
  try {
    const manifest = path.join(root, "project_context", "context.toml");
    const before = await readFile(manifest);
    const first = await moveContext(moveInput(root));
    const second = await moveContext(moveInput(root));
    assert.deepEqual(first, second);
    assert.equal(first.applied, false);
    assert.equal(first.can_apply, true);
    assert.deepEqual(first.directories_created, ["project_context/deployment"]);
    assert.equal(first.manifest.replacements.length, 2);
    assert.equal(first.links.references_updated.length, 5);
    assert.deepEqual(first.unresolved, []);
    assert.deepEqual(await readFile(manifest), before);
    await assert.rejects(access(path.join(root, ...to.split("/"))));
    assert.equal((await contextMutationStatus(root)).journal_present, false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("context move applies the deterministic target-links-Manifest-source transaction", async () => {
  const root = await moveProject();
  try {
    const result = await moveContext({ ...moveInput(root), apply: true });
    assert.equal(result.applied, true);
    assert.equal((await contextMutationStatus(root)).journal_present, false);
    await assert.rejects(access(path.join(root, ...from.split("/"))));
    const moved = await readFile(path.join(root, ...to.split("/")), "utf8");
    assert.match(moved, /\[architecture\]\(\.\.\/architecture\.md\)/u);
    const links = await readFile(
      path.join(root, "project_context", "areas", "main", "links.md"),
      "utf8",
    );
    assert.match(links, /\.\.\/\.\.\/deployment\/index\.md/u);
    const manifest = await readFile(
      path.join(root, "project_context", "context.toml"),
      "utf8",
    );
    assert.doesNotMatch(manifest, /project_context\/deployment\.md/u);
    assert.equal(
      manifest.match(/project_context\/deployment\/index\.md/gu)?.length,
      2,
    );
    const catalog = await loadContextCatalog(root);
    assert.ok(catalog.registered_contexts.some((entry) => entry.path === to));
    assert.ok(!catalog.registered_contexts.some((entry) => entry.path === from));
    assert.deepEqual((await runValidator(root, "validate-context")).errors, []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("context move recovers both forward and backward across a newly created directory", async () => {
  const completeRoot = await moveProject();
  const rollbackRoot = await moveProject();
  try {
    const completePlan = await planContextMove(moveInput(completeRoot));
    await assert.rejects(
      executeContextMutationPlan(completeRoot, completePlan.plan, {
        fault_after: `applied:${to}`,
      }),
      /fault_injected:applied/u,
    );
    assert.equal(
      (await contextMutationStatus(completeRoot)).directories[0].state,
      "directory",
    );
    await completeContextMutation(completeRoot);
    await access(path.join(completeRoot, ...to.split("/")));

    const rollbackPlan = await planContextMove(moveInput(rollbackRoot));
    await assert.rejects(
      executeContextMutationPlan(rollbackRoot, rollbackPlan.plan, {
        fault_after: `applied:${to}`,
      }),
      /fault_injected:applied/u,
    );
    await rollbackContextMutation(rollbackRoot);
    await access(path.join(rollbackRoot, ...from.split("/")));
    await assert.rejects(
      access(path.join(rollbackRoot, "project_context", "deployment")),
    );
    assert.equal(
      (await contextMutationStatus(rollbackRoot)).journal_present,
      false,
    );
  } finally {
    await rm(completeRoot, { recursive: true, force: true });
    await rm(rollbackRoot, { recursive: true, force: true });
  }
});

test("owned deletion tombstone closes publication-before-journal crashes in both directions", async (t) => {
  for (const direction of ["complete", "rollback"])
    await t.test(direction, async () => {
      const root = await moveProject();
      try {
        const planned = await planContextMove(moveInput(root));
        await assert.rejects(
          executeContextMutationPlan(root, planned.plan, {
            fault_after: `published_before_journal:${from}`,
          }),
          /fault_injected:published_before_journal/u,
        );
        const journal = await readContextMutationJournal(root);
        const source = journal.files.find((entry) => entry.path === from);
        assert.equal(source.temporary_state.state.identity.nlink, "2");
        const remainder = await captureMutationFileState(
          root,
          source.temporary_path,
          { allow_hardlinks: true },
        );
        assert.equal(remainder.identity.nlink, "1");
        assert.equal(
          (await contextMutationStatus(root)).files.find(
            (entry) => entry.path === from,
          ).state,
          "after",
        );

        if (direction === "complete") {
          await completeContextMutation(root);
          await assert.rejects(access(path.join(root, ...from.split("/"))));
          await access(path.join(root, ...to.split("/")));
        } else {
          await rollbackContextMutation(root);
          await access(path.join(root, ...from.split("/")));
          await assert.rejects(access(path.join(root, ...to.split("/"))));
        }
        assert.equal((await contextMutationStatus(root)).journal_present, false);
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    });
});

test("context move CAS protects every planned reference and unresolved literals block apply", async () => {
  const casRoot = await moveProject();
  const blockedRoot = await moveProject({ unresolved: true });
  try {
    const planned = await planContextMove(moveInput(casRoot));
    await appendFile(
      path.join(casRoot, "project_context", "areas", "main", "links.md"),
      "\nexternal edit\n",
    );
    await assert.rejects(
      executeContextMutationPlan(casRoot, planned.plan),
      /cas_conflict:project_context\/areas\/main\/links\.md/u,
    );
    assert.equal((await contextMutationStatus(casRoot)).journal_present, false);

    const blocked = await moveContext(moveInput(blockedRoot));
    assert.equal(blocked.can_apply, false);
    assert.ok(
      blocked.unresolved.some((entry) => entry.path === "README.md"),
    );
    await assert.rejects(
      moveContext({ ...moveInput(blockedRoot), apply: true }),
      /cannot apply until every reported unresolved reference/u,
    );
    await access(path.join(blockedRoot, ...from.split("/")));
  } finally {
    await rm(casRoot, { recursive: true, force: true });
    await rm(blockedRoot, { recursive: true, force: true });
  }
});

test("context move CLI is dry-run-first and exposes no force bypass", async () => {
  const root = await moveProject();
  try {
    const help = runMoveCli(root, ["context", "move", "--help"]);
    assert.equal(help.status, 0);
    assert.match(help.stdout, /Dry-run is the default/u);
    assert.equal(
      runMoveCli(root, [
        "context",
        "move",
        "--from",
        from,
        "--to",
        to,
        "--force",
      ]).status,
      2,
    );
    const dry = runMoveCli(root, [
      "context",
      "move",
      "--from",
      from,
      "--to",
      to,
      "--json",
    ]);
    assert.equal(dry.status, 0, dry.stderr);
    assert.equal(JSON.parse(dry.stdout).applied, false);
    const apply = runMoveCli(root, [
      "context",
      "move",
      "--from",
      from,
      "--to",
      to,
      "--apply",
      "--json",
    ]);
    assert.equal(apply.status, 0, apply.stderr);
    assert.equal(JSON.parse(apply.stdout).applied, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("context move supports the unique Area Context owner and preserves default selection", async () => {
  const root = await createContextProject();
  const areaFrom = "project_context/areas/main.md";
  const areaTo = "project_context/areas/main/index.md";
  try {
    const before = await loadContextCatalog(root);
    const result = await moveContext({
      project_root: root,
      from_path: areaFrom,
      to_path: areaTo,
      apply: true,
    });
    assert.equal(result.owner.source, "area");
    assert.equal(result.owner.role, "area");
    const after = await loadContextCatalog(root);
    assert.equal(after.areas[0].context, areaTo);
    assert.ok(after.default_footprint.has(areaTo));
    assert.ok(!after.default_footprint.has(areaFrom));
    assert.equal(
      result.default_footprint.before.path_count,
      result.default_footprint.after.path_count,
    );
    assert.equal(
      before.default_footprint.size,
      after.default_footprint.size,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
