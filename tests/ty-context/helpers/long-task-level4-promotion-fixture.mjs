import assert from "node:assert/strict";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { LEVEL4_AUDIT_REQUIRED_INPUT_ROLES } from "../../../tools/level4_governance_protocol.mjs";
import { readPackedPackageIdentity } from "../../../tools/long_task_packed_package_identity.mjs";
import { REAL_PROCESS_SCHEMAS } from "../../../tools/long_task_real_process_schema_policy.mjs";
import {
  canonical,
  sha256,
} from "../../../tools/long_task_real_process_roi_scoring.mjs";
import {
  buildLevel4GovernanceRecords,
  digestEntry,
} from "./long-task-level4-governance-fixture.mjs";
import {
  digest,
  git,
  toBytes,
  writeArtifact,
} from "./long-task-level4-test-utils.mjs";

export async function runPromotionCase(options) {
  const {
    repositoryRoot,
    temporary,
    registered,
    label,
    plan,
    candidateRecord,
    evidencePackage,
    reportPackage,
    manifestPackage,
  } = options;
  const evidenceRoot = path.join(temporary, `${label}-evidence`);
  await mkdir(evidenceRoot);
  const candidate = {
    commit: candidateRecord.commit,
    tree: candidateRecord.tree,
    package_version: evidencePackage.identity.package_version,
    package_sha256: evidencePackage.identity.package_sha256,
  };
  const manifestBytes = toBytes(buildManifest(manifestPackage));
  const reportBytes = toBytes(
    buildFormalReport({ candidate, plan, reportPackage, manifestBytes }),
  );
  const frozenConfigBytes = toBytes(plan.frozenConfig);
  const packetBytes = Buffer.from("synthetic promotion control only\n");
  const evidenceFiles = [
    [
      "candidate-package",
      "candidate-package-tarball",
      "candidate.tgz",
      evidencePackage.bytes,
    ],
    [
      "formal-packet",
      "formal-evidence-packet",
      "formal-evidence-index.json",
      packetBytes,
    ],
    [
      "formal-report",
      "formal-verifier-report",
      "formal-report.json",
      reportBytes,
    ],
    [
      "frozen-config",
      "run-set-frozen-config",
      "frozen-config.json",
      frozenConfigBytes,
    ],
    ["manifest", "run-set-manifest", "manifest.json", manifestBytes],
  ];
  for (const [, , locator, bytes] of evidenceFiles)
    await writeArtifact(evidenceRoot, locator, bytes);
  const evidenceArtifacts = evidenceFiles.map(([id, role, locator, bytes]) =>
    digestEntry(id, role, locator, bytes),
  );
  const auditInputs = [];
  for (const role of LEVEL4_AUDIT_REQUIRED_INPUT_ROLES) {
    const bytes = auditBytes(role, {
      candidatePackage: evidencePackage.bytes,
      reportBytes,
      manifestBytes,
      frozenConfigBytes,
      packetBytes,
    });
    const locator = `audit/${role}.bin`;
    await writeArtifact(evidenceRoot, locator, bytes);
    auditInputs.push(digestEntry(`audit-${role}`, role, locator, bytes));
  }
  const records = buildLevel4GovernanceRecords({
    candidate,
    benchmarkIdentitySha256:
      plan.frozenConfig.benchmark_implementation_identity.identity_sha256,
    runtimeTcbIdentitySha256:
      plan.frozenConfig.formal_runtime_tcb_identity.identity_sha256,
    evidenceArtifacts,
    auditInputs,
  });
  const checkout = await createPromotionCommit({
    repositoryRoot,
    temporary,
    registered,
    label,
    candidateCommit: candidate.commit,
    records,
  });
  const promotionCommit = await git(checkout, ["rev-parse", "HEAD"]);
  const verifyLevel4GovernancePromotion = await verifierAtCheckout(checkout);
  const result = await verifyLevel4GovernancePromotion({
    repositoryRoot: checkout,
    promotionCommit,
    evidenceRoot,
  });
  return {
    ...result,
    records,
    evidenceRoot,
    checkout,
    promotionCommit,
  };
}

