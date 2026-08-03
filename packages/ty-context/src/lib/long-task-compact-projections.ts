import {
  compactArray,
  compactFail,
  compactInteger,
  compactLiteral,
  compactNonemptyString,
  compactPlainObject,
  compactRequiredOutcome,
  compactSha256,
  compactStableRef,
  compactStableRefs,
} from "./long-task-compact-primitives.js";

export function prepareLongTaskCompactOutcomeTargets(
  outcomes: Record<string, unknown>[],
): void {
  for (const [index, outcome] of outcomes.entries()) {
    const label = `outcomes[${index}]`;
    if (Object.hasOwn(outcome, "semantic_fact_bindings"))
      compactFail(label, "expanded semantic_fact_bindings cannot coexist");
    const product = compactPlainObject(outcome.product, `${label}.product`);
    const technical = compactPlainObject(outcome.technical, `${label}.technical`);
    for (const field of ["requirements", "non_completing_outcomes"])
      if (Object.hasOwn(product, field))
        compactFail(`${label}.product.${field}`, "expanded projection cannot coexist");
    for (const field of ["obligations", "forbidden_shortcuts"])
      if (Object.hasOwn(technical, field))
        compactFail(`${label}.technical.${field}`, "expanded projection cannot coexist");
    product.requirements = [];
    product.non_completing_outcomes = [];
    technical.obligations = [];
    technical.forbidden_shortcuts = [];
    outcome.semantic_fact_bindings = {
      manifest_ref: "",
      facts: [],
      proofs: [],
    };
  }
}

export function materializeLongTaskCompactClaimProjections(
  projections: Record<string, unknown>[],
  claims: Map<string, Record<string, unknown>>,
  outcomes: Map<string, Record<string, unknown>>,
): void {
  for (const [index, projection] of projections.entries()) {
    const label = `compact_semantic_carrier.claim_projections.rows[${index}]`;
    const outcome = compactRequiredOutcome(projection.outcome_ref, outcomes, label);
    const claimKey =
      projection.claim_key === null
        ? null
        : compactStableRef(projection.claim_key, `${label}.claim_key`);
    const claim = claimKey ? claims.get(claimKey) : null;
    if (claimKey && !claim)
      compactFail(`${label}.claim_key`, `unknown claim: ${claimKey}`);
    const statement = claim
      ? compactNonemptyString(claim.statement, `${label}.statement`)
      : compactNonemptyString(projection.statement, `${label}.statement`);
    const applicabilityRefs = compactStableRefs(
      projection.applicability_refs,
      `${label}.applicability_refs`,
    );
    const kind = compactLiteral(
      projection.projection_kind,
      [
        "requirement",
        "obligation",
        "forbidden_shortcut",
        "non_completing_outcome",
      ] as const,
      `${label}.projection_kind`,
    );
    const product = compactPlainObject(outcome.product, `${label}.product`);
    const technical = compactPlainObject(outcome.technical, `${label}.technical`);
    const base = {
      key: compactStableRef(
        projection.projection_key ?? projection.claim_key,
        `${label}.projection_key`,
      ),
      statement,
      applicability_refs: applicabilityRefs,
    };
    if (kind === "requirement" || kind === "obligation") {
      const requiredProofSurfaces = compactStableRefs(
        projection.required_proof_surfaces,
        `${label}.required_proof_surfaces`,
      );
      const row = { ...base, required_proof_surfaces: requiredProofSurfaces };
      if (kind === "requirement")
        (product.requirements as unknown[]).push(row);
      else (technical.obligations as unknown[]).push(row);
    } else {
      if (projection.required_proof_surfaces !== null)
        compactFail(
          `${label}.required_proof_surfaces`,
          "must be null for statement-only projection",
        );
      if (kind === "forbidden_shortcut")
        (technical.forbidden_shortcuts as unknown[]).push(base);
      else (product.non_completing_outcomes as unknown[]).push(base);
    }
  }
}

