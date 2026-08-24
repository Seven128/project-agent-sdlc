import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  canonicalValueJson,
  sha256Hex,
} from "../../packages/ty-context/dist/lib/strict-codec.js";
import { verifierAuthorityDiff } from "../../packages/ty-context/dist/lib/long-task-verifier-authority.js";
import { captureVerifierIdentity } from "../../packages/ty-context/dist/lib/long-task-verifier-identity.js";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const packageRoot = path.join(repositoryRoot, "packages", "ty-context");
const helperNames = [
  "formal_process_supervisor_native_types.cs",
  "formal_process_supervisor_native_run.cs",
  "formal_process_supervisor_native_helpers.cs",
  "windows_job_process_supervisor.ps1",
];

test("VerifierIdentityV2 freezes every package-owned Windows Job supervisor asset", async () => {
  const identity = await captureVerifierIdentity(repositoryRoot, false);

  for (const name of helperNames) {
    const bundleKey = `assets/runtime/windows-job-supervisor/${name}`;
    const [canonical, packaged] = await Promise.all([
      readFile(path.join(repositoryRoot, "tools", name)),
      readFile(
        path.join(
          packageRoot,
          "assets",
          "runtime",
          "windows-job-supervisor",
          name,
        ),
      ),
    ]);
    assert.deepEqual(packaged, canonical, `${name} package mirror drifted`);
    assert.equal(identity.bundle_files[bundleKey], sha256Hex(packaged));
  }

  assert.equal(
    identity.bundle_sha256,
    sha256Hex(canonicalValueJson(identity.bundle_files)),
  );
});

test("a Windows Job helper asset change is existing verifier bundle drift", async () => {
  const current = await captureVerifierIdentity(repositoryRoot, false);
  const helper =
    "assets/runtime/windows-job-supervisor/windows_job_process_supervisor.ps1";
  const compiled = structuredClone(current);
  compiled.bundle_files[helper] = "0".repeat(64);
  compiled.bundle_sha256 = sha256Hex(canonicalValueJson(compiled.bundle_files));

  const diff = verifierAuthorityDiff(compiled, current);
  assert.equal(diff.verifier_content_changed, true);
  assert.equal(diff.verifier_runtime_locator_changed, false);
  assert.ok(diff.verifier_files_changed.includes(helper));
  assert.ok(diff.verifier_files_changed.includes("<bundle>"));
});
