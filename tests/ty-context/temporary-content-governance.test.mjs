import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const exec = promisify(execFile);
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
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
  assert.match(contract, /writer, reader, migration, tests, public documentation/iu);
  assert.match(contract, /no global Temporary Artifact Manager/iu);
});

test("tracked work products remain Contract/Source classes, not inferred cache", async () => {
  const { stdout } = await exec(
    "git",
    ["ls-files", "--", ".work_products/**"],
    { cwd: repo, windowsHide: true },
  );
  const tracked = stdout.trim().split(/\r?\n/u).filter(Boolean);
  assert.ok(tracked.length > 0);
  assert.ok(tracked.every((file) => file.endsWith("/delivery-contract.yaml")));
  const contract = await read(
    "project_context/areas/harness-package/contracts/temporary-content-governance.md",
  );
  assert.match(
    contract,
    /Tracked `.work_products\/\*\*\/delivery-contract\.yaml`[\s\S]*User\/Long-Task Source and Contract owners/iu,
  );
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
