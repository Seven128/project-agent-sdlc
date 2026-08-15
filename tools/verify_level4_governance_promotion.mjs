import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import {
  LEVEL4_GOVERNANCE_RECORD_NAMES,
  validateLevel4EvidenceReference,
  validateLevel4IndependentAuditRecord,
  validateLevel4OwnerDecision,
  validateLevel4PromotionRecord,
} from "./level4_governance_protocol.mjs";
import { readFile } from "node:fs/promises";
import { readPackedPackageIdentity } from "./long_task_packed_package_identity.mjs";
import { realProcessRoiBenchmarkImplementationPaths } from "./long_task_real_process_roi_runner.mjs";
import { validateFormalRuntimeTcbIdentity } from "./long_task_formal_runtime_tcb.mjs";
import {
  assert,
  canonical,
  sha256,
} from "./long_task_real_process_roi_scoring.mjs";
import { parseJson } from "./long_task_formal_total_cost_shared.mjs";
import { comparePackedPackages } from "./level4_package_identity_comparator.mjs";
import {
  parseAndValidateLevel4FormalReport,
  parseAndValidateLevel4FrozenCandidate,
  parseAndValidateLevel4RunSetManifest,
  validateLevel4ExternalArtifacts,
} from "./level4_promotion_evidence_validation.mjs";

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export async function verifyLevel4GovernancePromotion(options) {
  assertExactPromotionOptions(options);
  const repository = path.resolve(options.repositoryRoot);
  const evidenceRoot = options.evidenceRoot;
  const promotion = await gitText(repository, [
    "rev-parse",
    `${options.promotionCommit}^{commit}`,
  ]);
  const promotionTree = await gitText(repository, [
    "rev-parse",
    `${promotion}^{tree}`,
  ]);
  const [currentHead, currentTree, currentStatus] = await Promise.all([
    gitText(repository, ["rev-parse", "HEAD"]),
    gitText(repository, ["rev-parse", "HEAD^{tree}"]),
    gitBytes(repository, ["status", "--porcelain=v1", "-z"]),
  ]);
  assert(
    currentHead === promotion &&
      currentTree === promotionTree &&
      currentStatus.length === 0,
    "level4_promotion_current_checkout_identity",
  );
  const parents = (
    await gitText(repository, ["rev-list", "--parents", "-n", "1", promotion])
  ).split(/\s+/u);
  assert(parents.length === 2, "level4_promotion_single_parent");
  const candidateCommit = parents[1];
  const candidateTree = await gitText(repository, [
    "rev-parse",
    `${candidateCommit}^{tree}`,
  ]);
  const governanceRoot = `governance/level4-promotion/${candidateCommit}`;
  await validatePromotionDiff({
    repository,
    candidateCommit,
    promotion,
    governanceRoot,
  });
  const records = {};
  for (const name of LEVEL4_GOVERNANCE_RECORD_NAMES) {
    const bytes = await gitBytes(repository, [
      "show",
      `${promotion}:${governanceRoot}/${name}`,
    ]);
    records[name] = parseJson(bytes, `level4_governance_record:${name}`);
  }
  const evidenceReference = validateLevel4EvidenceReference(
    records["evidence-reference.json"],
  );
  assert(
    evidenceReference.candidate.commit === candidateCommit &&
      evidenceReference.candidate.tree === candidateTree,
    "level4_promotion_candidate_parent",
  );
  const auditRecord = validateLevel4IndependentAuditRecord(
    records["independent-audit.json"],
    evidenceReference,
  );
  const ownerDecision = validateLevel4OwnerDecision(
    records["owner-decision.json"],
    evidenceReference,
    auditRecord,
  );
  const promotionRecord = validateLevel4PromotionRecord(
    records["promotion-record.json"],
    evidenceReference,
    auditRecord,
    ownerDecision,
  );
  const resolvedEvidenceRoot = path.resolve(evidenceRoot);
  const evidenceArtifacts = await validateLevel4ExternalArtifacts(
    resolvedEvidenceRoot,
    evidenceReference.artifacts,
  );
  await validateLevel4ExternalArtifacts(
    resolvedEvidenceRoot,
    auditRecord.inputs,
  );
  const evidencePackage = readPackedPackageIdentity(
    evidenceArtifacts.get("candidate-package-tarball"),
  );
  assert(
    evidencePackage.package_sha256 ===
      evidenceReference.candidate.package_sha256 &&
      evidencePackage.package_version ===
        evidenceReference.candidate.package_version,
    "level4_evidence_package_identity",
  );
  const formalReport = parseAndValidateLevel4FormalReport(
    evidenceArtifacts.get("formal-verifier-report"),
    evidenceReference,
  );
  const frozenConfig = parseAndValidateLevel4FrozenCandidate(
    evidenceArtifacts.get("run-set-frozen-config"),
    evidenceReference,
  );
  const manifestBytes = evidenceArtifacts.get("run-set-manifest");
  assert(
    digest(manifestBytes) === formalReport.manifest_sha256,
    "level4_promotion_report_manifest_identity",
  );
  const runSetManifest = parseAndValidateLevel4RunSetManifest(manifestBytes);
  const candidatePackageEntries = runSetManifest.entries.filter(
    (entry) =>
      entry.role === "package_tarball" &&
      /^setup\/c\/.+\.tgz$/u.test(entry.path),
  );
  assert(
    candidatePackageEntries.length === 1 &&
      candidatePackageEntries[0].sha256 ===
        formalReport.candidate_package.package_sha256 &&
      candidatePackageEntries[0].bytes ===
        evidenceArtifacts.get("candidate-package-tarball").length,
    "level4_promotion_run_set_candidate_package",
  );
  const [candidateBenchmark, promotionBenchmark, currentBenchmark] =
    await Promise.all([
    sourceIdentityAtCommit(
      repository,
      candidateCommit,
      realProcessRoiBenchmarkImplementationPaths,
    ),
    sourceIdentityAtCommit(
      repository,
      promotion,
      realProcessRoiBenchmarkImplementationPaths,
    ),
      sourceIdentityAtWorkingTree(
        repository,
        realProcessRoiBenchmarkImplementationPaths,
      ),
    ]);
  assert(
    canonical(candidateBenchmark) === canonical(promotionBenchmark) &&
      canonical(promotionBenchmark) === canonical(currentBenchmark) &&
      candidateBenchmark.identity_sha256 ===
        evidenceReference.benchmark_implementation_identity_sha256 &&
      canonical(frozenConfig.benchmark_implementation_identity) ===
        canonical(candidateBenchmark) &&
      frozenConfig.formal_runtime_tcb_identity.identity_sha256 ===
        evidenceReference.runtime_tcb_identity_sha256,
    "level4_promotion_benchmark_runtime_tcb_identity",
  );
  await validateFormalRuntimeTcbIdentity({
    identity: frozenConfig.formal_runtime_tcb_identity,
    environment: frozenConfig.environment,
    benchmarkImplementationIdentity: candidateBenchmark,
  });
  const packageComparison = await comparePackedPackages({
    repositoryRoot: repository,
    candidateCommit,
    promotionCommit: promotion,
  });
  assert(
    packageComparison.candidate.package_sha256 ===
      evidenceReference.candidate.package_sha256 &&
      packageComparison.promotion.package_sha256 ===
        evidenceReference.candidate.package_sha256 &&
      packageComparison.candidate.package_version ===
        evidenceReference.candidate.package_version &&
      packageComparison.promotion.package_version ===
        evidenceReference.candidate.package_version &&
      packageComparison.candidate.package_name ===
        formalReport.candidate_package.package_name &&
      packageComparison.promotion.package_name ===
        formalReport.candidate_package.package_name &&
      evidencePackage.package_sha256 ===
        candidatePackageEntries[0].sha256,
    "level4_promotion_package_identity",
  );
  return {
    schema_version: "level4-governance-promotion-verification-v1",
    promotion_commit: promotion,
    candidate_commit: candidateCommit,
    candidate_tree: candidateTree,
    governance_root: governanceRoot,
    package_sha256: evidenceReference.candidate.package_sha256,
    benchmark_implementation_identity_sha256:
      evidenceReference.benchmark_implementation_identity_sha256,
    runtime_tcb_identity_sha256: evidenceReference.runtime_tcb_identity_sha256,
    formal_report_sha256: digest(
      evidenceArtifacts.get("formal-verifier-report"),
    ),
    formal_conclusion_owner: "verify_long_task_real_process_roi",
    governance_audit_passed:
      auditRecord.audit_conclusion.governance_audit_passed,
    owner_approved: ownerDecision.approved,
    promotion_record_sha256: sha256(canonical(promotionRecord)),
    governance_promotion_verified: true,
  };
}

