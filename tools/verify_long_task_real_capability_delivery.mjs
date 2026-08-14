import { createHash, randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import {
  appendFile,
  copyFile,
  mkdtemp,
  mkdir,
  readFile,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { npmCommandSpec } from "./npm_command_spec.mjs";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const sourcePath = "docs/long-task-real-capability-closure.md";
const source = await readText(sourcePath);
const manifest = loadManifest(source);
const sourceKinds = loadSourceKinds(source);
export const DELIVERY_BLACK_BOX_CASE_POLICY = Object.freeze([
  wrongProofCase(
    "wrong.r1.custom-oracle",
    "observer-trust.r1.custom-oracle",
    "control.process",
  ),
  wrongProofCase(
    "wrong.r1b.verification-input-static",
    "observer-trust.r1b.verification-input-static",
    "control.static",
  ),
  wrongProofCase(
    "wrong.r2.runner-created-static",
    "observer-trust.r2.runner-created-static",
    "control.static",
  ),
  wrongProofCase(
    "wrong.r3.historical-runtime",
    "observer-trust.r3.historical-runtime",
    "control.process",
  ),
  wrongProofCase(
    "wrong.r4.browser-native-proxy",
    "observer-trust.r4.browser-native-proxy",
    "control.external",
  ),
  wrongProofCase(
    "wrong.r5.synthetic-status-binding",
    "observer-trust.r5.synthetic-status-binding",
    "control.static",
  ),
  wrongProofCase(
    "wrong.r5b.evidence-role-static",
    "observer-trust.r5b.evidence-role-static",
    "control.static",
  ),
  wrongProofCase(
    "wrong.r5c.evidence-role-process",
    "observer-trust.r5c.evidence-role-process",
    "control.process",
  ),
  wrongProofCase(
    "wrong.r6.verifier-wrapper",
    "observer-trust.r6.verifier-wrapper",
    "control.process",
  ),
  wrongProofCase(
    "wrong.r6b.argv-wrapper",
    "observer-trust.r6b.argv-wrapper",
    "control.process",
  ),
  wrongProofCase(
    "wrong.r7.runner-modified-static",
    "observer-trust.r7.runner-modified-static",
    "control.static",
  ),
  wrongProofCase(
    "wrong.r7b.cross-execution-priming",
    "observer-trust.r7b.cross-execution-priming",
    "control.static",
  ),
  wrongProofCase(
    "wrong.r7c.process-input-mutation",
    "observer-trust.r7c.process-input-mutation",
    "control.process",
  ),
  wrongProofCase(
    "wrong.r8.empty-observation",
    "observer-trust.r8.empty-observation",
    "control.process",
  ),
  controlProofCase(
    "control.r9a.unused-nonclosure-evidence-input",
    "observer-trust.r9a.unused-nonclosure-evidence-input",
    "control",
    "machine_accepted",
  ),
  wrongProofCase(
    "wrong.process-noncarrier-evidence-input",
    "observer-trust.r9.process-noncarrier-evidence-input",
    "control.r9a.unused-nonclosure-evidence-input",
  ),
  wrongProofCase(
    "wrong.r9c.bound-evidence-input-closure-conflict",
    "observer-trust.r9c.bound-evidence-input-closure-conflict",
    "control.r9a.unused-nonclosure-evidence-input",
  ),
  controlProofCase(
    "control.r10a.unused-nonclosure-verification-input",
    "observer-trust.r10a.unused-nonclosure-verification-input",
    "control",
    "machine_accepted",
  ),
  wrongProofCase(
    "wrong.process-noncarrier-verification-input",
    "observer-trust.r10.process-noncarrier-verification-input",
    "control.r10a.unused-nonclosure-verification-input",
  ),
  wrongProofCase(
    "wrong.r10c.bound-verification-input-closure-conflict",
    "observer-trust.r10c.bound-verification-input-closure-conflict",
    "control.r10a.unused-nonclosure-verification-input",
  ),
  wrongProofCase(
    "wrong.execution-target-source-drift",
    "observer-trust.r11.execution-target-source-drift",
    "control.process",
  ),
  wrongProofCase(
    "wrong.execution-target-unbound-argv",
    "observer-trust.r11b.execution-target-unbound-argv",
    "control.process",
  ),
  wrongProofCase(
    "wrong.r12.external-root-argv",
    "observer-trust.r12.external-root-argv",
    "control.process",
  ),
  controlProofCase(
    "control.static",
    "observer-trust.control.static",
    "control",
    "machine_accepted",
  ),
  controlProofCase(
    "control.process",
    "observer-trust.control.process",
    "control",
    "machine_accepted",
  ),
  controlProofCase(
    "control.external",
    "observer-trust.control.external",
    "external",
    "blocked_external",
  ),
]);

const sharedExactTest =
  "shared exact evaluator recomputes V1 and V2 pass and comparison identity";
const selectedDesignObservationTest =
  "package observer is joined to selected-design validation from the current product carrier";
const symbolicObserverBoundaryTest =
  "[critical:symbolic-mixed-representation-closure] mixed V1 and opt-in UI V2 targets preserve symbolic closure and require External Confirmation without an admitted UI observer";
const starwardShapeTest =
  "Starward sanitized replay contains the four-page product shape and independently scored candidate paths";
const starwardGroundTruthTest =
  "Starward hidden ground truth rejects A1-A12 and accepts the valid control set";

const nodeMachineFactTests = new Map([
  [
    "known-selected-design-false-acceptance",
    [sharedExactTest, selectedDesignObservationTest],
  ],
  ["p0-positive-fixture-correction", [selectedDesignObservationTest]],
  ["p0-v1-negative-control", [sharedExactTest]],
  ["p0-v2-negative-control", [sharedExactTest, symbolicObserverBoundaryTest]],
  ["shared-exact-comparison-owner", [sharedExactTest]],
  [
    "p0-verification-boundary",
    [selectedDesignObservationTest, symbolicObserverBoundaryTest],
  ],
  [
    "selected-design-existing-owner-preservation",
    [selectedDesignObservationTest],
  ],
  ["starward-sanitized-replay", [starwardShapeTest, starwardGroundTruthTest]],
]);

const allWrongBlackBoxCases = DELIVERY_BLACK_BOX_CASE_POLICY.filter(
  (entry) => entry.candidate_role === "wrong",
).map((entry) => entry.case_id);
const allControlBlackBoxCases = DELIVERY_BLACK_BOX_CASE_POLICY.filter(
  (entry) => entry.candidate_role !== "wrong",
).map((entry) => entry.case_id);
const allBlackBoxCases = DELIVERY_BLACK_BOX_CASE_POLICY.map(
  (entry) => entry.case_id,
);
const r9R10LayerCases = Object.freeze([
  "control.r9a.unused-nonclosure-evidence-input",
  "wrong.process-noncarrier-evidence-input",
  "wrong.r9c.bound-evidence-input-closure-conflict",
  "control.r10a.unused-nonclosure-verification-input",
  "wrong.process-noncarrier-verification-input",
  "wrong.r10c.bound-verification-input-closure-conflict",
]);
const r9R10WrongLayerCases = Object.freeze(
  r9R10LayerCases.filter((caseId) => caseId.startsWith("wrong.")),
);

const compileBoundaryOwnerDiagnostics = new Map([
  ["wrong.r1.custom-oracle", ["custom_oracle_machine_completion_forbidden"]],
  [
    "wrong.r1b.verification-input-static",
    [
      "machine_observer_not_admitted",
      "static_carrier_expected_authority_forbidden",
    ],
  ],
  ["wrong.r3.historical-runtime", ["process_observer_direct_root_required"]],
  [
    "wrong.r4.browser-native-proxy",
    ["unsupported_observer_requires_external_confirmation"],
  ],
  [
    "wrong.r5.synthetic-status-binding",
    ["machine_observer_not_admitted", "static_carrier_evidence_role_forbidden"],
  ],
  [
    "wrong.r5b.evidence-role-static",
    ["machine_observer_not_admitted", "static_carrier_evidence_role_forbidden"],
  ],
  [
    "wrong.r5c.evidence-role-process",
    ["process_runtime_input_evidence_role_forbidden"],
  ],
  ["wrong.r6.verifier-wrapper", ["process_observer_direct_root_required"]],
  ["wrong.r6b.argv-wrapper", ["process_observer_root_argv_mismatch"]],
  [
    "wrong.r9c.bound-evidence-input-closure-conflict",
    ["process_runtime_input_evidence_role_forbidden"],
  ],
  [
    "wrong.r10c.bound-verification-input-closure-conflict",
    ["process_runtime_input_verification_role_forbidden"],
  ],
  [
    "wrong.execution-target-source-drift",
    ["process_root_source_identity_mismatch"],
  ],
  [
    "wrong.execution-target-unbound-argv",
    ["process_root_production_binding_required"],
  ],
  ["wrong.r12.external-root-argv", ["process_root_argv_unsafe"]],
]);

const blackBoxFactCases = new Map([
  ["coverage-defined-by-rejected-attack-surface", allWrongBlackBoxCases],
  [
    "critical-sentinel-positive-negative-controls",
    [
      "wrong.r1.custom-oracle",
      "wrong.r3.historical-runtime",
      "wrong.r7b.cross-execution-priming",
      "wrong.r8.empty-observation",
      ...r9R10WrongLayerCases,
      "wrong.execution-target-source-drift",
      "wrong.execution-target-unbound-argv",
      "wrong.r12.external-root-argv",
      ...allControlBlackBoxCases,
    ],
  ],
  [
    "observation-channel-authority",
    [
      "wrong.r1.custom-oracle",
      "wrong.r2.runner-created-static",
      "wrong.r3.historical-runtime",
      "wrong.r4.browser-native-proxy",
      "wrong.r6.verifier-wrapper",
      ...r9R10WrongLayerCases,
      "wrong.execution-target-source-drift",
      "wrong.execution-target-unbound-argv",
      "wrong.r12.external-root-argv",
      ...allControlBlackBoxCases,
    ],
  ],
  [
    "expected-actual-comparison-verdict-ownership",
    [
      "wrong.r1.custom-oracle",
      "wrong.r3.historical-runtime",
      ...r9R10LayerCases,
      "control.process",
    ],
  ],
  [
    "bounded-admitted-artifact-contract",
    [
      "wrong.r1b.verification-input-static",
      "wrong.r2.runner-created-static",
      "wrong.r7.runner-modified-static",
      "wrong.r7b.cross-execution-priming",
      "control.static",
    ],
  ],
  [
    "actual-artifact-reextraction",
    [
      "wrong.r2.runner-created-static",
      "wrong.r7.runner-modified-static",
      "wrong.r7b.cross-execution-priming",
      "control.static",
    ],
  ],
  [
    "generated-carrier-semantic-role",
    [
      "wrong.r5.synthetic-status-binding",
      "wrong.r5b.evidence-role-static",
      "wrong.r5c.evidence-role-process",
      ...r9R10LayerCases,
      "control.static",
    ],
  ],
  [
    "expected-to-actual-self-proof-rejection",
    [
      "wrong.r1.custom-oracle",
      "wrong.r1b.verification-input-static",
      "control.process",
      "control.static",
    ],
  ],
  [
    "production-reachability",
    [
      "wrong.r5.synthetic-status-binding",
      "wrong.r5c.evidence-role-process",
      "wrong.r6.verifier-wrapper",
      "wrong.r6b.argv-wrapper",
      "wrong.r7c.process-input-mutation",
      ...r9R10LayerCases,
      "wrong.execution-target-source-drift",
      "wrong.execution-target-unbound-argv",
      "wrong.r12.external-root-argv",
      "control.process",
      "control.static",
    ],
  ],
  [
    "counterfactual-actual-change-and-impact-set",
    [
      "wrong.r5.synthetic-status-binding",
      "wrong.r5c.evidence-role-process",
      "wrong.r7c.process-input-mutation",
      "wrong.r8.empty-observation",
      ...r9R10LayerCases,
      "control.process",
    ],
  ],
  [
    "compatibility-security-resource-boundaries",
    [
      "wrong.r3.historical-runtime",
      "wrong.r4.browser-native-proxy",
      "wrong.r6.verifier-wrapper",
      "wrong.r7c.process-input-mutation",
      "wrong.execution-target-source-drift",
      "wrong.execution-target-unbound-argv",
      "wrong.r12.external-root-argv",
      "control.process",
      "control.external",
    ],
  ],
  [
    "critical-scope-escape-risk",
    ["wrong.r4.browser-native-proxy", "control.external"],
  ],
  [
    "critical-self-attestation-risk",
    [
      "wrong.r1.custom-oracle",
      "wrong.r3.historical-runtime",
      "wrong.r6.verifier-wrapper",
      ...r9R10LayerCases,
      "wrong.execution-target-source-drift",
      "wrong.execution-target-unbound-argv",
      "wrong.r12.external-root-argv",
      "control.process",
    ],
  ],
  ["attack-suite-ground-truth", allWrongBlackBoxCases],
  ["valid-control-suite", allControlBlackBoxCases],
  ["black-box-final-gate-lifecycle", allBlackBoxCases],
]);

const regressionFactRefs = new Set([
  "verification-sequence-and-current-candidate",
]);

const pendingIndependentProofFactRefs = new Set([
  "real-capability-closure-result",
  "final-hard-acceptance",
  "approved-final-capability-wording",
  "independent-capability-audit",
  "real-process-workload-roi",
]);

const documentationFactRefs = new Set([
  "material-input-provenance",
  "declared-assurance-theorem",
  "assurance-causal-chain",
  "p0-owner-local-and-v3-compatible",
  "purpose-validity-floor-before-relative-antidegradation",
  "invalid-baseline-and-claim-downgrade",
  "incident-counterexample-first-rule",
  "sentinel-rationale-evidence-bounded",
  "capability-claim-levels",
  "route-b-project-owner-decision",
  "challenge-is-freshness-only",
  "no-universal-ui-observer",
  "v3-v4-and-migration-rule",
  "fresh-agent-benchmark-boundary",
  "roi-admission-order",
  "early-real-entry-feedback",
  "no-new-lifecycle-authority-registry",
  "owner-dependency-lifecycle-boundary",
  "build-reuse-buy-allowed-set",
  "technical-debt-and-future-change",
  "context-and-public-authority-update",
  "critical-claim-inflation-risk",
]);

for (const fact of manifest.facts)
  classifyDeliveryFactAuthority(fact.provenance.authority_ref);

if (isMainModule()) await main();

async function main() {
  const outcomeKey = process.argv[2] ?? "p0-exact-recomputation";
  const globalConformance = process.argv[3] === "global-conformance";
  if (!manifest.scope.outcome_refs.includes(outcomeKey))
    throw new Error(`real_capability_outcome_unknown:${outcomeKey}`);
  if (outcomeKey === "proof-and-roi") await materializeFreshAgentEvidence();

  const commands = globalConformance
    ? await runGlobalConformanceCommands()
    : await runOutcomeCommands(outcomeKey);
  const facts = globalConformance
    ? manifest.facts.filter(
        (fact) => sourceKinds.get(fact.provenance.authority_ref) === "non_goal",
      )
    : manifest.facts.filter((fact) => fact.outcome_ref === outcomeKey);
  const factResults = [];
  for (const fact of facts)
    factResults.push(await evaluateFactResult({ fact, outcomeKey, commands }));

  console.log(
    JSON.stringify({
      schema_version: "long-task-real-capability-delivery-verifier-report-v2",
      outcome_key: globalConformance ? "global-conformance" : outcomeKey,
      capability_level: 3,
      independent_capability_audit: "blocking",
      fact_results: factResults,
      command_results: commands,
    }),
  );
}

async function runOutcomeCommands(outcome) {
  const build = {
    ...npmCommandSpec([
      "run",
      "build",
      "--workspace",
      "project-tiny-context-harness",
    ]),
    proof_domain: "regression",
  };
  const specs = {
    "p0-exact-recomputation": [
      build,
      nodeTest(
        "shared exact evaluator recomputes V1 and V2",
        "tests/ty-context/long-task-real-capability-closure.test.mjs",
      ),
      nodeTest(
        "package observer is joined to selected-design validation",
        "tests/ty-context/long-task-real-capability-closure.test.mjs",
      ),
      nodeTest(
        "mixed V1 and opt-in UI V2 targets preserve symbolic closure",
        "tests/ty-context/long-task-symbolic-denotation-v2.test.mjs",
      ),
    ],
    "assurance-governance": [
      build,
      blackBoxNodeTest(),
      nodeTest(null, "tests/ty-context/test-suite-runtime.test.mjs"),
    ],
    "observer-tcb-closure": [
      build,
      blackBoxNodeTest(),
      nodeTest(
        null,
        "tests/ty-context/long-task-real-capability-closure.test.mjs",
      ),
      nodeTest(
        "package-reextracted baseline and mutated actual",
        "tests/ty-context/long-task-counterfactual-integrity.test.mjs",
      ),
    ],
    "proof-and-roi": [
      build,
      blackBoxNodeTest(),
      nodeTest(
        null,
        "tests/ty-context/long-task-real-capability-replay.test.mjs",
      ),
      {
        command: process.execPath,
        args: ["tools/verify_long_task_real_capability_roi.mjs"],
        proof_domain: "roi",
      },
      {
        ...npmCommandSpec([
          "run",
          "test:trust",
          "--workspace",
          "project-tiny-context-harness",
        ]),
        proof_domain: "regression",
      },
      { ...npmCommandSpec(["test"]), proof_domain: "regression" },
      {
        command: process.execPath,
        args: ["packages/ty-context/dist/cli.js", "package", "check-source"],
        proof_domain: "regression",
      },
      {
        command: process.execPath,
        args: ["packages/ty-context/dist/cli.js", "validate-context"],
        proof_domain: "regression",
      },
    ],
  }[outcome];
  const results = [];
  for (const [index, spec] of specs.entries()) {
    const result = await runCommandSpec(spec);
    results.push(result);
    if (result.code !== 0) break;
    if (outcome === "proof-and-roi" && index === 0) {
      const gitCandidate = await materializePortableGitCandidate();
      results.push(gitCandidate);
      if (gitCandidate.code !== 0) break;
    }
  }
  return results;
}

async function materializePortableGitCandidate() {
  const existing = await run("git", ["rev-parse", "--is-inside-work-tree"]);
  if (existing.code === 0) return existing;

  const dependencyRoot = await realpath(
    path.join(repositoryRoot, "node_modules"),
  ).catch(() => "");
  const hostRoot = dependencyRoot ? path.dirname(dependencyRoot) : "";
  const hostHead = hostRoot
    ? await run("git", ["-C", hostRoot, "rev-parse", "HEAD"])
    : null;
  const hostCommonDirectory = hostRoot
    ? await run("git", [
        "-C",
        hostRoot,
        "rev-parse",
        "--path-format=absolute",
        "--git-common-dir",
      ])
    : null;
  if (hostHead?.code !== 0 || hostCommonDirectory?.code !== 0)
    return portableGitFailure("host-history-unavailable");

  const steps = [
    ["init", "--initial-branch=main"],
    ["config", "core.autocrlf", "false"],
    ["config", "core.filemode", "false"],
    ["config", "user.name", "Tiny Context verification"],
    ["config", "user.email", "verification@invalid.local"],
  ];
  for (const args of steps) {
    const result = await run("git", args);
    if (result.code !== 0)
      return { ...result, portable_git_step: args.join(" ") };
  }
  await writeFile(
    path.join(repositoryRoot, ".git", "objects", "info", "alternates"),
    `${path.join(hostCommonDirectory.stdout.trim(), "objects")}\n`,
    "utf8",
  );
  await appendFile(
    path.join(repositoryRoot, ".git", "info", "exclude"),
    "\n.work_products/**/.ty-context/\n",
    "utf8",
  );
  for (const args of [
    ["reset", "--mixed", hostHead.stdout.trim()],
    ["add", "--all", "--", "."],
    ["commit", "--no-gpg-sign", "-m", "verification snapshot"],
  ]) {
    const result = await run("git", args);
    if (result.code !== 0)
      return { ...result, portable_git_step: args.join(" ") };
  }
  const clean = await run("git", ["status", "--porcelain=v1"]);
  return {
    ...clean,
    code: clean.code === 0 && clean.stdout.trim() === "" ? 0 : 1,
    portable_git_step: "candidate-ready",
  };
}

function portableGitFailure(step) {
  return {
    command: "git",
    args: [],
    code: 1,
    signal: null,
    stdout: "",
    stderr: `portable_git_candidate:${step}`,
    portable_git_step: step,
  };
}

async function runGlobalConformanceCommands() {
  const specs = [
    {
      ...npmCommandSpec([
        "run",
        "build",
        "--workspace",
        "project-tiny-context-harness",
      ]),
      proof_domain: "regression",
    },
    {
      command: process.execPath,
      args: ["packages/ty-context/dist/cli.js", "package", "check-source"],
      proof_domain: "documentation_conformance",
    },
    {
      command: process.execPath,
      args: ["packages/ty-context/dist/cli.js", "validate-context"],
      proof_domain: "documentation_conformance",
    },
  ];
  const results = [];
  for (const spec of specs) {
    const result = await runCommandSpec(spec);
    results.push(result);
    if (result.code !== 0) break;
  }
  return results;
}

async function materializeFreshAgentEvidence() {
  const fixture = path.join(
    repositoryRoot,
    "tests",
    "ty-context",
    "fixtures",
    "long-task-real-capability-fresh-agent-paired.json",
  );
  const targetDirectory = path.join(
    repositoryRoot,
    ".artifacts",
    "long-task-real-capability",
  );
  await mkdir(targetDirectory, { recursive: true });
  await copyFile(
    fixture,
    path.join(targetDirectory, "fresh-agent-paired.json"),
  );
}

function nodeTest(pattern, file) {
  return {
    kind: "node_machine_report",
    file,
    pattern,
    proof_domain: "runtime_capability",
  };
}

function blackBoxNodeTest() {
  return {
    kind: "black_box_machine_report",
    file: "tests/ty-context/long-task-observer-trust-counterexamples.test.mjs",
    proof_domain: "runtime_capability",
  };
}

async function runCommandSpec(spec) {
  if (spec.kind === "node_machine_report")
    return runNodeMachineReport(spec, false);
  if (spec.kind === "black_box_machine_report")
    return runNodeMachineReport(spec, true);
  return {
    ...(await run(spec.command, spec.args)),
    proof_domain: spec.proof_domain ?? "regression",
  };
}

async function runNodeMachineReport(spec, blackBox) {
  const temporaryRoot = await mkdtemp(
    path.join(os.tmpdir(), "ty-context-real-capability-report-"),
  );
  const eventPath = path.join(temporaryRoot, "node-events.jsonl");
  const terminalPath = path.join(temporaryRoot, "workflow-terminals.json");
  const invocationId = randomBytes(16).toString("hex");
  const reporter = "./tests/ty-context/test-suite-file-reporter.mjs";
  try {
    const args = [
      "--test",
      "--test-concurrency=1",
      `--test-reporter=${reporter}`,
      `--test-reporter-destination=${eventPath}`,
      ...(spec.pattern ? [`--test-name-pattern=${spec.pattern}`] : []),
      spec.file,
    ];
    const env = blackBox
      ? {
          ...process.env,
          TY_CONTEXT_REAL_CAPABILITY_TERMINAL_REPORT: terminalPath,
          TY_CONTEXT_REAL_CAPABILITY_REPORT_INVOCATION: invocationId,
        }
      : process.env;
    const execution = await run(process.execPath, args, { env });
    let nodeReport = null;
    let terminalReport = null;
    let blackBoxProof = null;
    let reportError = null;
    try {
      nodeReport = parseNodeMachineReport(await readFile(eventPath, "utf8"), {
        file: spec.file,
      });
      if (blackBox) {
        terminalReport = JSON.parse(await readFile(terminalPath, "utf8"));
        blackBoxProof = validateBlackBoxMachineProof({
          invocationId,
          nodeReport,
          terminalReport,
        });
      }
    } catch (error) {
      reportError = error instanceof Error ? error.message : String(error);
    }
    return {
      ...execution,
      code: execution.code === 0 && reportError === null ? 0 : 1,
      proof_domain: spec.proof_domain,
      node_machine_report: nodeReport,
      black_box_terminal_report: terminalReport,
      black_box_proof: blackBoxProof,
      machine_report_error: reportError,
    };
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

export function parseNodeMachineReport(jsonl, { file = null } = {}) {
  const tests = [];
  for (const [index, line] of String(jsonl).split(/\r?\n/u).entries()) {
    if (!line.trim()) continue;
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      throw new Error(`real_capability_node_report_json_invalid:${index + 1}`);
    }
    if (event?.type !== "test:pass" && event?.type !== "test:fail") continue;
    const name = typeof event.data?.name === "string" ? event.data.name : "";
    if (!name) throw new Error("real_capability_node_report_test_name_missing");
    tests.push({
      name,
      status:
        event.data?.skip || event.data?.todo
          ? "skipped"
          : event.type === "test:pass"
            ? "passed"
            : "failed",
      line: Number.isInteger(event.data?.line) ? event.data.line : null,
      column: Number.isInteger(event.data?.column) ? event.data.column : null,
    });
  }
  if (!tests.length) throw new Error("real_capability_node_report_empty");
  return {
    schema_version: "long-task-real-capability-node-machine-report-v1",
    file,
    tests,
  };
}

export function validateBlackBoxMachineProof({
  invocationId,
  nodeReport,
  terminalReport,
}) {
  if (!/^[a-f0-9]{32}$/u.test(invocationId ?? ""))
    throw new Error("real_capability_black_box_invocation_invalid");
  if (
    !nodeReport ||
    nodeReport.schema_version !==
      "long-task-real-capability-node-machine-report-v1" ||
    nodeReport.file !==
      "tests/ty-context/long-task-observer-trust-counterexamples.test.mjs" ||
    !Array.isArray(nodeReport.tests)
  )
    throw new Error("real_capability_black_box_node_report_invalid");
  if (
    !terminalReport ||
    !sameKeys(terminalReport, ["schema_version", "invocation_id", "cases"]) ||
    terminalReport.schema_version !==
      "long-task-real-capability-black-box-terminal-report-v2" ||
    terminalReport.invocation_id !== invocationId ||
    !Array.isArray(terminalReport.cases)
  )
    throw new Error("real_capability_black_box_terminal_report_invalid");

  const policyByCase = new Map(
    DELIVERY_BLACK_BOX_CASE_POLICY.map((entry) => [entry.case_id, entry]),
  );
  const policyByTest = new Map(
    DELIVERY_BLACK_BOX_CASE_POLICY.map((entry) => [entry.test_id, entry]),
  );
  const caseById = uniqueMap(
    terminalReport.cases,
    (entry) => entry?.case_id,
    "real_capability_black_box_case",
  );
  assertExactSet(
    caseById.keys(),
    policyByCase.keys(),
    "real_capability_black_box_case_set_mismatch",
  );

  const nodeTests = [];
  for (const test of nodeReport?.tests ?? []) {
    const matches = [
      ...String(test.name).matchAll(
        /\[real-capability:([a-z0-9]+(?:[.-][a-z0-9]+)*)\]/gu,
      ),
    ];
    if (matches.length > 1)
      throw new Error("real_capability_black_box_node_test_id_ambiguous");
    if (matches.length === 1)
      nodeTests.push({ ...test, test_id: matches[0][1] });
  }
  const nodeByTest = uniqueMap(
    nodeTests,
    (entry) => entry.test_id,
    "real_capability_black_box_node_test",
  );
  assertExactSet(
    nodeByTest.keys(),
    policyByTest.keys(),
    "real_capability_black_box_node_test_set_mismatch",
  );

  for (const policy of DELIVERY_BLACK_BOX_CASE_POLICY) {
    const record = caseById.get(policy.case_id);
    const nodeTestRecord = nodeByTest.get(policy.test_id);
    if (nodeTestRecord.status !== "passed")
      throw new Error(
        `real_capability_black_box_node_test_not_passed:${policy.test_id}:${nodeTestRecord.status}`,
      );
    if (
      !sameKeys(record, [
        "case_id",
        "test_id",
        "candidate_role",
        "control_case_id",
        "expected_relation",
        "terminal",
        "compile_attack",
        "final_gate",
      ]) ||
      record.test_id !== policy.test_id ||
      record.candidate_role !== policy.candidate_role ||
      record.control_case_id !== policy.control_case_id ||
      canonicalJson(record.expected_relation) !==
        canonicalJson(policy.expected_relation) ||
      !sameKeys(record.terminal, [
        "stage",
        "workflow_status",
        "result_status",
      ]) ||
      record.terminal.stage !== "final-gate" ||
      typeof record.terminal.workflow_status !== "string" ||
      record.terminal.workflow_status.length === 0 ||
      !(
        typeof record.terminal.result_status === "string" ||
        record.terminal.result_status === null
      ) ||
      !validFinalGateProof(record.final_gate)
    )
      throw new Error(
        `real_capability_black_box_case_record_invalid:${policy.case_id}`,
      );
    validateCaseProof(policy.case_id, record);
    assertExpectedTerminal(policy, record.terminal.workflow_status);
  }

  for (const policy of DELIVERY_BLACK_BOX_CASE_POLICY.filter(
    (entry) => entry.candidate_role === "wrong",
  )) {
    const control = caseById.get(policy.control_case_id);
    if (!control || !["control", "external"].includes(control.candidate_role))
      throw new Error(
        `real_capability_black_box_control_missing:${policy.case_id}:${policy.control_case_id}`,
      );
    assertExpectedTerminal(
      policyByCase.get(policy.control_case_id),
      control.terminal.workflow_status,
    );
  }

  return {
    schema_version: "long-task-real-capability-black-box-proof-v2",
    invocation_id: invocationId,
    cases: DELIVERY_BLACK_BOX_CASE_POLICY.map((policy) => ({
      case_id: policy.case_id,
      test_id: policy.test_id,
      candidate_role: policy.candidate_role,
      control_case_id: policy.control_case_id,
      terminal: { ...caseById.get(policy.case_id).terminal },
    })),
  };
}

function validFinalGateProof(proof) {
  if (
    !proof ||
    !sameKeys(proof, [
      "invoked",
      "command",
      "workdir_sha256",
      "command_identity",
      "authority_basis",
      "authority_compiled_identity",
      "authority_candidate_identity",
      "candidate",
      "diagnostic",
    ]) ||
    proof.invoked !== true ||
    proof.command !== "long-task final-gate" ||
    !sha256(proof.workdir_sha256) ||
    !sha256(proof.command_identity) ||
    !["current_candidate", "legal_neighbor"].includes(proof.authority_basis) ||
    !sha256(proof.authority_compiled_identity) ||
    !sha256(proof.authority_candidate_identity) ||
    !validCommittedCandidate(proof.candidate) ||
    typeof proof.diagnostic !== "string" ||
    proof.diagnostic.length === 0 ||
    /active_task_missing|dirty_candidate/u.test(proof.diagnostic)
  )
    return false;
  const expectedCommandIdentity = sha256Text(
    JSON.stringify({
      command: proof.command,
      workdir_sha256: proof.workdir_sha256,
    }),
  );
  return proof.command_identity === expectedCommandIdentity;
}

function validateCaseProof(caseId, record) {
  const required = compileBoundaryOwnerDiagnostics.get(caseId);
  if (!required) {
    if (record.compile_attack !== null)
      throw new Error(
        `real_capability_black_box_owner_compile_unexpected:${caseId}`,
      );
    if (
      record.final_gate.authority_basis !== "current_candidate" ||
      record.final_gate.authority_candidate_identity !==
        record.final_gate.candidate.identity
    )
      throw new Error(
        `real_capability_black_box_current_authority_invalid:${caseId}`,
      );
    return;
  }
  if (!validCompileAttackProof(record.compile_attack))
    throw new Error(
      `real_capability_black_box_compile_candidate_invalid:${caseId}`,
    );
  if (
    typeof record.compile_attack.owner_diagnostic !== "string" ||
    !required.every((token) =>
      record.compile_attack.owner_diagnostic.includes(token),
    )
  )
    throw new Error(
      `real_capability_black_box_owner_compile_diagnostic_invalid:${caseId}`,
    );
  if (
    canonicalJson(record.compile_attack.candidate) !==
    canonicalJson(record.final_gate.candidate)
  )
    throw new Error(
      `real_capability_black_box_compile_final_candidate_invalid:${caseId}`,
    );
  if (
    record.final_gate.authority_basis !== "legal_neighbor" ||
    record.final_gate.authority_candidate_identity ===
      record.final_gate.candidate.identity
  )
    throw new Error(
      `real_capability_black_box_legal_neighbor_invalid:${caseId}`,
    );
  if (
    !record.final_gate.diagnostic.includes(
      "final_gate_protected_input_stale",
    ) ||
    required.some((token) => record.final_gate.diagnostic.includes(token))
  )
    throw new Error(
      `real_capability_black_box_final_gate_freshness_invalid:${caseId}`,
    );
}

function validCompileAttackProof(proof) {
  if (
    !proof ||
    !sameKeys(proof, [
      "invoked",
      "command",
      "workdir_sha256",
      "command_identity",
      "candidate",
      "owner_diagnostic",
    ]) ||
    proof.invoked !== true ||
    proof.command !== "long-task compile --revise" ||
    !sha256(proof.workdir_sha256) ||
    !sha256(proof.command_identity) ||
    !validCommittedCandidate(proof.candidate)
  )
    return false;
  return (
    proof.command_identity ===
    sha256Text(
      JSON.stringify({
        command: proof.command,
        workdir_sha256: proof.workdir_sha256,
      }),
    )
  );
}

function validCommittedCandidate(candidate) {
  if (
    !candidate ||
    !sameKeys(candidate, [
      "head",
      "tree",
      "contract_sha256",
      "clean",
      "identity",
    ]) ||
    !gitObjectIdentity(candidate.head) ||
    !gitObjectIdentity(candidate.tree) ||
    !sha256(candidate.contract_sha256) ||
    candidate.clean !== true ||
    !sha256(candidate.identity)
  )
    return false;
  return (
    candidate.identity ===
    sha256Text(
      JSON.stringify({
        head: candidate.head,
        tree: candidate.tree,
        contract_sha256: candidate.contract_sha256,
        clean: candidate.clean,
      }),
    )
  );
}

function sha256(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
}

function gitObjectIdentity(value) {
  return (
    typeof value === "string" && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(value)
  );
}

function sha256Text(value) {
  return createHash("sha256").update(value).digest("hex");
}

function wrongProofCase(caseId, testId, controlCaseId) {
  return Object.freeze({
    case_id: caseId,
    test_id: testId,
    candidate_role: "wrong",
    control_case_id: controlCaseId,
    expected_relation: Object.freeze({
      operator: "not_equals",
      value: "machine_accepted",
    }),
  });
}

function controlProofCase(caseId, testId, candidateRole, expectedStatus) {
  return Object.freeze({
    case_id: caseId,
    test_id: testId,
    candidate_role: candidateRole,
    control_case_id: null,
    expected_relation: Object.freeze({
      operator: "equals",
      value: expectedStatus,
    }),
  });
}

function assertExpectedTerminal(policy, workflowStatus) {
  const relation = policy.expected_relation;
  const matches =
    relation.operator === "equals"
      ? workflowStatus === relation.value
      : workflowStatus !== relation.value;
  if (!matches)
    throw new Error(
      `real_capability_black_box_terminal_relation_failed:${policy.case_id}:${workflowStatus ?? "null"}:${relation.operator}:${relation.value}`,
    );
}

function uniqueMap(values, keyOf, diagnostic) {
  const result = new Map();
  for (const value of values) {
    const key = keyOf(value);
    if (typeof key !== "string" || !key)
      throw new Error(`${diagnostic}_id_invalid`);
    if (result.has(key)) throw new Error(`${diagnostic}_duplicate:${key}`);
    result.set(key, value);
  }
  return result;
}

function assertExactSet(actual, expected, diagnostic) {
  const actualValues = [...actual].sort();
  const expectedValues = [...expected].sort();
  if (canonicalJson(actualValues) !== canonicalJson(expectedValues))
    throw new Error(
      `${diagnostic}:expected=${expectedValues.join(",")}:actual=${actualValues.join(",")}`,
    );
}

function sameKeys(value, expected) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  return canonicalJson(actual) === canonicalJson([...expected].sort());
}

export async function evaluateFactResult({ fact, outcomeKey, commands }) {
  const authorityRef = fact?.provenance?.authority_ref;
  const base = {
    fact_ref: fact?.key ?? null,
    authority_ref: authorityRef ?? null,
    source_kind: sourceKinds.get(authorityRef) ?? null,
    expected: fact?.expected?.value ?? null,
  };
  if (fact?.expected?.value !== true)
    return failedFact(base, "real_capability_fact_expected_value_unsupported");

  const proofRoute = classifyDeliveryFactAuthority(authorityRef);
  if (proofRoute === "node_machine_report") {
    const requiredTests = nodeMachineFactTests.get(authorityRef);
    const proof = nodeMachineProof(commands, requiredTests);
    return observedFact(base, proof.ok, {
      proof_kind: "fixed_id_node_machine_report",
      evidence: {
        required_test_ids: [...requiredTests],
        observed_tests: proof.observed,
      },
      diagnostic: proof.diagnostic,
    });
  }
  if (proofRoute === "black_box_terminal_pairs") {
    const requiredCases = blackBoxFactCases.get(authorityRef);
    const proof = blackBoxFactProof(commands, requiredCases);
    return observedFact(base, proof.ok, {
      proof_kind: "black_box_terminal_pairs",
      evidence: {
        required_case_ids: [...requiredCases],
        observed_cases: proof.observed,
      },
      diagnostic: proof.diagnostic,
    });
  }
  if (proofRoute === "documentation_conformance") {
    const passed = await documentationConformance(authorityRef);
    return observedFact(base, passed, {
      proof_kind: "documentation_conformance",
      evidence: {
        source_path: sourcePath,
        static_probes: documentationProbes(authorityRef),
      },
      diagnostic: passed ? null : "documentation_conformance_failed",
      proof_limit:
        "Static checks establish declared rule and owner-document consistency only; they do not establish runtime capability.",
    });
  }
  if (proofRoute === "current_candidate_regression") {
    const proof = currentCandidateRegressionProof(commands, outcomeKey);
    return observedFact(base, proof.ok, {
      proof_kind: "current_candidate_regression",
      evidence: proof.evidence,
      diagnostic: proof.diagnostic,
      proof_limit:
        "Regression command success is not used as runtime-capability evidence; runtime facts use fixed test identities and black-box terminal pairs.",
    });
  }
  if (proofRoute === "blocking_independent_confirmation")
    return {
      ...base,
      actual: false,
      status: "external_confirmation_required",
      proof_kind: "blocking_independent_confirmation",
      diagnostic:
        "independent_capability_audit_and_real_process_workload_roi_required",
      evidence: {
        capability_level: 3,
        independent_capability_audit: "blocking",
      },
    };
  return failedFact(base, "real_capability_fact_proof_route_unreachable");
}

export function classifyDeliveryFactAuthority(authorityRef) {
  const routes = [
    nodeMachineFactTests.has(authorityRef) && "node_machine_report",
    blackBoxFactCases.has(authorityRef) && "black_box_terminal_pairs",
    documentationFactRefs.has(authorityRef) && "documentation_conformance",
    regressionFactRefs.has(authorityRef) && "current_candidate_regression",
    pendingIndependentProofFactRefs.has(authorityRef) &&
      "blocking_independent_confirmation",
  ].filter(Boolean);
  if (routes.length !== 1)
    throw new Error(
      routes.length === 0
        ? `real_capability_fact_proof_route_missing:${authorityRef ?? "null"}`
        : `real_capability_fact_proof_route_ambiguous:${authorityRef}:${routes.join(",")}`,
    );
  return routes[0];
}

function nodeMachineProof(commands, requiredTests) {
  const observed = [];
  for (const requiredName of requiredTests) {
    const matches = commands.flatMap((command, commandIndex) =>
      (command.node_machine_report?.tests ?? [])
        .filter((test) => test.name === requiredName)
        .map((test) => ({
          command_index: commandIndex,
          command_code: command.code,
          name: test.name,
          status: test.status,
          machine_report_error: command.machine_report_error ?? null,
        })),
    );
    observed.push(...matches);
    if (
      matches.length !== 1 ||
      matches[0].command_code !== 0 ||
      matches[0].status !== "passed" ||
      matches[0].machine_report_error !== null
    )
      return {
        ok: false,
        observed,
        diagnostic: `fixed_node_test_not_proven:${requiredName}`,
      };
  }
  return { ok: true, observed, diagnostic: null };
}

function blackBoxFactProof(commands, requiredCases) {
  const candidates = commands.filter(
    (command) =>
      command.black_box_proof !== null && command.black_box_proof !== undefined,
  );
  if (candidates.length !== 1 || candidates[0].code !== 0)
    return {
      ok: false,
      observed: [],
      diagnostic: "black_box_current_invocation_proof_missing_or_ambiguous",
    };
  const proof = candidates[0].black_box_proof;
  const byId = new Map(proof.cases.map((entry) => [entry.case_id, entry]));
  const observed = requiredCases.map((caseId) => byId.get(caseId) ?? null);
  if (observed.some((entry) => entry === null))
    return {
      ok: false,
      observed,
      diagnostic: "black_box_required_terminal_pair_missing",
    };
  return { ok: true, observed, diagnostic: null };
}

function currentCandidateRegressionProof(commands, outcomeKey) {
  const safetyCommands = commands.filter(
    (command) => command.proof_domain !== "roi",
  );
  const proofDomains = new Set(
    safetyCommands.map((command) => command.proof_domain),
  );
  const hasCurrentRuntimeProof = safetyCommands.some(
    (command) =>
      command.code === 0 &&
      (command.black_box_proof || command.node_machine_report),
  );
  const ok =
    outcomeKey === "proof-and-roi" &&
    safetyCommands.length >= 7 &&
    safetyCommands.every((command) => command.code === 0) &&
    proofDomains.has("regression") &&
    proofDomains.has("runtime_capability") &&
    hasCurrentRuntimeProof;
  return {
    ok,
    diagnostic: ok
      ? null
      : "current_candidate_verification_sequence_incomplete",
    evidence: {
      outcome_key: outcomeKey,
      roi_commands_excluded_from_safety_verdict: commands.filter(
        (command) => command.proof_domain === "roi",
      ).length,
      safety_command_count: safetyCommands.length,
      proof_domains: [...proofDomains].sort(),
      command_codes: safetyCommands.map((command) => command.code),
    },
  };
}

function observedFact(base, passed, detail) {
  return {
    ...base,
    actual: passed,
    status: passed ? "passed" : "failed",
    ...detail,
  };
}

function failedFact(base, diagnostic) {
  return {
    ...base,
    actual: false,
    status: "failed",
    proof_kind: "none",
    diagnostic,
    evidence: null,
  };
}

async function documentationConformance(authorityRef) {
  if (!source.includes(`key=${authorityRef} `)) return false;
  return containsAll(documentationProbes(authorityRef));
}

function documentationProbes(authorityRef) {
  return (
    {
      "material-input-provenance": [
        [
          "docs/long-task-real-capability-closure.md",
          "material-input-provenance",
        ],
      ],
      "purpose-validity-floor-before-relative-antidegradation": [
        ["PROJECT_SPEC.md", "declared-purpose validity floor"],
      ],
      "incident-counterexample-first-rule": [
        [
          "project_context/areas/harness-package/verification.md",
          "counterexample",
        ],
      ],
      "sentinel-rationale-evidence-bounded": [
        ["tools/test_suite_policy.mjs", "does not prove"],
      ],
      "capability-claim-levels": [
        [
          "PROJECT_SPEC.md",
          "Formal capability reporting has four evidence-bounded levels",
        ],
        ["PROJECT_SPEC.md", "no open critical counterexample"],
      ],
      "route-b-project-owner-decision": [
        [
          "project_context/areas/harness-package/decision-rationale/long-task-workflow.md",
          "ordinary model-authored verifier mistakes",
        ],
      ],
      "challenge-is-freshness-only": [
        [
          "project_context/areas/harness-package/decision-rationale/long-task-workflow.md",
          "freshness",
        ],
      ],
      "no-universal-ui-observer": [
        ["PROJECT_SPEC.md", "External Confirmation"],
      ],
      "v3-v4-and-migration-rule": [
        ["PROJECT_SPEC.md", "long-task-check-result-v3"],
      ],
      "fresh-agent-benchmark-boundary": [
        ["tools/verify_long_task_real_capability_roi.mjs", "fresh-agent"],
      ],
      "roi-admission-order": [
        ["tools/verify_long_task_real_capability_roi.mjs", "validity_floor"],
      ],
      "context-and-public-authority-update": [
        [
          "project_context/areas/harness-package/implementation-index.md",
          "observer",
        ],
        ["README.md", "External Confirmation"],
        ["README.zh-CN.md", "External Confirmation"],
      ],
    }[authorityRef] ?? []
  );
}

async function containsAll(probes) {
  for (const [file, token] of probes)
    if (!(await readText(file)).includes(token)) return false;
  return true;
}

async function readText(relative) {
  return readFile(
    path.join(repositoryRoot, ...relative.split("/")),
    "utf8",
  ).catch(() => "");
}

function loadManifest(value) {
  const match = value.match(
    /```yaml semantic-fact-manifest-v1\r?\n([\s\S]*?)\r?\n```/u,
  );
  if (!match) throw new Error("real_capability_semantic_manifest_missing");
  return JSON.parse(match[1]);
}

function loadSourceKinds(value) {
  const result = new Map();
  const pattern = /<!--\s*ty-source-item:start\s+([^>]+?)\s*-->/gu;
  for (const match of value.matchAll(pattern)) {
    const key = /(?:^|\s)key=([^\s]+)/u.exec(match[1])?.[1];
    const kind = /(?:^|\s)kind=([^\s]+)/u.exec(match[1])?.[1];
    if (key && kind) result.set(key, kind);
  }
  return result;
}

function run(command, args, { env = process.env } = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: repositoryRoot,
      env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      shell: false,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on(
      "data",
      (chunk) => (stdout = tail(stdout + chunk.toString())),
    );
    child.stderr.on(
      "data",
      (chunk) => (stderr = tail(stderr + chunk.toString())),
    );
    child.on("error", (error) =>
      resolve({
        command,
        args,
        code: null,
        error: error.message,
        stdout,
        stderr,
      }),
    );
    child.on("exit", (code, signal) =>
      resolve({ command, args, code, signal, stdout, stderr }),
    );
  });
}

function tail(value) {
  return value.length > 524_288 ? value.slice(-524_288) : value;
}

function canonicalJson(value) {
  return JSON.stringify(sortCanonical(value));
}

function sortCanonical(value) {
  if (Array.isArray(value)) return value.map(sortCanonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortCanonical(value[key])]),
    );
  return value;
}

function isMainModule() {
  if (!process.argv[1]) return false;
  return (
    path.resolve(process.argv[1]) ===
    path.resolve(fileURLToPath(import.meta.url))
  );
}
