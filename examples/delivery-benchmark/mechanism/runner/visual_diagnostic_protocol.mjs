export function validateProtocol(protocol) {
  if (protocol.schema_version !== "dra-visual-diagnostic-protocol-v1")
    fail("unexpected protocol schema_version");
  const expectedCases = [
    "landing",
    "dashboard",
    "data-workbench",
    "mobile-multiscreen-flow",
    "complex-component",
    "component-workbench",
    "responsive-page",
    "existing-ui-library-local-redesign",
  ];
  const expectedVariants = [
    "open-design-generic-skill",
    "open-design-specialized-skill",
    "specialized-plus-quality-commission",
    "specialized-plus-refinement",
    "direct-agent-provider",
  ];
  const expectedRubric = [
    "composition",
    "hierarchy",
    "typography",
    "visual_language",
    "content_realism",
    "ai_template_mannerisms",
    "design_side_component_reuse",
    "ui_library_adaptation",
    "human_correction_required",
    "generation_cost_and_variance",
  ];
  sameSet(
    protocol.cases?.map((item) => item.key),
    expectedCases,
    "cases",
  );
  sameSet(
    protocol.variants?.map((item) => item.key),
    expectedVariants,
    "variants",
  );
  sameSet(protocol.rubric, expectedRubric, "rubric");
  for (const item of protocol.cases)
    if (!item.artifact_archetype || !item.fixed_input)
      fail(`case ${item.key} is not fixed`);
  for (const value of Object.values(protocol.authority ?? {}))
    if (value !== "none") fail("diagnostic authority effects must all be none");
  if (
    protocol.run_policy?.minimum_repeats_per_case_variant < 2 ||
    protocol.run_policy?.aggregate_thresholds_forbidden !== true ||
    protocol.run_policy?.winner_or_ranking_output_forbidden !== true ||
    protocol.run_policy?.provider_identity_blinded_during_review !== true ||
    protocol.run_policy?.randomized_display_order_required !== true
  )
    fail("diagnostic run policy weakened");
}

export function validateBindings(bindings, protocol, protocolDigest) {
  if (bindings.schema_version !== "dra-visual-diagnostic-bindings-v1")
    fail("unexpected bindings schema_version");
  if (bindings.protocol_sha256 !== protocolDigest)
    fail("bindings protocol_sha256 does not match current protocol");
  sameSet(
    bindings.variant_bindings?.map((item) => item.variant_key),
    protocol.variants.map((item) => item.key),
    "variant bindings",
  );
  for (const binding of bindings.variant_bindings) {
    for (const field of [
      "execution_route_identity",
      "provider_identity",
      "provider_version",
      "implementation_commit_or_tag",
      "model_identity",
      "reasoning_effort",
      "capability_evidence_ref",
    ])
      if (typeof binding[field] !== "string" || !binding[field].trim())
        fail(`${binding.variant_key}.${field} must be a non-empty string`);
    if (
      /[<>]|\b(?:latest|main|master|head)\b/iu.test(
        binding.implementation_commit_or_tag,
      )
    )
      fail(
        `${binding.variant_key}.implementation_commit_or_tag must be immutable`,
      );
  }
}

function sameSet(actual, expected, label) {
  if (!Array.isArray(actual) || new Set(actual).size !== actual.length)
    fail(`${label} must be a unique array`);
  const left = [...actual].sort();
  const right = [...expected].sort();
  if (JSON.stringify(left) !== JSON.stringify(right))
    fail(`${label} set mismatch`);
}

function fail(message) {
  throw new Error(`dra_visual_diagnostic_invalid:${message}`);
}
