import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { REPO_ROOT } from "./admission-shared.mjs";

const PACKAGE_JSON = path.join(
  REPO_ROOT,
  "packages",
  "ty-context",
  "package.json",
);

export function observeDeterministicRuntimeEnvironment(options = {}) {
  const environment = options.environment ?? process.env;
  const nodeVersion = options.nodeVersion ?? process.version;
  const packageEngine =
    options.packageEngine ?? readPackageNodeEngine(options.packageJsonPath);
  const engine = evaluateNodeEngineConformance(nodeVersion, packageEngine);
  return {
    platform: options.platform ?? process.platform,
    arch: options.arch ?? process.arch,
    node_version: nodeVersion,
    node_major: engine.actual_major,
    runner: observedRunner(environment),
    observed: true,
    package_engine: packageEngine,
    node_engine_conformant: engine.conformant,
    engine_failure: engine.failure,
  };
}

export function evaluateNodeEngineConformance(nodeVersion, requirement) {
  const actual = /^v?(\d+)(?:\.\d+){0,2}$/u.exec(String(nodeVersion));
  const required = /^>=\s*(\d+)$/u.exec(String(requirement).trim());
  if (!actual)
    return {
      actual_major: null,
      required_major: required ? Number(required[1]) : null,
      conformant: false,
      failure: "node_version_unparseable",
    };
  if (!required)
    return {
      actual_major: Number(actual[1]),
      required_major: null,
      conformant: false,
      failure: "package_engine_unsupported",
    };
  const actualMajor = Number(actual[1]);
  const requiredMajor = Number(required[1]);
  return {
    actual_major: actualMajor,
    required_major: requiredMajor,
    conformant: actualMajor >= requiredMajor,
    failure:
      actualMajor >= requiredMajor ? null : "node_major_below_package_engine",
  };
}

function readPackageNodeEngine(packageJsonPath = PACKAGE_JSON) {
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  const requirement = packageJson.engines?.node;
  if (typeof requirement !== "string" || !requirement.trim())
    throw new Error("admission_runtime_package_engine_missing");
  return requirement.trim();
}

function observedRunner(environment) {
  if (environment.GITHUB_ACTIONS !== "true") return "local";
  return environment.RUNNER_ENVIRONMENT === "github-hosted"
    ? "github-hosted"
    : "github-actions";
}

function main() {
  const runtime = observeDeterministicRuntimeEnvironment();
  process.stdout.write(`${JSON.stringify(runtime)}\n`);
  if (!runtime.node_engine_conformant) process.exitCode = 1;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
)
  main();
