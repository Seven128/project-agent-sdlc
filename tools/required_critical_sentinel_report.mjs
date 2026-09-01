export function reportFailures({
  report,
  sentinel,
  inventory,
  parsed,
  completion,
  cleanupError,
}) {
  const failures = [];
  const timing = report.timing;
  if (parsed.error) failures.push(`report_read_failed:${parsed.error}`);
  if (parsed.events.length === 0) failures.push("report_missing_or_empty");
  if (completion.error) failures.push(`execution_error:${completion.error}`);
  if (completion.signal) failures.push(`execution_signal:${completion.signal}`);
  if (completion.code !== 0)
    failures.push(`execution_exit_code:${completion.code ?? "missing"}`);
  if (cleanupError) failures.push(`cleanup_failed:${cleanupError}`);
  if (report.schema_version !== "required-critical-sentinel-report-v1")
    failures.push("projection_report_schema_invalid");
  if (
    report.result_scope !== "registration-projection" ||
    report.complete_suite !== false ||
    report.registry_runtime_observation_complete !== false ||
    report.semantic_test_population_executed !== false
  )
    failures.push("projection_report_scope_invalid");
  if (!sameStrings(report.verified_ids, [sentinel.id]))
    failures.push("projection_report_verified_ids_invalid");
  if (timing.schema_version !== "test-suite-timing-v2")
    failures.push("timing_report_schema_invalid");
  if (timing.file_count !== inventory.selectedFiles.length)
    failures.push(
      `selected_file_count_mismatch:${timing.file_count}:${inventory.selectedFiles.length}`,
    );
  if (timing.missing_file_count !== 0) failures.push("selected_file_missing");
  if (
    timing.file_summary_integrity?.required !== true ||
    timing.file_summary_integrity?.status !== "passed"
  )
    failures.push("selected_file_summary_integrity_failed");
  if (timing.imported_test_count !== 0)
    failures.push(`imported_tests_observed:${timing.imported_test_count}`);
  if (timing.unattributed_test_count !== 0)
    failures.push(
      `unattributed_tests_observed:${timing.unattributed_test_count}`,
    );

  const coverage = timing.critical_sentinel_coverage;
  if (coverage?.status !== "passed")
    failures.push("critical_sentinel_coverage_failed");
  if (
    coverage?.registered_count !== inventory.registeredSentinels.length ||
    !sameStrings(
      coverage?.registered_ids,
      inventory.registeredSentinels.map((entry) => entry.id).sort(compareUtf8),
    )
  )
    failures.push("critical_sentinel_registry_projection_invalid");
  if (
    coverage?.required_count !== 1 ||
    coverage?.required_ids?.length !== 1 ||
    coverage.required_ids[0] !== sentinel.id
  )
    failures.push("critical_sentinel_applicability_projection_invalid");
  if (
    coverage?.applicable_count !== inventory.applicableSentinels.length ||
    !sameStrings(
      coverage?.applicable_ids,
      inventory.applicableSentinels.map((entry) => entry.id).sort(compareUtf8),
    ) ||
    !coverage.applicable_ids.includes(sentinel.id)
  )
    failures.push("critical_sentinel_platform_projection_invalid");
  if (
    !isExactPartition(
      coverage?.registered_ids,
      coverage?.applicable_ids,
      coverage?.non_applicable_ids,
    ) ||
    !isExactPartition(
      coverage?.applicable_ids,
      coverage?.required_ids,
      coverage?.not_selected_ids,
    )
  )
    failures.push("critical_sentinel_projection_partition_invalid");
  if (
    !Array.isArray(coverage?.observed_ids) ||
    !coverage.observed_ids.includes(sentinel.id)
  )
    failures.push("critical_sentinel_observation_not_exact");
  appendCoverageFailures(failures, "missing", coverage?.missing_ids);
  appendCoverageFailures(failures, "unexpected", coverage?.unexpected_ids);
  appendCoverageFailures(failures, "duplicate", coverage?.duplicate_ids);
  appendCoverageFailures(failures, "misplaced", coverage?.misplaced_ids);
  appendCoverageFailures(failures, "non_passing", coverage?.non_passing_ids);
  if (timing.test_status !== "passed")
    failures.push(`test_status_not_passed:${timing.test_status}`);
  return failures;
}

function appendCoverageFailures(failures, kind, ids) {
  if (Array.isArray(ids) && ids.length > 0)
    failures.push(`critical_sentinel_${kind}:${ids.join(",")}`);
}

function sameStrings(left, right) {
  return (
    Array.isArray(left) &&
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function isExactPartition(whole, left, right) {
  if (!Array.isArray(whole) || !Array.isArray(left) || !Array.isArray(right))
    return false;
  const combined = [...left, ...right].sort(compareUtf8);
  return (
    new Set(whole).size === whole.length &&
    new Set(left).size === left.length &&
    new Set(right).size === right.length &&
    left.every((id) => !right.includes(id)) &&
    sameStrings(whole, [...whole].sort(compareUtf8)) &&
    sameStrings(left, [...left].sort(compareUtf8)) &&
    sameStrings(right, [...right].sort(compareUtf8)) &&
    sameStrings(whole, combined)
  );
}

function compareUtf8(left, right) {
  return Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
}
