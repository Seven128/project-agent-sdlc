import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { runInit } from "../../packages/ty-context/dist/lib/init.js";
import { createUpgradePlan } from "../../packages/ty-context/dist/lib/migrations.js";

const marker = "<!-- ty-context-design-authority-format: bundle-v1 -->";

test("upgrade reports bundle marker and manifest mismatch as manual Authority work", async () => {
  for (const state of ["manifest-only", "marker-only", "invalid-marker"]) {
    const repository = await mkdtemp(
      path.join(os.tmpdir(), "ty-design-migration-"),
    );
    try {
      await runInit(repository, { adopt: false, force: false });
      if (state !== "marker-only") {
        await mkdir(path.join(repository, "design_system"));
        await writeFile(
          path.join(repository, "design_system/authority.manifest.json"),
          "{}\n",
          "utf8",
        );
      }
      if (state !== "manifest-only")
        await writeFile(
          path.join(repository, "DESIGN.md"),
          state === "marker-only"
            ? `${marker}\n# Design\n`
            : `# Design\n${marker}\n`,
          "utf8",
        );
      const plan = await createUpgradePlan(repository);
      const item = plan.manual_required.find(
        (entry) => entry.id === "design-authority-bundle-marker-v1",
      );
      assert.ok(item, state);
      assert.match(item.message, /explicit DSA\/Authority Revision/u);
    } finally {
      await rm(repository, { recursive: true, force: true });
    }
  }
});

test("upgrade leaves true legacy and a paired bundle marker alone", async () => {
  for (const state of ["legacy", "paired"]) {
    const repository = await mkdtemp(
      path.join(os.tmpdir(), "ty-design-migration-"),
    );
    try {
      await runInit(repository, { adopt: false, force: false });
      if (state === "paired") {
        await writeFile(
          path.join(repository, "DESIGN.md"),
          `${marker}\n# Design\n`,
          "utf8",
        );
        await mkdir(path.join(repository, "design_system"));
        await writeFile(
          path.join(repository, "design_system/authority.manifest.json"),
          "{}\n",
          "utf8",
        );
      }
      const plan = await createUpgradePlan(repository);
      assert.equal(
        plan.manual_required.some(
          (entry) => entry.id === "design-authority-bundle-marker-v1",
        ),
        false,
        state,
      );
    } finally {
      await rm(repository, { recursive: true, force: true });
    }
  }
});
