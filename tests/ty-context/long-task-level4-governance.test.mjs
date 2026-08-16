import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  LEVEL4_AUDIT_REQUIRED_INPUT_ROLES,
  validateLevel4EvidenceReference,
  validateLevel4IndependentAuditRecord,
  validateLevel4OwnerDecision,
  validateLevel4PromotionRecord,
} from "../../tools/level4_governance_protocol.mjs";
import { verifyLevel4GovernancePromotion } from "../../tools/verify_level4_governance_promotion.mjs";
import {
  canonical,
  sha256,
} from "../../tools/long_task_real_process_roi_scoring.mjs";
import {
  buildLevel4GovernanceRecords,
  digestEntry,
} from "./helpers/long-task-level4-governance-fixture.mjs";
import { git, writeArtifact } from "./helpers/long-task-level4-test-utils.mjs";

test("[critical:level4-governance-audit-boundary] audit binds independence, complete input census, current commands/results, findings, and sole formal owner", () => {
  const fixture = governanceFixture({
    commit: "a".repeat(40),
    tree: "b".repeat(40),
  });
  const { evidenceReference, auditRecord, ownerDecision, promotionRecord } =
    fixture;
  assert.equal(
    validateLevel4EvidenceReference(evidenceReference),
    evidenceReference,
  );
  assert.equal(
    validateLevel4IndependentAuditRecord(auditRecord, evidenceReference),
    auditRecord,
  );
  assert.equal(
    validateLevel4OwnerDecision(ownerDecision, evidenceReference, auditRecord),
    ownerDecision,
  );
  assert.equal(
    validateLevel4PromotionRecord(
      promotionRecord,
      evidenceReference,
      auditRecord,
      ownerDecision,
    ),
    promotionRecord,
  );
  assert.equal(
    auditRecord.formal_conclusion_owner,
    "verify_long_task_real_process_roi",
  );
  assert.equal(auditRecord.formal_roi_conclusion_owned, false);
  assert.deepEqual(
    auditRecord.inputs.map((entry) => entry.role).sort(),
    [...LEVEL4_AUDIT_REQUIRED_INPUT_ROLES].sort(),
  );
});

test("dependent auditors, incomplete or altered inputs, stale commands, and hidden findings fail closed", () => {
  const { evidenceReference, auditRecord } = governanceFixture({
    commit: "a".repeat(40),
    tree: "b".repeat(40),
  });
  const dependent = structuredClone(auditRecord);
  dependent.auditor.auditor_id = dependent.auditor.implementation_owner_id;
  assert.throws(
    () => validateLevel4IndependentAuditRecord(dependent, evidenceReference),
    /level4_auditor_independence/u,
  );
  const participant = structuredClone(auditRecord);
  participant.auditor.collection_participation = true;
  assert.throws(
    () => validateLevel4IndependentAuditRecord(participant, evidenceReference),
    /level4_auditor_independence/u,
  );
  const missing = structuredClone(auditRecord);
  missing.inputs.pop();
  missing.input_census_identity_sha256 = "0".repeat(64);
  assert.throws(
    () => validateLevel4IndependentAuditRecord(missing, evidenceReference),
    /level4_audit_input/u,
  );
  const failed = structuredClone(auditRecord);
  failed.commands.find(
    (item) => item.command_id === "formal-verifier",
  ).exit_code = 1;
  assert.throws(
    () => validateLevel4IndependentAuditRecord(failed, evidenceReference),
    /level4_audit_current_results/u,
  );
  const unrelatedReport = structuredClone(auditRecord);
  const reportInput = unrelatedReport.inputs.find(
    (item) => item.role === "formal-verifier-report",
  );
  reportInput.sha256 = "1".repeat(64);
  unrelatedReport.input_census_identity_sha256 = sha256(
    canonical(unrelatedReport.inputs),
  );
  assert.throws(
    () =>
      validateLevel4IndependentAuditRecord(unrelatedReport, evidenceReference),
    /level4_audit_evidence_artifact_binding/u,
  );
  const unrelatedCommandOutput = structuredClone(auditRecord);
  unrelatedCommandOutput.commands.find(
    (item) => item.command_id === "formal-verifier",
  ).stdout_sha256 = "2".repeat(64);
  assert.throws(
    () =>
      validateLevel4IndependentAuditRecord(
        unrelatedCommandOutput,
        evidenceReference,
      ),
    /level4_audit_current_results/u,
  );
  const unrelatedCommand = structuredClone(auditRecord);
  unrelatedCommand.commands.find(
    (item) => item.command_id === "formal-verifier",
  ).argv = ["node", "tools/print_prebuilt_report.mjs"];
  assert.throws(
    () =>
      validateLevel4IndependentAuditRecord(unrelatedCommand, evidenceReference),
    /level4_audit_current_results/u,
  );
  const hidden = structuredClone(auditRecord);
  hidden.findings.push({
    finding_id: "open-critical",
    severity: "critical-counterexample",
    status: "open",
    summary: "False-acceptance path remains open.",
    input_refs: [hidden.inputs[0].id],
    command_refs: ["validation"],
  });
  assert.throws(
    () => validateLevel4IndependentAuditRecord(hidden, evidenceReference),
    /level4_audit_conclusion/u,
  );
  const secondVerifier = structuredClone(auditRecord);
  secondVerifier.formal_roi_conclusion_owned = true;
  assert.throws(
    () =>
      validateLevel4IndependentAuditRecord(secondVerifier, evidenceReference),
    /level4_audit/u,
  );
});

