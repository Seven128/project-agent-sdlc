import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { link, mkdir, readFile, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { recoveryCheckpointRelativePath } from "../../packages/ty-context/dist/lib/design-resource-recovery-files.js";
import {
  applyDesignResourceRecoveryWriteback,
  createDesignResourceRecoveryCheckpoint,
  removeDesignResourceRecoveryCheckpoint,
} from "../../packages/ty-context/dist/lib/design-resource-recovery.js";
import {
  createRecoveryFixture,
  sha256,
} from "./design-resource-recovery-fixture.mjs";
import {
  canonicalValueJson,
  sha256Hex,
} from "../../packages/ty-context/dist/lib/strict-codec.js";

const exec = promisify(execFile);
const repo = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const cli = path.join(repo, "packages", "ty-context", "dist", "cli.js");

test("writeback preserves supported encodings and uniform EOL", async () => {
  for (const [encoding, newline] of [
    ["utf8-bom", "\n"],
    ["utf16le", "\r\n"],
    ["utf16be", "\r"],
  ]) {
    const fixture = await createRecoveryFixture({
      sessionId: `encoding-${encoding}`,
      encoding,
      newline,
    });
    try {
      await createDesignResourceRecoveryCheckpoint(fixture.root, fixture.input);
      const result = await applyDesignResourceRecoveryWriteback(
        fixture.root,
        fixture.input.session_id,
        fixture.auditLocator,
      );
      assert.equal(result.status, "writeback-applied");
      assert.deepEqual(
        await readFile(path.join(fixture.root, "proposal.md")),
        fixture.afterBytes,
      );
    } finally {
      await fixture.cleanup();
    }
  }
});

test("mixed EOL and ambiguous patches fail before checkpoint publication", async () => {
  for (const content of [
    "# Proposal\r\ncolor: blue\nlayout: compact\r\n",
    "# Proposal\ncolor: blue\ncolor: blue\nlayout: compact\n",
  ]) {
    const fixture = await createRecoveryFixture({
      sessionId: `text-${Math.random().toString(16).slice(2)}`,
    });
    try {
      const before = Buffer.from(content, "utf8");
      const after = Buffer.from(content.replace("color: blue", "color: red"));
      await writeFile(path.join(fixture.root, "proposal.md"), before);
      fixture.input.writeback.pre_write_raw_byte_digest = sha256(before);
      fixture.input.writeback.expected_post_write_raw_byte_digest =
        sha256(after);
      const start = content.indexOf("color: blue");
      fixture.input.writeback.patch.operations[0].source_span = {
        coordinate_system: "utf16-code-unit-v1",
        start_offset: start,
        end_offset: start + "color: blue".length,
        before_text_sha256:
          fixture.input.writeback.patch.operations[0].before_text_sha256,
      };
      fixture.input.writeback.patch_identity = sha256Hex(
        canonicalValueJson(fixture.input.writeback.patch),
      );
      await assert.rejects(
        createDesignResourceRecoveryCheckpoint(fixture.root, fixture.input),
        /mixed_eol|patch_occurrence_mismatch/u,
      );
    } finally {
      await fixture.cleanup();
    }
  }
});

test("path escape, symlink, hardlink and session collisions are blocked", async () => {
  const escape = await createRecoveryFixture({ sessionId: "path-escape" });
  try {
    escape.input.base.locator = "../outside.md";
    await assert.rejects(
      createDesignResourceRecoveryCheckpoint(escape.root, escape.input),
      /unsafe_path/u,
    );
  } finally {
    await escape.cleanup();
  }
  const links = await createRecoveryFixture({ sessionId: "path-links" });
  try {
    const original = path.join(links.root, links.input.base.locator);
    const hard = path.join(links.root, "source", "hard-base.md");
    await link(original, hard);
    links.input.base.locator = "source/hard-base.md";
    await assert.rejects(
      createDesignResourceRecoveryCheckpoint(links.root, links.input),
      /hardlink_not_allowed/u,
    );
    const linked = path.join(links.root, "linked-source");
    await symlink(
      path.join(links.root, "source"),
      linked,
      process.platform === "win32" ? "junction" : "dir",
    );
    links.input.base.locator = "linked-source/base-proposal.md";
    await assert.rejects(
      createDesignResourceRecoveryCheckpoint(links.root, links.input),
      /parent_symlink_not_allowed/u,
    );
  } finally {
    await links.cleanup();
  }
  const collision = await createRecoveryFixture({ sessionId: "collision" });
  try {
    const session = path.join(
      collision.root,
      path.dirname(recoveryCheckpointRelativePath("collision")),
    );
    await mkdir(session, { recursive: true });
    await writeFile(path.join(session, "user.txt"), "owned by user\n");
    await assert.rejects(
      createDesignResourceRecoveryCheckpoint(collision.root, collision.input),
      /session_directory_collision/u,
    );
  } finally {
    await collision.cleanup();
  }
});

test("cleanup failure is explicit and never removes an unowned sibling", async () => {
  const fixture = await createRecoveryFixture({
    sessionId: "cleanup-collision",
  });
  try {
    const created = await createDesignResourceRecoveryCheckpoint(
      fixture.root,
      fixture.input,
    );
    const sibling = path.join(
      fixture.root,
      path.dirname(created.checkpoint_path),
      "user.txt",
    );
    await writeFile(sibling, "preserve\n");
    const result = await removeDesignResourceRecoveryCheckpoint(
      fixture.root,
      fixture.input.session_id,
      created.checkpoint_raw_byte_digest,
    );
    assert.equal(result.status, "partial");
    assert.equal(result.reason, "unowned_entries");
    assert.equal(result.checkpoint_removed, false);
    assert.deepEqual(result.retained_entries, ["checkpoint.json", "user.txt"]);
    assert.equal(await readFile(sibling, "utf8"), "preserve\n");
    assert.ok(
      await readFile(path.join(fixture.root, created.checkpoint_path), "utf8"),
    );
  } finally {
    await fixture.cleanup();
  }
});

test("nested CLI exposes explicit create/update/inspect/preview without implicit Proposal writes", async () => {
  const fixture = await createRecoveryFixture({ sessionId: "cli-session" });
  try {
    const created = await exec(
      process.execPath,
      [
        cli,
        "design-resource",
        "recovery",
        "create",
        fixture.input.session_id,
        "--input",
        fixture.stateLocator,
        "--json",
      ],
      { cwd: fixture.root, windowsHide: true },
    );
    const createdResult = JSON.parse(created.stdout);
    assert.equal(createdResult.status, "created");
    fixture.input.provider.run.immutable_identity = "run-revision-2";
    await writeFile(
      path.join(fixture.root, fixture.stateLocator),
      `${JSON.stringify(fixture.input, null, 2)}\n`,
      "utf8",
    );
    const updated = await exec(
      process.execPath,
      [
        cli,
        "design-resource",
        "recovery",
        "update",
        fixture.input.session_id,
        "--input",
        fixture.stateLocator,
        "--expected-sha256",
        createdResult.checkpoint_raw_byte_digest,
        "--json",
      ],
      { cwd: fixture.root, windowsHide: true },
    );
    assert.equal(JSON.parse(updated.stdout).status, "updated");
    const before = await readFile(path.join(fixture.root, "proposal.md"));
    for (const action of ["inspect", "preview"]) {
      const output = await exec(
        process.execPath,
        [cli, "design-resource", "recovery", action, "cli-session", "--json"],
        { cwd: fixture.root, windowsHide: true },
      );
      assert.equal(JSON.parse(output.stdout).status, "recoverable");
    }
    assert.deepEqual(
      await readFile(path.join(fixture.root, "proposal.md")),
      before,
    );
  } finally {
    await fixture.cleanup();
  }
});

test("nested CLI reconcile is read-only for a resource-owned-only checkpoint", async () => {
  const fixture = await createRecoveryFixture({
    sessionId: "cli-reconcile",
    resourceOwned: true,
  });
  try {
    await exec(
      process.execPath,
      [
        cli,
        "design-resource",
        "recovery",
        "create",
        fixture.input.session_id,
        "--input",
        fixture.stateLocator,
        "--json",
      ],
      { cwd: fixture.root, windowsHide: true },
    );
    const before = await readFile(path.join(fixture.root, "proposal.md"));
    const reconciled = await exec(
      process.execPath,
      [
        cli,
        "design-resource",
        "recovery",
        "reconcile",
        fixture.input.session_id,
        "--audit",
        fixture.auditLocator,
        "--json",
      ],
      { cwd: fixture.root, windowsHide: true },
    );
    const result = JSON.parse(reconciled.stdout);
    assert.equal(result.status, "reconciliation-balanced");
    assert.equal(result.write_transaction, false);
    assert.deepEqual(
      await readFile(path.join(fixture.root, "proposal.md")),
      before,
    );
  } finally {
    await fixture.cleanup();
  }
});
