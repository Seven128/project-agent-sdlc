import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { CRITICAL_TEST_SENTINELS } from "../../tools/test_suite_policy.mjs";
import { assertCriticalInventoryContract } from "./workflow-critical-inventory-contract.mjs";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const COMPLETE_LONG_TASK_COMMAND =
  "npm run test:long-task-workflow:built --workspace project-tiny-context-harness --ignore-scripts";

test("[critical:ci-diagnostic-routing] package CI separates Trust feedback from complete regression and preserves same-run diagnostics", () => {
  const packageWorkflow = read(".github/workflows/package.yml");
  const packageJson = JSON.parse(read("packages/ty-context/package.json"));
  const windowsLevel4Job = section(
    packageWorkflow,
    "windows-level4-runtime",
    "pull-request",
  );
  const pullRequestJob = section(packageWorkflow, "pull-request", "main");
  const mainJob = section(packageWorkflow, "main");
  assertPackageWorkflowStructure(
    packageWorkflow,
    windowsLevel4Job,
    pullRequestJob,
    mainJob,
  );
  assertPackageScriptContract(packageJson);
  assertCompleteSuiteSourceContract();
});

test("every platform-specific Long-Task sentinel has same-platform complete runtime evidence", () => {
  const platforms = [
    ...new Set(
      CRITICAL_TEST_SENTINELS.filter((entry) =>
        entry.required_suites.includes("long-task"),
      ).flatMap((entry) => entry.required_platforms ?? []),
    ),
  ].sort();
  assert.ok(platforms.length > 0);

  const packageJobs = parsedWorkflowJobs(".github/workflows/package.yml");
  const packageEvidence = assertPlatformCompleteSuiteJobs(
    packageJobs,
    platforms,
  );
  const publishJobs = parsedWorkflowJobs(".github/workflows/npm-publish.yml");
  const publishEvidence = assertPlatformCompleteSuiteJobs(
    publishJobs,
    platforms,
  );
  const prepareNeeds = normalizeNeeds(publishJobs.prepare?.needs);
  for (const jobId of publishEvidence.values())
    assert.ok(
      prepareNeeds.includes(jobId),
      `publish preparation must depend on ${jobId}`,
    );

  assert.deepEqual([...packageEvidence.keys()], platforms);
  assert.deepEqual([...publishEvidence.keys()], platforms);
});

test("complete and one-sentinel runners share parsed suite-wide critical title inventory", () => {
  assertCriticalInventoryContract(read);
});

