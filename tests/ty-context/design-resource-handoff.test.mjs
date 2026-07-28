import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { preflightDesignResourceHandoff } from "../../packages/ty-context/dist/index.js";
import { DESIGN_RESOURCE_DIMENSIONS } from "../../packages/ty-context/dist/lib/design-resource-handoff-types.js";
import {
  DESIGN_HANDOFF_PATH,
  DESIGN_RESOURCE_PATH,
  writeDesignResourceHandoff,
  writeDesignResourceHandoffFixture,
} from "./design-resource-handoff-fixture.mjs";

const exec = promisify(execFile);
const repo = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const cli = path.join(repo, "packages", "ty-context", "dist", "cli.js");

test("one strict handoff preflight closes all eight dimensions and serves the CLI", async () => {
  await withFixture(async (root) => {
    const result = await preflightDesignResourceHandoff(
      root,
      DESIGN_HANDOFF_PATH,
    );
    assert.equal(result.status, "ready");
    assert.equal(result.counts.subjects, 1);
    assert.equal(result.counts.coverage, 8);
    assert.ok(result.counts.facts > result.counts.coverage);
    assert.equal(
      result.counts.resource_fact_closure,
      result.handoff.resources.length,
    );
    assert.ok(
      result.handoff.resource_fact_closure.some(
        (row) =>
          row.resource_ref === "resource.supporting-notes" &&
          row.disposition === "supporting_only" &&
          row.fact_refs.length === 0,
      ),
    );
    assert.deepEqual(
      result.handoff.coverage.map((row) => row.dimension).sort(),
      [...DESIGN_RESOURCE_DIMENSIONS].sort(),
    );

    const { stdout } = await exec(
      process.execPath,
      [cli, "design-resource", "preflight", DESIGN_HANDOFF_PATH, "--json"],
      { cwd: root },
    );
    const reported = JSON.parse(stdout);
    assert.equal(reported.status, "ready");
    assert.equal(reported.handoff.targets[0].key, "main-default");
  });
});

test("missing, duplicate, unresolved and unknown coverage fail closed", async () => {
  for (const [mutate, expected] of [
    [
      (handoff) => handoff.coverage.pop(),
      /coverage_cell_missing:surface\.main:main-default:desktop-light-default-nominal-mouse:assets/u,
    ],
    [
      (handoff) => handoff.coverage.push(structuredClone(handoff.coverage[0])),
      /coverage_key_duplicate|coverage_cell_duplicate/u,
    ],
    [
      (handoff) => {
        const row = handoff.coverage.find(
          (item) => item.dimension === "motion",
        );
        row.disposition = "decision_required";
        row.evidence_refs = [];
        row.verification_methods = [];
      },
      /unresolved_coverage:coverage\.motion/u,
    ],
    [
      (handoff) => {
        handoff.unknown_future_semantics = true;
      },
      /unknown keys: unknown_future_semantics/u,
    ],
  ]) {
    await withFixture(async (root, handoff) => {
      mutate(handoff);
      await writeDesignResourceHandoff(root, handoff);
      await assert.rejects(
        preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
        expected,
      );
    });
  }
});

test("fact inventory and resource fact closure fail closed on every conservation break", async () => {
  for (const [mutate, expected] of [
    [
      (handoff) => handoff.coverage[0].fact_refs.pop(),
      /coverage_fact_refs_mismatch:coverage\.surface-flow/u,
    ],
    [(handoff) => handoff.facts.pop(), /fact_ref_unknown/u],
    [
      (handoff) => {
        handoff.facts[0].evidence_refs = [];
      },
      /fact_evidence_refs_required/u,
    ],
    [
      (handoff) => {
        handoff.facts[0].source_item_refs = [];
      },
      /fact_source_item_refs_required/u,
    ],
    [
      (handoff) => handoff.resource_fact_closure.pop(),
      /resource_fact_closure_missing:resource\.supporting-notes/u,
    ],
    [
      (handoff) => {
        handoff.resource_fact_closure[0].disposition = "supporting_only";
      },
      /supporting_only_resource_fact_forbidden:closure\.main/u,
    ],
    [
      (handoff) => {
        handoff.facts[0].unknown_fact_semantics = true;
      },
      /unknown keys: unknown_fact_semantics/u,
    ],
  ]) {
    await withFixture(async (root, handoff) => {
      mutate(handoff);
      await writeDesignResourceHandoff(root, handoff);
      await assert.rejects(
        preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
        expected,
      );
    });
  }
});