export function materializeLongTaskCompactFactBindings(
  facts: Record<string, unknown>[],
  obligations: Record<string, unknown>[],
  factByKey: Map<string, Record<string, unknown>>,
  templates: Map<string, Record<string, unknown>>,
  outcomes: Map<string, Record<string, unknown>>,
): void {
  for (const [index, fact] of facts.entries()) {
    const label = `compact_semantic_carrier.facts[${index}]`;
    const outcome = compactRequiredOutcome(fact.outcome_ref, outcomes, label);
    const binding = compactPlainObject(
      outcome.semantic_fact_bindings,
      `${label}.semantic_fact_bindings`,
    );
    if (!binding.manifest_ref)
      binding.manifest_ref = compactStableRef(
        fact.manifest_ref,
        `${label}.manifest_ref`,
      );
    else if (binding.manifest_ref !== fact.manifest_ref)
      compactFail(`${label}.manifest_ref`, "outcome manifest_ref mismatch");
    (binding.facts as unknown[]).push({
      fact_ref: compactStableRef(fact.fact_key, `${label}.fact_key`),
      fact_revision_digest: compactSha256(
        fact.fact_revision_digest,
        `${label}.fact_revision_digest`,
      ),
      claim_ref: compactStableRef(fact.claim_ref, `${label}.claim_ref`),
      applicability_ref: compactStableRef(
        fact.applicability_ref,
        `${label}.applicability_ref`,
      ),
    });
  }
  for (const [index, obligation] of obligations.entries()) {
    const label = `compact_semantic_carrier.obligations.rows[${index}]`;
    const outcome = compactRequiredOutcome(obligation.outcome_ref, outcomes, label);
    const factKey = compactStableRef(obligation.fact_key, `${label}.fact_key`);
    if (!factByKey.has(factKey))
      compactFail(`${label}.fact_key`, `unknown fact: ${factKey}`);
    const templateRef = compactStableRef(
      obligation.template_ref,
      `${label}.template_ref`,
    );
    const template = templates.get(templateRef);
    if (!template)
      compactFail(`${label}.template_ref`, `unknown template: ${templateRef}`);
    const overrides = compactPlainObject(
      obligation.overrides,
      `${label}.overrides`,
    );
    if (
      ["proof_ref", "fact_ref", "obligation_revision_digest"].some((field) =>
        Object.hasOwn(overrides, field),
      )
    )
      compactFail(`${label}.overrides`, "identity fields cannot be overridden");
    const binding = compactPlainObject(
      outcome.semantic_fact_bindings,
      `${label}.semantic_fact_bindings`,
    );
    (binding.proofs as unknown[]).push({
      ...template,
      ...overrides,
      proof_ref: compactStableRef(
        obligation.obligation_key,
        `${label}.obligation_key`,
      ),
      obligation_revision_digest: compactSha256(
        obligation.obligation_revision_digest,
        `${label}.obligation_revision_digest`,
      ),
      fact_ref: factKey,
    });
  }
}

export function materializeLongTaskCompactAssertions(
  assertions: Record<string, unknown>[],
  claims: Map<string, Record<string, unknown>>,
  facts: Map<string, Record<string, unknown>>,
  outcomes: Map<string, Record<string, unknown>>,
): void {
  for (const [index, projection] of assertions.entries()) {
    const label = `compact_semantic_carrier.assertion_projections.rows[${index}]`;
    const outcome = compactRequiredOutcome(projection.outcome_ref, outcomes, label);
    const acceptance = compactPlainObject(
      outcome.acceptance,
      `${label}.acceptance`,
    );
    const checkRef = compactStableRef(projection.check_ref, `${label}.check_ref`);
    const check = compactArray(acceptance.checks, `${label}.checks`)
      .map((item, checkIndex) =>
        compactPlainObject(item, `${label}.checks[${checkIndex}]`),
      )
      .find((item) => item.key === checkRef);
    if (!check) compactFail(`${label}.check_ref`, `unknown check: ${checkRef}`);
    const criterionKind = compactLiteral(
      projection.criterion_kind,
      ["claim_statement", "semantic_fact"] as const,
      `${label}.criterion_kind`,
    );
    const criterionRef = compactStableRef(
      projection.criterion_ref,
      `${label}.criterion_ref`,
    );
    let criterion: string;
    if (criterionKind === "claim_statement") {
      const claim = claims.get(criterionRef);
      if (!claim)
        compactFail(`${label}.criterion_ref`, `unknown claim: ${criterionRef}`);
      criterion = compactNonemptyString(claim.statement, `${label}.criterion`);
    } else {
      if (!facts.has(criterionRef))
        compactFail(`${label}.criterion_ref`, `unknown fact: ${criterionRef}`);
      criterion = `The current candidate satisfies the exact Source Fact ${criterionRef}.`;
    }
    const assertion = {
      key: compactStableRef(projection.key, `${label}.key`),
      criterion,
      claims: compactStableRefs(projection.claims, `${label}.claims`),
      applicability_ref: compactStableRef(
        projection.applicability_ref,
        `${label}.applicability_ref`,
      ),
      observation: compactNonemptyString(
        projection.observation,
        `${label}.observation`,
      ),
      evidence_capabilities: compactStableRefs(
        projection.evidence_capabilities,
        `${label}.evidence_capabilities`,
      ),
      operator: compactNonemptyString(
        projection.operator,
        `${label}.operator`,
      ),
      expected: projection.expected,
    };
    const positive = compactArray(
      check.positive_assertions,
      `${label}.positive_assertions`,
    );
    if (
      positive.some(
        (item) => compactPlainObject(item, label).key === assertion.key,
      )
    )
      compactFail(`${label}.key`, `duplicate assertion: ${assertion.key}`);
    const position = compactInteger(projection.position, `${label}.position`);
    if (position > positive.length)
      compactFail(
        `${label}.position`,
        `position exceeds current assertion length: ${position}:${positive.length}`,
      );
    positive.splice(position, 0, assertion);
  }
}
