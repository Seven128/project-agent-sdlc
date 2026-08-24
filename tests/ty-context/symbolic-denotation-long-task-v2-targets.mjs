import {
  DESIGN_HANDOFF_PATH,
  DESIGN_TARGET_KEY,
} from "./design-resource-handoff-fixture.mjs";
import { SYMBOLIC_TARGET_KEY } from "./design-resource-symbolic-handoff-fixture.mjs";
import { designResourceSymbolicNoninterferenceProofDigest } from "../../packages/ty-context/dist/lib/design-resource-symbolic-fact-validation.js";

export function makeGroundTarget(preflight) {
  const target = preflight.handoff.targets.find(
    (item) => item.key === DESIGN_TARGET_KEY,
  );
  const facts = preflight.handoff.facts.filter(
    (item) => item.target_ref === DESIGN_TARGET_KEY,
  );
  const factRefs = new Set(facts.map((item) => item.key));
  const proofs = preflight.handoff.proof_obligations.filter((item) =>
    factRefs.has(item.fact_ref),
  );
  const methods = [...new Set(proofs.map((item) => item.method))];
  return {
    key: DESIGN_TARGET_KEY,
    interpretation: target.interpretation,
    source_paths: [
      DESIGN_HANDOFF_PATH,
      ...target.resource_refs.map(
        (ref) =>
          preflight.handoff.resources.find((item) => item.key === ref).path,
      ),
    ],
    condition_keys: [...target.condition_refs],
    claim_refs: ["control.main.location"],
    conformance_check_ref: "first-check",
    conformance_assertion_ref: "v1-design-conformance",
    verification_method_bindings: methods.map((method) => ({
      method,
      assertion_ref: `v1-design-${method.replaceAll("_", "-")}`,
      evidence_artifacts: target.condition_refs.map((conditionKey) => {
        const localProofs = proofs.filter(
          (proof) =>
            proof.method === method &&
            facts.some(
              (fact) =>
                fact.key === proof.fact_ref &&
                fact.condition_ref === conditionKey,
            ),
        );
        return {
          condition_key: conditionKey,
          path: `artifacts/v1-${method}-${conditionKey}-comparison.json`,
          observation_path: `artifacts/v1-${method}-${conditionKey}-observation.json`,
          fact_refs: localProofs.map((item) => item.fact_ref),
          fact_expectations: localProofs.map((proof) =>
            groundExpectation(preflight.handoff, proof),
          ),
        };
      }),
    })),
    actual_artifact_path: "artifacts/v1-design-actual.json",
    comparison_artifact_path: "artifacts/v1-design-comparison.json",
  };
}

export function makeSymbolicTarget(preflight, handoffPath) {
  const target = preflight.handoff.targets.find(
    (item) => item.key === SYMBOLIC_TARGET_KEY,
  );
  const methods = [
    ...new Set(
      preflight.manifest.semantic_proof_obligations.map((item) => item.method),
    ),
  ];
  return {
    key: SYMBOLIC_TARGET_KEY,
    fact_model: "symbolic_rules_v2",
    interpretation: target.interpretation,
    source_paths: [
      handoffPath,
      ...target.resource_refs.map(
        (ref) =>
          preflight.handoff.resources.find((item) => item.key === ref).path,
      ),
    ],
    condition_keys: [],
    claim_refs: ["control.main.location"],
    conformance_check_ref: "first-check",
    conformance_assertion_ref: "v2-design-conformance",
    verification_method_bindings: [],
    symbolic_method_bindings: methods.map((method) => ({
      method,
      assertion_ref: `v2-design-${method.replaceAll("_", "-")}`,
      artifact_path: `artifacts/v2-${method}-comparison.json`,
      observation_path: `artifacts/v2-${method}-observation.json`,
      rule_expectations: preflight.manifest.semantic_proof_obligations
        .filter((item) => item.method === method)
        .map((item) => symbolicExpectation(preflight, item)),
    })),
    symbolic_certificate_binding: {
      assertion_ref: "v2-symbolic-certificate",
      artifact_path: "artifacts/v2-symbolic-certificate.json",
      expectations: preflight.manifest.noninterference_certificates.map(
        (item) => {
          const sourceProofDigest =
            designResourceSymbolicNoninterferenceProofDigest(
              item.source_noninterference_proof,
            );
          const productionProofDigest =
            designResourceSymbolicNoninterferenceProofDigest(
              item.production_noninterference_proof,
            );
          return {
            certificate_ref: item.key,
            fact_rule_refs: [...item.fact_rule_refs],
            omitted_axis_refs: [...item.omitted_axis_refs],
            dependency_edge_refs: [...item.dependency_edge_refs],
            canonical_rule_dag_sha256: item.canonical_rule_dag_sha256,
            ...(sourceProofDigest
              ? { source_noninterference_proof_sha256: sourceProofDigest }
              : {}),
            ...(productionProofDigest
              ? {
                  production_noninterference_proof_sha256:
                    productionProofDigest,
                }
              : {}),
          };
        },
      ),
      metrics: structuredClone(preflight.metrics),
    },
    actual_artifact_path: "artifacts/v2-design-actual.json",
    comparison_artifact_path: "artifacts/v2-design-comparison.json",
  };
}

