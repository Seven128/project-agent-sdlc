import {
  decodeUtf8,
  digest,
  readTrackedRegularContained,
} from "./delegation-guidance-io.mjs";
import { REPO_ROOT } from "./shared.mjs";

const INPUTS = [
  ["task", "examples/delivery-benchmark/mechanism/tasks/long-task-disjoint-money-health.json"],
  ["gold", "examples/delivery-benchmark/mechanism/gold/long-task-disjoint-money-health.json"],
  [
    "hidden_probe",
    "examples/delivery-benchmark/mechanism/hidden/long-task-disjoint-money-health.mjs",
  ],
];

export async function validateDelegationBenchmarkInputs(declared, repoRoot = REPO_ROOT) {
  if (!Array.isArray(declared) || declared.length !== INPUTS.length)
    throw new Error("delegation_benchmark_input_set_invalid");
  const records = [];
  for (const [index, [role, expectedPath]] of INPUTS.entries()) {
    const item = declared[index];
    if (
      JSON.stringify(Object.keys(item ?? {}).sort()) !==
        JSON.stringify(["byte_length", "path", "role", "sha256"]) ||
      item.role !== role ||
      item.path !== expectedPath ||
      !Number.isInteger(item.byte_length) ||
      item.byte_length <= 0 ||
      !/^[0-9a-f]{64}$/u.test(item.sha256 ?? "")
    )
      throw new Error(`delegation_benchmark_input_identity_invalid:${role}`);
    const bytes = await readTrackedRegularContained(repoRoot, item.path);
    decodeUtf8(bytes, `delegation benchmark ${role}`);
    if (bytes.length !== item.byte_length || digest(bytes) !== item.sha256)
      throw new Error(`delegation_benchmark_input_bytes_mismatch:${role}`);
    records.push({ ...item });
  }
  return records;
}
