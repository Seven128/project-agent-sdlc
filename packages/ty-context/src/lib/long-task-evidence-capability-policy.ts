import type {
  CompiledCheckV2,
  DeliveryContractV2,
  EvidenceCapabilityRecordV2,
  EvidenceCapabilityV2,
  LongTaskFindingV2,
} from "./long-task-delivery-types.js";
import { validateRuntimeEvidenceRecord } from "./long-task-evidence-capability-runtime.js";
import { validateDistinctSemanticFactEvidence } from "./long-task-semantic-fact-evidence.js";
import { checkFinding } from "./long-task-evidence-findings.js";

export { decodeEvidenceCapabilityRecords } from "./long-task-evidence-capability-codec.js";

type Reporter = (message: string) => void;
type EvidenceDeclarationCheck =
  DeliveryContractV2["global"]["acceptance"]["checks"][number];
type ExecutionTarget = DeliveryContractV2["task"]["execution_targets"][number];

export function validateEvidenceCapabilityDeclarations(
  contract: DeliveryContractV2,
  report?: Reporter,
): void {
  const targets = new Map(
    contract.task.execution_targets.map((target) => [target.key, target]),
  );
  for (const [outcomeKey, check] of allChecks(contract)) {
    validateCheckEvidenceCapabilityDeclarations(
      check,
      outcomeKey,
      targets,
      report,
    );
  }
  validateJourneySeparation(contract, report);
}

function validateCheckEvidenceCapabilityDeclarations(
  check: EvidenceDeclarationCheck,
  outcomeKey: string | null,
  targets: Map<string, ExecutionTarget>,
  report?: Reporter,
): void {
  const label = checkLabel(outcomeKey, check.key);
  unique(check.journey_roles, "journey_role_duplicate", label, report);
  if (!check.journey_roles.length)
    issue(report, "journey_role_required", label);
  validateScenario(check, outcomeKey, report);
  for (const assertion of [
    ...check.positive_assertions,
    ...check.negative_assertions,
  ])
    validateAssertionEvidenceCapabilityDeclarations(
      assertion,
      check,
      targets,
      `${label}:${assertion.key}`,
      report,
    );
}

function validateAssertionEvidenceCapabilityDeclarations(
  assertion: EvidenceDeclarationCheck["positive_assertions"][number],
  check: EvidenceDeclarationCheck,
  targets: Map<string, ExecutionTarget>,
  label: string,
  report?: Reporter,
): void {
  unique(
    assertion.evidence_capabilities,
    "evidence_capability_duplicate",
    label,
    report,
  );
  if (!assertion.evidence_capabilities.length)
    issue(report, "evidence_capability_required", label);
  if (
    assertion.claims.length &&
    check.proof_surface !== "implementation_structure" &&
    assertion.evidence_capabilities.every(
      (capability) => capability === "presence",
    )
  )
    issue(report, "presence_cannot_prove_behavior", label);
  if (
    assertion.operator === "exists" &&
    !assertion.evidence_capabilities.includes("presence")
  )
    issue(report, "exists_requires_presence_capability", label);
  validateArtifactCapabilityDeclarations(assertion, check, label, report);
  validateRunnerCapabilityDeclarations(
    assertion,
    check,
    targets,
    label,
    report,
  );
}

function validateArtifactCapabilityDeclarations(
  assertion: EvidenceDeclarationCheck["positive_assertions"][number],
  check: EvidenceDeclarationCheck,
  label: string,
  report?: Reporter,
): void {
  if (
    assertion.evidence_capabilities.includes("visual_render") &&
    !check.artifact_globs.length
  )
    issue(report, "visual_render_artifact_required", label);
  if (
    assertion.evidence_capabilities.includes("design_conformance") &&
    !check.artifact_globs.length
  )
    issue(report, "design_conformance_artifact_required", label);
  if (
    assertion.evidence_capabilities.includes("design_method") &&
    !check.artifact_globs.length
  )
    issue(report, "design_method_artifact_required", label);
  if (
    assertion.evidence_capabilities.includes("design_symbolic_certificate") &&
    !check.artifact_globs.length
  )
    issue(report, "design_symbolic_certificate_artifact_required", label);
  if (
    assertion.evidence_capabilities.includes("semantic_fact") &&
    !check.artifact_globs.length
  )
    issue(report, "semantic_fact_artifact_required", label);
}

function validateRunnerCapabilityDeclarations(
  assertion: EvidenceDeclarationCheck["positive_assertions"][number],
  check: EvidenceDeclarationCheck,
  targets: Map<string, ExecutionTarget>,
  label: string,
  report?: Reporter,
): void {
  if (
    assertion.evidence_capabilities.includes("interaction_trace") &&
    !check.scenario.when.length
  )
    issue(report, "interaction_trace_actions_required", label);
  if (
    check.runner.type === "playwright_test" &&
    assertion.evidence_capabilities.some(
      (capability) =>
        capability !== "presence" &&
        capability !== "interaction_trace" &&
        capability !== "design_conformance" &&
        capability !== "design_method" &&
        capability !== "design_symbolic_certificate" &&
        capability !== "semantic_fact" &&
        capability !== "target_runtime",
    )
  )
    issue(report, "playwright_evidence_capability_unsupported", label);
  if (
    ["boundary_invocation", "external_side_effect"].some((capability) =>
      assertion.evidence_capabilities.includes(
        capability as EvidenceCapabilityV2,
      ),
    ) &&
    targets.get(check.execution_target.target_ref)?.role !== "observer"
  )
    issue(report, "observer_check_target_required", label);
}