test("an exact target requires full-target layout and visual_pixel facts while a partial constraint is not promoted", async () => {
  await withFixture(async (root, handoff) => {
    removeVisualPixelFacts(handoff);
    await writeDesignResourceHandoff(root, handoff);
    await assert.rejects(
      preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
      /exact_target_full_target_fact_missing:main-default:desktop-light-default-nominal-mouse:visual_pixel/u,
    );
  });

  await withFixture(async (root, handoff) => {
    handoff.targets[0].interpretation = "constraint";
    handoff.resources[0].role = "constraint";
    for (const fact of handoff.facts)
      if (fact.observation_scope === "full_target")
        fact.observation_scope = "subject";
    removeVisualPixelFacts(handoff);
    await writeDesignResourceHandoff(root, handoff);
    const result = await preflightDesignResourceHandoff(
      root,
      DESIGN_HANDOFF_PATH,
    );
    assert.equal(result.status, "ready");
    assert.equal(result.handoff.targets[0].interpretation, "constraint");
    assert.equal(
      result.handoff.facts.some(
        (fact) => fact.verification_method === "visual_pixel",
      ),
      false,
    );
  });
});

test("every subject, target and condition cell must close all eight dimensions", async () => {
  await withFixture(async (root, handoff) => {
    handoff.conditions.push({
      ...structuredClone(handoff.conditions[0]),
      key: "mobile-default",
      viewport: { width: 390, height: 844, unit: "px" },
    });
    handoff.targets[0].condition_refs.push("mobile-default");
    await writeDesignResourceHandoff(root, handoff);
    await assert.rejects(
      preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
      /coverage_cell_missing:surface\.main:main-default:mobile-default:surface_flow/u,
    );
  });

  await withFixture(async (root, handoff) => {
    handoff.targets.push({
      ...structuredClone(handoff.targets[0]),
      key: "main-secondary",
    });
    handoff.subjects[0].target_refs.push("main-secondary");
    await writeDesignResourceHandoff(root, handoff);
    await assert.rejects(
      preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
      /coverage_cell_missing:surface\.main:main-secondary:desktop-light-default-nominal-mouse:surface_flow/u,
    );
  });

  await withFixture(async (root, handoff) => {
    handoff.scope.surface_keys.push("surface.secondary");
    handoff.subjects.push({
      ...structuredClone(handoff.subjects[0]),
      key: "subject.secondary",
      stable_keys: ["surface.secondary"],
    });
    for (const row of handoff.coverage)
      row.subject_refs.push("subject.secondary");
    await writeDesignResourceHandoff(root, handoff);
    await assert.rejects(
      preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
      /coverage_cell_without_fact:coverage\.surface-flow:subject\.secondary:main-default:desktop-light-default-nominal-mouse/u,
    );
  });
});

test("typed locators must resolve in the immutable resource", async () => {
  await withFixture(async (root, handoff) => {
    handoff.evidence[0].locator.value = "#does-not-exist";
    await writeDesignResourceHandoff(root, handoff);
    await assert.rejects(
      preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
      /locator_not_found:frame-main:resource\.main:html_selector:#does-not-exist/u,
    );
  });

  await withFixture(async (root, handoff) => {
    handoff.evidence[0].locator = "page.html#frame-main";
    await writeDesignResourceHandoff(root, handoff);
    await assert.rejects(
      preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
      /design_resource_handoff\.evidence\[0\]\.locator:must be an object/u,
    );
  });
});

test("implementation source profiles close the declared and discovered dependency set", async () => {
  await withFixture(async (root, handoff) => {
    handoff.targets[0].source_profile.dependency_resource_refs = [
      "resource.undeclared",
    ];
    await writeDesignResourceHandoff(root, handoff);
    await assert.rejects(
      preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
      /source_profile_dependency_resource_ref_unknown:resource\.undeclared/u,
    );
  });

  await withFixture(async (root, handoff) => {
    const resource = await readFile(
      path.join(root, DESIGN_RESOURCE_PATH),
      "utf8",
    );
    const changed = resource.replace(
      "</body>",
      '<script src="missing.js"></script>\n</body>',
    );
    await writeFile(path.join(root, DESIGN_RESOURCE_PATH), changed);
    handoff.resources[0].sha256 = createHash("sha256")
      .update(changed)
      .digest("hex");
    await writeDesignResourceHandoff(root, handoff);
    await assert.rejects(
      preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
      /implementation_dependency_undeclared:main-default:design\/page\.html:missing\.js:design\/missing\.js/u,
    );
  });
});