test("publish, tarball, and consumer gates retain complete release boundaries", () => {
  const packageWorkflow = read(".github/workflows/package.yml");
  const publishWorkflow = read(".github/workflows/npm-publish.yml");
  const consumerWorkflow = read(".github/workflows/harness.yml");
  const publishRunbook = read("docs/launch/npm-trusted-publishing.md");
  const tarballSmoke = read("tools/release_tarball_smoke.mjs");
  const releasePrepare = read("tools/release_prepare.mjs");
  const releasePublish = read("tools/release_publish.mjs");
  const windowsLevel4Job = section(
    publishWorkflow,
    "windows-level4-runtime",
    "prepare",
  );
  const publishPrepareJob = section(publishWorkflow, "prepare", "publish");

  assertWindowsLevel4RuntimeJob(windowsLevel4Job);
  assert.match(publishPrepareJob, /needs:\s*windows-level4-runtime/u);
  assert.match(publishWorkflow, /Build package/);
  assert.match(publishWorkflow, /npm install -g npm@12\.0\.1/);
  assert.doesNotMatch(publishWorkflow, /npm@latest/);
  assert.match(
    publishWorkflow,
    /Complete package tests[\s\S]*run: npm test --workspace project-tiny-context-harness/,
  );
  assert.match(
    publishWorkflow,
    /Complete package tests[\s\S]*TY_CONTEXT_TEST_SUITE_BUDGET_PROFILE:\s*github-ubuntu-v5/,
  );
  assert.match(
    publishWorkflow,
    /Complete package tests[\s\S]*TY_CONTEXT_TEST_TIMING_DIR:\s*\.artifacts\/test-timing\/publish/,
  );
  assert.match(publishWorkflow, /Upload package test timing/);
  assert.doesNotMatch(publishWorkflow, /TY_CONTEXT_TEST_SUITE_BUDGETS_MS_JSON/);
  assert.equal(
    countOccurrences(publishWorkflow, COMPLETE_LONG_TASK_COMMAND),
    1,
  );
  assert.match(publishWorkflow, /release:check-version/);
  assert.match(publishWorkflow, /package check-source/);
  assert.match(publishWorkflow, /make validate-harness/);
  assert.match(
    publishWorkflow,
    /workflow_release_artifact\.mjs[\s\S]*--dry-run/,
  );
  assert.match(publishWorkflow, /workflow-release-artifact\.json/);
  assert.match(publishWorkflow, /release_tarball_smoke\.mjs --tarball/);
  assert.match(publishWorkflow, /publish_prepared_artifact\.mjs/);
  assert.doesNotMatch(publishWorkflow, /run: npm publish/);
  assert.match(
    read("tools/publish_prepared_artifact.mjs"),
    /runCommand\(\s*"npm",\s*\[\s*"publish"[\s\S]*assertRegistryArtifact/,
  );
  assert.match(
    read("tools/release_artifact_prepare.mjs"),
    /ty-context-release-artifact-v2|RELEASE_ARTIFACT_SCHEMA_V2/,
  );
  assert.match(
    read("tools/workflow_release_artifact.mjs"),
    /dryRun[\s\S]*release-artifact-\$\{version\}\.json/,
  );
  assert.match(read("tools/release_artifact_identity.mjs"), /lockfile_sha256/);
  assert.match(tarballSmoke, /writeReleaseTarballLongTaskFixture/);
  assert.match(
    read("tools/release_tarball_smoke_fixture.mjs"),
    /long-task-delivery-v2/,
  );
  assert.match(tarballSmoke, /long-task-v1-retirement/);
  assert.match(tarballSmoke, /npm", \["install", "--save-dev", tarball\]/);
  assert.match(tarballSmoke, /"ty-context",\s*"init"/);
  assert.match(tarballSmoke, /"ty-context", "doctor"/);
  assert.match(tarballSmoke, /"ty-context",\s*"route"/);
  assert.match(tarballSmoke, /"context",\s*"create"/);
  assert.match(tarballSmoke, /"ty-context",\s*"context",\s*"inspect"/);
  const scaffoldCreate = tarballSmoke.indexOf('"context",\n      "create"');
  const scaffoldRestore = tarballSmoke.indexOf(
    "await rm(portableContextScaffold, { force: true })",
  );
  const longTaskEnable = tarballSmoke.indexOf(
    '"ty-context", "enable", "long-task"',
  );
  assert.ok(scaffoldCreate >= 0);
  assert.ok(scaffoldRestore > scaffoldCreate);
  assert.ok(longTaskEnable > scaffoldRestore);
  assert.match(tarballSmoke, /"design-authority",\s*"inspect"/);
  assert.match(tarballSmoke, /"design-authority",\s*"tokens"/);
  assert.match(tarballSmoke, /"authority-delta",\s*"validate"/);
  assert.match(
    tarballSmoke,
    /design-authority-delta-assessment-v1\.schema\.json/,
  );
  assert.match(tarballSmoke, /design-authority-closure\.js/);
  assert.match(tarballSmoke, /authority-delta-assessment\.md/);
  assert.match(tarballSmoke, /"ty-context", "validate-context"/);
  assert.match(tarballSmoke, /"long-task", "final-gate"/);
  assert.match(tarballSmoke, /tarball contains retired runtime asset/);
  assert.match(
    tarballSmoke,
    /for \(const forbidden[\s\S]*source-plan-authoring[\s\S]*for \(const required/,
  );
  assert.match(tarballSmoke, /assets\/agents\/long-task-implementation\.toml/);
  assert.match(tarballSmoke, /formal-selected-web-app-handoff\.md/);
  assert.match(
    publishRunbook,
    /complete default and Long-Task Workflow test suites/,
  );
  assert.match(publishRunbook, /exact packed tarball/);

  for (const workflow of [
    packageWorkflow,
    publishWorkflow,
    consumerWorkflow,
    read(".github/workflows/scorecard.yml"),
  ]) {
    for (const match of workflow.matchAll(/uses:\s+[^\s@]+@([^\s#]+)/g)) {
      assert.match(
        match[1],
        /^[a-f0-9]{40}$/,
        `workflow action is not pinned to a commit SHA: ${match[0]}`,
      );
    }
  }

  assert.doesNotMatch(consumerWorkflow, /npm (?:run )?test/);
  assert.doesNotMatch(
    consumerWorkflow,
    /test:(?:composite|long-task)-workflow/,
  );
  assert.doesNotMatch(
    consumerWorkflow,
    /composite-campaign-v5-app-server-black-box/,
  );
  assert.doesNotMatch(releasePrepare, /test:(?:composite|long-task)-workflow/);
  assert.doesNotMatch(releasePublish, /test:(?:composite|long-task)-workflow/);
  assert.match(
    releasePublish,
    /run\("npm", \["test", "--workspace", packageName\]\)/u,
  );
  assert.match(releasePublish, /release_tarball_smoke\.mjs[\s\S]*--tarball/);
  assert.doesNotMatch(
    releasePublish,
    /release_tarball_smoke\.mjs[^\r\n]*--portable-only/u,
  );
  assert.match(tarballSmoke, /if \(!portableOnly\)/);
});

test("pull-request template follows affected, Trust, and conditional complete routing", () => {
  const template = read(".github/PULL_REQUEST_TEMPLATE.md");
  assert.match(template, /npm run test:affected/u);
  assert.match(template, /npm run test:long-task:trust/u);
  assert.match(
    template,
    /npm test --workspace project-tiny-context-harness` only when/u,
  );
  assert.doesNotMatch(
    template,
    /- \[ \] `npm test --workspace project-tiny-context-harness`\s*$/mu,
  );
});

test("affected-test launcher stays portable and has a Windows gate", () => {
  const packageWorkflow = read(".github/workflows/package.yml");
  const affectedRunner = read("tools/run_affected_tests.mjs");
  const npmCommandSpec = read("tools/npm_command_spec.mjs");

  assert.match(packageWorkflow, /windows-affected-test-launcher:/);
  assert.match(packageWorkflow, /runs-on: windows-latest/);
  assert.match(
    packageWorkflow,
    /Verify Windows npm subprocess launch[\s\S]*node --test tests\/ty-context\/affected-test-portable-command\.test\.mjs/,
  );
  assert.match(affectedRunner, /npmCommandSpec/);
  assert.doesNotMatch(affectedRunner, /npm\.cmd/);
  assert.match(npmCommandSpec, /ComSpec/);
  assert.match(npmCommandSpec, /cmd\.exe/);
  assert.match(npmCommandSpec, /"call", "npm"/);
});

function assertPackageWorkflowStructure(
  packageWorkflow,
  windowsLevel4Job,
  pullRequestJob,
  mainJob,
) {
  assertWindowsLevel4RuntimeJob(windowsLevel4Job, true);
  assert.throws(
    () =>
      assertWindowsLevel4RuntimeJob(
        windowsLevel4Job.replace(
          /\s*tests\/ty-context\/long-task-windows-job-supervisor\.test\.mjs/u,
          "",
        ),
        true,
      ),
    /long-task-windows-job-supervisor/u,
  );
  assert.throws(() =>
    assertWindowsLevel4RuntimeJob(
      windowsLevel4Job.replace(
        "node tools/run_required_critical_sentinel.mjs long-task-trust windows-finalization-tree-settlement",
        "node --version",
      ),
      true,
    ),
  );
  assert.match(packageWorkflow, /Typecheck package and build once/);
  assert.match(
    packageWorkflow,
    /main:[\s\S]*Build package\s+run: npm run build --workspace project-tiny-context-harness[\s\S]*Validate modularity waiver lifecycle/,
  );
  assert.match(packageWorkflow, /package check-source/);
  assert.match(packageWorkflow, /make validate-harness/);
  assert.match(pullRequestJob, /PR_BASE_REF: \$\{\{ github\.base_ref \}\}/);
  assert.match(
    pullRequestJob,
    /PUSH_BASE_SHA: \$\{\{ github\.event\.before \}\}/,
  );
  assert.match(
    pullRequestJob,
    /git cat-file -e "\$\{PUSH_BASE_SHA\}\^\{commit\}"/,
  );
  assert.match(pullRequestJob, /git merge-base HEAD origin\/main/);
  assert.match(pullRequestJob, /--base "\$modularity_base"/);
  assert.match(pullRequestJob, /Trust boundary package tests/);
  assert.match(pullRequestJob, /TY_CONTEXT_TEST_TIMING_DIR/);
  assert.match(
    pullRequestJob,
    /TY_CONTEXT_TEST_SUITE_BUDGET_PROFILE:\s*github-ubuntu-v5/,
  );
  assert.match(
    pullRequestJob,
    /npm run test:trust:built --workspace project-tiny-context-harness --ignore-scripts/,
  );
  assert.doesNotMatch(
    pullRequestJob,
    /npm test --workspace project-tiny-context-harness/u,
  );
  assert.match(
    mainJob,
    /Complete package tests[\s\S]*npm test --workspace project-tiny-context-harness --ignore-scripts/,
  );
  assert.match(mainJob, /TY_CONTEXT_TEST_TIMING_DIR/);
  assert.match(
    mainJob,
    /TY_CONTEXT_TEST_SUITE_BUDGET_PROFILE:\s*github-ubuntu-v5/,
  );
  assert.doesNotMatch(packageWorkflow, /TY_CONTEXT_TEST_SUITE_BUDGETS_MS_JSON/);
  assert.match(packageWorkflow, /set -o pipefail/);
  assert.match(packageWorkflow, /tee package-test\.log/);
  assert.match(packageWorkflow, /Upload package test diagnostics/);
  assert.match(packageWorkflow, /Upload package test timing/);
  assert.match(packageWorkflow, /uses: actions\/upload-artifact@[a-f0-9]{40}/);
  assert.match(packageWorkflow, /if-no-files-found: ignore/);
  assert.equal(
    countOccurrences(packageWorkflow, COMPLETE_LONG_TASK_COMMAND),
    1,
  );
  assert.match(packageWorkflow, /node tools\/quickstart_smoke\.mjs/);
  assert.match(packageWorkflow, /npm run preview:pack/);
}

function assertPackageScriptContract(packageJson) {
  assert.equal(
    packageJson.scripts["test:default:built"],
    "node ../../tests/ty-context/run-package-suite.mjs default",
  );
  assert.equal(
    packageJson.scripts["test:default"],
    "npm run build && npm run test:default:built",
  );
  assert.equal(
    packageJson.scripts["test:built"],
    "npm run test:default:built && npm run test:long-task-workflow:built",
  );
  assert.equal(
    packageJson.scripts["test:trust:built"],
    "npm run test:default:built && npm run test:long-task-trust:built",
  );
  assert.equal(
    packageJson.scripts["test:trust"],
    "npm run build && npm run test:trust:built",
  );
  assert.equal(packageJson.scripts.pretest, "npm run build");
  assert.equal(packageJson.scripts.test, "npm run test:built");
  assert.equal(
    packageJson.scripts["test:long-task-workflow:built"],
    "node ../../tests/ty-context/run-package-suite.mjs long-task",
  );
  assert.equal(
    packageJson.scripts["test:long-task-workflow"],
    "npm run build && npm run test:long-task-workflow:built",
  );
  assert.equal(
    packageJson.scripts["test:long-task-trust:built"],
    "node ../../tests/ty-context/run-package-suite.mjs long-task-trust",
  );
  assert.equal(
    packageJson.scripts["test:long-task-trust"],
    "npm run build && npm run test:long-task-trust:built",
  );
  assert.equal(
    packageJson.scripts["test:long-task-performance"],
    "npm run build && node ../../tests/ty-context/long-task-performance.mjs",
  );
  const performanceProbe = read("tests/ty-context/long-task-performance.mjs");
  assert.match(
    performanceProbe,
    /addGlobalClaim\(target, \{ counterfactual: true \}\)/u,
  );
  assert.doesNotMatch(performanceProbe, /key: "performance-global"/u);
  assert.ok(
    performanceProbe.indexOf(
      "const globalCounterfactual = await measureGlobalCounterfactualFixture();",
    ) <
      performanceProbe.indexOf(
        "const fixture = await createDeliveryFixture();",
      ),
    "small semantic performance fixtures must fail before the 10k-file repository is seeded",
  );
  assert.match(performanceProbe, /uniqueExecutionDurationMs/u);
  assert.match(performanceProbe, /"default-v1"/u);
  assert.match(performanceProbe, /"windows-v1"/u);
  assert.match(performanceProbe, /large_repository_seed_ms/u);
  assert.match(performanceProbe, /probe_total_ms/u);
  assert.equal(packageJson.scripts["test:composite-workflow"], undefined);
}

function assertCompleteSuiteSourceContract() {
  const suiteRunner = read("tests/ty-context/run-package-suite.mjs");
  const suiteCompleteness = read(
    "tests/ty-context/run-package-suite-completeness.mjs",
  );
  const suiteReporter = read("tests/ty-context/test-suite-file-reporter.mjs");
  assert.match(suiteRunner, /longTaskTestName/);
  assert.match(suiteCompleteness, /long-task-trust/);
  assert.match(suiteRunner, /test-suite-file-reporter/);
  assert.match(suiteReporter, /test-suite-timing-v2/);
  assert.match(suiteRunner, /resolveTestTimingOutput\(repositoryRoot, suite\)/);
  assert.match(suiteRunner, /resolveSuiteWallTimeBudgetMs\(suite\)/);
  assert.match(suiteRunner, /criticalSentinelsForSuite\(suite\)/);
  assert.match(suiteRunner, /result_scope:\s*"complete-suite"/u);
  assert.match(suiteRunner, /assertCompleteSuiteInvocation/u);
  assert.match(suiteRunner, /assertCompleteSuiteLanePlan/u);
  assert.match(suiteRunner, /INCOMPLETE_SUITE_EXECUTION_FACTS/u);
  assert.match(suiteRunner, /finalizeCompleteSuiteExecution/u);
  assert.match(suiteRunner, /child\.once\("close"/u);
  assert.match(suiteRunner, /delete childEnvironment\.NODE_OPTIONS/u);
  assert.match(suiteRunner, /delete childEnvironment\.NODE_TEST_CONTEXT/u);
  assert.match(suiteRunner, /delete childEnvironment\.NODE_PATH/u);
  assert.doesNotMatch(suiteRunner, /forwardedOptions/u);
  assert.doesNotMatch(suiteRunner, /process\.argv\.slice\(3\)/u);
  assert.doesNotMatch(suiteRunner, /\[node-test options\]/u);
  assert.ok(
    suiteRunner.indexOf("const suite = assertCompleteSuiteInvocation") <
      suiteRunner.indexOf("await readdir(testRoot)"),
    "the complete-suite invocation envelope must close before discovery",
  );
  assert.ok(
    suiteRunner.indexOf("assertCompleteSuiteLanePlan") <
      suiteRunner.indexOf("await mkdtemp"),
    "the lane plan must close before execution artifacts exist",
  );
  assert.match(suiteCompleteness, /complete_suite:\s*false/u);
  assert.match(suiteCompleteness, /evaluateCompleteSuiteExecution/u);
  assert.match(suiteCompleteness, /completion\?\.lane_key !== laneKey/u);
  assert.match(suiteCompleteness, /completion\.signal !== null/u);
  assert.match(suiteCompleteness, /Number\.isInteger\(completion\.code\)/u);
  assert.match(suiteCompleteness, /integrity\?\.required === true/u);
  assert.match(suiteReporter, /critical_sentinel_coverage/);
  assert.match(suiteReporter, /not_selected_ids/);
  assert.match(suiteReporter, /slowest_files/);
  assert.match(suiteRunner, /wall_time_budget_status/);
  assert.match(suiteRunner, /CI[\s\S]*--test-reporter=dot/);
}

function read(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function section(source, start, end) {
  const startMarker = `  ${start}:`;
  const startIndex = source.indexOf(startMarker);
  assert.notEqual(startIndex, -1, `missing workflow section: ${start}`);
  if (!end) return source.slice(startIndex);
  const endIndex = source.indexOf(`  ${end}:`, startIndex + startMarker.length);
  assert.notEqual(endIndex, -1, `missing workflow section: ${end}`);
  return source.slice(startIndex, endIndex);
}

function assertWindowsLevel4RuntimeJob(
  job,
  includePackageJobSupervisor = false,
) {
  assert.match(job, /runs-on:\s*windows-latest/u);
  assert.match(job, /fetch-depth:\s*0/u);
  assert.match(job, /node-version:\s*"24"/u);
  assert.deepEqual(
    [...job.matchAll(/^\s+run:\s*(.+)$/gmu)].map((match) => match[1]),
    [
      "npm ci",
      "npm run build --workspace project-tiny-context-harness",
      includePackageJobSupervisor
        ? "node --test --test-concurrency=1 tests/ty-context/long-task-windows-job-supervisor.test.mjs tests/ty-context/long-task-level4-acquisition.test.mjs tests/ty-context/long-task-level4-package-promotion.test.mjs"
        : "node --test --test-concurrency=1 tests/ty-context/long-task-level4-acquisition.test.mjs tests/ty-context/long-task-level4-package-promotion.test.mjs",
      "node tools/run_required_critical_sentinel.mjs long-task-trust windows-finalization-tree-settlement",
      COMPLETE_LONG_TASK_COMMAND,
    ],
  );
  assert.doesNotMatch(
    job,
    /--test-name-pattern|long-task-final-authority-race\.test\.mjs/u,
  );
  assert.doesNotMatch(job, /continue-on-error/u);
  assert.match(job, /Upload Windows Long-Task timing[\s\S]*if:\s*always\(\)/u);
  assert.match(
    job,
    /Complete Windows Long-Task package suite[\s\S]*TY_CONTEXT_TEST_TIMING_DIR:\s*\.artifacts\/test-timing\/windows/u,
  );
}

function parsedWorkflowJobs(relativePath) {
  const workflow = parse(read(relativePath));
  assert.ok(workflow && typeof workflow === "object");
  assert.ok(workflow.jobs && typeof workflow.jobs === "object");
  return workflow.jobs;
}

function assertPlatformCompleteSuiteJobs(jobs, platforms) {
  const evidence = new Map();
  for (const platform of platforms) {
    const matching = Object.entries(jobs).filter(([, job]) => {
      if (runnerPlatform(job?.["runs-on"]) !== platform) return false;
      return (job.steps ?? []).some(
        (step) => step.run?.trim() === COMPLETE_LONG_TASK_COMMAND,
      );
    });
    assert.equal(
      matching.length,
      1,
      `${platform} must have exactly one complete Long-Task job`,
    );
    const [jobId, job] = matching[0];
    const completeSteps = (job.steps ?? []).filter(
      (step) => step.run?.trim() === COMPLETE_LONG_TASK_COMMAND,
    );
    assert.equal(completeSteps.length, 1);
    const completeStep = completeSteps[0];
    const timingDirectory = completeStep.env?.TY_CONTEXT_TEST_TIMING_DIR;
    assert.match(timingDirectory, /^\.artifacts\/test-timing\/[a-z0-9-]+$/u);
    assert.doesNotMatch(
      completeStep.run,
      /--test-name-pattern|long-task-trust|tests\/ty-context|--test-concurrency/u,
    );
    const timingUploads = (job.steps ?? []).filter(
      (step) =>
        typeof step.uses === "string" &&
        step.uses.startsWith("actions/upload-artifact@") &&
        step.with?.path === `${timingDirectory}/*.json`,
    );
    assert.equal(timingUploads.length, 1);
    assert.equal(timingUploads[0].if, "always()");
    assert.equal(timingUploads[0].with["if-no-files-found"], "error");
    evidence.set(platform, jobId);
  }
  return evidence;
}

function runnerPlatform(runsOn) {
  const labels = Array.isArray(runsOn) ? runsOn : [runsOn];
  for (const label of labels) {
    if (typeof label !== "string") continue;
    if (label.startsWith("windows-")) return "win32";
    if (label.startsWith("macos-")) return "darwin";
    if (label.startsWith("ubuntu-")) return "linux";
  }
  return null;
}

function normalizeNeeds(needs) {
  if (typeof needs === "string") return [needs];
  return Array.isArray(needs) ? needs : [];
}

function countOccurrences(source, needle) {
  return source.split(needle).length - 1;
}
