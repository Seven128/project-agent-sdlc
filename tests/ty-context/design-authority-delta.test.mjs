import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { parseDesignAuthorityDeltaAssessment } from "../../packages/ty-context/dist/lib/design-authority-delta-codec.js";
import { validateDesignAuthorityDeltaAssessmentCurrent } from "../../packages/ty-context/dist/lib/design-authority-delta-validation.js";
import { loadCurrentDesignAuthorityClosure } from "../../packages/ty-context/dist/lib/design-authority-closure.js";

const cli = fileURLToPath(
  new URL("../../packages/ty-context/dist/cli.js", import.meta.url),
);
const schemaVersion = "design-authority-delta-assessment-v1";

test("consistent assessment binds concrete evidence and the current closure", async () => {
  const repository = await temporaryRepository();
  try {
    const identity = (await loadCurrentDesignAuthorityClosure(repository)).identity;
    const parsed = parseDesignAuthorityDeltaAssessment(
      JSON.stringify({
        schema_version: schemaVersion,
        assessment: "consistent_with_current_authority",
        based_on: identity,
        evidence: {
          tokens: ["color.surface.primary"],
          components: ["sheet/default"],
          rules: ["DESIGN.md#principles"],
        },
        observed_variances: [],
      }),
    );
    const result = await validateDesignAuthorityDeltaAssessmentCurrent(
      repository,
      parsed,
    );
    assert.equal(result.authority_current, true);
    assert.equal(result.write_performed, false);
    assert.deepEqual(result.authority_identity, identity);

    const unsupported = structuredClone(parsed);
    unsupported.evidence = { tokens: [], components: [], rules: [] };
    assert.throws(
      () => parseDesignAuthorityDeltaAssessment(JSON.stringify(unsupported)),
      /at_least_one_reference_required/u,
    );
  } finally {
    await cleanup(repository);
  }
});

test("task-local and cross-task variances have distinct durability owners", async () => {
  const repository = await temporaryRepository();
  try {
    const identity = (await loadCurrentDesignAuthorityClosure(repository)).identity;
    const common = {
      schema_version: schemaVersion,
      assessment: "task_local_variance",
      based_on: identity,
      scope: ["screen:map-discovery"],
      reason: "The selected task needs a deliberately local interaction.",
      affected_rules: ["DESIGN.md#interactions"],
    };
    const taskOnly = parseDesignAuthorityDeltaAssessment(
      JSON.stringify({
        ...common,
        durability: "task_only",
        precedent: "forbidden",
      }),
    );
    assert.equal(taskOnly.durability, "task_only");
    assert.equal(taskOnly.precedent, "forbidden");

    const crossTask = parseDesignAuthorityDeltaAssessment(
      JSON.stringify({
        ...common,
        durability: "cross_task_candidate",
        required_owner: {
          type: "screen_contract",
          path: "project_context/areas/main/screen-contract.md",
        },
      }),
    );
    assert.equal(crossTask.durability, "cross_task_candidate");
    assert.equal(crossTask.required_owner.type, "screen_contract");

    assert.throws(
      () =>
        parseDesignAuthorityDeltaAssessment(
          JSON.stringify({
            ...common,
            durability: "task_only",
            precedent: "allowed",
          }),
        ),
      /assessment\.precedent:expected:forbidden/u,
    );
    assert.throws(
      () =>
        parseDesignAuthorityDeltaAssessment(
          JSON.stringify({
            ...common,
            durability: "cross_task_candidate",
          }),
        ),
      /required_owner/u,
    );
  } finally {
    await cleanup(repository);
  }
});

test("authority delta candidate is non-empty and rejects adoption or status fields", async () => {
  const repository = await temporaryRepository();
  try {
    const identity = (await loadCurrentDesignAuthorityClosure(repository)).identity;
    const candidate = {
      schema_version: schemaVersion,
      assessment: "authority_delta_candidate",
      based_on: identity,
      proposed_changes: {
        tokens: [
          {
            key: "motion.duration.sheet",
            proposal: "Use the candidate duration in representative sheets.",
            rationale: "The behavior recurs across selected scenarios.",
          },
        ],
        components: [],
        patterns: [],
        motion: [],
        platforms: [],
      },
      supporting_resources: ["design/handoff.md#main-design"],
      representative_scenarios: ["map filter sheet", "saved plan sheet"],
    };
    const parsed = parseDesignAuthorityDeltaAssessment(JSON.stringify(candidate));
    assert.equal(parsed.assessment, "authority_delta_candidate");
    assert.equal(parsed.proposed_changes.tokens.length, 1);

    for (const forbidden of ["status", "adopted", "authority_updated"])
      assert.throws(
        () =>
          parseDesignAuthorityDeltaAssessment(
            JSON.stringify({ ...candidate, [forbidden]: true }),
          ),
        new RegExp(`unknown_field:${forbidden}`, "u"),
      );

    const empty = structuredClone(candidate);
    empty.proposed_changes.tokens = [];
    assert.throws(
      () => parseDesignAuthorityDeltaAssessment(JSON.stringify(empty)),
      /at_least_one_change_required/u,
    );
  } finally {
    await cleanup(repository);
  }
});

test("stale base identity fails and the CLI remains deterministic and read-only", async () => {
  const repository = await temporaryRepository();
  try {
    const identity = (await loadCurrentDesignAuthorityClosure(repository)).identity;
    const assessmentPath = path.join(repository, "assessment.json");
    const assessment = {
      schema_version: schemaVersion,
      assessment: "consistent_with_current_authority",
      based_on: identity,
      evidence: { tokens: ["color.primary"], components: [], rules: [] },
      observed_variances: [],
    };
    await writeFile(assessmentPath, `${JSON.stringify(assessment, null, 2)}\n`);
    const beforeFiles = await readdir(repository, { recursive: true });
    const beforeAssessment = await readFile(assessmentPath, "utf8");
    const first = run(repository, [
      "design-resource",
      "authority-delta",
      "validate",
      "assessment.json",
      "--json",
    ]);
    const second = run(repository, [
      "design-resource",
      "authority-delta",
      "validate",
      "assessment.json",
      "--json",
    ]);
    assert.equal(first.status, 0, first.stderr);
    assert.equal(first.stdout, second.stdout);
    const output = JSON.parse(first.stdout);
    assert.equal(output.authority_current, true);
    assert.equal(output.write_performed, false);
    assert.deepEqual(await readdir(repository, { recursive: true }), beforeFiles);
    assert.equal(await readFile(assessmentPath, "utf8"), beforeAssessment);

    assessment.based_on.closure_digest = `sha256:${"0".repeat(64)}`;
    await writeFile(assessmentPath, `${JSON.stringify(assessment, null, 2)}\n`);
    const stale = run(repository, [
      "design-resource",
      "authority-delta",
      "validate",
      "assessment.json",
      "--json",
    ]);
    assert.equal(stale.status, 3);
    assert.match(stale.stderr, /identity_mismatch/u);
  } finally {
    await cleanup(repository);
  }
});

async function temporaryRepository() {
  const repository = await mkdtemp(path.join(os.tmpdir(), "ty-delta-"));
  await writeFile(
    path.join(repository, "DESIGN.md"),
    `---
version: "delta-v1"
name: "Delta Fixture"
description: "Authority Delta Assessment fixture."
colors:
  primary: "#123456"
---

# Design Authority

The current single-file Authority.
`,
    "utf8",
  );
  return repository;
}

function run(cwd, args) {
  return spawnSync(process.execPath, [cli, ...args], {
    cwd,
    encoding: "utf8",
  });
}

async function cleanup(repository) {
  await rm(repository, { recursive: true, force: true });
}
