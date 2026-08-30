import assert from "node:assert/strict";
import {
  access,
  appendFile,
  readFile,
  realpath,
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
import { scanStagedRepositoryForContextPath } from "../../packages/ty-context/dist/lib/context-move/context-move-literal-scan.js";
import { executeContextMutationPlan } from "../../packages/ty-context/dist/lib/context-mutation/mutation-commit.js";
import { captureMutationFileState } from "../../packages/ty-context/dist/lib/context-mutation/mutation-cas.js";
import { readContextMutationJournal } from "../../packages/ty-context/dist/lib/context-mutation/mutation-journal.js";
import { validateContextMutationJournal } from "../../packages/ty-context/dist/lib/context-mutation/mutation-journal-validation.js";
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
    assert.ok(
      !catalog.registered_contexts.some((entry) => entry.path === from),
    );
    assert.deepEqual((await runValidator(root, "validate-context")).errors, []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("context move keeps logical NFC identity separate from NFD source and reference files", async (t) => {
  const physicalFrom = "project_context/areas/Cafe\u0301/deployment.md";
  const logicalFrom = physicalFrom.normalize("NFC");
  const physicalLinks = "project_context/areas/Cafe\u0301/links.md";
  const logicalLinks = physicalLinks.normalize("NFC");
  const logicalTo = "project_context/areas/Café/deployment/index.md";
  const roots = await Promise.all([
    createNfdMoveProject(physicalFrom, physicalLinks),
    createNfdMoveProject(physicalFrom, physicalLinks),
    createNfdMoveProject(physicalFrom, physicalLinks),
    createNfdMoveProject(physicalFrom, physicalLinks),
  ]);
  const input = (root) => ({
    project_root: root,
    from_path: logicalFrom,
    to_path: logicalTo,
  });
  try {
    if (
      !(await hasDistinctPhysicalSpelling(roots[0], physicalFrom, logicalFrom))
    ) {
      t.skip("filesystem does not preserve distinct NFC/NFD spellings");
      return;
    }

    const first = await moveContext(input(roots[0]));
    const second = await moveContext(input(roots[0]));
    assert.deepEqual(second, first);
    assert.equal(first.from_path, logicalFrom);
    assert.equal(first.to_path, logicalTo);
    assert.ok(first.links.files_changed.includes(logicalLinks));
    assert.ok(
      first.files.every((entry) => entry.path === entry.path.normalize("NFC")),
    );

    const applied = await moveContext({ ...input(roots[1]), apply: true });
    assert.equal(applied.applied, true);
    await assert.rejects(
      access(path.join(roots[1], ...physicalFrom.split("/"))),
    );
    await access(path.join(roots[1], ...logicalTo.split("/")));
    const moved = await readFile(
      path.join(roots[1], ...logicalTo.split("/")),
      "utf8",
    );
    assert.match(
      moved,
      /\[architecture\]\(\.\.\/\.\.\/\.\.\/architecture\.md\)/u,
    );
    const links = await readFile(
      path.join(roots[1], ...physicalLinks.split("/")),
      "utf8",
    );
    assert.equal(links.match(/deployment\/index\.md/gu)?.length, 3);
    await assertNfdMoveLinksResolve(roots[1], physicalLinks, logicalTo, links);
    const appliedCatalog = await loadContextCatalog(roots[1]);
    assert.ok(
      appliedCatalog.registered_contexts.some(
        (entry) => entry.path === logicalTo,
      ),
    );
    assert.equal(
      appliedCatalog.context_files.find((entry) => entry.path === logicalLinks)
        ?.physical_path,
      physicalLinks,
    );

    for (const [root, direction] of [
      [roots[2], "complete"],
      [roots[3], "rollback"],
    ]) {
      const planned = await planContextMove(input(root));
      const sourceChange = planned.plan.files.find(
        (entry) => entry.path === logicalFrom,
      );
      assert.equal(sourceChange?.physical_path, physicalFrom);
      assert.equal(
        planned.plan.files.find((entry) => entry.path === logicalLinks)
          ?.physical_path,
        physicalLinks,
      );
      await assert.rejects(
        executeContextMutationPlan(root, planned.plan, {
          fault_after: `published_before_journal:${logicalFrom}`,
        }),
        /fault_injected:published_before_journal/u,
      );
      const journal = await readContextMutationJournal(root);
      const tampered = structuredClone(journal);
      tampered.files.find((entry) => entry.path === logicalFrom).physical_path =
        "project_context/areas/other/deployment.md";
      assert.throws(
        () => validateContextMutationJournal(tampered),
        /journal_file_physical_path_identity_mismatch/u,
      );
      if (direction === "complete") {
        await completeContextMutation(root);
        await assert.rejects(
          access(path.join(root, ...physicalFrom.split("/"))),
        );
        await access(path.join(root, ...logicalTo.split("/")));
        await assertNfdMoveLinksResolve(
          root,
          physicalLinks,
          logicalTo,
          await readFile(path.join(root, ...physicalLinks.split("/")), "utf8"),
        );
      } else {
        await rollbackContextMutation(root);
        await access(path.join(root, ...physicalFrom.split("/")));
        await assert.rejects(access(path.join(root, ...logicalTo.split("/"))));
        await assertNfdMoveLinksResolve(
          root,
          physicalLinks,
          physicalFrom,
          await readFile(path.join(root, ...physicalLinks.split("/")), "utf8"),
        );
      }
      assert.equal((await contextMutationStatus(root)).journal_present, false);
    }
  } finally {
    await Promise.all(
      roots.map((root) => rm(root, { recursive: true, force: true })),
    );
  }
});

test("context move blocks exact NFD physical literals in code, config, prose, encoded, and Windows forms", async (t) => {
  const physicalFrom = "project_context/areas/Cafe\u0301/deployment.md";
  const logicalFrom = physicalFrom.normalize("NFC");
  const physicalLinks = "project_context/areas/Cafe\u0301/links.md";
  const logicalTo = "project_context/areas/Café/deployment/index.md";
  const encoded = physicalFrom.split("/").map(encodeURIComponent).join("/");
  const windows = physicalFrom.replaceAll("/", "\\");
  const referenceFiles = {
    "src/context-owner.ts": `export const owner = ${JSON.stringify(physicalFrom)};\n`,
    "config/context-owner.json": `${JSON.stringify({ owner: `/${physicalFrom}` })}\n`,
    "config/context-owner.yaml": `owner: ${windows}\n`,
    "docs/context-owner.md": `# Owner\n\n${physicalFrom}\n`,
    "docs/context-owner.txt": `${encoded}\n`,
  };
  const root = await createNfdMoveProject(
    physicalFrom,
    physicalLinks,
    referenceFiles,
  );
  try {
    if (!(await hasDistinctPhysicalSpelling(root, physicalFrom, logicalFrom))) {
      t.skip("filesystem does not preserve distinct NFC/NFD spellings");
      return;
    }
    const blocked = await moveContext({
      project_root: root,
      from_path: logicalFrom,
      to_path: logicalTo,
    });
    assert.equal(blocked.can_apply, false);
    assert.deepEqual(
      [...new Set(blocked.unresolved.map((entry) => entry.path))].sort(),
      Object.keys(referenceFiles).sort(),
    );
    assert.ok(
      blocked.unresolved.some((entry) => entry.matched === physicalFrom),
    );
    assert.ok(blocked.unresolved.some((entry) => entry.matched === encoded));
    assert.ok(blocked.unresolved.some((entry) => entry.matched === windows));
    await assert.rejects(
      moveContext({
        project_root: root,
        from_path: logicalFrom,
        to_path: logicalTo,
        apply: true,
      }),
      /cannot apply until every reported unresolved reference/u,
    );

    for (const file of Object.keys(referenceFiles))
      await writeFile(
        path.join(root, ...file.split("/")),
        "resolved\n",
        "utf8",
      );
    const applied = await moveContext({
      project_root: root,
      from_path: logicalFrom,
      to_path: logicalTo,
      apply: true,
    });
    assert.equal(applied.applied, true);
    assert.deepEqual(applied.unresolved, []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("staged literal scan applies a logical override to the matching NFD physical file", async (t) => {
  const physicalFile = "project_context/areas/Cafe\u0301/notes.md";
  const logicalFile = physicalFile.normalize("NFC");
  const searchedPath = "project_context/areas/Café/ghost.md";
  const root = await createContextProject({
    extraFiles: {
      [physicalFile]: `# Notes\n\n${searchedPath}\n`,
    },
  });
  try {
    if (!(await hasDistinctPhysicalSpelling(root, physicalFile, logicalFile))) {
      t.skip("filesystem does not preserve distinct NFC/NFD spellings");
      return;
    }
    const before = await scanStagedRepositoryForContextPath({
      repository: root,
      logical_context_path: searchedPath,
      physical_context_path: searchedPath,
      file_overrides: new Map(),
    });
    assert.equal(before.complete, true);
    assert.deepEqual(
      before.matches.map((entry) => entry.path),
      [logicalFile],
    );

    const overrides = new Map([[logicalFile, Buffer.from("# Replaced\n")]]);
    const first = await scanStagedRepositoryForContextPath({
      repository: root,
      logical_context_path: searchedPath,
      physical_context_path: searchedPath,
      file_overrides: overrides,
    });
    const second = await scanStagedRepositoryForContextPath({
      repository: root,
      logical_context_path: searchedPath,
      physical_context_path: searchedPath,
      file_overrides: overrides,
    });
    assert.deepEqual(second, first);
    assert.equal(first.complete, true);
    assert.deepEqual(first.matches, []);
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
        assert.equal(
          (await contextMutationStatus(root)).journal_present,
          false,
        );
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
    assert.ok(blocked.unresolved.some((entry) => entry.path === "README.md"));
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
    assert.equal(before.default_footprint.size, after.default_footprint.size);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function createNfdMoveProject(
  physicalFrom,
  physicalLinks,
  extraFiles = {},
) {
  return createContextProject({
    manifest: `${baseManifestForMove()}
[[context]]
path = "${physicalFrom}"
role = "deployment"
read_policy = "on-demand"
triggers = ["deploy"]
`,
    extraFiles: {
      [physicalFrom]: `---
context_role: deployment
read_policy: on-demand
---
# Deployment

## Responsibility

- This Context owns current deployment boundaries and recovery entry points.

[architecture](../../architecture.md)
`,
      [physicalLinks]: `# Links

[inline](./deployment.md#top)
[reference][deployment]
[encoded](./deployment%2Emd)

[deployment]: ./deployment.md "Deployment"
`,
      ...extraFiles,
    },
  });
}

async function assertNfdMoveLinksResolve(
  root,
  physicalLinks,
  targetPath,
  content,
) {
  const destinations = [
    content.match(/\[inline\]\(([^#)]+)/u)?.[1],
    content.match(/\[encoded\]\(([^)]+)/u)?.[1],
    content.match(/^\[deployment\]:\s+(\S+)/mu)?.[1],
  ];
  assert.ok(destinations.every(Boolean), "missing moved Markdown destination");
  const expected = await realpath(path.join(root, ...targetPath.split("/")));
  const sourceDirectory = path.dirname(
    path.join(root, ...physicalLinks.split("/")),
  );
  for (const destination of destinations) {
    const decoded = decodeURIComponent(destination).replaceAll("\\", "/");
    const actual = await realpath(path.resolve(sourceDirectory, decoded));
    assert.equal(actual, expected, destination);
  }
}

function baseManifestForMove() {
  return `[[areas]]
id = "main"
root = "."
context = "project_context/areas/main.md"
kind = "app"
default = true

[[context]]
path = "project_context/areas/main/verification.md"
role = "verification"
read_policy = "default"
triggers = ["test"]
`;
}

async function hasDistinctPhysicalSpelling(root, physical, canonical) {
  await access(path.join(root, ...physical.split("/")));
  try {
    await access(path.join(root, ...canonical.split("/")));
    return false;
  } catch {
    return true;
  }
}
