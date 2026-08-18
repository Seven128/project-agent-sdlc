import { inspectPackageSourceMappings } from "../packages/ty-context/dist/lib/package-source.js";
import {
  normalizeHostTrace,
  unavailableHostTrace,
} from "./normalized_host_trace.mjs";
import { verifyPackageBuildFingerprint } from "./package_build_fingerprint.mjs";
import {
  collectPackageArchive,
  collectStructuralOwner,
  collectTestSuiteShape,
} from "./self_hosting_cost_collectors.mjs";
import {
  collectDeclaredMinimumRoutes,
  collectDefaultInstall,
} from "./self_hosting_cost_install_collectors.mjs";
import {
  aggregateMetricIndex,
  collectDiagnosticBaseline,
  mappingBlastRadius,
  structuralView,
} from "./self_hosting_cost_metrics.mjs";
import { buildCostHotspots } from "./self_hosting_cost_hotspots.mjs";
import {
  stableMeasurementDigest,
  unavailableMeasurement,
} from "./self_hosting_cost_model.mjs";
import {
  candidateIncludesPath,
  collectExplicitComparison,
  collectRepositoryCandidate,
  gitText,
  isDirectInvocation,
  parseReportArguments,
  readRepositoryRegular,
  repository,
  writeRepositoryArtifact,
} from "./self_hosting_cost_repository.mjs";

export async function buildSelfHostingCostReport(options = {}) {
  const firstCandidate = await collectRepositoryCandidate();
  const fingerprint = await verifiedBuild();
  const fixedAutomatic = await collectDefaultInstall(repository);
  const declaredMinimum = await collectDeclaredMinimumRoutes(
    repository,
    fixedAutomatic.default_context,
  );
  await validateOptionalInputs(options);
  const [
    archive,
    testSuites,
    structuralRaw,
    sourceMappings,
    comparison,
    observedHost,
  ] = await Promise.all([
    collectPackageArchive(repository),
    collectTestSuiteShape(repository, options.timings ?? []),
    collectStructuralOwner(repository, options.structuralReport),
    inspectPackageSourceMappings(repository),
    collectExplicitComparison(options.baseRef),
    collectObservedHost(options.hostTrace, firstCandidate),
  ]);
  const maintenance = {
    source_mappings: sourceMappings,
    owner_projection_blast_radius: mappingBlastRadius(sourceMappings),
    package_archive: archive,
    test_suites: testSuites,
    structural_cost_owner: structuralView(structuralRaw),
    consumer_tarball_smoke: unavailableMeasurement("not_collected", {
      owner: "tools/release_tarball_smoke.mjs",
      execution: "not_run_by_this_report",
    }),
  };
  const costClasses = {
    fixed_automatic: fixedAutomatic,
    declared_minimum_routed: declaredMinimum,
    observed_host: observedHost,
    maintenance_distribution: maintenance,
  };
  const hotspots = buildCostHotspots(
    fixedAutomatic,
    declaredMinimum,
    observedHost,
    maintenance,
  );
  const metricIndex = aggregateMetricIndex(
    fixedAutomatic,
    declaredMinimum,
    maintenance,
  );
  const environment = {
    node_version: process.version,
    platform: process.platform,
    architecture: process.arch,
    npm_version: archive.npm_version,
    git_version: await gitText(["--version"]),
  };
  const diagnosticBaseline = await collectDiagnosticBaseline(
    metricIndex,
    environment,
  );
  const lastCandidate = await collectRepositoryCandidate();
  await verifiedBuild();
  if (
    stableMeasurementDigest(firstCandidate) !==
    stableMeasurementDigest(lastCandidate)
  ) {
    throw new Error("self_hosting_candidate_changed_during_collection");
  }
  const measurementDigest = stableMeasurementDigest({
    schema_version: "self-hosting-cost-measurement-v1",
    candidate: firstCandidate,
    environment,
    cost_classes: costClasses,
    metric_index: metricIndex,
  });
  return {
    schema_version: "self-hosting-cost-report-v1",
    purpose: "measurement_only_diagnostic",
    definitions: {
      same_unit_hotspots_only: true,
      declared_routes_are_not_observed_reads: true,
      nested_components_are_non_additive: true,
      wall_clock_and_toolchain_tarball_bytes_are_outside_the_stable_digest: true,
    },
    build_fingerprint: fingerprint,
    candidate: firstCandidate,
    comparison,
    environment,
    cost_classes: costClasses,
    hotspots,
    metric_index: metricIndex,
    measurement_digest: measurementDigest,
    diagnostic_baseline: diagnosticBaseline,
  };
}

async function collectObservedHost(tracePath, candidate) {
  if (!tracePath) return unavailableHostTrace("host_trace_not_supplied");
  const input = await readRepositoryRegular(tracePath, { optional: true });
  if (!input) return unavailableHostTrace("host_trace_missing");
  const normalized = normalizeHostTrace(input.bytes.toString("utf8"), {
    expectedHeadCommit: candidate.head_commit,
    expectedWorkingTreeDigest: candidate.working_tree.digest,
  });
  if (normalized.availability !== "available") {
    if (normalized.availability === "partial") {
      normalized.current_candidate_opened_file_bytes = unavailableMeasurement(
        "candidate_binding_not_provided_by_v1",
      );
    }
    return normalized;
  }
  const files = [];
  for (const entry of normalized.opened_files) {
    if (!(await candidateIncludesPath(entry.path))) {
      return {
        ...normalized,
        current_candidate_opened_file_bytes: unavailableMeasurement(
          "opened_file_not_candidate_bound",
          { path: entry.path },
        ),
      };
    }
    const opened = await readRepositoryRegular(entry.path, { optional: true });
    if (!opened) {
      return {
        ...normalized,
        current_candidate_opened_file_bytes: unavailableMeasurement(
          "opened_file_not_current_regular",
          { path: entry.path },
        ),
      };
    }
    files.push({ ...entry, bytes: opened.bytes.length });
  }
  if (normalized.provenance.availability !== "available") {
    return {
      ...normalized,
      current_candidate_opened_file_bytes: unavailableMeasurement(
        "host_trace_origin_not_independently_attested",
      ),
    };
  }
  return {
    ...normalized,
    current_candidate_opened_file_bytes: {
      availability: "available",
      source: "candidate_regular_file_size",
      value: {
        files,
        total_bytes: files.reduce((sum, file) => sum + file.bytes, 0),
      },
    },
  };
}

async function verifiedBuild() {
  const value = await verifyPackageBuildFingerprint({
    repositoryRoot: repository,
  });
  return {
    schema_version: value.schema_version,
    input_sha256: value.input_sha256,
    dist_sha256: value.dist_sha256,
  };
}

async function validateOptionalInputs(options) {
  for (const timing of options.timings ?? []) {
    await readRepositoryRegular(timing);
  }
  if (options.structuralReport) {
    await readRepositoryRegular(options.structuralReport, { optional: true });
  }
}

async function main() {
  const options = parseReportArguments(process.argv.slice(2));
  const report = await buildSelfHostingCostReport(options);
  await writeRepositoryArtifact(options.artifact, report);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

if (isDirectInvocation(import.meta.url)) await main();