test("owner approval and promotion records cannot drift package, benchmark, runtime, audit, or candidate identities", () => {
  const { evidenceReference, auditRecord, ownerDecision, promotionRecord } =
    governanceFixture({
      commit: "a".repeat(40),
      tree: "b".repeat(40),
    });
  const wrongOwner = structuredClone(ownerDecision);
  wrongOwner.audit_record_sha256 = "0".repeat(64);
  assert.throws(
    () =>
      validateLevel4OwnerDecision(wrongOwner, evidenceReference, auditRecord),
    /level4_owner_decision/u,
  );
  for (const field of [
    "package_sha256",
    "benchmark_implementation_identity_sha256",
    "runtime_tcb_identity_sha256",
  ]) {
    const drift = structuredClone(promotionRecord);
    drift[field] = "0".repeat(64);
    assert.throws(
      () =>
        validateLevel4PromotionRecord(
          drift,
          evidenceReference,
          auditRecord,
          ownerDecision,
        ),
      /level4_promotion_record/u,
    );
  }
});

test("direct-child governance-only additions pass the commit boundary, while any candidate/TCB-surface mutation fails before evidence use", async () => {
  const temporary = await mkdtemp(
    path.join(os.tmpdir(), "ty-level4-governance-"),
  );
  const repository = path.join(temporary, "repository");
  const evidenceRoot = path.join(temporary, "external-evidence-pending");
  try {
    await mkdir(repository);
    await mkdir(evidenceRoot);
    await git(repository, ["init"]);
    await git(repository, ["config", "user.email", "fixture@example.invalid"]);
    await git(repository, ["config", "user.name", "Fixture"]);
    await writeArtifact(repository, "README.md", "candidate\n");
    await git(repository, ["add", "."]);
    await git(repository, ["commit", "-m", "evidence candidate"]);
    const commit = await git(repository, ["rev-parse", "HEAD"]);
    const tree = await git(repository, ["rev-parse", "HEAD^{tree}"]);
    const records = governanceFixture({ commit, tree });
    const governanceRoot = `governance/level4-promotion/${commit}`;
    await writeGovernanceRecords(repository, governanceRoot, records);
    await git(repository, ["add", "."]);
    await git(repository, ["commit", "-m", "governance promotion boundary"]);
    const promotion = await git(repository, ["rev-parse", "HEAD"]);
    assert.equal(await git(repository, ["rev-parse", `${promotion}^`]), commit);
    await assert.rejects(
      () =>
        verifyLevel4GovernancePromotion({
          repositoryRoot: repository,
          promotionCommit: promotion,
          evidenceRoot,
        }),
      /ENOENT|formal_evidence_regular_file/u,
    );
    await writeArtifact(repository, "dirty.tmp", "dirty checkout\n");
    await assert.rejects(
      () =>
        verifyLevel4GovernancePromotion({
          repositoryRoot: repository,
          promotionCommit: promotion,
          evidenceRoot,
        }),
      /level4_promotion_current_checkout_identity/u,
    );
    await rm(path.join(repository, "dirty.tmp"));
    await assert.rejects(
      () =>
        verifyLevel4GovernancePromotion({
          repositoryRoot: repository,
          promotionCommit: commit,
          evidenceRoot,
        }),
      /level4_promotion_current_checkout_identity/u,
    );

    await git(repository, ["switch", "--detach", commit]);
    await writeGovernanceRecords(repository, governanceRoot, records);
    await writeArtifact(
      repository,
      "PROJECT_SPEC.md",
      "forbidden promotion mutation\n",
    );
    await git(repository, ["add", "."]);
    await git(repository, ["commit", "-m", "invalid promotion mutation"]);
    const invalid = await git(repository, ["rev-parse", "HEAD"]);
    await assert.rejects(
      () =>
        verifyLevel4GovernancePromotion({
          repositoryRoot: repository,
          promotionCommit: invalid,
          evidenceRoot,
        }),
      /level4_promotion_diff_allowlist/u,
    );
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

function governanceFixture({ commit, tree }) {
  const candidate = {
    commit,
    tree,
    package_version: "0.8.14",
    package_sha256: "c".repeat(64),
  };
  const evidenceArtifacts = [
    ["candidate-package", "candidate-package-tarball", "candidate.tgz"],
    ["formal-packet", "formal-evidence-packet", "formal-evidence-index.json"],
    ["formal-report", "formal-verifier-report", "formal-report.json"],
    ["frozen-config", "run-set-frozen-config", "frozen-config.json"],
    ["manifest", "run-set-manifest", "manifest.json"],
  ].map(([id, role, locator]) =>
    digestEntry(id, role, locator, Buffer.from(`${role}\n`)),
  );
  const auditInputs = LEVEL4_AUDIT_REQUIRED_INPUT_ROLES.map((role) =>
    digestEntry(
      `audit-${role}`,
      role,
      `audit/${role}.bin`,
      Buffer.from(`${role}\n`),
    ),
  );
  return buildLevel4GovernanceRecords({
    candidate,
    benchmarkIdentitySha256: "d".repeat(64),
    runtimeTcbIdentitySha256: "e".repeat(64),
    evidenceArtifacts,
    auditInputs,
  });
}

async function writeGovernanceRecords(repository, governanceRoot, records) {
  for (const [name, record] of [
    ["evidence-reference.json", records.evidenceReference],
    ["independent-audit.json", records.auditRecord],
    ["owner-decision.json", records.ownerDecision],
    ["promotion-record.json", records.promotionRecord],
  ])
    await writeArtifact(repository, `${governanceRoot}/${name}`, record);
}
