import assert from "node:assert/strict";
import test from "node:test";
import YAML from "yaml";
import { generateClaims } from "../../packages/ty-context/dist/lib/long-task-claim-definitions.js";
import { parseDeliveryContractText } from "../../packages/ty-context/dist/lib/long-task-delivery-parser.js";
import { parseControls } from "../../packages/ty-context/dist/lib/long-task-product-shape.js";
import { buildCanonicalSourceTargetIndex } from "../../packages/ty-context/dist/lib/long-task-source-target-index.js";
import {
  addProductionControlBinding,
  completeControl,
  deliveryContract,
} from "./long-task-delivery-fixtures.mjs";

function parse(contract) {
  return parseDeliveryContractText(YAML.stringify(contract));
}

test("result, Control states, non-completing, obligation and shortcut Claims require coverage", () => {
  const contract = deliveryContract();
  const outcome = contract.outcomes[0];
  outcome.product.controls.push(
    completeControl({
      key: "submit",
      surface: "fixture-main",
      location: "footer",
      trigger: "click",
      input: "content",
      loading_state: "loading",
      empty_state: "disabled",
      success_state: "done",
      failure_state: "error",
      feedback: "visible",
    }),
  );
  addProductionControlBinding(contract, {
    controlKey: "submit",
    rootClaimRef: "control.submit.location",
  });
  assert.throws(
    () => parse(contract),
    /ui_surface_binding_(root_control|target_claim)_proof_missing/,
  );
});

test("every non-empty control-level UI field becomes a stable Claim and Source target", () => {
  const contract = deliveryContract();
  const control = completeControl({
    key: "submit",
    surface: "settings",
    region: "action-footer",
    location: "settings footer",
    control_type: "button",
    label_content: "Save",
    user_task: "Commit valid settings",
    visibility: "visible while editing",
    availability: "enabled only when valid",
    trigger: "click or keyboard activation",
    input: "current form values",
    validation: "invalid fields remain identified",
    default_value: "current persisted values",
    interaction: "commit once and preserve focus",
    navigation_result: "remain on settings with confirmation",
    loading_state: "show pending state",
    empty_state: "disable when no editable fields exist",
    success_state: "show saved confirmation",
    failure_state: "show actionable failure",
    recovery: "retry without losing values",
    permission: "show read-only state when denied",
    feedback: "announce save result",
    accessibility: "named keyboard-operable button",
  });
  contract.outcomes[0].product.controls.push(control);
  const expectedFields = [
    "surface",
    "region",
    "location",
    "control_type",
    "label_content",
    "user_task",
    "visibility",
    "availability",
    "trigger",
    "input",
    "validation",
    "default_value",
    "interaction",
    "navigation_result",
    "loading",
    "empty",
    "success",
    "failure",
    "recovery",
    "permission",
    "feedback",
    "accessibility",
  ];
  const expectedRefs = expectedFields.map(
    (field) => `first.control.submit.${field}`,
  );
  const claims = generateClaims(contract.outcomes[0]).map((claim) => claim.id);
  const targets = buildCanonicalSourceTargetIndex(contract);
  assert.deepEqual(
    claims.filter((claim) => claim.startsWith("first.control.submit.")),
    expectedRefs,
  );
  assert.deepEqual(
    expectedRefs.filter((ref) => targets.has(ref)),
    expectedRefs,
  );
});

test("Controls fail closed without field closure and N/A fields create negative Claims", () => {
  const contract = deliveryContract();
  assert.throws(
    () =>
      parseControls(
        [{ key: "classified", location: "footer", trigger: "click" }],
        "controls",
      ),
    /missing keys: field_coverage/u,
  );
  const [control] = parseControls(
    [
      completeControl({
        key: "classified",
        location: "footer",
        trigger: "click",
      }),
    ],
    "controls",
  );
  const claims = generateClaims({
    ...contract.outcomes[0],
    product: {
      ...contract.outcomes[0].product,
      controls: [control],
    },
  }).filter((claim) => claim.id.startsWith("first.control.classified."));
  assert.equal(claims.length, 22);
  assert.equal(
    claims.find((claim) => claim.id.endsWith(".location")).required_polarity,
    "positive",
  );
  assert.equal(
    claims.find((claim) => claim.id.endsWith(".accessibility"))
      .required_polarity,
    "negative",
  );
});

test("unknown and cross-Outcome Claim refs fail", () => {
  const unknown = deliveryContract();
  unknown.outcomes[0].acceptance.checks[0].positive_assertions[0].claims = [
    "missing.claim",
  ];
  assert.throws(() => parse(unknown), /assertion_claim_unknown/);
  const cross = deliveryContract({ twoOutcomes: true });
  cross.outcomes[0].acceptance.checks[0].positive_assertions[0].claims = [
    "second.result",
  ];
  assert.throws(() => parse(cross), /assertion_claim_cross_outcome/);
});

test("Control Claims follow their production target and obligation surfaces must match", () => {
  const ui = deliveryContract();
  const outcome = ui.outcomes[0];
  outcome.product.controls.push(
    completeControl({
      key: "submit",
      surface: "fixture-main",
      location: "footer",
      trigger: "click",
    }),
  );
  addProductionControlBinding(ui, {
    controlKey: "submit",
    rootClaimRef: "control.submit.trigger",
  });
  assert.doesNotThrow(() => parse(ui));
  const obligation = deliveryContract();
  obligation.outcomes[0].technical.obligations[0].required_proof_surfaces = [
    "api_contract",
  ];
  assert.throws(() => parse(obligation), /obligation_proof_surface_mismatch/);
});

test("non-completing and forbidden shortcuts reject positive-only coverage", () => {
  for (const kind of ["non_completing", "forbidden_shortcut"]) {
    const contract = deliveryContract();
    const outcome = contract.outcomes[0];
    if (kind === "non_completing")
      outcome.product.non_completing_outcomes.push({
        key: "exit-zero-only",
        statement: "Exit zero alone is not completion.",
        applicability_refs: ["first-root-success"],
      });
    else
      outcome.technical.forbidden_shortcuts.push({
        key: "self-report",
        statement: "Self-report is not proof.",
        applicability_refs: ["first-root-success"],
      });
    outcome.acceptance.checks[0].positive_assertions.push({
      key: `${kind.replaceAll("_", "-")}-positive-only`,
      criterion: "The prohibited state is incorrectly treated as positive.",
      claims: [
        `${kind}.` +
          (kind === "non_completing" ? "exit-zero-only" : "self-report"),
      ],
      applicability_ref: "first-root-success",
      observation: `${kind}_positive`,
      evidence_capabilities: ["state_delta"],
      operator: "equals",
      expected: true,
    });
    assert.throws(
      () => parse(contract),
      /claim_proof_polarity_mismatch/,
    );
  }
});

test("fully covered Claims parse successfully and Source Claims target generated ids", () => {
  const contract = deliveryContract();
  assert.doesNotThrow(() => parse(contract));
  contract.source_claims[0].disposition.refs = ["first.missing"];
  assert.throws(() => parse(contract), /source_claim_product_ref_unknown/);
});
