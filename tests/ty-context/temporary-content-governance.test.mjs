import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {
  buildAdmissionEvidencePayload,
  encodeAdmissionEvidencePayload,
} from "../../examples/delivery-benchmark/mechanism/runner/admission-evidence.mjs";
import { runDeterministicAdmissionChecks } from "../../examples/delivery-benchmark/mechanism/runner/admission-deterministic.mjs";
import { sha256 } from "../../examples/delivery-benchmark/mechanism/runner/admission-shared.mjs";
import {
  evaluateNodeEngineConformance,
  observeDeterministicRuntimeEnvironment,
} from "../../examples/delivery-benchmark/mechanism/runner/admission-runtime-environment.mjs";
import { materializeCiAdmissionEvidence } from "../../tools/ci_admission_evidence.mjs";

const exec = promisify(execFile);
const repo = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const read = (relative) => readFile(path.join(repo, relative), "utf8");

test("temporary-content governance classifies every required dimension and scope", async () => {
  const contract = await read(
    "project_context/areas/harness-package/contracts/temporary-content-governance.md",
  );
  for (const dimension of [
    "owner",
    "authority",
    "location",
    "tracked/ignored",
    "sensitivity/disclosure",
    "retention/TTL/capacity",
    "atomicity/concurrency/collision",
    "link",
    "containment",
    "cleanup owner",
    "cleanup failure",
    "Windows",
    "macOS",
    "recovery role",
    "final-Source eligibility",
  ])
    assert.ok(contract.includes(dimension), dimension);
  for (const scope of [
    ".work_products/**",
    "tmp/ty-context/context-exports/**",
    "tmp/ty-context/source-preview/**",
    ".artifacts/mechanism/**",
    ".artifacts/releases/prepared/**",
    "Test-suite timing/build-fingerprint artifacts",
    "Design-resource handoff drafts",
    "DRA `tmp/ty-context/design-resource-recovery",
    "Long-Task workdir `.ty-context/**`",
  ])
    assert.ok(contract.includes(scope), scope);
  assert.match(contract, /path name never determines authority/iu);
  assert.match(
    contract,
    /writer, reader, migration, tests, public documentation/iu,
  );
  assert.match(contract, /no global Temporary Artifact Manager/iu);
});