function validateScenario(
  check: EvidenceDeclarationCheck,
  outcomeKey: string | null,
  report?: Reporter,
): void {
  const label = checkLabel(outcomeKey, check.key);
  if (!check.scenario.given.length)
    issue(report, "scenario_given_required", label);
  if (!check.scenario.when.length)
    issue(report, "scenario_when_required", label);
  unique(
    check.scenario.given.map((step) => step.key),
    "scenario_given_key_duplicate",
    label,
    report,
  );
  unique(
    check.scenario.when.map((step) => step.key),
    "scenario_when_key_duplicate",
    label,
    report,
  );
}

function validateJourneySeparation(
  contract: DeliveryContractV2,
  report?: Reporter,
): void {
  for (const outcome of contract.outcomes) {
    for (const check of outcome.acceptance.checks)
      if (
        check.journey_roles.includes("success") &&
        check.journey_roles.includes("degradation")
      )
        issue(
          report,
          "success_degradation_check_must_be_distinct",
          `${outcome.key}:${check.key}`,
        );
    if (
      outcome.product.success_path_required &&
      !outcome.acceptance.checks.some((check) =>
        check.journey_roles.includes("success"),
      )
    )
      issue(report, "success_path_check_required", outcome.key);
    if (
      outcome.product.degradation_path_required &&
      !outcome.acceptance.checks.some((check) =>
        check.journey_roles.includes("degradation"),
      )
    )
      issue(report, "degradation_path_check_required", outcome.key);
    for (const check of outcome.acceptance.checks) {
      const provesResult = [
        ...check.positive_assertions,
        ...check.negative_assertions,
      ].some((assertion) => assertion.claims.includes("result"));
      if (provesResult && !check.journey_roles.includes("success"))
        issue(
          report,
          "result_claim_requires_success_journey",
          `${outcome.key}:${check.key}`,
        );
    }
  }
}

export function evaluateEvidenceCapabilities(
  check: CompiledCheckV2,
  records: EvidenceCapabilityRecordV2[],
  artifactHashes: Record<string, string>,
): {
  complete: Record<string, boolean>;
  findings: LongTaskFindingV2[];
} {
  const runtimeRecords = records ?? [];
  const complete: Record<string, boolean> = {};
  const findings: LongTaskFindingV2[] = [];
  const assertions = [
    ...check.positive_assertions,
    ...check.negative_assertions,
  ];
  const assertionsByKey = new Map(
    assertions.map((assertion) => [assertion.key, assertion]),
  );
  for (const record of runtimeRecords) {
    const assertion = assertionsByKey.get(record.assertion_key);
    const reason = !assertion
      ? "assertion_unknown"
      : !assertion.evidence_capabilities.includes(record.capability)
        ? "capability_undeclared"
        : null;
    if (!reason) continue;
    findings.push({
      ...checkFinding(
        check,
        "evidence_capability_invalid",
        `Evidence record ${record.assertion_key}:${record.capability} is not bound to a declared Assertion capability: ${reason}.`,
        "Emit records only for capabilities declared by Assertions in this Check.",
      ),
      assertion_key: record.assertion_key,
      claim_keys: assertion?.claims ?? [],
      expected: "declared_assertion_capability",
      actual: reason,
    });
  }
  for (const assertion of assertions) {
    let assertionComplete = true;
    for (const capability of assertion.evidence_capabilities) {
      if (capability === "presence") continue;
      const matches = runtimeRecords.filter(
        (record) =>
          record.assertion_key === assertion.key &&
          record.capability === capability,
      );
      const reason =
        matches.length === 1
          ? validateRuntimeEvidenceRecord(check, matches[0], artifactHashes)
          : matches.length === 0
            ? "record_missing"
            : "record_duplicate";
      if (!reason) continue;
      assertionComplete = false;
      findings.push({
        ...checkFinding(
          check,
          "evidence_capability_invalid",
          `Assertion ${assertion.key} did not provide valid ${capability} evidence: ${reason}.`,
          "Make the current Check execution emit one valid typed evidence record for the declared capability.",
        ),
        assertion_key: assertion.key,
        claim_keys: assertion.claims,
        expected: capability,
        actual: reason,
      });
    }
    complete[assertion.key] = assertionComplete;
  }
  validateDistinctDesignMethodArtifacts(
    check,
    runtimeRecords,
    artifactHashes,
    findings,
  );
  const semanticDistinctness =
    validateDistinctSemanticFactEvidence(runtimeRecords);
  if (semanticDistinctness)
    findings.push({
      ...checkFinding(
        check,
        "semantic_fact_evidence_reused",
        `Semantic Fact evidence is not independently attributable: ${semanticDistinctness}.`,
        "Emit exactly one independently located current observation and comparison result for every Fact-by-method obligation.",
      ),
      expected: "unique_fact_proof_and_artifact_locator_identity",
      actual: semanticDistinctness,
    });
  return { complete, findings };
}