export async function assertPromotionMutationRejected(options) {
  const checkout = await createPromotionCommit(options);
  if (options.mutation.endsWith(".mjs"))
    await appendFile(
      path.join(checkout, ...options.mutation.split("/")),
      "\n// forbidden promotion mutation\n",
      "utf8",
    );
  else
    await writeArtifact(
      checkout,
      options.mutation,
      "forbidden promotion mutation\n",
    );
  await git(checkout, ["add", "."]);
  await git(checkout, ["commit", "--amend", "--no-edit"]);
  const promotionCommit = await git(checkout, ["rev-parse", "HEAD"]);
  const verifyLevel4GovernancePromotion = await verifierAtCheckout(checkout);
  await assert.rejects(
    () =>
      verifyLevel4GovernancePromotion({
        repositoryRoot: checkout,
        promotionCommit,
        evidenceRoot: options.evidenceRoot,
      }),
    /level4_promotion_diff_allowlist/u,
  );
}

async function verifierAtCheckout(checkout) {
  const modulePath = path.join(
    checkout,
    "tools",
    "verify_level4_governance_promotion.mjs",
  );
  const module = await import(pathToFileURL(modulePath).href);
  return module.verifyLevel4GovernancePromotion;
}

export function packageControl(bytes) {
  const value = Buffer.from(bytes);
  return { bytes: value, identity: readPackedPackageIdentity(value) };
}

function buildManifest(packageEntry) {
  const entries = [
    {
      path: `setup/c/project-tiny-context-harness-${packageEntry.identity.package_version}.tgz`,
      role: "package_tarball",
      bytes: packageEntry.bytes.length,
      sha256: packageEntry.identity.package_sha256,
    },
  ];
  return {
    schema_version: REAL_PROCESS_SCHEMAS.REAL_PROCESS_MANIFEST_SCHEMA,
    root: ".",
    excludes: ["attestation.json", "manifest.json"],
    entries,
    entry_count: entries.length,
    total_bytes: entries[0].bytes,
    materialized_set_sha256: sha256(canonical(entries)),
  };
}

function buildFormalReport({ candidate, plan, reportPackage, manifestBytes }) {
  return {
    schema_version: REAL_PROCESS_SCHEMAS.REAL_PROCESS_VERIFICATION_SCHEMA,
    formal_conclusion_owner: "verify_long_task_real_process_roi",
    candidate_commit: candidate.commit,
    candidate_tree: candidate.tree,
    capability_level: "level_3",
    level_4_claimed: false,
    governance_judgment_included: false,
    formal_status: "total_roi_positive",
    total_roi_supported: true,
    total_roi_positive: true,
    formal_runtime_tcb_identity_sha256:
      plan.frozenConfig.formal_runtime_tcb_identity.identity_sha256,
    candidate_package: {
      package_name: reportPackage.identity.package_name,
      package_version: reportPackage.identity.package_version,
      package_sha256: reportPackage.identity.package_sha256,
    },
    manifest_sha256: digest(manifestBytes),
    formal_blockers: [],
    formal_accounting: { significant_stable_margin_met: true },
    formal_evidence: { incident_evidence_class: "authorized_sanitized_real" },
    synthetic_test_control_only: true,
  };
}

async function createPromotionCommit({
  repositoryRoot,
  temporary,
  registered,
  label,
  candidateCommit,
  records,
}) {
  const checkout = path.join(temporary, `${label}-promotion`);
  await git(repositoryRoot, [
    "worktree",
    "add",
    "--detach",
    checkout,
    candidateCommit,
  ]);
  registered.push(checkout);
  await git(checkout, ["config", "user.email", "fixture@example.invalid"]);
  await git(checkout, ["config", "user.name", "Fixture"]);
  await writeGovernanceRecords(checkout, candidateCommit, records);
  await git(checkout, ["add", "."]);
  await git(checkout, ["commit", "-m", `synthetic ${label}`]);
  return checkout;
}

async function writeGovernanceRecords(root, candidateCommit, records) {
  const governanceRoot = `governance/level4-promotion/${candidateCommit}`;
  for (const [name, record] of [
    ["evidence-reference.json", records.evidenceReference],
    ["independent-audit.json", records.auditRecord],
    ["owner-decision.json", records.ownerDecision],
    ["promotion-record.json", records.promotionRecord],
  ])
    await writeArtifact(root, `${governanceRoot}/${name}`, record);
}

function auditBytes(role, sources) {
  if (role === "candidate-package-tarball") return sources.candidatePackage;
  if (role === "formal-evidence-packet") return sources.packetBytes;
  if (role === "formal-verifier-report") return sources.reportBytes;
  if (role === "run-set-manifest-and-attestation") return sources.manifestBytes;
  if (role === "runtime-tcb") return sources.frozenConfigBytes;
  return Buffer.from(`synthetic audit input control: ${role}\n`);
}
