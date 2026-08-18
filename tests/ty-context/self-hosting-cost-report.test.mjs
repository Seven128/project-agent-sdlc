import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { collectDiagnosticBaseline } from "../../tools/self_hosting_cost_metrics.mjs";
import {
  collectExplicitComparison,
  writeRepositoryArtifact,
} from "../../tools/self_hosting_cost_repository.mjs";

const repository = fileURLToPath(new URL("../..", import.meta.url));
const artifact = ".artifacts/self-hosting-cost/integration-report.json";

test("self-hosting report is deterministic, provenance-bound, and measurement-only", async () => {
  try {
    await runReportCli(["--base-ref", "HEAD", "--artifact", artifact]);
    const first = await readJson(artifact);
    await runReportCli(["--base-ref", "HEAD", "--artifact", artifact]);
    const second = await readJson(artifact);

    assert.equal(first.schema_version, "self-hosting-cost-report-v1");
    assert.equal(first.purpose, "measurement_only_diagnostic");
    assert.equal(first.measurement_digest, second.measurement_digest);
    assert.deepEqual(first.candidate, second.candidate);
    assert.deepEqual(first.metric_index, second.metric_index);
    assert.deepEqual(first.hotspots, second.hotspots);
    assert.equal(first.comparison.availability, "available");
    assert.equal(first.comparison.value.requested_ref, "HEAD");
    assert.equal(first.comparison.value.includes_worktree, true);
    assert.equal(first.candidate.working_tree.clean, false);
    assert.match(first.candidate.working_tree.digest, /^[a-f0-9]{64}$/u);

    const classes = first.cost_classes;
    assert.deepEqual(Object.keys(classes), [
      "fixed_automatic",
      "declared_minimum_routed",
      "observed_host",
      "maintenance_distribution",
    ]);
    assert.equal(
      classes.fixed_automatic.injected_agents.canonical_source
        .additive_to_runtime_or_installed_total,
      false,
    );
    assert.equal(
      classes.fixed_automatic.default_workflow_prompt
        .additive_to_runtime_or_installed_total,
      false,
    );
    assert.equal(
      classes.fixed_automatic.default_context.additive_to_installed_total,
      false,
    );
    assert.equal(classes.declared_minimum_routed.status, "declared_not_observed");
    assert.ok(
      classes.declared_minimum_routed.reference_routes.every(
        (route) => route.status === "declared_not_observed",
      ),
    );
    assert.equal(
      classes.declared_minimum_routed.main_skill_route.status,
      "declared_not_observed",
    );
    assert.equal(classes.observed_host.availability, "unavailable");
    assert.equal(classes.observed_host.reason, "host_trace_not_supplied");

    const maintenance = classes.maintenance_distribution;
    assert.equal(maintenance.source_mappings.parity, true);
    assert.equal(maintenance.consumer_tarball_smoke.availability, "unavailable");
    assert.equal(maintenance.consumer_tarball_smoke.reason, "not_collected");
    assert.equal(maintenance.test_suites.timing.availability, "unavailable");
    assert.equal(
      maintenance.structural_cost_owner.current_report.availability,
      "unavailable",
    );
    assert.ok(maintenance.package_archive.file_count > 0);
    assert.equal(
      maintenance.package_archive.tarball_bytes
        .excluded_from_stable_measurement_digest,
      true,
    );
    assert.deepEqual(
      maintenance.package_archive.files.map((file) => file.path),
      maintenance.package_archive.files.map((file) => file.path).toSorted(),
    );

    assert.equal(first.diagnostic_baseline.availability, "available");
    assert.equal(first.diagnostic_baseline.value.environment_exact_match, true);
    assert.deepEqual(first.diagnostic_baseline.value.current_only, []);
    assert.deepEqual(first.diagnostic_baseline.value.baseline_only, []);
    assert.ok(
      first.diagnostic_baseline.value.deltas.every((entry) => entry.delta === 0),
    );
    const crossEnvironment = await collectDiagnosticBaseline(
      first.metric_index,
      { ...first.environment, platform: "different-platform" },
    );
    assert.equal(crossEnvironment.value.environment_exact_match, false);
    assert.equal(crossEnvironment.value.deltas.availability, "unavailable");
    assert.equal(
      crossEnvironment.value.deltas.reason,
      "diagnostic_baseline_environment_mismatch",
    );
    assert.equal(
      new Set(first.metric_index.map((entry) => `${entry.unit}\0${entry.key}`))
        .size,
      first.metric_index.length,
    );
    assert.ok(
      first.metric_index.every(
        (entry) =>
          !entry.key.includes("tests/ty-context/") &&
          !entry.key.endsWith(".mjs"),
      ),
    );
    assertSameUnitHotspots(first.hotspots);

    const serialized = JSON.stringify(first);
    assert.doesNotMatch(
      serialized,
      /"(?:verdict|threshold|budget|admission|deletion_recommendation)"\s*:/u,
    );
    assert.doesNotMatch(serialized, /[A-Za-z]:\\/u);
    await assertUnavailableComparisonBoundaries();
    await assert.rejects(
      writeRepositoryArtifact("outside-self-hosting-report.json", {}),
      /artifact_path_unsafe/u,
    );
  } finally {
    await rm(path.join(repository, artifact), { force: true });
  }
});

async function assertUnavailableComparisonBoundaries() {
  for (const comparison of [
    await collectExplicitComparison(),
    await collectExplicitComparison("../unsafe"),
    await collectExplicitComparison("refs/heads/definitely-absent-self-hosting"),
  ]) {
    assert.equal(comparison.availability, "unavailable");
    assert.ok(comparison.reason.startsWith("base_ref_"));
  }
}

function assertSameUnitHotspots(groups) {
  assert.deepEqual(
    groups.map((group) => group.unit),
    groups.map((group) => group.unit).toSorted(),
  );
  for (const group of groups) {
    assert.ok(group.hotspots.every((entry) => entry.unit === group.unit));
    for (let index = 1; index < group.hotspots.length; index += 1) {
      assert.ok(group.hotspots[index - 1].value >= group.hotspots[index].value);
    }
  }
}

async function readJson(relative) {
  return JSON.parse(await readFile(path.join(repository, relative), "utf8"));
}

async function runReportCli(args) {
  await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [path.join(repository, "tools", "self_hosting_cost_report.mjs"), ...args],
      {
        cwd: repository,
        stdio: ["ignore", "ignore", "pipe"],
        windowsHide: true,
      },
    );
    const errors = [];
    child.stderr.on("data", (chunk) => errors.push(chunk));
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) reject(new Error(`self_hosting_report_signal:${signal}`));
      else if (code === 0) resolve();
      else {
        reject(
          new Error(
            Buffer.concat(errors).toString("utf8") ||
              `self_hosting_report_exit:${code ?? 1}`,
          ),
        );
      }
    });
  });
}
