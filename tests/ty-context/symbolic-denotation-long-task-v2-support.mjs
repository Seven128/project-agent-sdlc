import { createHash } from "node:crypto";

export function wrapperOracleSource(records, observations) {
  return `import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import process from "node:process";
const baseOracle = fileURLToPath(new URL("./base-oracle.mjs", import.meta.url));
const base = JSON.parse(execFileSync(process.execPath, [baseOracle, ...process.argv.slice(2)], { encoding: "utf8" }));
const state = JSON.parse(await readFile(new URL("../src/state.json", import.meta.url), "utf8"));
const passed = state.first === true;
const expected = ${JSON.stringify(observations)};
for (const [key, value] of Object.entries(expected))
  base.observations[key] = passed ? value : typeof value === "boolean" ? !value : null;
const records = structuredClone(${JSON.stringify(records)});
if (!passed)
  for (const record of records) {
    if (record.capability === "design_method") {
      const results = "fact_model" in record ? record.rule_results : record.cells.flatMap((cell) => cell.fact_results);
      for (const result of results) {
        result.verdict = "failed";
        result.comparison.passed = false;
      }
    }
    if (record.capability === "design_symbolic_certificate")
      for (const result of record.certificate_results) result.verdict = "failed";
  }
if (Array.isArray(base.evidence_records)) base.evidence_records.push(...records);
console.log(JSON.stringify(base));
`;
}

export function fixtureSha(value) {
  return createHash("sha256").update(value).digest("hex");
}
