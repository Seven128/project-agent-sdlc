import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  DELIVERY_BLACK_BOX_CASE_POLICY,
  parseNodeMachineReport,
  validateBlackBoxMachineProof,
} from "../../tools/verify_long_task_real_capability_delivery.mjs";

const invocationId = "a".repeat(32);
const compileBoundaryDiagnostics = new Map([
  ["wrong.r1.custom-oracle", "custom_oracle_machine_completion_forbidden"],
  [
    "wrong.r1b.verification-input-static",
    "machine_observer_not_admitted:static_carrier_expected_authority_forbidden",
  ],
  ["wrong.r3.historical-runtime", "process_observer_direct_root_required"],
  [
    "wrong.r4.browser-native-proxy",
    "unsupported_observer_requires_external_confirmation",
  ],
  [
    "wrong.r5.synthetic-status-binding",
    "machine_observer_not_admitted:static_carrier_evidence_role_forbidden",
  ],
  [
    "wrong.r5b.evidence-role-static",
    "machine_observer_not_admitted:static_carrier_evidence_role_forbidden",
  ],
  [
    "wrong.r5c.evidence-role-process",
    "process_runtime_input_evidence_role_forbidden",
  ],
  ["wrong.r6.verifier-wrapper", "process_observer_direct_root_required"],
  ["wrong.r6b.argv-wrapper", "process_observer_root_argv_mismatch"],
]);

test("delivery verifier accepts one complete current-run terminal/control report", () => {
  const fixture = validProofFixture();
  const proof = validateBlackBoxMachineProof(fixture);
  assert.equal(proof.invocation_id, invocationId);
  assert.deepEqual(
    proof.cases.map((entry) => entry.case_id),
    DELIVERY_BLACK_BOX_CASE_POLICY.map((entry) => entry.case_id),
  );
});

test("delivery verifier rejects duplicate terminal cases", () => {
  const fixture = validProofFixture();
  fixture.terminalReport.cases.push(
    structuredClone(fixture.terminalReport.cases[0]),
  );
  assert.throws(
    () => validateBlackBoxMachineProof(fixture),
    /real_capability_black_box_case_duplicate/u,
  );
});

test("delivery verifier rejects a missing terminal or Node test identity", () => {
  const missingTerminal = validProofFixture();
  missingTerminal.terminalReport.cases.pop();
  assert.throws(
    () => validateBlackBoxMachineProof(missingTerminal),
    /real_capability_black_box_case_set_mismatch/u,
  );

  const missingNode = validProofFixture();
  missingNode.nodeReport.tests.pop();
  assert.throws(
    () => validateBlackBoxMachineProof(missingNode),
    /real_capability_black_box_node_test_set_mismatch/u,
  );
});

test("delivery verifier rejects duplicate or skipped fixed Node test identities", () => {
  const duplicate = validProofFixture();
  duplicate.nodeReport.tests.push(
    structuredClone(duplicate.nodeReport.tests[0]),
  );
  assert.throws(
    () => validateBlackBoxMachineProof(duplicate),
    /real_capability_black_box_node_test_duplicate/u,
  );

  const skipped = validProofFixture();
  skipped.nodeReport.tests[0].status = "skipped";
  assert.throws(
    () => validateBlackBoxMachineProof(skipped),
    /real_capability_black_box_node_test_not_passed/u,
  );
});

test("delivery verifier rejects wrong and control terminal inversions", () => {
  const wrongAccepted = validProofFixture();
  wrongAccepted.terminalReport.cases.find(
    (entry) => entry.candidate_role === "wrong",
  ).terminal.workflow_status = "machine_accepted";
  assert.throws(
    () => validateBlackBoxMachineProof(wrongAccepted),
    /real_capability_black_box_terminal_relation_failed/u,
  );

  const controlRejected = validProofFixture();
  controlRejected.terminalReport.cases.find(
    (entry) => entry.case_id === "control.process",
  ).terminal.workflow_status = "needs_work";
  assert.throws(
    () => validateBlackBoxMachineProof(controlRejected),
    /real_capability_black_box_terminal_relation_failed/u,
  );

  const externalAccepted = validProofFixture();
  externalAccepted.terminalReport.cases.find(
    (entry) => entry.case_id === "control.external",
  ).terminal.workflow_status = "machine_accepted";
  assert.throws(
    () => validateBlackBoxMachineProof(externalAccepted),
    /real_capability_black_box_terminal_relation_failed/u,
  );
});

test("delivery verifier rejects invocation, role, relation, and control-reference tampering", () => {
  const wrongInvocation = validProofFixture();
  wrongInvocation.terminalReport.invocation_id = "b".repeat(32);
  assert.throws(
    () => validateBlackBoxMachineProof(wrongInvocation),
    /real_capability_black_box_terminal_report_invalid/u,
  );

  for (const mutate of [
    (entry) => (entry.candidate_role = "control"),
    (entry) => (entry.control_case_id = "control.external"),
    (entry) => (entry.expected_relation.value = "needs_work"),
  ]) {
    const tampered = validProofFixture();
    mutate(
      tampered.terminalReport.cases.find(
        (entry) => entry.case_id === "wrong.r1.custom-oracle",
      ),
    );
    assert.throws(
      () => validateBlackBoxMachineProof(tampered),
      /real_capability_black_box_case_record_invalid/u,
    );
  }
});