async function validatePromotionDiff({
  repository,
  candidateCommit,
  promotion,
  governanceRoot,
}) {
  const output = await gitText(repository, [
    "diff",
    "--name-status",
    "--no-renames",
    candidateCommit,
    promotion,
    "--",
  ]);
  const rows = output
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => line.split("\t"));
  const expectedPaths = LEVEL4_GOVERNANCE_RECORD_NAMES.map(
    (name) => `${governanceRoot}/${name}`,
  ).sort();
  assert(
    rows.length === expectedPaths.length &&
      rows.every(([status]) => status === "A") &&
      canonical(rows.map(([, file]) => file).sort()) ===
        canonical(expectedPaths),
    "level4_promotion_diff_allowlist",
  );
}

async function sourceIdentityAtCommit(repository, commit, paths) {
  const entries = [];
  for (const relative of paths) {
    const bytes = await gitBytes(repository, ["show", `${commit}:${relative}`]);
    entries.push({
      path: relative,
      bytes: bytes.length,
      sha256: digest(bytes),
    });
  }
  return {
    entries,
    identity_sha256: sha256(canonical(entries)),
  };
}

async function sourceIdentityAtWorkingTree(repository, paths) {
  const entries = [];
  for (const relative of paths) {
    const bytes = await readFile(
      path.resolve(repository, ...relative.split("/")),
    );
    entries.push({
      path: relative,
      bytes: bytes.length,
      sha256: digest(bytes),
    });
  }
  return {
    entries,
    identity_sha256: sha256(canonical(entries)),
  };
}

