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
import { writeDesignResourceSymbolicHandoffFixture } from "./design-resource-symbolic-handoff-fixture.mjs";
import {
  enableCompactSymbolicApplicability,
  enableFixtureTrustedNoninterference,
  rekeySymbolicFixtureCertificate,
} from "./design-resource-symbolic-handoff-fixture-model.mjs";

export async function exerciseMixedSymbolicLongTaskClosure() {
  return exerciseMixedSymbolicLongTaskClosureWithOptions({});
}

export async function exerciseCompactTrustedSymbolicLongTaskClosure() {
  return exerciseMixedSymbolicLongTaskClosureWithOptions({
    mutateSymbolicModel(model) {
      enableCompactSymbolicApplicability(model);
      enableFixtureTrustedNoninterference(model);
    },
    assertPrepared({ v2 }) {
      assert.equal(v2.manifest.disposition_regions.length, 0);
      assert.equal(v2.manifest.dependency_edges.length, 0);
      assert.equal(v2.manifest.fact_rules.length, 2);
      assert.equal(v2.metrics.certificate_covered_omitted_axes, 2);
      const certificate = v2.manifest.noninterference_certificates[0];
      assert.equal(
        certificate.source_noninterference_proof.method,
        "closed_world_static_dependency_closure",
      );
      assert.equal(
        certificate.production_noninterference_proof.method,
        "closed_world_static_dependency_closure",
      );
    },
  });
}

async function exerciseMixedSymbolicLongTaskClosureWithOptions({
  mutateSymbolicModel,
  assertPrepared,
}) {
  const fixture = await createDeliveryFixture();
  const fakePlaywrightBin = await createFakePlaywrightBin();
  const env = withPath(fakePlaywrightBin);
  try {
    const prepared = await prepareMixedSymbolicLongTaskFixture(fixture, {
      mutateSymbolicModel,
    });
    const { v2, artifactHashes, designRecords } = prepared;
    assertPrepared?.(prepared);
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
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir], {
      env,
    });
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

export async function exerciseSymbolicCompileRejectsUntrustedDynamicDependency() {
  const fixture = await createDeliveryFixture();
  try {
    await prepareMixedSymbolicLongTaskFixture(fixture, {
      mutateSymbolicModel(model) {
        enableCompactSymbolicApplicability(model);
        enableFixtureTrustedNoninterference(model);
      },
    });
    await writeDesignResourceSymbolicHandoffFixture(
      fixture.root,
      (model) => {
        enableCompactSymbolicApplicability(model);
        enableFixtureTrustedNoninterference(model);
        model.certificate.source_noninterference_proof.dynamic_dependency_kinds.push(
          "reflection",
        );
        rekeySymbolicFixtureCertificate(model);
      },
      { directory: "design-symbolic" },
    );
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
      /v2_noninterference_dynamic_dependency_unproved/u,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
}

export async function exerciseSymbolicCompileRejectsUnresolvedDisposition() {
  const fixture = await createDeliveryFixture();
  try {
    await prepareMixedSymbolicLongTaskFixture(fixture);
    await writeDesignResourceSymbolicHandoffFixture(
      fixture.root,
      ({ manifest }) => {
        manifest.disposition_regions[0].disposition = "decision_required";
      },
      { directory: "design-symbolic" },
    );
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
      /v2_unresolved_disposition/u,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
}

export async function exerciseSymbolicFinalGateRejectsCounterexample() {
  const fixture = await createDeliveryFixture();
  const fakePlaywrightBin = await createFakePlaywrightBin();
  const env = withPath(fakePlaywrightBin);
  try {
    await prepareMixedSymbolicLongTaskFixture(fixture, {
      mutateSymbolicModel(model) {
        enableCompactSymbolicApplicability(model);
        enableFixtureTrustedNoninterference(model);
      },
      mutateDesignRecords(records) {
        const certificate = records.find(
          (item) => item.capability === "design_symbolic_certificate",
        );
        certificate.certificate_results[0].production_noninterference_proof_sha256 =
          "0".repeat(64);
      },
    });
    await runCli(fixture.root, ["enable", "long-task"], { env });
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir], {
      env,
    });
    const receipt = await runFinalGate(fixture, env);
    assert.notEqual(receipt.workflow_status, "machine_accepted");
    assert.match(
      JSON.stringify(receipt),
      /design_symbolic_certificate_denotation_mismatch/u,
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
  mutatedCertificate.certificate_results[0].fact_rule_refs.pop();
  assert.equal(
    validateRuntimeEvidenceRecord(
      compiledCheck,
      decodeEvidenceCapabilityRecords([mutatedCertificate])[0],
      artifactHashes,
    ),
    "design_symbolic_certificate_denotation_mismatch",
  );
  if (
    symbolicCertificate.certificate_results[0]
      .production_noninterference_proof_sha256
  ) {
    const mutatedProductionProof = structuredClone(symbolicCertificate);
    mutatedProductionProof.certificate_results[0].production_noninterference_proof_sha256 =
      "0".repeat(64);
    assert.equal(
      validateRuntimeEvidenceRecord(
        compiledCheck,
        decodeEvidenceCapabilityRecords([mutatedProductionProof])[0],
        artifactHashes,
      ),
      "design_symbolic_certificate_denotation_mismatch",
    );
  }
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