test("delivery verifier rejects fabricated or unbound Final Gate proof", () => {
  for (const mutate of [
    (proof) => (proof.invoked = false),
    (proof) => (proof.command_identity = "0".repeat(64)),
    (proof) => (proof.candidate_identity = "0".repeat(64)),
    (proof) => (proof.final_gate_diagnostic = "active_task_missing"),
  ]) {
    const fixture = validProofFixture();
    mutate(fixture.terminalReport.cases[0].final_gate);
    assert.throws(
      () => validateBlackBoxMachineProof(fixture),
      /real_capability_black_box_case_record_invalid/u,
    );
  }

  const missingOwnerDiagnostic = validProofFixture();
  missingOwnerDiagnostic.terminalReport.cases.find(
    (entry) => entry.case_id === "wrong.r1.custom-oracle",
  ).final_gate.owner_compile_diagnostic = null;
  assert.throws(
    () => validateBlackBoxMachineProof(missingOwnerDiagnostic),
    /real_capability_black_box_owner_compile_diagnostic_invalid/u,
  );

  const unexpectedOwnerDiagnostic = validProofFixture();
  unexpectedOwnerDiagnostic.terminalReport.cases.find(
    (entry) => entry.case_id === "control.process",
  ).final_gate.owner_compile_diagnostic = "fabricated_owner_diagnostic";
  assert.throws(
    () => validateBlackBoxMachineProof(unexpectedOwnerDiagnostic),
    /real_capability_black_box_owner_compile_unexpected/u,
  );
});

test("delivery verifier rejects a terminal without a concrete workflow status", () => {
  const fixture = validProofFixture();
  fixture.terminalReport.cases[0].terminal.workflow_status = null;
  assert.throws(
    () => validateBlackBoxMachineProof(fixture),
    /real_capability_black_box_case_record_invalid/u,
  );
});

test("Node machine report parser preserves pass/fail/skip without trusting summaries", () => {
  const report = parseNodeMachineReport(
    [
      JSON.stringify({
        type: "test:pass",
        data: { name: "fixed pass", line: 1, column: 2 },
      }),
      JSON.stringify({
        type: "test:pass",
        data: { name: "fixed skip", skip: "reason", line: 3, column: 4 },
      }),
      JSON.stringify({
        type: "test:summary",
        data: { success: true, counts: { passed: 999 } },
      }),
    ].join("\n"),
    { file: "fixture.test.mjs" },
  );
  assert.deepEqual(
    report.tests.map(({ name, status }) => ({ name, status })),
    [
      { name: "fixed pass", status: "passed" },
      { name: "fixed skip", status: "skipped" },
    ],
  );
});

function validProofFixture() {
  return {
    invocationId,
    nodeReport: {
      schema_version: "long-task-real-capability-node-machine-report-v1",
      file: "tests/ty-context/long-task-observer-trust-counterexamples.test.mjs",
      tests: DELIVERY_BLACK_BOX_CASE_POLICY.map((policy) => ({
        name: `[real-capability:${policy.test_id}] fixture`,
        status: "passed",
        line: 1,
        column: 1,
      })),
    },
    terminalReport: {
      schema_version: "long-task-real-capability-black-box-terminal-report-v1",
      invocation_id: invocationId,
      cases: DELIVERY_BLACK_BOX_CASE_POLICY.map((policy) => ({
        case_id: policy.case_id,
        test_id: policy.test_id,
        candidate_role: policy.candidate_role,
        control_case_id: policy.control_case_id,
        expected_relation: structuredClone(policy.expected_relation),
        terminal: {
          stage: "final-gate",
          workflow_status:
            policy.candidate_role === "wrong"
              ? "needs_work"
              : policy.expected_relation.value,
          result_status:
            policy.candidate_role === "wrong" ? "rejected" : "accepted",
        },
        final_gate: finalGateProof(policy),
      })),
    },
  };
}

function finalGateProof(policy) {
  const command = "long-task final-gate";
  const workdir_sha256 = digest(`workdir:${policy.case_id}`);
  const candidate_head = digest(`head:${policy.case_id}`).slice(0, 40);
  const candidate_tree = digest(`tree:${policy.case_id}`).slice(0, 40);
  const contract_sha256 = digest(`contract:${policy.case_id}`);
  return {
    invoked: true,
    command,
    workdir_sha256,
    command_identity: digest(JSON.stringify({ command, workdir_sha256 })),
    candidate_head,
    candidate_tree,
    contract_sha256,
    candidate_identity: digest(
      JSON.stringify({ candidate_head, candidate_tree, contract_sha256 }),
    ),
    owner_compile_diagnostic:
      compileBoundaryDiagnostics.get(policy.case_id) ?? null,
    final_gate_diagnostic:
      policy.candidate_role === "wrong"
        ? `protected_candidate_revision_rejected:${policy.case_id}`
        : `final_gate_completed:${policy.case_id}`,
  };
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}
