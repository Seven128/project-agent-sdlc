import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { freezeLocalVerifierDependencyClosure } from "../../packages/ty-context/dist/lib/long-task-verifier-dependency-closure.js";

test("a static verifier URL may resolve to the repository root directory", async () => {
  const repository = await mkdtemp(path.join(os.tmpdir(), "ty-context-root-url-"));
  try {
    await mkdir(path.join(repository, "tests", "acceptance"), { recursive: true });
    const relative = "tests/acceptance/config.mjs";
    await writeFile(
      path.join(repository, ...relative.split("/")),
      'export const root = new URL("../../", import.meta.url);\nexport const testDir = new URL("./", import.meta.url);\n',
      "utf8",
    );
    const manifest = {
      files: [{ path: relative }],
    };

    const frozen = await freezeLocalVerifierDependencyClosure(
      repository,
      [relative],
      manifest,
      ["apps/product/**", "tests/acceptance/**"],
    );

    assert.deepEqual(Object.keys(frozen), [relative]);
  } finally {
    await rm(repository, { recursive: true, force: true });
  }
});

test("the same root directory URL still fails closed without runtime ownership", async () => {
  const repository = await mkdtemp(path.join(os.tmpdir(), "ty-context-root-url-"));
  try {
    await mkdir(path.join(repository, "tests", "acceptance"), { recursive: true });
    const relative = "tests/acceptance/config.mjs";
    await writeFile(
      path.join(repository, ...relative.split("/")),
      'export const root = new URL("../../", import.meta.url);\n',
      "utf8",
    );
    const manifest = {
      files: [{ path: relative }],
    };

    await assert.rejects(
      freezeLocalVerifierDependencyClosure(repository, [relative], manifest),
      /verification_dependency_not_found:tests\/acceptance\/config\.mjs:\.\.\/\.\./u,
    );
  } finally {
    await rm(repository, { recursive: true, force: true });
  }
});