test("a static frame cannot substitute for motion or accessibility evidence", async () => {
  for (const dimension of ["motion", "accessibility"]) {
    await withFixture(async (root, handoff) => {
      const row = handoff.coverage.find((item) => item.dimension === dimension);
      row.evidence_refs = ["frame-main"];
      await writeDesignResourceHandoff(root, handoff);
      await assert.rejects(
        preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
        new RegExp(
          `coverage_evidence_kind_incompatible:coverage\\.${dimension}:${dimension}:frame-main:frame`,
          "u",
        ),
      );
    });
  }
  await withFixture(async (root, handoff) => {
    const tokens = handoff.resources.find(
      (item) => item.key === "resource.tokens",
    );
    tokens.media_type = "image/png";
    const tokenEvidence = handoff.evidence.find(
      (item) => item.key === "token-main",
    );
    tokenEvidence.locator = { kind: "whole_resource", value: "." };
    await writeDesignResourceHandoff(root, handoff);
    await assert.rejects(
      preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
      /evidence_resource_media_type_incompatible:token-main:token_spec:image\/png/u,
    );
  });
});

test("resource mutation and unknown Source items invalidate the handoff", async () => {
  await withFixture(async (root) => {
    await writeFile(path.join(root, DESIGN_RESOURCE_PATH), "changed\n");
    await assert.rejects(
      preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
      /resource_digest_mismatch:resource\.main/u,
    );
  });
  await withFixture(async (root, handoff) => {
    handoff.coverage[0].source_item_refs = ["missing-source-item"];
    await writeDesignResourceHandoff(root, handoff);
    await assert.rejects(
      preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
      /source_item_ref_unknown:missing-source-item/u,
    );
  });
});

test("repository paths, scoped surfaces and design Source kinds remain fail closed", async () => {
  await withFixture(async (root, handoff) => {
    handoff.resources[0].path = "../outside.html";
    await writeDesignResourceHandoff(root, handoff);
    await assert.rejects(
      preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
      /unsafe_path:design_resource_handoff\.resources\[0\]\.path/u,
    );
  });
  await withFixture(async (root, handoff) => {
    handoff.scope.surface_keys = ["surface.unaccounted"];
    await writeDesignResourceHandoff(root, handoff);
    await assert.rejects(
      preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
      /scope_surface_subject_missing:surface\.unaccounted/u,
    );
  });
  await withFixture(async (root) => {
    const file = path.join(root, DESIGN_HANDOFF_PATH);
    const content = await readFile(file, "utf8");
    await writeFile(file, content.replace("kind=requirement", "kind=non_goal"));
    await assert.rejects(
      preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
      /design_source_item_kind_unsupported:design-main:non_goal/u,
    );
  });
});

test("the embedded YAML is unique and remains readable ordinary Markdown Source", async () => {
  await withFixture(async (root) => {
    const file = path.join(root, DESIGN_HANDOFF_PATH);
    const content = await readFile(file, "utf8");
    await writeFile(file, `${content}\n${content}`);
    await assert.rejects(
      preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
      /block_count:design\/handoff\.md:2/u,
    );
  });
});

async function withFixture(action) {
  const root = await mkdtemp(path.join(os.tmpdir(), "design-handoff-"));
  try {
    const { handoff } = await writeDesignResourceHandoffFixture(root);
    await action(root, handoff);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function removeVisualPixelFacts(handoff) {
  const removed = new Set(
    handoff.facts
      .filter((fact) => fact.verification_method === "visual_pixel")
      .map((fact) => fact.key),
  );
  handoff.facts = handoff.facts.filter((fact) => !removed.has(fact.key));
  for (const row of handoff.coverage) {
    row.fact_refs = row.fact_refs.filter((ref) => !removed.has(ref));
    row.verification_methods = row.verification_methods.filter(
      (method) => method !== "visual_pixel",
    );
  }
  for (const closure of handoff.resource_fact_closure)
    closure.fact_refs = closure.fact_refs.filter((ref) => !removed.has(ref));
}
