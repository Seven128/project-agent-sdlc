import assert from "node:assert/strict";
import test from "node:test";
import YAML from "yaml";
import { parseDeliveryContractText } from "../../packages/ty-context/dist/lib/long-task-delivery-parser.js";
import { deliveryContract } from "./long-task-delivery-fixtures.mjs";

test("parses the only active V2 Contract without entity-chain ids", () => {
  const parsed = parseDeliveryContractText(
    YAML.stringify(deliveryContract({ twoOutcomes: true })),
  );
  assert.equal(parsed.schema_version, "long-task-delivery-v2");
  assert.deepEqual(
    parsed.outcomes.map((outcome) => outcome.key),
    ["first", "second"],
  );
  for (const retired of ["requirement_id", "plan_item", "ac_id", "proof_id"])
    assert.equal(JSON.stringify(parsed).includes(retired), false);
});

test("V1 is retired instead of entering a second Evidence Kernel", () => {
  const contract = deliveryContract();
  contract.schema_version = "long-task-delivery-v1";
  assert.throws(
    () => parseDeliveryContractText(YAML.stringify(contract)),
    /long_task_delivery_v1_retired_use_v2/,
  );
});

test("rejects duplicate Outcome/Check/Assertion keys while Check keys remain Outcome-local", () => {
  const duplicateOutcome = deliveryContract({ twoOutcomes: true });
  duplicateOutcome.outcomes[1].key = "first";
  assert.throws(
    () => parseDeliveryContractText(YAML.stringify(duplicateOutcome)),
    /outcome_key_duplicate/,
  );
  const localChecks = deliveryContract({ twoOutcomes: true });
  localChecks.outcomes[1].acceptance.checks[0].key = "first-check";
  assert.doesNotThrow(() =>
    parseDeliveryContractText(YAML.stringify(localChecks)),
  );
  const duplicateAssertion = deliveryContract();
  const check = duplicateAssertion.outcomes[0].acceptance.checks[0];
  check.negative_assertions.push(structuredClone(check.positive_assertions[0]));
  assert.throws(
    () => parseDeliveryContractText(YAML.stringify(duplicateAssertion)),
    /assertion_key_duplicate/,
  );
});

test("rejects unsupported runners, unknown keys and YAML aliases", () => {
  const unsupported = deliveryContract();
  unsupported.outcomes[0].acceptance.checks[0].runner.type = "shell";
  assert.throws(
    () => parseDeliveryContractText(YAML.stringify(unsupported)),
    /runner.type:must be one of/,
  );
  const unknown = YAML.stringify(deliveryContract()).replace(
    "schema_version: long-task-delivery-v2",
    "schema_version: long-task-delivery-v2\nunknown: true",
  );
  assert.throws(() => parseDeliveryContractText(unknown), /unknown keys/);
  assert.throws(
    () =>
      parseDeliveryContractText(
        "schema_version: &x long-task-delivery-v2\ntask: *x\n",
      ),
    /aliases|anchors/,
  );
});

test("uncovered Claims and cyclic dependencies fail closed", () => {
  const noCheck = deliveryContract();
  noCheck.outcomes[0].acceptance.checks = [];
  assert.throws(
    () => parseDeliveryContractText(YAML.stringify(noCheck)),
    /product_claim_required_surfaces_missing/,
  );
  const cyclic = deliveryContract({ twoOutcomes: true });
  cyclic.outcomes[0].depends_on = ["second"];
  assert.throws(
    () => parseDeliveryContractText(YAML.stringify(cyclic)),
    /outcome_dependency_cycle/,
  );
});

test("Source Claims require declared Source files and valid file#anchor locators", () => {
  const missingSources = deliveryContract();
  missingSources.task.source_paths = [];
  assert.throws(
    () => parseDeliveryContractText(YAML.stringify(missingSources)),
    /source_authority_required/u,
  );

  const emptyAnchor = deliveryContract();
  emptyAnchor.source_claims[0].source_ref = "source.md#";
  assert.throws(
    () => parseDeliveryContractText(YAML.stringify(emptyAnchor)),
    /source_claim_ref_invalid/u,
  );

  const valid = deliveryContract();
  valid.source_claims[0].source_ref = "source.md#section";
  assert.doesNotThrow(() =>
    parseDeliveryContractText(YAML.stringify(valid)),
  );
});
