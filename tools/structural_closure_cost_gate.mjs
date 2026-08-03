import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { materializeCanonicalCompactSharedStructures } from "../packages/ty-context/dist/lib/compact-shared-structure-validation.js";
import { inspectDefaultContextFootprint } from "../packages/ty-context/dist/lib/context-default-footprint.js";
import { createLongTaskCompactContract } from "../packages/ty-context/dist/lib/long-task-compact-authoring.js";
import { longTaskCompactSharedStructureTargets } from "../packages/ty-context/dist/lib/long-task-compact-primitives.js";
import { parseDeliveryContractText } from "../packages/ty-context/dist/lib/long-task-delivery-parser.js";
import { createSemanticFactCompactCarrier } from "../packages/ty-context/dist/lib/semantic-fact-compact-authoring.js";
import { semanticCompactSharedStructureTargets } from "../packages/ty-context/dist/lib/semantic-fact-compact-support.js";
import { parseSemanticFactManifestBlocks } from "../packages/ty-context/dist/lib/semantic-fact-source-parser.js";
import { evaluateStructuralClosureCost } from "../packages/ty-context/dist/lib/structural-closure-cost.js";
import { sha256Hex } from "../packages/ty-context/dist/lib/strict-codec.js";
import { createSymbolicDenotationCompilationSession } from "../packages/ty-context/dist/lib/symbolic-denotation-engine.js";
import { buildSymbolicScaleCatalog } from "../tests/ty-context/design-resource-symbolic-scale-fixture-catalog.mjs";
import {
  measureRevisionBlastRadius,
  measureUnrelatedAxis,
} from "./structural_closure_cost_revision_probe.mjs";
import { measureLongTaskPhases } from "./structural_closure_cost_phase_probe.mjs";

const repository = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const options = parseArguments(process.argv.slice(2));
const artifactPath = protectedArtifactPath(options.artifact);
const baselinePath = path.join(
  repository,
  "tests",
  "ty-context",
  "fixtures",
  "structural-closure-cost-baseline.json",
);
let report;
let exitCode = 0;
try {
  report = await buildReport();
  if (report.findings.length > 0) exitCode = 1;
} catch (error) {
  exitCode = 1;
  report = {
    schema_version: "structural-closure-cost-report-v1",
    status: "failed",
    error: error instanceof Error ? error.stack ?? error.message : String(error),
    findings: ["probe_execution_failed"],
  };
}
await mkdir(path.dirname(artifactPath), { recursive: true });
await writeFile(artifactPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
process.exitCode = exitCode;

async function buildReport() {
  const baselineRaw = await readFile(baselinePath, "utf8");
  const baseline = JSON.parse(baselineRaw);
  const sourceRelative = "docs/symbolic-denotation-efficiency.md";
  const contractRelative =
    ".work_products/symbolic-denotation-efficiency/delivery-contract.yaml";
  const sourceText = await readFile(path.join(repository, sourceRelative), "utf8");
  const contractText = await readFile(
    path.join(repository, contractRelative),
    "utf8",
  );
  const [source] = parseSemanticFactManifestBlocks(sourceRelative, sourceText);
  assert.equal(source.carrier, "compact_v1");
  const contract = parseDeliveryContractText(contractText);
  const compactSource = createSemanticFactCompactCarrier(source.manifest);
  const compactContract = createLongTaskCompactContract(
    contract,
    source.fact_revisions,
    source.obligation_revisions,
  );
  const sourceDuplicates = duplicateStatistics(compactSource, "source");
  const contractDuplicates = duplicateStatistics(compactContract, "contract");
  const scale = symbolicScaleCardinality();
  const context = await inspectDefaultContextFootprint(repository);
  const revisionBlastRadius = await measureRevisionBlastRadius(
    sourceText,
    source.manifest,
    contract,
  );
  const unrelatedAxis = measureUnrelatedAxis(source.manifest);
  const phases = await measureLongTaskPhases();
  const profile = process.platform === "win32" ? "windows-v1" : "default-v1";
  const observation = {
    cardinality: {
      K_fact: source.manifest.facts.length,
      K_rule: scale.K_rule,
      M_value: source.manifest.proof_obligations.length,
      M_total:
        source.manifest.proof_obligations.length +
        scale.semantic_obligations +
        scale.certificate_obligations,
      N_dag:
        sourceDuplicates.emitted_family_count +
        contractDuplicates.emitted_family_count +
        scale.canonical_dag_nodes,
    },
    bytes: {
      source: Buffer.byteLength(sourceText, "utf8"),
      contract: Buffer.byteLength(contractText, "utf8"),
      evidence: phases.evidence_bytes,
      default_context: context.total_bytes,
    },
    phases_ms: {
      compile: phases.compile_ms,
      preflight: phases.preflight_ms,
      final_gate: phases.final_gate_ms,
    },
    peak_rss_bytes: phases.peak_rss_bytes,
    duplicate_blocks: {
      source: sourceDuplicates,
      contract: contractDuplicates,
    },
    revision_blast_radius: revisionBlastRadius,
    unrelated_axis: unrelatedAxis,
  };
  const findings = evaluateStructuralClosureCost(
    observation,
    baseline,
    profile,
  );
  return {
    schema_version: "structural-closure-cost-report-v1",
    status: findings.length === 0 ? "passed" : "failed",
    baseline: {
      path: path.relative(repository, baselinePath).replace(/\\/gu, "/"),
      sha256: sha256Hex(baselineRaw),
      profile,
      workload: baseline.workload,
    },
    environment: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      peak_rss_scope:
        "real process.resourceUsage().maxRSS for the isolated gate process; child runner RSS is outside this process metric",
    },
    definitions: {
      K_fact: "real compact non-UI Source Fact count",
      K_rule:
        "639 symbolic subjects x 2 applicable properties x 2 exact regions",
      M_value: "real compact non-UI Fact-method obligation count",
      M_total:
        "non-UI obligations + 2,556 scale semantic obligations + one set certificate",
      N_dag:
        "Source/Contract shared-structure families + scale canonical predicate DAG nodes",
    },
    fixture: {
      non_ui: {
        facts: source.manifest.facts.length,
        obligations: source.manifest.proof_obligations.length,
        inputs: source.manifest.inputs.length,
      },
      symbolic: scale,
      phase_probe:
        "disposable one-Fact repository; it exercises real preflight, compile and sole Final Gate without activating this repository's Long-Task binding",
    },
    metrics: observation,
    context_files: context.files,
    findings,
  };
}

