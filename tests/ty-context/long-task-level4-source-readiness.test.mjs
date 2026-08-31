import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
  link,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { assessFormalCollectionReadiness } from "../../tools/long_task_formal_collection_readiness.mjs";
import { FormalProviderCaptureAdapter } from "../../tools/long_task_formal_provider_capture.mjs";
import { formalProviderWorkerEnvironment } from "../../tools/long_task_formal_provider_protocol.mjs";
import { FormalStateCapture } from "../../tools/long_task_formal_state_capture.mjs";
import {
  readFreshFormalFile,
  resolveFormalArtifact,
} from "../../tools/long_task_formal_collection_io.mjs";
import {
  canonical,
  sha256,
} from "../../tools/long_task_real_process_roi_scoring.mjs";
import { createLevel4FormalEvidenceFixture } from "./helpers/long-task-level4-fixture.mjs";
import {
  assertProviderBridgeControls,
  fixtureProviderIdentity,
} from "./helpers/long-task-level4-provider-controls.mjs";
import { clonePrecollection } from "./helpers/long-task-level4-test-utils.mjs";

const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));
const invocationId = "a".repeat(64);
const execFileAsync = promisify(execFile);
let fixture;
before(async () => {
  fixture = await createLevel4FormalEvidenceFixture(repositoryRoot);
});
after(async () => fixture?.remove());

test("[critical:level4-source-readiness-boundary] sole-verifier dry-run keeps missing real Sources formal-inexecutable and ROI false", async () => {
  const cli = path.join(
    repositoryRoot,
    "tools",
    "verify_long_task_real_process_roi.mjs",
  );
  const { stdout } = await execFileAsync(
    process.execPath,
    [cli, "--dry-run", "--candidate", "HEAD"],
    { cwd: repositoryRoot, maxBuffer: 4 * 1024 * 1024 },
  );
  const report = JSON.parse(stdout);
  assert.equal(report.formal_status, "not_evaluated");
  assert.equal(report.formal_collection_executable, false);
  assert.equal(report.total_roi_supported, false);
  assert.equal(report.total_roi_positive, false);
  assert.equal(report.formal_runtime_tcb_identity_sha256, null);
  assert.equal(
    report.formal_collection_blockers.includes(
      "formal_process_supervisor_platform_unsupported",
    ),
    false,
  );
  assert.equal(Object.hasOwn(report, "executable"), false);
  for (const pending of [
    "formal_evidence_precollection",
    "controlled_incident",
    "provider_compute_storage_prices",
    "state_retention",
  ])
    assert.ok(report.external_pending.includes(pending), pending);
});

test("formal source preflight derives missing price meters and enforces delivery-scoped State retention", () => {
  assert.equal(
    fixture.accountingPolicy.state_storage_retention.scope,
    "this-delivery-precollection-proxy-only",
  );
  const precollection = clonePrecollection(fixture.precollection);
  const documentPath = "prices/official-price-document.json";
  const documentSource = precollection.files.get(documentPath);
  const document = JSON.parse(documentSource.bytes.toString("utf8"));
  document.rates = document.rates.filter((rate) => rate.key !== "compute_ms");
  documentSource.bytes = Buffer.from(`${JSON.stringify(document, null, 2)}\n`);
  documentSource.entry.bytes = documentSource.bytes.length;
  documentSource.entry.sha256 = sha256(documentSource.bytes);
  const identityEntry = precollection.identity.entries.find(
    (entry) => entry.path === documentPath,
  );
  Object.assign(identityEntry, documentSource.entry);
  precollection.identity.identity_sha256 = sha256(
    canonical({
      frozen_at: precollection.identity.frozen_at,
      entries: precollection.identity.entries,
    }),
  );
  const readiness = assessFormalCollectionReadiness({
    precollection,
    accountingPolicy: fixture.accountingPolicy,
    validationWindow: {
      started: Date.parse("2026-08-16T01:00:00.000Z"),
      completed: Date.parse("2026-08-16T02:00:00.000Z"),
    },
  });
  assert.equal(readiness.executable, false);
  assert.deepEqual(readiness.missing_price_meters, ["compute_ms"]);
  assert.ok(
    readiness.blockers.includes("formal_collection_price_source_incomplete"),
  );
});

