import assert from "node:assert/strict";
import { link, mkdir, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { inspectDesignAuthorityClosure } from "../../packages/ty-context/dist/lib/design-authority-closure.js";
import {
  BUTTON,
  DESIGN,
  assertDiagnostic,
  baseManifest,
  cleanup,
  temporaryRepository,
  writeManifest,
} from "./design-authority-closure-fixture.mjs";

test("strict manifest rejects unknown fields, unsafe paths and case collisions", async () => {
  const cases = [
    { extra: true },
    {
      authority_files: [
        { path: "design_system/../escape.md", kind: "component" },
      ],
    },
    {
      authority_files: [
        { path: "design_system/A.md", kind: "component" },
        { path: "design_system/a.md", kind: "component" },
      ],
    },
  ];
  for (const mutate of cases) {
    const repository = await temporaryRepository();
    try {
      await mkdir(path.join(repository, "design_system"), { recursive: true });
      await writeFile(path.join(repository, "DESIGN.md"), DESIGN, "utf8");
      const manifest = baseManifest();
      Object.assign(manifest, mutate);
      await writeFile(
        path.join(repository, "design_system/authority.manifest.json"),
        JSON.stringify(manifest),
        "utf8",
      );
      const result = await inspectDesignAuthorityClosure(repository);
      assert.equal(result.status, "invalid");
      assertDiagnostic(result, "design_authority_invalid");
    } finally {
      await cleanup(repository);
    }
  }
});

test("BOM, symlink and hardlink Authority members fail closed", async (t) => {
  const bomRepository = await temporaryRepository();
  try {
    await writeFile(
      path.join(bomRepository, "DESIGN.md"),
      Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(DESIGN)]),
    );
    const bom = await inspectDesignAuthorityClosure(bomRepository);
    assert.equal(bom.status, "invalid");
    assert.match(bom.diagnostics[0].detail, /utf8_bom_not_allowed/u);
  } finally {
    await cleanup(bomRepository);
  }

  await t.test("hardlink", async () => {
    const repository = await temporaryRepository();
    try {
      await mkdir(path.join(repository, "design_system/components"), {
        recursive: true,
      });
      await writeFile(path.join(repository, "DESIGN.md"), DESIGN, "utf8");
      const source = path.join(repository, "source.md");
      await writeFile(source, BUTTON, "utf8");
      await link(
        source,
        path.join(repository, "design_system/components/button.md"),
      );
      await writeManifest(repository, baseManifest());
      const result = await inspectDesignAuthorityClosure(repository);
      assert.equal(result.status, "invalid");
      assert.match(result.diagnostics[0].detail, /hardlink_not_allowed/u);
    } finally {
      await cleanup(repository);
    }
  });

  await t.test("symlink", async (t) => {
    const repository = await temporaryRepository();
    try {
      await mkdir(path.join(repository, "design_system/components"), {
        recursive: true,
      });
      await writeFile(path.join(repository, "DESIGN.md"), DESIGN, "utf8");
      const source = path.join(repository, "source.md");
      await writeFile(source, BUTTON, "utf8");
      try {
        await symlink(
          source,
          path.join(repository, "design_system/components/button.md"),
        );
      } catch (error) {
        if (error?.code === "EPERM")
          return t.skip("symlink privilege unavailable");
        throw error;
      }
      await writeManifest(repository, baseManifest());
      const result = await inspectDesignAuthorityClosure(repository);
      assert.equal(result.status, "invalid");
      assert.match(result.diagnostics[0].detail, /symlink_not_allowed/u);
    } finally {
      await cleanup(repository);
    }
  });
});
