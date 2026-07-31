import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { rm } from "node:fs/promises";
import { compileDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-delivery-compiler.js";
import { decodeEvidenceCapabilityRecords } from "../../packages/ty-context/dist/lib/long-task-evidence-capability-codec.js";
import { validateRuntimeEvidenceRecord } from "../../packages/ty-context/dist/lib/long-task-evidence-capability-runtime.js";
import {
  createDeliveryFixture,
  runCli,
} from "./long-task-delivery-fixtures.mjs";
import {
  createFakePlaywrightBin,
  withPath,
} from "./long-task-final-closure-mutation-fixtures.mjs";
import { prepareMixedSymbolicLongTaskFixture } from "./symbolic-denotation-long-task-v2-setup.mjs";

export async function exerciseMixedSymbolicLongTaskClosure() {
  const fixture = await createDeliveryFixture();
  const fakePlaywrightBin = await createFakePlaywrightBin();
  const env = withPath(fakePlaywrightBin);
  try {
    const prepared = await prepareMixedSymbolicLongTaskFixture(fixture);
    const {
      v2,
      artifactHashes,
      designRecords,
    } = prepared;
    const oracleProbe = JSON.parse(
      execFileSync(process.execPath, ["tests/oracle.mjs", "first"], {
        cwd: fixture.root,
        encoding: "utf8",
      }),
    );
    assert.equal(oracleProbe.observations.v2_symbolic_certificate, true);
    const compiled = await compileDeliveryContract(
      fixture.workdir,
      fixture.root,
      { require_completion_gate: false },
    );
    const compiledTargets =
      compiled.outcomes[0].acceptance.checks[0].design_conformance_targets;
    assert.deepEqual(
      compiledTargets.map((item) => item.fact_model ?? "ground_facts_v1"),
      ["ground_facts_v1", "symbolic_rules_v2"],
    );
    assert.equal(
      compiledTargets[1].symbolic_certificate_binding.metrics
        .theoretical_ground_cardinality,
      v2.metrics.theoretical_ground_cardinality,
    );
    validateSymbolicEvidenceMutations(
      compiled.outcomes[0].acceptance.checks[0],
      designRecords,
      artifactHashes,
    );
    await runCli(fixture.root, ["enable", "long-task"], { env });
    await runCli(
      fixture.root,
      ["long-task", "compile", fixture.workdir],
      { env },
    );
    await runCli(fixture.root, ["long-task", "verify", fixture.workdir], {
      env,
    });
    const receipt = await runFinalGate(fixture, env);
    assert.equal(
      receipt.workflow_status,
      "machine_accepted",
      JSON.stringify({
        stage_results: receipt.stage_results,
        findings: receipt.findings,
      }),
    );
  } finally {
    await Promise.all([
      rm(fixture.root, { recursive: true, force: true }),
      rm(fakePlaywrightBin, { recursive: true, force: true }),
    ]);
  }
}

function validateSymbolicEvidenceMutations(
  compiledCheck,
  designRecords,
  artifactHashes,
) {
  const symbolicMethod = designRecords.find(
    (item) =>
      item.capability === "design_method" &&
      item.fact_model === "symbolic_rules_v2",
  );
  const symbolicCertificate = designRecords.find(
    (item) => item.capability === "design_symbolic_certificate",
  );
  assert.equal(
    validateRuntimeEvidenceRecord(
      compiledCheck,
      decodeEvidenceCapabilityRecords([symbolicMethod])[0],
      artifactHashes,
    ),
    null,
  );
  assert.equal(
    validateRuntimeEvidenceRecord(
      compiledCheck,
      decodeEvidenceCapabilityRecords([symbolicCertificate])[0],
      artifactHashes,
    ),
    null,
  );
  const crossSubstitution = structuredClone(symbolicMethod);
  delete crossSubstitution.fact_model;
  assert.throws(
    () => decodeEvidenceCapabilityRecords([crossSubstitution]),
    /check_evidence_records_invalid/u,
  );
  const mutatedRule = structuredClone(symbolicMethod);
  mutatedRule.rule_results[0].region_sha256 = "0".repeat(64);
  assert.equal(
    validateRuntimeEvidenceRecord(
      compiledCheck,
      decodeEvidenceCapabilityRecords([mutatedRule])[0],
      artifactHashes,
    ),
    "design_symbolic_method_identity_mismatch",
  );
  const mutatedCertificate = structuredClone(symbolicCertificate);
  mutatedCertificate.certificate_results[0].omitted_axis_refs = [];
  assert.equal(
    validateRuntimeEvidenceRecord(
      compiledCheck,
      decodeEvidenceCapabilityRecords([mutatedCertificate])[0],
      artifactHashes,
    ),
    "design_symbolic_certificate_denotation_mismatch",
  );
}

async function runFinalGate(fixture, env) {
  try {
    return await runCli(
      fixture.root,
      ["long-task", "final-gate", fixture.workdir],
      { env },
    );
  } catch (error) {
    if (!error.stdout) throw error;
    return JSON.parse(error.stdout);
  }
}
