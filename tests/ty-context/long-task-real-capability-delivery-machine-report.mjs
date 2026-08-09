import { writeFile } from "node:fs/promises";

const REPORT_SCHEMA =
  "long-task-real-capability-black-box-terminal-report-v1";
const candidateRoles = new Set(["wrong", "control", "external"]);
const relationOperators = new Set(["equals", "not_equals"]);

export function createDeliveryTerminalReportRecorder({
  reportPath = process.env.TY_CONTEXT_REAL_CAPABILITY_TERMINAL_REPORT ?? "",
  invocationId =
    process.env.TY_CONTEXT_REAL_CAPABILITY_REPORT_INVOCATION ?? "",
} = {}) {
  const enabled = reportPath.length > 0 || invocationId.length > 0;
  if (enabled && (!reportPath || !/^[a-f0-9]{32}$/u.test(invocationId)))
    throw new Error("real_capability_machine_report_invocation_invalid");
  const cases = new Map();

  return {
    record(definition, execution) {
      validateDefinition(definition);
      if (cases.has(definition.case_id))
        throw new Error(
          `real_capability_machine_report_case_duplicate:${definition.case_id}`,
        );
      const workflowStatus =
        typeof execution?.result?.workflow_status === "string"
          ? execution.result.workflow_status
          : normalizedPreFinalRejection(execution?.stage);
      const resultStatus =
        typeof execution?.result?.status === "string"
          ? execution.result.status
          : null;
      cases.set(definition.case_id, {
        case_id: definition.case_id,
        test_id: definition.test_id,
        candidate_role: definition.candidate_role,
        control_case_id: definition.control_case_id ?? null,
        expected_relation: { ...definition.expected_relation },
        terminal: {
          stage:
            typeof execution?.stage === "string" ? execution.stage : "unknown",
          workflow_status: workflowStatus,
          result_status: resultStatus,
        },
      });
    },

    async write() {
      if (!enabled) return;
      await writeFile(
        reportPath,
        `${JSON.stringify({
          schema_version: REPORT_SCHEMA,
          invocation_id: invocationId,
          cases: [...cases.values()],
        })}\n`,
        { encoding: "utf8", flag: "wx" },
      );
    },
  };
}

function normalizedPreFinalRejection(stage) {
  if (typeof stage !== "string" || stage.length === 0 || stage === "unknown")
    return null;
  if (stage === "final-gate") return null;
  return `${stage.replace(/[^a-z0-9]+/gu, "_")}_rejected`;
}

function validateDefinition(definition) {
  if (!definition || typeof definition !== "object")
    throw new Error("real_capability_machine_report_definition_invalid");
  if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/u.test(definition.case_id ?? ""))
    throw new Error("real_capability_machine_report_case_id_invalid");
  if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/u.test(definition.test_id ?? ""))
    throw new Error("real_capability_machine_report_test_id_invalid");
  if (!candidateRoles.has(definition.candidate_role))
    throw new Error("real_capability_machine_report_candidate_role_invalid");
  if (
    definition.candidate_role === "wrong" &&
    !/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/u.test(
      definition.control_case_id ?? "",
    )
  )
    throw new Error("real_capability_machine_report_control_ref_required");
  if (
    definition.candidate_role !== "wrong" &&
    definition.control_case_id !== undefined &&
    definition.control_case_id !== null
  )
    throw new Error("real_capability_machine_report_control_ref_forbidden");
  if (
    !definition.expected_relation ||
    !relationOperators.has(definition.expected_relation.operator) ||
    typeof definition.expected_relation.value !== "string" ||
    definition.expected_relation.value.length === 0
  )
    throw new Error("real_capability_machine_report_expected_relation_invalid");
}