test("tracked work products remain Contract/Source classes, not inferred cache", async () => {
  const { stdout } = await exec(
    "git",
    ["ls-files", "--", ".work_products/**"],
    { cwd: repo, windowsHide: true },
  );
  const tracked = stdout.trim().split(/\r?\n/u).filter(Boolean);
  assert.deepEqual(tracked.sort(), [
    ".work_products/design-fact-universe-closure/delivery-contract.yaml",
    ".work_products/dra-production-handoff-closure/EXECUTION_SOURCE.md",
    ".work_products/dra-production-handoff-closure/RECOVERY_INDEX.md",
    ".work_products/long-task-real-capability/delivery-contract.yaml",
    ".work_products/symbolic-denotation-efficiency/delivery-contract.yaml",
  ]);
  const contract = await read(
    "project_context/areas/harness-package/contracts/temporary-content-governance.md",
  );
  assert.match(
    contract,
    /Tracked `.work_products\/\*\*\/delivery-contract\.yaml`[\s\S]*User\/Long-Task Source and Contract owners/iu,
  );
  assert.match(
    contract,
    /dra-production-handoff-closure\/EXECUTION_SOURCE\.md` and `RECOVERY_INDEX\.md`[\s\S]*User\/native-Goal Source and recovery-locator owners/iu,
  );
  assert.match(contract, /Exact-path allowlist only/iu);
  assert.match(contract, /Never blanket-cleaned/iu);
});

test("DRA checkpoint is ignored and cleanup cannot recurse or follow names", async () => {
  await exec(
    "git",
    [
      "check-ignore",
      "--quiet",
      "--",
      "tmp/ty-context/design-resource-recovery/example/checkpoint.json",
    ],
    { cwd: repo, windowsHide: true },
  );
  const [files, cleanup] = await Promise.all([
    read("packages/ty-context/src/lib/design-resource-recovery-files.ts"),
    read("packages/ty-context/src/lib/design-resource-recovery-cleanup.ts"),
  ]);
  assert.match(files, /checkpoint_path_not_ignored/u);
  assert.match(files, /checkpoint_path_tracked/u);
  assert.match(files, /checkpoint_remove_cas_conflict/u);
  assert.match(files, /temporary_cleanup_identity_mismatch/u);
  assert.match(files, /session_directory_collision/u);
  assert.doesNotMatch(files, /rm\([^)]*recursive:\s*true/su);
  assert.match(cleanup, /parseDesignResourceRecoveryCheckpoint/u);
  assert.match(cleanup, /expectedDigest/u);
});

test("deterministic admission binds observed runtime separately and fails below the package engine", () => {
  const candidate = {
    branch: "main",
    commit: "1".repeat(40),
    tree: "2".repeat(40),
    main_commit: "1".repeat(40),
    working_tree_clean: true,
  };
  const config = {
    environment: {
      identity: "windows-x64-node24-codex-0.144.5-v1",
      platform: "win32",
      arch: "x64",
      node_major: 24,
    },
    deterministic_checks: { "dra-semantic-recovery": [] },
  };
  const runtime = observeDeterministicRuntimeEnvironment();
  const report = runDeterministicAdmissionChecks(
    config,
    "global",
    { "dra-semantic-recovery": "track" },
    { candidate, runtime },
  );
  assert.equal(
    report.schema_version,
    "tiny-context-admission-deterministic-v3",
  );
  assert.equal(
    report.benchmark_execution_environment.identity,
    config.environment.identity,
  );
  assert.equal(
    report.benchmark_execution_environment.provenance,
    "frozen-track-input",
  );
  assert.equal(
    report.deterministic_runtime_environment.platform,
    process.platform,
  );
  assert.equal(
    report.deterministic_runtime_environment.node_version,
    process.version,
  );
  assert.notEqual(
    report.deterministic_runtime_environment,
    report.benchmark_execution_environment,
  );
  assert.equal(report.deterministic_runtime_passed, true);

  const below = evaluateNodeEngineConformance("v22.20.0", ">=24");
  assert.equal(below.conformant, false);
  const unsupported = runDeterministicAdmissionChecks(
    config,
    "global",
    { "dra-semantic-recovery": "track" },
    {
      candidate,
      runtime: {
        ...runtime,
        node_version: "v22.20.0",
        node_major: 22,
        node_engine_conformant: false,
        engine_failure: "node_major_below_package_engine",
      },
    },
  );
  assert.equal(unsupported.tracks["dra-semantic-recovery"].passed, false);
  assert.equal(unsupported.deterministic_runtime_passed, false);
});

test("CI evidence rebinds deterministic proof and reports three distinct digest meanings", async () => {
  const candidate = {
    branch: "main",
    commit: "1".repeat(40),
    tree: "2".repeat(40),
    main_commit: "1".repeat(40),
    working_tree_clean: true,
  };
  const global = "a".repeat(64);
  const tracks = {
    "dra-semantic-recovery": "b".repeat(64),
    "build-reuse-buy": "c".repeat(64),
  };
  const pairs = Object.entries(tracks).map(([track, digest]) =>
    evidenceRecord(`${track}/pair.json`, {
      schema_version: "tiny-context-fresh-agent-pair-v3",
      global_execution_envelope_sha256: global,
      track_config_sha256: digest,
      track,
      pair_id: "pair-1",
      replicate: 1,
      candidate_git: candidate,
      baseline: {
        quality: {
          score: { targeted_defects: 2, findings: [] },
          trace_identity: "d".repeat(64),
        },
      },
      candidate: {
        quality: {
          score: { targeted_defects: 1, findings: [] },
          trace_identity: "e".repeat(64),
        },
      },
    }),
  );
  const aggregates = pairs.map((pair) =>
    evidenceRecord(`${pair.value.track}/aggregate.json`, {
      schema_version: "tiny-context-fresh-agent-aggregate-v3",
      global_execution_envelope_sha256: global,
      track_config_sha256: pair.value.track_config_sha256,
      track: pair.value.track,
      candidate_git: candidate,
      pair_count: 1,
      reports: [pair.value],
    }),
  );
  const localDeterministic = evidenceRecord("local-deterministic.json", {
    schema_version: "tiny-context-admission-deterministic-v3",
    global_execution_envelope_sha256: global,
    track_config_sha256: tracks,
    candidate_git: candidate,
    tracks: Object.fromEntries(
      Object.keys(tracks).map((track) => [track, { passed: true }]),
    ),
    benchmark_execution_environment: {
      identity: "windows-x64-node24-codex-0.144.5-v1",
      provenance: "frozen-track-input",
    },
    deterministic_runtime_environment: observeDeterministicRuntimeEnvironment(),
    deterministic_runtime_passed: true,
  });
  const attestation = evidenceRecord("attestation.json", {
    schema_version: "tiny-context-admission-attestation-v2",
    sensitive_raw_content_included: false,
    global_execution_envelope_sha256: global,
    track_config_sha256: tracks,
    candidate_git: candidate,
    deterministic: {
      artifact_sha256: localDeterministic.sha256,
      passed: true,
      benchmark_execution_environment:
        localDeterministic.value.benchmark_execution_environment,
      deterministic_runtime_environment:
        localDeterministic.value.deterministic_runtime_environment,
    },
    tracks: aggregates.map((aggregate) => ({
      track: aggregate.value.track,
      track_config_sha256: aggregate.value.track_config_sha256,
      artifact_sha256: aggregate.sha256,
      evidence_candidate_git: candidate,
      provenance_qualification: {
        status:
          aggregate.value.track === "dra-semantic-recovery"
            ? "unverified"
            : "verified",
      },
    })),
  });
  const encoded = encodeAdmissionEvidencePayload(
    buildAdmissionEvidencePayload({
      deterministic: localDeterministic,
      pairs,
      aggregates,
      attestation,
      candidate,
    }),
  );
  const temporary = await mkdtemp(path.join(os.tmpdir(), "admission-ci-"));
  try {
    const deterministicPath = path.join(temporary, "ci-deterministic.json");
    const ciBytes = Buffer.from(
      `${JSON.stringify(
        {
          ...localDeterministic.value,
          tracks: Object.fromEntries(
            Object.keys(tracks).map((track) => [
              track,
              { passed: true, results: [{ id: "current-tree", status: 0 }] },
            ]),
          ),
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    await writeFile(deterministicPath, ciBytes);
    const output = path.join(temporary, "materialized");
    const summary = await materializeCiAdmissionEvidence({
      encoded,
      outputDirectory: output,
      deterministicReport: deterministicPath,
      expectedCommit: candidate.commit,
      expectedTree: candidate.tree,
    });
    assert.equal(summary.ci_deterministic_report_sha256, sha256(ciBytes));
    assert.equal(summary.deterministic_runtime_passed, true);
    assert.equal(summary.fresh_agent_evidence_internally_valid, true);
    assert.equal(
      summary.fresh_agent_provenance_qualification.status,
      "unverified",
    );
    assert.notEqual(
      summary.input_payload_sha256,
      summary.materialized_json_set_sha256,
    );
    const reboundAttestation = JSON.parse(
      await readFile(path.join(output, "admission-attestation.json"), "utf8"),
    );
    assert.equal(
      reboundAttestation.deterministic.artifact_sha256,
      sha256(ciBytes),
    );
    const manifest = JSON.parse(
      await readFile(
        path.join(output, "admission-evidence-manifest.json"),
        "utf8",
      ),
    );
    assert.equal(
      manifest.files.find((row) => row.path === "deterministic-report.json")
        .sha256,
      sha256(ciBytes),
    );
    const workflow = await read(".github/workflows/admission-evidence.yml");
    assert.match(workflow, /fetch-depth:\s*0/u);
    assert.match(workflow, /actions\/setup-node@[0-9a-f]+/u);
    assert.match(workflow, /node-version:\s*24/u);
    assert.match(workflow, /cache:\s*npm/u);
    assert.match(workflow, /admission-runtime-environment\.mjs --check/u);
    assert.match(workflow, /npm ci --ignore-scripts/u);
    assert.match(workflow, /admission_benchmark\.mjs.*deterministic/su);
    assert.match(workflow, /ci_admission_evidence\.mjs/u);
    assert.match(workflow, /artifact-digest/u);

    const mismatchedPath = path.join(
      temporary,
      "wrong-tree-deterministic.json",
    );
    await writeFile(
      mismatchedPath,
      `${JSON.stringify(
        {
          ...JSON.parse(ciBytes.toString("utf8")),
          candidate_git: { ...candidate, tree: "3".repeat(40) },
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    await assert.rejects(
      materializeCiAdmissionEvidence({
        encoded,
        outputDirectory: path.join(temporary, "wrong-tree-materialized"),
        deterministicReport: mismatchedPath,
        expectedCommit: candidate.commit,
        expectedTree: candidate.tree,
      }),
      /candidate_mismatch/u,
    );
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

function evidenceRecord(relative, value) {
  const bytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
  return { path: relative, value, bytes, sha256: sha256(bytes) };
}