function validateDistinctDesignMethodArtifacts(
  check: CompiledCheckV2,
  records: EvidenceCapabilityRecordV2[],
  artifactHashes: Record<string, string>,
  findings: LongTaskFindingV2[],
): void {
  const pathOwners = new Map<string, string>();
  const digestOwners = new Map<string, string>();
  for (const record of records) {
    if (record.capability === "design_symbolic_certificate") {
      addDistinctArtifact(
        check,
        findings,
        pathOwners,
        digestOwners,
        record.assertion_key,
        `symbolic-certificate:${record.design_target_ref}`,
        record.artifact_path,
        artifactHashes,
      );
      continue;
    }
    if (record.capability !== "design_method") continue;
    if ("fact_model" in record) {
      addDistinctArtifact(
        check,
        findings,
        pathOwners,
        digestOwners,
        record.assertion_key,
        `symbolic-method:${record.design_target_ref}:${record.method}:observation`,
        record.observation_artifact_path,
        artifactHashes,
      );
      addDistinctArtifact(
        check,
        findings,
        pathOwners,
        digestOwners,
        record.assertion_key,
        `symbolic-method:${record.design_target_ref}:${record.method}:comparison`,
        record.artifact_path,
        artifactHashes,
      );
      continue;
    }
    for (const cell of record.cells) {
      const currentOwner = `${record.method}:${cell.condition_key}`;
      const pathOwner = pathOwners.get(cell.observation_artifact_path);
      if (pathOwner)
        findings.push(
          reusedDesignMethodArtifactFinding(
            check,
            record.assertion_key,
            currentOwner,
            pathOwner,
            "path",
            cell.observation_artifact_path,
          ),
        );
      else pathOwners.set(cell.observation_artifact_path, currentOwner);

      const digest = artifactHashes[cell.observation_artifact_path];
      if (!digest) continue;
      const digestOwner = digestOwners.get(digest);
      if (digestOwner)
        findings.push(
          reusedDesignMethodArtifactFinding(
            check,
            record.assertion_key,
            currentOwner,
            digestOwner,
            "sha256",
            digest,
          ),
        );
      else digestOwners.set(digest, currentOwner);
    }
  }
}

function addDistinctArtifact(
  check: CompiledCheckV2,
  findings: LongTaskFindingV2[],
  pathOwners: Map<string, string>,
  digestOwners: Map<string, string>,
  assertionKey: string,
  currentOwner: string,
  path: string,
  artifactHashes: Record<string, string>,
): void {
  const pathOwner = pathOwners.get(path);
  if (pathOwner)
    findings.push(
      reusedDesignMethodArtifactFinding(
        check,
        assertionKey,
        currentOwner,
        pathOwner,
        "path",
        path,
      ),
    );
  else pathOwners.set(path, currentOwner);
  const digest = artifactHashes[path];
  if (!digest) return;
  const digestOwner = digestOwners.get(digest);
  if (digestOwner)
    findings.push(
      reusedDesignMethodArtifactFinding(
        check,
        assertionKey,
        currentOwner,
        digestOwner,
        "sha256",
        digest,
      ),
    );
  else digestOwners.set(digest, currentOwner);
}

function reusedDesignMethodArtifactFinding(
  check: CompiledCheckV2,
  assertionKey: string,
  currentOwner: string,
  previousOwner: string,
  identityKind: "path" | "sha256",
  identity: string,
): LongTaskFindingV2 {
  return {
    ...checkFinding(
      check,
      "design_method_evidence_reused",
      `Design-method evidence ${identityKind} ${identity} is reused by ${previousOwner} and ${currentOwner}.`,
      "Emit method-and-condition evidence whose path and current content digest are both distinct for every verification-method cell.",
    ),
    assertion_key: assertionKey,
    expected: "distinct_method_condition_artifact_path_and_content",
    actual: { identity_kind: identityKind, identity },
  };
}

function allChecks(contract: DeliveryContractV2) {
  return [
    ...contract.global.acceptance.checks.map((check) => [null, check] as const),
    ...contract.outcomes.flatMap((outcome) =>
      outcome.acceptance.checks.map((check) => [outcome.key, check] as const),
    ),
  ];
}

function checkLabel(outcomeKey: string | null, checkKey: string): string {
  return `${outcomeKey ?? "GLOBAL"}:${checkKey}`;
}

function unique(
  values: string[],
  code: string,
  detail: string,
  report?: Reporter,
): void {
  if (new Set(values).size !== values.length) issue(report, code, detail);
}

function issue(
  report: Reporter | undefined,
  code: string,
  detail: string,
): void {
  const message = `delivery_contract_invalid:${code}:${detail}`;
  if (report) report(message);
  else throw new Error(message);
}