test("runner-owned State payload is sorted, exact, retained, and package-proxy/hardlink/empty sources fail closed", async (t) => {
  const root = await realpath(
    await mkdtemp(path.join(os.tmpdir(), "ty-level4-state-")),
  );
  const executionRoot = path.join(root, "formal-evidence", invocationId);
  const retention = {
    scope: "this-delivery-precollection-proxy-only",
    status: "frozen_supported",
    retention_hours: 24,
    basis: "test-contract",
    source_sha256: "b".repeat(64),
  };
  await mkdir(executionRoot, { recursive: true });
  try {
    const capture = await FormalStateCapture.create({
      executionRoot,
      invocationId,
    });
    await mkdir(path.join(capture.root, "nested"));
    await writeFile(path.join(capture.root, "b.bin"), "beta");
    await writeFile(path.join(capture.root, "nested", "a.bin"), "alpha");
    const payloadPath = path.join(executionRoot, "state-payload.bin");
    const ledgerPath = path.join(executionRoot, "storage-ledger.json");
    const result = await capture.finalize({
      payloadPath,
      ledgerPath,
      retention,
    });
    assert.equal(await readFile(payloadPath, "utf8"), "betaalpha");
    assert.equal(result.payload_bytes, 9);
    const ledger = JSON.parse(await readFile(ledgerPath, "utf8"));
    assert.deepEqual(
      ledger.entries.map((entry) => entry.path),
      ["b.bin", "nested/a.bin"],
    );
    assert.equal(ledger.retention_hours, 24);

    const empty = await FormalStateCapture.create({
      executionRoot,
      invocationId,
    });
    await assert.rejects(
      () =>
        empty.finalize({
          payloadPath: path.join(executionRoot, "empty-payload.bin"),
          ledgerPath: path.join(executionRoot, "empty-ledger.json"),
          retention,
        }),
      /formal_state_payload_empty_file_set/u,
    );
    await empty.abort();

    const proxy = await FormalStateCapture.create({
      executionRoot,
      invocationId,
    });
    const packagePath = path.join(root, "candidate.tgz");
    await writeFile(packagePath, "package-is-not-state");
    await link(packagePath, path.join(proxy.root, "candidate.tgz"));
    await assert.rejects(
      () =>
        proxy.finalize({
          payloadPath: path.join(executionRoot, "proxy-payload.bin"),
          ledgerPath: path.join(executionRoot, "proxy-ledger.json"),
          retention,
        }),
      /formal_state_not_regular/u,
    );
    await proxy.abort();

    const linked = await FormalStateCapture.create({
      executionRoot,
      invocationId,
    });
    try {
      await symlink(packagePath, path.join(linked.root, "linked.bin"), "file");
      await assert.rejects(
        () =>
          linked.finalize({
            payloadPath: path.join(executionRoot, "link-payload.bin"),
            ledgerPath: path.join(executionRoot, "link-ledger.json"),
            retention,
          }),
        /formal_state_link/u,
      );
    } catch (error) {
      if (!["EPERM", "EACCES"].includes(error?.code)) throw error;
      t.diagnostic(
        "file symlink creation unavailable; hardlink rejection remained exercised",
      );
    } finally {
      await linked.abort();
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("runner-owned State capture rejects a replaced root and nested junction escape", async (t) => {
  const root = await realpath(
    await mkdtemp(path.join(os.tmpdir(), "ty-level4-state-junction-")),
  );
  const executionRoot = path.join(root, "formal-evidence", invocationId);
  const outside = path.join(root, "outside-state");
  const retention = {
    scope: "this-delivery-precollection-proxy-only",
    status: "frozen_supported",
    retention_hours: 24,
    basis: "test-contract",
    source_sha256: "b".repeat(64),
  };
  await mkdir(executionRoot, { recursive: true });
  await mkdir(outside);
  await writeFile(path.join(outside, "escaped.bin"), "escaped-state");
  try {
    for (const placement of ["root", "nested"]) {
      const capture = await FormalStateCapture.create({
        executionRoot,
        invocationId,
      });
      try {
        if (placement === "root") {
          await rm(capture.root, { recursive: true });
          await symlink(
            outside,
            capture.root,
            process.platform === "win32" ? "junction" : "dir",
          );
        } else {
          await symlink(
            outside,
            path.join(capture.root, "escaped"),
            process.platform === "win32" ? "junction" : "dir",
          );
        }
        await assert.rejects(
          () =>
            capture.finalize({
              payloadPath: path.join(executionRoot, `${placement}-payload.bin`),
              ledgerPath: path.join(executionRoot, `${placement}-ledger.json`),
              retention,
            }),
          /formal_state_(?:root_closed|link|reparse)/u,
        );
      } catch (error) {
        if (!["EPERM", "EACCES"].includes(error?.code)) throw error;
        t.diagnostic(`${placement} junction creation unavailable`);
      } finally {
        await capture.abort();
      }
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("runner-owned output locators stay inside the run root and post-close reads reject linked files", async () => {
  const root = await realpath(
    await mkdtemp(path.join(os.tmpdir(), "ty-level4-output-")),
  );
  try {
    assert.throws(
      () => resolveFormalArtifact(root, "../escaped-output.bin"),
      /formal_collection_artifact_escape/u,
    );
    const external = path.join(root, "external.bin");
    const linked = path.join(root, "output.bin");
    await writeFile(external, "external-output");
    await link(external, linked);
    await assert.rejects(
      () => readFreshFormalFile(linked, 1024),
      /formal_collection_regular_file/u,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("fixed Provider adapter is invocation-bound and fails closed when model or parent credential is unavailable", async () => {
  const adapter = new FormalProviderCaptureAdapter(
    await fixtureProviderIdentity(null),
  );
  assert.throws(
    () => adapter.assertReadyForAttempt(),
    /formal_provider_source_not_ready_for_attempt/u,
  );
  await assert.rejects(
    () =>
      adapter.openOneShotBridge({
        invocationId,
        scenarioTimeoutMs: 1_000,
      }),
    /formal_provider_source_not_ready_for_attempt/u,
  );
});

test("runner-owned Provider acquisition source fixes isolated transport, bounded protocol, sanitized launch, and frozen identity", async () => {
  const parentExecArgv = [...process.execArgv];
  process.execArgv.splice(0, process.execArgv.length, "--synthetic-parent-only");
  try {
    assert.deepEqual(formalProviderWorkerEnvironment({}), {});
  } finally {
    process.execArgv.splice(0, process.execArgv.length, ...parentExecArgv);
  }
  assert.throws(
    () => formalProviderWorkerEnvironment({ NODE_OPTIONS: "--require=x" }),
    /formal_provider_launch_envelope_unsupported/u,
  );
  await assertProviderBridgeControls();
});
