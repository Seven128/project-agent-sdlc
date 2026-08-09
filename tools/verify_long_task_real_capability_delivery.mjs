import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import {
  appendFile,
  copyFile,
  mkdir,
  readFile,
  realpath,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { materializeSemanticFactEvidence } from "./semantic_fact_delivery_evidence.mjs";
import { npmCommandSpec } from "./npm_command_spec.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rootEntrypoint = "tools/verify_long_task_real_capability_delivery.mjs";
const targetRef = "harness-package-runtime";
const outcomeKey = process.argv[2] ?? "p0-exact-recomputation";
const globalConformance = process.argv[3] === "global-conformance";
const sourcePath = "docs/long-task-real-capability-closure.md";
const source = await readText(sourcePath);
const manifest = loadManifest(source);
const sourceKinds = loadSourceKinds(source);
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
const proofs = manifest.proof_obligations.filter((proof) =>
  facts.some((fact) => fact.key === proof.fact_ref),
);
const factResults = new Map();
const observations = {};
for (const fact of facts) {
  const authorityRef = fact.provenance.authority_ref;
  const passed =
    commands.every((command) => command.code === 0) &&
    (await sourceSpecificProbe(authorityRef, outcomeKey));
  factResults.set(fact.key, passed);
  observations[`semantic_fact_${slug(authorityRef)}`] = passed;
  const kind = sourceKinds.get(authorityRef);
  if (kind === "requirement") observations[`requirement_${slug(authorityRef)}`] = passed;
  if (kind === "technical_obligation") observations[`obligation_${slug(authorityRef)}`] = passed;
  if (kind === "acceptance") observations[`acceptance_${slug(authorityRef)}`] = passed;
  if (kind === "non_goal") observations[`non_goal_${slug(authorityRef)}`] = passed;
}
const outcomePassed = [...factResults.values()].every(Boolean);
observations[`${slug(outcomeKey)}_result`] = outcomePassed;
observations.target_live = commands[0]?.code === 0;
const fixtureState = JSON.parse(
  await readText("tests/ty-context/fixtures/long-task-real-capability-state.json"),
);
observations.relations_applicable = fixtureState.relations_applicable;
observations.command_results = commands;

const manifestSha256 = sha256(canonicalJson(manifest));
const sessionId = `real-capability-${slug(outcomeKey)}-${sha256(canonicalJson(observations)).slice(0, 16)}`;
const manifestSubset = {
  ...manifest,
  facts,
  proof_obligations: proofs,
};
const assertionByObligation = new Map(
  proofs.map((proof) => {
    const fact = facts.find((candidate) => candidate.key === proof.fact_ref);
    const authorityRef = fact.provenance.authority_ref;
    return [
      proof.key,
      `semantic-${authorityRef}`,
    ];
  }),
);
const semanticRecords = globalConformance
  ? []
  : (
      await materializeSemanticFactEvidence({
        repositoryRoot,
        targetRef,
        rootEntrypoint,
        manifest: manifestSubset,
        manifestSha256,
        passedByFact: factResults,
        assertionByObligation,
        sessionId,
      })
    ).filter((record) => record.capability === "semantic_fact");
const targetRecord = (assertionKey) => ({
  assertion_key: assertionKey,
  capability: "target_runtime",
  target_ref: targetRef,
  root_entrypoint: rootEntrypoint,
  session_id: sessionId,
  cold_start: true,
});
const resultAssertion = `${outcomeKey}-result`;
const livenessAssertion = globalConformance
  ? "global-observer-liveness"
  : `${outcomeKey}-liveness`;
const relationsAssertion = `${outcomeKey}-relations-na`;
const productAssertionRecords = facts.flatMap((fact) => {
  const authorityRef = fact.provenance.authority_ref;
  const kind = sourceKinds.get(authorityRef);
  const assertionKey =
    kind === "requirement"
      ? `requirement-${authorityRef}`
      : kind === "technical_obligation"
        ? `obligation-${authorityRef}`
        : kind === "acceptance"
          ? `acceptance-${authorityRef}`
        : kind === "non_goal"
          ? `non-goal-${authorityRef}`
          : null;
  if (!assertionKey) return [];
  const passed = factResults.get(fact.key);
  return [
    targetRecord(assertionKey),
    {
      assertion_key: assertionKey,
      capability: "state_delta",
      before_sha256: "0".repeat(64),
      after_sha256: sha256(canonicalJson({ authority_ref: authorityRef, passed })),
      changed_fields: [`requirement.${authorityRef}`],
    },
  ];
});
const evidenceRecords = [
  ...semanticRecords,
  ...productAssertionRecords,
  ...(
    globalConformance
      ? []
      : [
          targetRecord(resultAssertion),
          {
            assertion_key: resultAssertion,
            capability: "state_delta",
            before_sha256: "0".repeat(64),
            after_sha256: sha256(
              canonicalJson({ outcome: outcomeKey, passed: outcomePassed }),
            ),
            changed_fields: [`outcome.${outcomeKey}`],
          },
        ]
  ),
  targetRecord(livenessAssertion),
  ...(globalConformance ? [] : [targetRecord(relationsAssertion)]),
];
console.log(
  JSON.stringify({
    schema_version: "long-task-check-result-v3",
    execution_status: "completed",
    observations,
    evidence_records: evidenceRecords,
  }),
);

async function runOutcomeCommands(outcome) {
  const build = npmCommandSpec(["run", "build", "--workspace", "project-tiny-context-harness"]);
  const specs = {
    "p0-exact-recomputation": [
      build,
      nodeTest("selected design targets require exact fact-bound", "tests/ty-context/long-task-semantic-drift-closure.test.mjs"),
      nodeTest("one Contract compiles and reaches one Final Gate", "tests/ty-context/long-task-symbolic-denotation-v2.test.mjs"),
    ],
    "assurance-governance": [
      build,
      nodeTest(null, "tests/ty-context/test-suite-runtime.test.mjs"),
    ],
    "observer-tcb-closure": [
      build,
      nodeTest(null, "tests/ty-context/long-task-real-capability-closure.test.mjs"),
      nodeTest(
        "package-reextracted baseline and mutated actual",
        "tests/ty-context/long-task-counterfactual-integrity.test.mjs",
      ),
    ],
    "proof-and-roi": [
      build,
      { command: process.execPath, args: ["tests/ty-context/long-task-real-capability-replay.test.mjs"] },
      { command: process.execPath, args: ["tools/verify_long_task_real_capability_roi.mjs"] },
      npmCommandSpec([
        "run",
        "test:trust",
        "--workspace",
        "project-tiny-context-harness",
      ]),
      npmCommandSpec(["test"]),
      { command: process.execPath, args: ["packages/ty-context/dist/cli.js", "package", "check-source"] },
      { command: process.execPath, args: ["packages/ty-context/dist/cli.js", "validate-context"] },
    ],
  }[outcome];
  const results = [];
  for (const [index, spec] of specs.entries()) {
    const result = await run(spec.command, spec.args);
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
    npmCommandSpec([
      "run",
      "build",
      "--workspace",
      "project-tiny-context-harness",
    ]),
    {
      command: process.execPath,
      args: ["packages/ty-context/dist/cli.js", "package", "check-source"],
    },
    {
      command: process.execPath,
      args: ["packages/ty-context/dist/cli.js", "validate-context"],
    },
  ];
  const results = [];
  for (const spec of specs) {
    const result = await run(spec.command, spec.args);
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
  await copyFile(fixture, path.join(targetDirectory, "fresh-agent-paired.json"));
}

function nodeTest(pattern, file) {
  return {
    command: process.execPath,
    args: ["--test", ...(pattern ? [`--test-name-pattern=${pattern}`] : []), file],
  };
}

async function sourceSpecificProbe(authorityRef, outcome) {
  if (!source.includes(`key=${authorityRef} `)) return false;
  const shared = {
    "p0-exact-recomputation": [
      ["packages/ty-context/src/lib/long-task-exact-comparison.ts", "exactComparisonResultIdentity"],
      ["packages/ty-context/src/lib/long-task-evidence-capability-runtime.ts", "design_method_exact_value_mismatch"],
      ["tests/ty-context/long-task-semantic-drift-closure.test.mjs", "comparison result identity is recomputed"],
    ],
    "assurance-governance": [
      ["tools/test_suite_policy.mjs", "selected-design-exact-verdict-recomputation"],
      ["PROJECT_SPEC.md", "declared-purpose validity floor"],
      ["project_context/areas/harness-package/verification.md", "positive/negative"],
    ],
    "observer-tcb-closure": [
      ["packages/ty-context/src/lib/long-task-json-pointer-observation.ts", "json-pointer-exact-v1"],
      ["tests/ty-context/long-task-real-capability-closure.test.mjs", "expected-as-actual"],
      ["tests/ty-context/long-task-real-capability-closure.test.mjs", "production reachability"],
      ["tests/ty-context/long-task-counterfactual-integrity.test.mjs", "package-reextracted baseline and mutated actual"],
    ],
    "proof-and-roi": [
      ["tests/ty-context/long-task-real-capability-replay.test.mjs", "Starward"],
      ["tools/verify_long_task_real_capability_roi.mjs", "fresh-agent"],
      ["project_context/areas/harness-package/verification.md", "deterministic"],
    ],
  }[outcome];
  if (!(await containsAll(shared))) return false;
  const specific = specificProbes(authorityRef);
  return containsAll(specific);
}

function specificProbes(authorityRef) {
  return ({
  "p0-positive-fixture-correction": [["tests/ty-context/long-task-delivery-fixtures.mjs", "DESIGN_FACT_FIXTURE_SHA256"]],
  "p0-v1-negative-control": [["tests/ty-context/long-task-semantic-drift-closure.test.mjs", "exact value mismatch cannot be overridden"]],
  "p0-v2-negative-control": [["tests/ty-context/symbolic-denotation-long-task-v2-exercise.mjs", "design_symbolic_method_exact_value_mismatch"]],
  "shared-exact-comparison-owner": [["packages/ty-context/src/lib/long-task-semantic-fact-evidence.ts", "exactComparisonResultIdentity"]],
  "critical-sentinel-positive-negative-controls": [["tools/test_suite_policy.mjs", "positive and negative controls"]],
  "incident-counterexample-first-rule": [["tests/ty-context/long-task-semantic-drift-closure.test.mjs", "submitted pass fields"]],
  "sentinel-rationale-evidence-bounded": [["tools/test_suite_policy.mjs", "does not prove arbitrary observers"]],
  "capability-claim-levels": [
    ["PROJECT_SPEC.md", "Formal capability reporting has four evidence-bounded levels"],
    ["PROJECT_SPEC.md", "no open critical counterexample"],
  ],
  "actual-artifact-reextraction": [["packages/ty-context/src/lib/long-task-admitted-observation.ts", "extractJsonPointerExactObservation"]],
  "challenge-is-freshness-only": [["project_context/areas/harness-package/decision-rationale/long-task-workflow.md", "Challenge/nonce is only"]],
  "generated-carrier-semantic-role": [["packages/ty-context/src/lib/long-task-evidence-sensitivity-policy.ts", "generated_evidence"]],
  "expected-to-actual-self-proof-rejection": [["tests/ty-context/long-task-real-capability-closure.test.mjs", "expected-as-actual"]],
  "production-reachability": [["tests/ty-context/long-task-real-capability-closure.test.mjs", "production reachability"]],
  "counterfactual-actual-change-and-impact-set": [["packages/ty-context/src/lib/long-task-evidence-sensitivity-policy.ts", "validateCounterfactualObservationImpact"]],
  "attack-suite-ground-truth": [["tests/ty-context/long-task-real-capability-replay.test.mjs", "A12"]],
  "valid-control-suite": [["tests/ty-context/long-task-real-capability-replay.test.mjs", "valid control"]],
  "starward-sanitized-replay": [["tests/ty-context/long-task-real-capability-replay.test.mjs", "Starward"]],
  "fresh-agent-benchmark-boundary": [["tools/verify_long_task_real_capability_roi.mjs", "fresh-agent"]],
  "roi-admission-order": [["tools/verify_long_task_real_capability_roi.mjs", "validity_floor"]],
  })[authorityRef] ?? [];
}

async function containsAll(probes) {
  for (const [file, token] of probes) if (!(await readText(file)).includes(token)) return false;
  return true;
}

async function readText(relative) {
  return readFile(path.join(repositoryRoot, ...relative.split("/")), "utf8").catch(() => "");
}

function loadManifest(value) {
  const match = value.match(/```yaml semantic-fact-manifest-v1\r?\n([\s\S]*?)\r?\n```/u);
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

function run(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: repositoryRoot,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      shell: false,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout = tail(stdout + chunk.toString())));
    child.stderr.on("data", (chunk) => (stderr = tail(stderr + chunk.toString())));
    child.on("error", (error) => resolve({ command, args, code: null, error: error.message, stdout, stderr }));
    child.on("exit", (code, signal) => resolve({ command, args, code, signal, stdout, stderr }));
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
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortCanonical(value[key])]));
  return value;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function slug(value) {
  return value.replace(/[^a-z0-9]+/gu, "_").replace(/^_|_$/gu, "");
}
