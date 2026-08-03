import { spawn } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { npmCommandSpec } from "./npm_command_spec.mjs";
import {
  symbolicDeliveryGroups,
  symbolicDeliveryItems,
  symbolicDeliveryObservation,
  symbolicFactObservationRefs,
  symbolicPolicyMarkers,
  symbolicSemanticAssertionKeys,
} from "./symbolic_denotation_efficiency_delivery_catalog.mjs";
import { emitSemanticDeliveryResult } from "./semantic_fact_delivery_evidence.mjs";
import { resolveSemanticFactResults } from "./semantic_fact_delivery_verifier_support.mjs";
import { parseSemanticFactManifestBlocks } from "../packages/ty-context/dist/lib/semantic-fact-source-parser.js";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const mode = process.argv[2] ?? "--semantic";
const targetRef = "harness-package-runtime";
const rootEntrypoint =
  "tools/verify_symbolic_denotation_efficiency_delivery.mjs";
const policyPath =
  "packages/ty-context/src/lib/design-resource-symbolic-fact-policy.ts";
const sourcePath = "docs/symbolic-denotation-efficiency.md";

if (mode === "--semantic") await semanticVerification();
else if (mode === "--api-contract") await apiContractVerification();
else if (mode === "--complete") await completeVerification();
else throw new Error(`unsupported verification mode: ${mode}`);

async function semanticVerification() {
  const policy = await readText(policyPath);
  const markerState = {
    delivery: policy.includes(symbolicPolicyMarkers.delivery),
    relations: policy.includes(symbolicPolicyMarkers.relations),
    shortcuts: policy.includes(symbolicPolicyMarkers.shortcuts),
    nonCompletion: policy.includes(symbolicPolicyMarkers.nonCompletion),
  };
  const buildSpec = npmCommandSpec([
    "run",
    "build",
    "--workspace",
    "project-tiny-context-harness",
  ]);
  const build = await run(buildSpec.command, buildSpec.args);
  const uniqueTests = [
    ...new Set(
      Object.values(symbolicDeliveryGroups).flatMap((group) => group.tests),
    ),
  ];
  const testResults = new Map();
  for (const testPath of uniqueTests) {
    const exists = await pathExists(testPath);
    testResults.set(
      testPath,
      build.code === 0 && exists
        ? await run(process.execPath, ["--test", testPath])
        : {
            command: process.execPath,
            args: ["--test", testPath],
            code: null,
            skipped: true,
            reason: exists ? "build_failed" : "test_missing",
          },
    );
  }
  const groupPass = Object.fromEntries(
    Object.entries(symbolicDeliveryGroups)
      .filter(([group]) => group !== "outcome")
      .map(([group, definition]) => [
        group,
        markerState.delivery &&
          build.code === 0 &&
          definition.tests.every(
            (testPath) => testResults.get(testPath)?.code === 0,
          ),
      ]),
  );
  groupPass.outcome =
    markerState.delivery &&
    Object.values(groupPass).every((passed) => passed === true);

  const observations = {};
  for (const item of symbolicDeliveryItems) {
    let passed = groupPass[item.group] === true;
    if (item.kind === "forbidden_shortcut")
      passed = passed && markerState.shortcuts;
    if (item.kind === "non_completing")
      passed = passed && markerState.nonCompletion;
    observations[`fact_${symbolicDeliveryObservation(item.key)}`] = passed;
    if (item.kind === "outcome_result") observations.result = passed;
    else if (item.kind === "non_completing")
      observations.inventory_completes_delivery = !passed;
    else if (item.kind === "forbidden_shortcut")
      observations[`${symbolicDeliveryObservation(item.key)}_used`] = !passed;
    else if (item.kind !== "risk_fact" && !item.complete)
      observations[symbolicDeliveryObservation(item.key)] = passed;
  }
  observations.control_relations_applicable = !markerState.relations;
  observations.target_live = true;
  observations.command_results = [build, ...testResults.values()];
  observations.group_results = groupPass;
  observations.policy_markers = markerState;

  const semanticSource = await loadSemanticManifest();
  const semanticManifest = semanticSource.manifest;
  const semanticFactResults = resolveSemanticFactResults(
    semanticManifest,
    symbolicFactObservationRefs,
    observations,
  );
  for (const fact of semanticManifest.facts)
    observations[
      `semantic_fact_${symbolicDeliveryObservation(fact.provenance.authority_ref)}`
    ] = semanticFactResults.get(fact.key);

  await emitSemanticDeliveryResult({
    repositoryRoot,
    targetRef,
    rootEntrypoint,
    observations,
    assertionKeys: symbolicSemanticAssertionKeys,
    kind: "symbolic-denotation-efficiency",
    semanticManifest,
    semanticFactResults,
    semanticManifestSha256: semanticSource.sha256,
    semanticFactRevisions:
      semanticSource.carrier === "compact_v1"
        ? new Map(
            semanticSource.fact_revisions.map((item) => [
              item.key,
              item.revision_digest,
            ]),
          )
        : null,
    semanticObligationRevisions:
      semanticSource.carrier === "compact_v1"
        ? new Map(
            semanticSource.obligation_revisions.map((item) => [
              item.key,
              item.revision_digest,
            ]),
          )
        : null,
  });
}