function duplicateStatistics(value, side) {
  const clone = structuredClone(value);
  const carrier =
    side === "source" ? clone : clone.compact_semantic_carrier;
  const targets =
    side === "source"
      ? semanticCompactSharedStructureTargets(clone)
      : longTaskCompactSharedStructureTargets(clone, carrier);
  return materializeCanonicalCompactSharedStructures(
    targets,
    carrier.shared_structures,
    side,
  );
}

function symbolicScaleCardinality() {
  const catalog = buildSymbolicScaleCatalog();
  const regions = ["off", "on"].map((value) => ({
    op: "eq",
    axis_ref: "condition.axis-00",
    value,
  }));
  const reachable = {
    op: "in",
    axis_ref: "variation.case",
    values: catalog.variations,
  };
  const session = createSymbolicDenotationCompilationSession(catalog.domains, [
    reachable,
    ...regions,
  ]);
  const compiled = [reachable, ...regions].map((predicate) =>
    session.compile(predicate),
  );
  return {
    subjects: catalog.subjects.length,
    properties: catalog.properties.length,
    axes: catalog.domains.length,
    variations: catalog.variations.length,
    applicable_properties: 2,
    exact_regions: 2,
    K_rule: catalog.subjects.length * 2 * 2,
    semantic_obligations: catalog.subjects.length * 2 * 2,
    certificate_obligations: 1,
    canonical_dag_nodes: compiled.reduce(
      (sum, item) => sum + item.metrics.canonical_dag_nodes,
      0,
    ),
  };
}

function parseArguments(args) {
  const result = {
    artifact: ".artifacts/structural-closure-cost/report.json",
  };
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--artifact") result.artifact = args[++index];
    else throw new Error(`structural_cost_unknown_argument:${args[index]}`);
  }
  return result;
}

function protectedArtifactPath(relative) {
  if (typeof relative !== "string" || !relative.trim())
    throw new Error("structural_cost_artifact_path_missing");
  const target = path.resolve(repository, ...relative.split("/"));
  if (!target.startsWith(`${repository}${path.sep}`))
    throw new Error(`structural_cost_artifact_path_unsafe:${relative}`);
  return target;
}