export function addDesignAssertions(check, v1Target, v2Target) {
  const keys = new Set();
  const add = (key, capabilities, claims = ["requirement.design-handoff"]) => {
    check.positive_assertions.push({
      key,
      criterion: `${key} is proven on the current candidate.`,
      claims,
      applicability_ref: "first-root-success",
      observation: key.replaceAll("-", "_"),
      evidence_capabilities: capabilities,
      operator: "equals",
      expected: true,
    });
    keys.add(key);
  };
  add(
    v1Target.conformance_assertion_ref,
    [
      "design_conformance",
      "interaction_trace",
      "presence",
      "target_runtime",
      "visual_render",
    ],
    ["control.main.location"],
  );
  add(
    v2Target.conformance_assertion_ref,
    [
      "design_conformance",
      "interaction_trace",
      "presence",
      "target_runtime",
      "visual_render",
    ],
    ["control.main.location"],
  );
  for (const target of [v1Target, v2Target]) {
    const bindings =
      target.fact_model === "symbolic_rules_v2"
        ? target.symbolic_method_bindings
        : target.verification_method_bindings;
    for (const binding of bindings)
      add(binding.assertion_ref, requiredCapabilities(binding.method), [
        target.fact_model === "symbolic_rules_v2"
          ? "requirement.symbolic-design-handoff"
          : "requirement.design-handoff",
      ]);
  }
  add(
    v2Target.symbolic_certificate_binding.assertion_ref,
    ["design_symbolic_certificate"],
    ["requirement.symbolic-design-handoff"],
  );
  return keys;
}

function requiredCapabilities(method) {
  if (method === "interaction_trace")
    return ["design_method", "interaction_trace", "target_runtime"];
  if (method === "component_state")
    return [
      "design_method",
      "design_conformance",
      "interaction_trace",
      "target_runtime",
      "visual_render",
    ];
  return [
    "design_method",
    "design_conformance",
    "target_runtime",
    "visual_render",
  ];
}

function groundExpectation(handoff, proof) {
  const fact = handoff.facts.find((item) => item.key === proof.fact_ref);
  const oracle = handoff.oracles.find((item) => item.key === proof.oracle_ref);
  const environment = handoff.environments.find(
    (item) => item.key === proof.environment_ref,
  );
  return {
    fact_ref: fact.key,
    subject_ref: fact.subject_ref,
    variation_ref: fact.variation_ref,
    property_ref: fact.property_ref,
    observation_sensitivity: fact.observation_sensitivity,
    expected: structuredClone(fact.value),
    comparison: structuredClone(proof.comparison),
    oracle: pickOracle(oracle),
    environment: pickEnvironment(environment),
  };
}

function symbolicExpectation(preflight, obligation) {
  const rule = preflight.manifest.fact_rules.find(
    (item) => item.key === obligation.fact_rule_ref,
  );
  const oracle = preflight.manifest.oracles.find(
    (item) => item.key === obligation.oracle_ref,
  );
  const environment = preflight.manifest.environments.find(
    (item) => item.key === obligation.environment_ref,
  );
  return {
    obligation_ref: obligation.key,
    fact_rule_ref: rule.key,
    region_sha256: obligation.region_sha256,
    subject_or_relation_ref: rule.subject_or_relation_ref,
    property_ref: rule.property_ref,
    population_ref: rule.population_ref,
    quantifier: structuredClone(rule.quantifier),
    observation_sensitivity: rule.observation_sensitivity,
    expected: structuredClone(rule.expected),
    proof_surface: obligation.proof_surface,
    observation_boundary: obligation.observation_boundary,
    comparison: structuredClone(obligation.comparison),
    oracle: pickOracle(oracle),
    environment: pickEnvironment(environment),
    protected_value_policy: obligation.protected_value_policy,
    completion_effect: obligation.completion_effect,
  };
}

function pickOracle(oracle) {
  return {
    key: oracle.key,
    trust: oracle.trust,
    identity: oracle.identity,
    version: oracle.version,
    sha256: oracle.sha256,
  };
}

function pickEnvironment(environment) {
  return {
    key: environment.key,
    identity: environment.identity,
    definition: structuredClone(environment.definition),
  };
}