async function apiContractVerification() {
  const policy = await readText(policyPath);
  const requiredTests = [
    "tests/ty-context/symbolic-denotation-equivalence.test.mjs",
    "tests/ty-context/long-task-symbolic-denotation-v2.test.mjs",
  ];
  const buildSpec = npmCommandSpec([
    "run",
    "build",
    "--workspace",
    "project-tiny-context-harness",
  ]);
  const build = await run(buildSpec.command, buildSpec.args);
  const results = [build];
  for (const testPath of requiredTests)
    results.push(
      build.code === 0 && (await pathExists(testPath))
        ? await run(process.execPath, ["--test", testPath])
        : {
            command: process.execPath,
            args: ["--test", testPath],
            code: null,
            skipped: true,
          },
    );
  const passed =
    policy.includes(symbolicPolicyMarkers.delivery) &&
    results.every((result) => result.code === 0);
  await emitSemanticDeliveryResult({
    repositoryRoot,
    targetRef,
    rootEntrypoint,
    observations: {
      api_contract_parity: passed,
      target_live: true,
      command_results: results,
    },
    assertionKeys: ["api-contract-parity", "api-contract-liveness"],
    kind: "symbolic-denotation-efficiency-api-contract",
  });
}

async function completeVerification() {
  const policy = await readText(policyPath);
  if (!policy.includes(symbolicPolicyMarkers.delivery)) {
    await emitSemanticDeliveryResult({
      repositoryRoot,
      targetRef,
      rootEntrypoint,
      observations: {
        package_antidegradation_and_parity_ac: false,
        target_live: true,
        command_results: [],
      },
      assertionKeys: [
        "package-antidegradation-and-parity-ac",
        "complete-liveness",
      ],
      kind: "symbolic-denotation-efficiency-complete",
    });
    return;
  }
  const commands = [
    npmCommandSpec(["test"]),
    {
      command: process.execPath,
      args: ["packages/ty-context/dist/cli.js", "package", "check-source"],
    },
    {
      command: process.execPath,
      args: ["packages/ty-context/dist/cli.js", "validate-context"],
    },
    {
      command: process.execPath,
      args: ["packages/ty-context/dist/cli.js", "validate-harness"],
    },
  ];
  const results = [];
  for (const { command, args } of commands)
    results.push(await run(command, args));
  const passed = results.every((result) => result.code === 0);
  await emitSemanticDeliveryResult({
    repositoryRoot,
    targetRef,
    rootEntrypoint,
    observations: {
      package_antidegradation_and_parity_ac: passed,
      target_live: true,
      command_results: results,
    },
    assertionKeys: [
      "package-antidegradation-and-parity-ac",
      "complete-liveness",
    ],
    kind: "symbolic-denotation-efficiency-complete",
  });
}

async function loadSemanticManifest() {
  const source = await readText(sourcePath);
  const rows = parseSemanticFactManifestBlocks(sourcePath, source);
  if (rows.length !== 1)
    throw new Error(`symbolic_semantic_manifest_count:${rows.length}`);
  return rows[0];
}

async function readText(relativePath) {
  return readFile(path.join(repositoryRoot, relativePath), "utf8").catch(
    () => "",
  );
}

async function pathExists(relativePath) {
  try {
    await access(path.join(repositoryRoot, relativePath));
    return true;
  } catch {
    return false;
  }
}

async function run(command, args) {
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
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      resolve({ command, args, code: null, error: error.message });
    });
    child.on("close", (code) => {
      resolve({ command, args, code, stdout, stderr });
    });
  });
}
