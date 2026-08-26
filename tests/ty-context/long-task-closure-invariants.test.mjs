import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import test from "node:test";
import YAML from "yaml";
import { compileDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-delivery-compiler.js";
import { generateClaims } from "../../packages/ty-context/dist/lib/long-task-claim-definitions.js";
import { parseDeliveryContractText } from "../../packages/ty-context/dist/lib/long-task-delivery-parser.js";
import {
  createDeliveryFixture,
  deliveryContract,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";

test("Long Task Source authority is mandatory even when both Source arrays are empty", () => {
  const contract = deliveryContract();
  contract.task.source_paths = [];
  contract.source_claims = [];
  assert.throws(() => parse(contract), /source_authority_required/u);
});

test("out_of_scope cannot resolve a Material Source Item", () => {
  const contract = deliveryContract();
  contract.source_claims[0].disposition = {
    type: "out_of_scope",
    reason: "The executing Agent chooses not to implement it.",
  };
  assert.throws(
    () => parse(contract),
    /out_of_scope_requires_non_goal_or_decision:first-observable/u,
  );
});

test("Source acceptance cannot indirectly compress into a result-only Assertion", () => {
  const contract = deliveryContract();
  contract.source_claims[0].disposition = {
    type: "acceptance",
    refs: ["first.first-check.first-result"],
  };
  contract.outcomes[0].acceptance.checks[0].positive_assertions[0].claims = [
    "result",
  ];
  contract.outcomes[0].acceptance.checks[0].positive_assertions[0].criterion =
    "The first outcome must be observable.";
  assert.throws(
    () => parse(contract),
    /source_claim_acceptance_result_only:first-observable:first\.first-check\.first-result/u,
  );
});

test("Runner-derived Evidence Adapter rejects Browser Proof spoofing", () => {
  for (const runnerType of ["node_oracle", "package_script"]) {
    const contract = deliveryContract();
    const check = contract.outcomes[0].acceptance.checks[0];
    check.proof_surface = "ui_browser";
    check.runner.type = runnerType;
    if (runnerType === "package_script") check.runner.target = "oracle";
    assert.throws(
      () => parse(contract),
      /evidence_adapter_mismatch:first:first-check:ui_browser:structured_json_v2/u,
      runnerType,
    );
  }
});

test("Claim-bearing Playwright Assertions use only AC passed equals true", () => {
  const contract = deliveryContract();
  contract.task.execution_targets[0].runtime_family = "browser";
  const check = contract.outcomes[0].acceptance.checks[0];
  check.runner.type = "playwright_test";
  check.runner.target = "tests/ui.spec.ts";
  check.proof_surface = "ui_browser";
  check.positive_assertions[0] = {
    ...check.positive_assertions[0],
    observation: "playwright.case.first-result.skipped",
    evidence_capabilities: ["interaction_trace", "target_runtime"],
    operator: "equals",
    expected: false,
  };
  assert.throws(
    () => parse(contract),
    /playwright_claim_assertion_invalid:first:first-check:first-result/u,
  );
});

test("required_proof_surfaces uses all-of coverage", () => {
  const contract = deliveryContract();
  contract.outcomes[0].product.requirements[0].required_proof_surfaces = [
    "runtime_behavior",
    "data_state",
  ];
  assert.throws(
    () => parse(contract),
    /product_claim_required_surfaces_missing:first:requirement\.observe-first:first-root-success:data_state/u,
  );
});

test("required_proof_surfaces passes only when every layer has a compatible proof", () => {
  const contract = deliveryContract();
  const outcome = contract.outcomes[0];
  outcome.acceptance.counterfactual_controls = [];
  outcome.product.requirements[0].required_proof_surfaces = [
    "ui_browser",
    "data_state",
  ];
  outcome.technical.obligations = outcome.technical.obligations.filter(
    (obligation) => obligation.key === "architecture-first",
  );
  outcome.technical.obligations[0].required_proof_surfaces = ["ui_browser"];
  const browserCheck = outcome.acceptance.checks[0];
  contract.task.execution_targets.push({
    key: "fixture-browser",
    description: "The browser support surface.",
    role: "product",
    runtime_family: "browser",
    root_entrypoint: "/",
    capabilities: ["browser-runtime", "cold-start", "production-root"],
  });
  contract.task.target_profile.required_target_refs = ["fixture-browser"];
  outcome.applicability[0].target_ref = "fixture-browser";
  browserCheck.journey_roles = ["success", "stage_gate"];
  browserCheck.execution_target = {
    target_ref: "fixture-browser",
    entrypoint: "root",
  };
  browserCheck.proof_surface = "ui_browser";
  browserCheck.runner.type = "playwright_test";
  browserCheck.runner.target = "tests/ui.spec.ts";
  browserCheck.positive_assertions = [
    {
      key: "browser-result",
      criterion: "The browser target proves the observable result.",
      claims: ["result"],
      applicability_ref: "first-root-success",
      observation: "playwright.case.browser-result.passed",
      evidence_capabilities: ["interaction_trace", "target_runtime"],
      operator: "equals",
      expected: true,
    },
    {
      key: "browser-architecture",
      criterion: "The browser layer preserves the architecture owner.",
      claims: ["obligation.architecture-first"],
      applicability_ref: "first-root-success",
      observation: "playwright.case.browser-architecture.passed",
      evidence_capabilities: ["interaction_trace", "target_runtime"],
      operator: "equals",
      expected: true,
    },
    {
      key: "browser-layer",
      criterion: "The browser layer proves the atomic requirement.",
      claims: ["requirement.observe-first"],
      applicability_ref: "first-root-success",
      observation: "playwright.case.browser-layer.passed",
      evidence_capabilities: ["interaction_trace", "target_runtime"],
      operator: "equals",
      expected: true,
    },
  ];
  browserCheck.negative_assertions = browserCheck.negative_assertions.map(
    (assertion) => ({
      ...assertion,
      observation: `playwright.case.${assertion.key}.passed`,
      evidence_capabilities: ["interaction_trace", "target_runtime"],
      expected: true,
    }),
  );
  const dataCheck = structuredClone(browserCheck);
  dataCheck.key = "data-layer";
  dataCheck.journey_roles = ["success"];
  dataCheck.execution_target = {
    target_ref: "fixture-browser",
    entrypoint: "root",
  };
  dataCheck.proof_surface = "data_state";
  dataCheck.runner.type = "node_oracle";
  dataCheck.runner.target = "tests/oracle.mjs";
  dataCheck.positive_assertions = [
    {
      key: "data-layer",
      criterion: "The data layer proves the observable result.",
      claims: ["result"],
      applicability_ref: "first-root-success",
      observation: "result",
      evidence_capabilities: ["state_delta"],
      operator: "equals",
      expected: true,
    },
    {
      key: "data-requirement-layer",
      criterion: "The data layer proves the atomic requirement.",
      claims: ["requirement.observe-first"],
      applicability_ref: "first-root-success",
      observation: "data_requirement",
      evidence_capabilities: ["state_delta"],
      operator: "equals",
      expected: true,
    },
    {
      key: "first-semantic-fact",
      criterion:
        "The exact Source-indexed semantic Fact passes its frozen comparison.",
      claims: ["semantic_fact.fact.first.observable"],
      applicability_ref: "first-root-success",
      observation: "semantic_fact_result",
      evidence_capabilities: ["semantic_fact"],
      operator: "equals",
      expected: true,
    },
    {
      key: "data-architecture-semantic-fact",
      criterion:
        "The exact architecture Fact passes its frozen comparison on the data layer.",
      claims: ["semantic_fact.fact.first.architecture-boundary"],
      applicability_ref: "first-root-success",
      observation: "architecture_semantic_fact_result",
      evidence_capabilities: ["semantic_fact"],
      operator: "equals",
      expected: true,
    },
  ];
  dataCheck.negative_assertions = [];
  outcome.acceptance.checks.push(dataCheck);
  for (const proof of outcome.semantic_fact_bindings.proofs) {
    proof.proof_surface = "data_state";
    proof.check_ref = "data-layer";
    proof.assertion_ref = proof.fact_ref.includes(".architecture-boundary")
      ? "data-architecture-semantic-fact"
      : "first-semantic-fact";
  }
  assert.doesNotThrow(() => parse(contract));
});

test("blocking result External Confirmation permits a Stage gate with no machine stage_gate Check", () => {
  const contract = deliveryContract();
  contract.outcomes[0].acceptance.checks[0].journey_roles = ["success"];
  contract.global.acceptance.external_confirmations = [
    exactExternalConfirmation(contract, {
      key: "unsupported-stage-result",
      description:
        "The unsupported Stage result requires external confirmation.",
      kind: "functional_prerequisite",
      claimRefs: ["first.result"],
      blocksTarget: true,
    }),
  ];
  assert.doesNotThrow(() => parse(contract));
});

test("Stage gate omission rejects non-blocking or non-result External Confirmation", () => {
  for (const mutation of ["non-blocking", "missing-result"]) {
    const contract = deliveryContract();
    contract.outcomes[0].acceptance.checks[0].journey_roles = ["success"];
    contract.global.acceptance.external_confirmations = [
      exactExternalConfirmation(contract, {
        key: "unsupported-stage-result",
        description:
          "The unsupported Stage result requires external confirmation.",
        kind: "field_validation",
        claimRefs:
          mutation === "missing-result"
            ? ["first.requirement.observe-first"]
            : ["first.result"],
        blocksTarget: mutation !== "non-blocking",
      }),
    ];
    assert.throws(
      () => parse(contract),
      /stage_gate_check_required:first:first/u,
      mutation,
    );
  }
});

test("External Confirmation never waives an explicitly required success path", () => {
  const contract = deliveryContract();
  contract.outcomes[0].acceptance.checks[0].journey_roles = ["stage_gate"];
  contract.outcomes[0].applicability[0].journey_role = "stage_gate";
  contract.global.acceptance.external_confirmations = [
    exactExternalConfirmation(contract, {
      key: "unsupported-stage-result",
      description:
        "The unsupported Stage result requires external confirmation.",
      kind: "functional_prerequisite",
      claimRefs: ["first.result"],
      blocksTarget: true,
    }),
  ];
  assert.throws(() => parse(contract), /success_path_check_required:first/u);
});

test("all unsupported ordinary Claims and Semantic Facts can preflight only as explicit blocking external work", () => {
  const contract = deliveryContract();
  const outcome = contract.outcomes[0];
  outcome.product.success_path_required = false;
  outcome.acceptance.checks = [];
  outcome.semantic_fact_bindings.proofs =
    outcome.semantic_fact_bindings.proofs.map((semanticProof) => ({
      proof_ref: semanticProof.proof_ref,
      fact_ref: semanticProof.fact_ref,
      method: semanticProof.method,
      proof_surface: semanticProof.proof_surface,
      evidence_capabilities: semanticProof.evidence_capabilities,
      authority: "external_confirmation",
      confirmation_ref: "unsupported-observation",
    }));
  const externalClaimRefs = generateClaims(outcome).map((claim) => claim.id);
  contract.global.acceptance.external_confirmations = [
    exactExternalConfirmation(contract, {
      key: "unsupported-observation",
      description: "The unsupported observations require an external owner.",
      kind: "functional_prerequisite",
      claimRefs: externalClaimRefs,
      blocksTarget: true,
    }),
  ];
  assert.doesNotThrow(() => parse(contract));
});

test("Control relation closure remains an atomic Claim when other atomic declarations are absent", () => {
  const contract = deliveryContract();
  const outcome = contract.outcomes[0];
  contract.source_claims = contract.source_claims.filter(
    (claim) => claim.key !== "fixture-architecture",
  );
  contract.source_claims[0].statement =
    "The no-Control relation closure is complete.";
  contract.source_claims[0].disposition.refs = [
    "first.control_relation_closure",
  ];
  outcome.product.requirements = [];
  outcome.technical.obligations = [];
  outcome.acceptance.checks[0].positive_assertions =
    outcome.acceptance.checks[0].positive_assertions.filter(
      (assertion) =>
        assertion.key === "first-result" ||
        assertion.key === "first-semantic-fact" ||
        assertion.key === "first-architecture-semantic-fact" ||
        assertion.key === "first-liveness",
    );
  assert.doesNotThrow(() => parse(contract));
});

test("Claim-bearing Product Assertions cannot use unary operators", () => {
  const contract = deliveryContract();
  const assertion =
    contract.outcomes[0].acceptance.checks[0].positive_assertions[0];
  assertion.operator = "truthy";
  delete assertion.expected;
  assert.throws(
    () => parse(contract),
    /claim_assertion_explicit_expected_required:first:first-check:first-result/u,
  );
});

test("truthy and falsy cannot prove an implementation_structure Obligation", () => {
  for (const operator of ["truthy", "falsy"]) {
    const contract = deliveryContract();
    const outcome = contract.outcomes[0];
    outcome.acceptance.counterfactual_controls = [];
    const check = outcome.acceptance.checks[0];
    outcome.technical.obligations[0].required_proof_surfaces = [
      "implementation_structure",
    ];
    check.positive_assertions = check.positive_assertions.filter(
      (assertion) => assertion.key !== "first-obligation",
    );
    const structureCheck = structuredClone(check);
    structureCheck.key = `structure-${operator}-check`;
    structureCheck.journey_roles = ["success"];
    structureCheck.proof_surface = "implementation_structure";
    structureCheck.positive_assertions = [
      {
        key: `structure-${operator}`,
        criterion: "The implementation carrier exists structurally.",
        claims: ["obligation.implement-first"],
        applicability_ref: "first-root-success",
        observation: "structure_value",
        evidence_capabilities: ["state_delta"],
        operator,
      },
    ];
    outcome.acceptance.checks.push(structureCheck);
    assert.throws(
      () => parse(contract),
      new RegExp(
        `claim_assertion_explicit_expected_required:first:structure-${operator}-check:`,
        "u",
      ),
      operator,
    );
  }
});

test("exists may prove only an implementation_structure Obligation", () => {
  const contract = deliveryContract();
  const outcome = contract.outcomes[0];
  outcome.acceptance.counterfactual_controls = [];
  outcome.technical.obligations[0].required_proof_surfaces = [
    "implementation_structure",
  ];
  outcome.acceptance.checks[0].positive_assertions =
    outcome.acceptance.checks[0].positive_assertions.filter(
      (assertion) => assertion.key !== "first-obligation",
    );
  const structureCheck = structuredClone(outcome.acceptance.checks[0]);
  structureCheck.key = "structure-check";
  structureCheck.proof_surface = "implementation_structure";
  structureCheck.positive_assertions = [
    {
      key: "implementation-carrier",
      criterion: "The declared implementation carrier exists.",
      claims: ["obligation.implement-first"],
      applicability_ref: "first-root-success",
      observation: "result",
      evidence_capabilities: ["presence"],
      operator: "exists",
    },
  ];
  outcome.acceptance.checks.push(structureCheck);
  assert.doesNotThrow(() => parse(contract));
});

test("one Raw Execution Observation cannot be copied across Checks", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const first = fixture.contract.outcomes[0].acceptance.checks[0];
    const second = structuredClone(first);
    second.key = "copied-proof";
    second.positive_assertions = [
      {
        ...structuredClone(first.positive_assertions[0]),
        key: "copied-result",
        claims: ["obligation.implement-first"],
      },
    ];
    second.negative_assertions = [];
    first.positive_assertions = first.positive_assertions.filter(
      (assertion) => assertion.key !== "first-obligation",
    );
    const counterfactual =
      fixture.contract.outcomes[0].acceptance.counterfactual_controls[0];
    counterfactual.claims = counterfactual.claims.filter(
      (claim) => claim !== "obligation.implement-first",
    );
    counterfactual.expected_assertion_failures =
      counterfactual.expected_assertion_failures.filter(
        (assertion) => assertion !== "first-obligation",
      );
    fixture.contract.outcomes[0].acceptance.checks.push(second);
    await writeContract(fixture.workdir, fixture.contract);
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
      /raw_execution_observation_reused:/u,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Compile enforces criterion even when Authoring Preflight is skipped", async () => {
  const fixture = await createDeliveryFixture();
  try {
    delete fixture.contract.outcomes[0].acceptance.checks[0]
      .positive_assertions[0].criterion;
    await writeContract(fixture.workdir, fixture.contract);
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
      /assertion_criterion_required:first\.first-check\.first-result/u,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

function parse(contract) {
  return parseDeliveryContractText(YAML.stringify(contract));
}

function exactExternalConfirmation(
  contract,
  { key, description, kind, claimRefs, blocksTarget },
) {
  if (blocksTarget)
    contract.task.target_profile.completion_authority = "declared_authorities";
  const outcome = contract.outcomes[0];
  const authorityKey = `${key}-authority`;
  contract.source_claims.push({
    key: authorityKey,
    source_ref: "source.md#fixture-source",
    statement: `${description} The declared external owner supplies current evidence for the listed exact obligations.`,
    disposition: {
      type: "external_confirmation",
      refs: [key],
    },
  });
  const claims = new Map(
    generateClaims(outcome).map((claim) => [claim.id, claim]),
  );
  return {
    key,
    description,
    owner: "external-owner",
    kind,
    impact_claims: [...claimRefs],
    blocks_target: blocksTarget,
    actor: {
      id: "external-owner",
      role: "product acceptance owner",
      authority_kind: "expert",
      identity_assurance: {
        scheme: "ed25519",
        key_id: "external-owner-2026",
        public_key_ref: "project_context/authorities/external-owner.pub",
      },
    },
    target_ref: "fixture-app",
    environment_identity: "fixture-external-environment-v1",
    scenario: structuredClone(
      outcome.acceptance.checks[0]?.scenario ?? {
        given: [
          { key: "fixture-loaded", statement: "Load the fixture state." },
        ],
        when: [
          { key: "read-outcome", statement: "Read the selected outcome." },
        ],
      },
    ),
    evidence_requirements: [
      {
        key: "external-observation",
        statement:
          "Capture current-candidate evidence for every exact listed obligation.",
      },
    ],
    obligations: claimRefs.map((claimRef, index) => {
      const semanticFact = outcome.semantic_fact_bindings.facts.find(
        (binding) => `${outcome.key}.${binding.claim_ref}` === claimRef,
      );
      if (semanticFact) {
        const proof = outcome.semantic_fact_bindings.proofs.find(
          (binding) => binding.fact_ref === semanticFact.fact_ref,
        );
        assert.ok(proof, `semantic proof required for ${claimRef}`);
        return {
          key: `${key}-obligation-${index + 1}`,
          claim_ref: claimRef,
          applicability_ref: semanticFact.applicability_ref,
          fact_ref: semanticFact.fact_ref,
          proof_ref: proof.proof_ref,
          method: proof.method,
          proof_surface: proof.proof_surface,
          evidence_capabilities: [...proof.evidence_capabilities],
          expected_authority_ref: `semantic-proof:${proof.proof_ref}`,
          result_kind: "actual",
        };
      }
      const claim = claims.get(claimRef);
      assert.ok(claim, `ordinary claim required for ${claimRef}`);
      return {
        key: `${key}-obligation-${index + 1}`,
        claim_ref: claimRef,
        applicability_ref: claim.applicability_refs[0],
        fact_ref: null,
        proof_ref: null,
        method: "exact_value",
        proof_surface: claim.required_proof_surfaces[0] ?? "runtime_behavior",
        evidence_capabilities:
          claim.kind === "result" ? ["target_runtime"] : [],
        expected_authority_ref: `contract-claim:${claimRef}`,
        result_kind: "actual",
      };
    }),
  };
}
