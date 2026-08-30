import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  compareMechanismScores,
  prepareMechanismRun,
  scoreMechanismRun,
} from "../../examples/delivery-benchmark/mechanism/runner/mechanism_benchmark.mjs";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const mechanismRoot = path.join(
  repoRoot,
  "examples",
  "delivery-benchmark",
  "mechanism",
);

test("authoring score requires fixed Source, Risk, proof, and compiled Authority", async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "mechanism-authoring-"));
  try {
    const runDir = path.join(temp, "run");
    await prepareMechanismRun({
      task: "authoring-structured-json",
      variant: "authoring-compact-v2",
      pairId: "authoring-score",
      replicate: 1,
      model: "fixed-model",
      reasoning: "fixed-reasoning",
      outDir: runDir,
      force: true,
      skipHarnessInit: true,
    });
    const workdir = path.join(runDir, "delivery", "authoring-structured-json");
    await mkdir(path.join(workdir, ".ty-context"), { recursive: true });
    await writeFile(
      path.join(workdir, "delivery-contract.yaml"),
      "schema_version: long-task-delivery-v2\nsource_claims: []\nrisk:\n  facts: {}\n",
    );
    const compiledPath = path.join(
      workdir,
      ".ty-context",
      "compiled-contract.json",
    );
    await writeFile(
      compiledPath,
      `${JSON.stringify(compiledContract(), null, 2)}\n`,
    );
    const agentPath = path.join(runDir, ".benchmark", "agent-result.json");
    const agent = JSON.parse(await readFile(agentPath, "utf8"));
    agent.preflight_reports = [{ status: "ready" }];
    agent.compile_report = { status: "compiled" };
    await writeFile(agentPath, `${JSON.stringify(agent, null, 2)}\n`);

    const score = await scoreMechanismRun({ runDir });
    assert.equal(score.metrics.hard_gate_passed, true);
    assert.equal(score.metrics.authoring.gold_compliance_passed, true);
    assert.equal(
      score.metrics.authoring.gold_compliance.source_kinds_exact,
      true,
    );
    assert.ok(score.metrics.authoring.canonical_authority_fingerprint);

    const wrongKind = JSON.parse(await readFile(compiledPath, "utf8"));
    wrongKind.source_items[0].kind = "requirement";
    await writeFile(compiledPath, `${JSON.stringify(wrongKind, null, 2)}\n`);
    const rejected = await scoreMechanismRun({ runDir });
    assert.equal(
      rejected.metrics.authoring.gold_compliance.source_kinds_exact,
      false,
    );
    assert.equal(rejected.metrics.hard_gate_passed, false);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});

test("authoring cost metrics remain unavailable until canonical Authority is equal", async () => {
  const temp = await mkdtemp(
    path.join(os.tmpdir(), "mechanism-authoring-compare-"),
  );
  try {
    const baselineFile = path.join(temp, "baseline.json");
    const candidateFile = path.join(temp, "candidate.json");
    await writeFile(
      baselineFile,
      `${JSON.stringify(authoringScore("baseline", "authority-a"))}\n`,
    );
    await writeFile(
      candidateFile,
      `${JSON.stringify(authoringScore("candidate", "authority-b"))}\n`,
    );

    const unequal = await compareMechanismScores({
      baselineScore: baselineFile,
      candidateScore: candidateFile,
    });
    assert.equal(unequal.decision_eligible, false);
    assert.equal(unequal.metrics.authoring_cost_comparable, false);
    assert.equal(unequal.metrics.effective_yaml_line_reduction, null);
    assert.equal(unequal.metrics.elapsed_reduction, null);

    await writeFile(
      candidateFile,
      `${JSON.stringify(authoringScore("candidate", "authority-a"))}\n`,
    );
    const equal = await compareMechanismScores({
      baselineScore: baselineFile,
      candidateScore: candidateFile,
    });
    assert.equal(equal.decision_eligible, true);
    assert.equal(equal.metrics.authoring_cost_comparable, true);
    assert.equal(equal.metrics.effective_yaml_line_reduction, 0.25);
    assert.equal(equal.metrics.elapsed_reduction, 0.2);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});

test("authoring Source markers and fixed gold remain set-equal", async () => {
  for (const id of [
    "authoring-structured-json",
    "authoring-ui-playwright",
    "authoring-population",
    "authoring-security-migration",
    "authoring-external-pending",
  ]) {
    const source = await readFile(
      path.join(mechanismRoot, "fixture", "plans", `${id}.md`),
      "utf8",
    );
    const gold = JSON.parse(
      await readFile(path.join(mechanismRoot, "gold", `${id}.json`), "utf8"),
    );
    const keys = [...source.matchAll(/ty-source-item:start key=([a-z0-9-]+)/gu)]
      .map((match) => match[1])
      .sort();
    assert.deepEqual(keys, [...gold.source_keys].sort(), id);
    assert.equal(
      new Set(keys).size,
      keys.length,
      `${id} marker keys must be unique`,
    );
  }
});

function compiledContract() {
  return {
    schema_version: "compiled-long-task-delivery-v2",
    authority_hashes: { source: "fixed" },
    authority_materials: { source_items: "fixed" },
    effective_risk: "standard",
    risk_reasons: [],
    claim_coverage: { claims_total: 2, claims_covered: 2 },
    source_items: [
      { key: "invoice-total-result", kind: "outcome_result" },
      { key: "invoice-total-requirement", kind: "requirement" },
      { key: "invoice-total-obligation", kind: "technical_obligation" },
      { key: "invoice-total-acceptance", kind: "acceptance" },
    ],
    risk: {
      facts: {
        public_api_or_schema_change: [],
        persistent_data_change: [],
        data_migration: [],
        security_boundary_change: [],
        permission_boundary_change: [],
        irreversible_external_effect: [],
        critical_user_path: [],
        full_population_operation: [],
        multi_repository_change: [],
        weak_observability: [],
      },
    },
    global: { acceptance: { checks: [], external_confirmations: [] } },
    outcomes: [
      { acceptance: { checks: [{ proof_surface: "runtime_behavior" }] } },
    ],
  };
}

function authoringScore(role, fingerprint) {
  const baseline = role === "baseline";
  return {
    run: {
      task_id: "authoring-structured-json",
      track: "long-task-authoring",
      pair_id: "authoring-pair",
      replicate: 1,
      model: "fixed-model",
      reasoning: "fixed-reasoning",
      baseline_commit: "fixed-baseline",
      fixture_sha256: "fixed-fixture",
      experiment_set_sha256: "fixed-experiment",
      source_checkout_commit: baseline
        ? "baseline-checkout"
        : "candidate-checkout",
      variant_id: baseline
        ? "authoring-compact-v2"
        : "authoring-source-derived",
      variant_role: role,
      protocol_status: "formal",
      harness_initialized: true,
    },
    elapsed: { duration_ms: baseline ? 1000 : 800 },
    metrics: {
      hard_gate_passed: true,
      authoring: {
        canonical_authority_fingerprint: fingerprint,
        effective_yaml_lines: baseline ? 100 : 75,
        yaml_bytes: baseline ? 1000 : 700,
        preflight_rounds: baseline ? 3 : 1,
        manual_source_ref_count: baseline ? 4 : 0,
        manual_source_statement_count: baseline ? 4 : 0,
        manual_risk_fact_rows: baseline ? 2 : 1,
      },
    },
  };
}
