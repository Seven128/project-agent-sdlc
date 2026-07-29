import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { npmCommandSpec } from "./npm_command_spec.mjs";
import {
  groupFiles,
  loadSemanticManifest,
  semanticAssertionKeys,
  semanticFactObservationRefs,
  semanticRiskFiles,
  semanticRows,
} from "./semantic_fact_delivery_catalog.mjs";
import { emitSemanticDeliveryResult } from "./semantic_fact_delivery_evidence.mjs";
import { collectSemanticObservations } from "./semantic_fact_delivery_observations.mjs";
import { resolveSemanticFactResults } from "./semantic_fact_delivery_verifier_support.mjs";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const mode = process.argv[2] ?? "--semantic";
const targetRef = "harness-package-runtime";
const rootEntrypoint = "tools/verify_semantic_fact_completeness_delivery.mjs";
const policyFile = "packages/ty-context/src/lib/semantic-fact-policy.ts";
if (mode === "--semantic") await semanticVerification();
else if (mode === "--api-contract") await apiContractVerification();
else if (mode === "--complete") await completeVerification();
else throw new Error(`unsupported verification mode: ${mode}`);

async function semanticVerification() {
  const requiredFiles = [
    ...new Set([
      policyFile,
      "docs/non-ui-semantic-fact-completeness.md",
      ...Object.values(groupFiles).flat(),
      ...semanticRiskFiles,
    ]),
  ];
  const files = await readFiles(requiredFiles);
  const policy = files.get(policyFile) ?? "";
  const buildSpec = npmCommandSpec([
    "run",
    "build",
    "--workspace",
    "project-tiny-context-harness",
  ]);
  const build = await run(buildSpec.command, buildSpec.args);
  const focused =
    build.code === 0
      ? await run(process.execPath, [
          "--test",
          "tests/ty-context/long-task-semantic-fact-closure.test.mjs",
        ])
      : { command: process.execPath, args: [], code: null, skipped: true };
  const observations = collectSemanticObservations({
    policy,
    files,
    requiredFiles,
    semanticRows,
    groupFiles,
    buildCode: build.code,
    focusedCode: focused.code,
  });
  const semanticManifest = await loadSemanticManifest(repositoryRoot);
  const semanticFactResults = semanticManifest
    ? resolveSemanticFactResults(
        semanticManifest,
        semanticFactObservationRefs,
        observations,
      )
    : null;
  for (const fact of semanticManifest?.facts ?? [])
    observations[
      `semantic_fact_${fact.provenance.authority_ref.replaceAll("-", "_")}`
    ] = semanticFactResults.get(fact.key);
  observations.target_live = true;
  observations.command_results = [build, focused];
  await emitSemanticDeliveryResult({
    repositoryRoot,
    targetRef,
    rootEntrypoint,
    observations,
    assertionKeys: semanticAssertionKeys,
    kind: "semantic",
    semanticManifest,
    semanticFactResults,
  });
}

async function completeVerification() {
  const policy = await readFile(
    path.join(repositoryRoot, policyFile),
    "utf8",
  ).catch(() => "");
  if (!policy.includes("complete_non_ui_semantic_fact_delivery")) {
    await emitSemanticDeliveryResult({
      repositoryRoot,
      targetRef,
      rootEntrypoint,
      observations: {
        antidegradation_and_parity_ac: false,
        target_live: true,
        command_results: [],
      },
      assertionKeys: ["antidegradation-and-parity-ac", "complete-liveness"],
      kind: "complete",
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
      args: [
        "packages/ty-context/dist/cli.js",
        "check-modularity",
        "--touched",
        "--fail-on-warning",
      ],
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
      antidegradation_and_parity_ac: passed,
      target_live: true,
      command_results: results,
    },
    assertionKeys: ["antidegradation-and-parity-ac", "complete-liveness"],
    kind: "complete",
  });
}

async function apiContractVerification() {
  const requiredFiles = [
    "packages/ty-context/src/lib/semantic-fact-manifest-shape.ts",
    "packages/ty-context/src/lib/long-task-semantic-fact-closure.ts",
    "packages/ty-context/src/lib/long-task-semantic-fact-evidence.ts",
    "packages/ty-context/src/schemas/long-task-delivery-v2/long-task-delivery-v2.schema.json",
    "tests/ty-context/long-task-semantic-fact-closure.test.mjs",
  ];
  const files = await readFiles(requiredFiles);
  const apiContractParity =
    requiredFiles.every((file) => (files.get(file) ?? "").trim().length > 0) &&
    (
      files.get(
        "packages/ty-context/src/lib/long-task-semantic-fact-closure.ts",
      ) ?? ""
    ).includes("semantic_fact_contract_projection_enabled") &&
    (
      files.get(
        "packages/ty-context/src/schemas/long-task-delivery-v2/long-task-delivery-v2.schema.json",
      ) ?? ""
    ).includes("semantic_fact_manifest");
  await emitSemanticDeliveryResult({
    repositoryRoot,
    targetRef,
    rootEntrypoint,
    observations: {
      api_contract_parity: apiContractParity,
      target_live: true,
    },
    assertionKeys: ["api-contract-parity", "api-contract-liveness"],
    kind: "api-contract",
  });
}

async function readFiles(paths) {
  const result = new Map();
  for (const relative of paths) {
    const content = await readFile(
      path.join(repositoryRoot, relative),
      "utf8",
    ).catch(() => "");
    result.set(relative, content);
  }
  return result;
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
      stdout = tail(stdout + chunk.toString());
    });
    child.stderr.on("data", (chunk) => {
      stderr = tail(stderr + chunk.toString());
    });
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
    child.on("close", (code, signal) =>
      resolve({ command, args, code, signal, stdout, stderr }),
    );
  });
}

function tail(value) {
  return value.length <= 4000 ? value : value.slice(-4000);
}