async function gitText(cwd, args) {
  return (await gitBytes(cwd, args)).toString("utf8").trim();
}

async function gitBytes(cwd, args) {
  const result = await execFileAsync("git", args, {
    cwd,
    windowsHide: true,
    encoding: "buffer",
    maxBuffer: 64 * 1024 * 1024,
    timeout: 120_000,
  });
  return Buffer.from(result.stdout);
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function parseArgs(argv) {
  const values = {
    promotionCommit: "HEAD",
    evidenceRoot: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!value || value.startsWith("--"))
      throw new Error(`level4_promotion_argument:${key}`);
    if (key === "--promotion") values.promotionCommit = value;
    else if (key === "--evidence-root") values.evidenceRoot = value;
    else throw new Error(`level4_promotion_argument_unknown:${key}`);
    index += 1;
  }
  if (!values.evidenceRoot)
    throw new Error("level4_promotion_evidence_root_required");
  return values;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = await verifyLevel4GovernancePromotion({
    repositoryRoot: root,
    ...options,
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();

function assertExactPromotionOptions(options) {
  assert(
    options &&
      typeof options === "object" &&
      !Array.isArray(options) &&
      Object.keys(options).sort().join(",") ===
        "evidenceRoot,promotionCommit,repositoryRoot" &&
      typeof options.repositoryRoot === "string" &&
      typeof options.promotionCommit === "string" &&
      typeof options.evidenceRoot === "string",
    "level4_promotion_options",
  );
}
