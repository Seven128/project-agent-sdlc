import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import YAML from "yaml";
import { preflightDesignResourceHandoff } from "../../packages/ty-context/dist/index.js";
import {
  containsDesignResourceHandoff,
  parseDesignResourceHandoffMarkdown,
  scanDesignResourceHandoffBlocks,
} from "../../packages/ty-context/dist/lib/design-resource-handoff-parser.js";
import { DESIGN_RESOURCE_DIMENSIONS } from "../../packages/ty-context/dist/lib/design-resource-handoff-types.js";
import {
  DESIGN_HANDOFF_PATH,
  DESIGN_RESOURCE_PATH,
  manifestBackedDesignResourceHandoff,
  writeDesignResourceFactManifest,
  writeDesignResourceHandoff,
  writeDesignResourceHandoffFixture,
} from "./design-resource-handoff-fixture.mjs";

const exec = promisify(execFile);
const repo = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const cli = path.join(repo, "packages", "ty-context", "dist", "cli.js");

test("field-scale Unicode handoff fences use bounded linear scanning", () => {
  const payload = "中".repeat(10 * 1024 * 1024 + 1024);
  const prefix = ": intentionally-not-yaml ";
  const body = `${prefix}${payload}`;
  const content = `\`\`\`yaml design-resource-handoff-v1\r\n${body}\r\n\`\`\`\r\n`;
  assert.ok(content.length > 10 * 1024 * 1024);
  assert.ok(Buffer.byteLength(content, "utf8") > 10 * 1024 * 1024);
  const originalParseAllDocuments = YAML.parseAllDocuments;
  let yamlCalls = 0;
  YAML.parseAllDocuments = (...args) => {
    yamlCalls += 1;
    return Reflect.apply(originalParseAllDocuments, YAML, args);
  };
  try {
    const blocks = scanDesignResourceHandoffBlocks(content);
    assert.equal(blocks.length, 1);
    assert.equal(
      blocks[0].bodyEndOffset - blocks[0].bodyStartOffset,
      body.length + 2,
    );
    assert.equal(
      content.slice(
        blocks[0].bodyStartOffset,
        blocks[0].bodyStartOffset + prefix.length,
      ),
      prefix,
    );
    assert.equal(
      content.slice(blocks[0].bodyEndOffset - 3, blocks[0].bodyEndOffset),
      "中\r\n",
    );
    assert.equal(containsDesignResourceHandoff(content), true);
    assert.equal(yamlCalls, 0);
  } finally {
    YAML.parseAllDocuments = originalParseAllDocuments;
  }
});

test("handoff fence scanning has explicit LF, CRLF, CR, EOF and block-count boundaries", () => {
  for (const newline of ["\n", "\r\n", "\r"]) {
    const content = [
      "intro",
      "```yaml design-resource-handoff-v1",
      "body",
      "```",
    ].join(newline);
    const blocks = scanDesignResourceHandoffBlocks(content);
    assert.equal(blocks.length, 1);
    assert.equal(
      content.slice(blocks[0].bodyStartOffset, blocks[0].bodyEndOffset),
      `body${newline}`,
    );
  }
  assert.equal(scanDesignResourceHandoffBlocks("ordinary markdown").length, 0);
  assert.equal(
    scanDesignResourceHandoffBlocks(
      "```yaml design-resource-handoff-v1\nunclosed",
    ).length,
    0,
  );
  assert.equal(
    scanDesignResourceHandoffBlocks(
      [
        "```yaml design-resource-handoff-v1",
        "one",
        "```",
        "```yaml design-resource-handoff-v1",
        "two",
        "```",
      ].join("\n"),
    ).length,
    2,
  );
});

test("single-decode handoff parsing preserves YAML keep-chomp trailing lines", async () => {
  await withFixture(async (root) => {
    const content = await readFile(
      path.join(root, DESIGN_HANDOFF_PATH),
      "utf8",
    );
    const keepChomp = content.replace(
      "  revision: fixture-selected-v2",
      "  revision: |+\n    fixture-selected-v2\n",
    );
    assert.notEqual(keepChomp, content);
    const parsed = parseDesignResourceHandoffMarkdown(
      DESIGN_HANDOFF_PATH,
      keepChomp,
    );
    assert.equal(parsed.handoff.proposal.revision, "fixture-selected-v2\n\n");
  });
});

test("the handoff adapter decodes strict YAML and the root shape exactly once", async () => {
  await withFixture(async (root) => {
    const content = await readFile(
      path.join(root, DESIGN_HANDOFF_PATH),
      "utf8",
    );
    const originalParseAllDocuments = YAML.parseAllDocuments;
    let yamlCalls = 0;
    let toJSCalls = 0;
    let shapeRootReads = 0;
    YAML.parseAllDocuments = (...args) => {
      yamlCalls += 1;
      const documents = Reflect.apply(originalParseAllDocuments, YAML, args);
      for (const document of documents) {
        const originalToJS = document.toJS.bind(document);
        document.toJS = (...toJSArgs) => {
          toJSCalls += 1;
          const value = originalToJS(...toJSArgs);
          return new Proxy(value, {
            get(target, property, receiver) {
              if (property === "schema_version") shapeRootReads += 1;
              return Reflect.get(target, property, receiver);
            },
          });
        };
      }
      return documents;
    };
    try {
      const parsed = parseDesignResourceHandoffMarkdown(
        DESIGN_HANDOFF_PATH,
        content,
      );
      assert.equal(parsed.handoff.fact_cells.length, 3038);
      assert.equal(yamlCalls, 1);
      assert.equal(toJSCalls, 1);
      assert.equal(shapeRootReads, 1);
    } finally {
      YAML.parseAllDocuments = originalParseAllDocuments;
    }
  });
});

test("one strict handoff preflight closes all eight dimensions and serves the CLI", async () => {
  await withFixture(async (root) => {
    const result = await preflightDesignResourceHandoff(
      root,
      DESIGN_HANDOFF_PATH,
    );
    assert.equal(result.status, "ready");
    assert.equal(result.counts.subjects, result.handoff.subjects.length);
    assert.ok(result.counts.subjects >= 6);
    assert.equal(result.counts.conditions, 2);
    assert.equal(result.counts.properties, 217);
    assert.equal(result.counts.lineage_nodes, 2);
    assert.equal(result.counts.fact_cells, 3038);
    assert.equal(result.counts.facts, 36);
    assert.equal(result.counts.proof_obligations, 48);
    assert.equal(result.counts.coverage, result.handoff.coverage.length);
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
      [...new Set(result.handoff.coverage.map((row) => row.dimension))].sort(),
      [...DESIGN_RESOURCE_DIMENSIONS].sort(),
    );

    const { stdout } = await exec(
      process.execPath,
      [cli, "design-resource", "preflight", DESIGN_HANDOFF_PATH, "--json"],
      { cwd: root, maxBuffer: 16 * 1024 * 1024 },
    );
    const reported = JSON.parse(stdout);
    assert.equal(reported.status, "ready");
    assert.equal(reported.handoff.targets[0].key, "main-default");
  });
});

test("the same V1 marker can hydrate a lossless manifest-backed handoff", async () => {
  await withFixture(async (root, handoff) => {
    const embedded = await preflightDesignResourceHandoff(
      root,
      DESIGN_HANDOFF_PATH,
    );
    const embeddedBytes = Buffer.byteLength(
      await readFile(path.join(root, DESIGN_HANDOFF_PATH), "utf8"),
    );
    const descriptor = manifestBackedDesignResourceHandoff(handoff);
    await writeDesignResourceHandoff(root, descriptor);
    const descriptorText = await readFile(
      path.join(root, DESIGN_HANDOFF_PATH),
      "utf8",
    );
    assert.match(descriptorText, /representation: manifest_backed/u);
    assert.doesNotMatch(descriptorText, /\nfact_cells:/u);
    assert.ok(Buffer.byteLength(descriptorText) < embeddedBytes / 3);

    const parsed = parseDesignResourceHandoffMarkdown(
      DESIGN_HANDOFF_PATH,
      descriptorText,
    );
    assert.equal(parsed.handoff.schema_version, "design-resource-handoff-v1");
    assert.equal(parsed.handoff.representation, "manifest_backed");

    const hydrated = await preflightDesignResourceHandoff(
      root,
      DESIGN_HANDOFF_PATH,
    );
    assert.deepEqual(hydrated.counts, embedded.counts);
    assert.deepEqual(hydrated.resource_hashes, embedded.resource_hashes);
    assert.deepEqual(hydrated.manifest_identities, [
      {
        resource_ref: "resource.fact-manifest",
        path: "design/observable-facts.json",
        sha256: handoff.resources.find(
          (resource) => resource.key === "resource.fact-manifest",
        ).sha256,
        scope_key: "main-surface",
        target_key: "main-default",
        collections: hydrated.manifest_identities[0].collections,
      },
    ]);
    assert.equal(hydrated.manifest_identities[0].collections.length, 19);
    assert.equal(
      hydrated.manifest_identities[0].collections.find(
        (collection) => collection.name === "fact_cells",
      ).expected_count,
      3038,
    );
    for (const collection of [
      "axis_dispositions",
      "condition_exclusions",
      "conditions",
      "subjects",
      "variation_axis_dispositions",
      "variation_exclusions",
      "variations",
      "properties",
      "lineage_nodes",
      "evidence",
      "fact_cells",
      "facts",
      "proof_obligations",
      "oracles",
      "environments",
      "asset_bindings",
      "acceptance_blockers",
    ])
      assert.deepEqual(
        hydrated.handoff[collection],
        embedded.handoff[collection],
        collection,
      );

    const multiTargetDescriptor = structuredClone(descriptor);
    multiTargetDescriptor.targets.push(
      structuredClone(multiTargetDescriptor.targets[0]),
    );
    multiTargetDescriptor.resources[0].path = "design/not-present.html";
    await writeDesignResourceHandoff(root, multiTargetDescriptor);
    await assert.rejects(
      preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
      /manifest_backed_one_target_required:2/u,
    );
  });
});

test("DSA bundle publication validates the frozen manifest set and is atomic", async () => {
  await withFixture(async (root, handoff) => {
    const descriptor = manifestBackedDesignResourceHandoff(handoff);
    await writeDesignResourceHandoff(root, descriptor, {
      handoffPath: "draft/main.md",
    });
    await mkdir(path.join(root, "handoffs"));
    const { stdout } = await exec(
      process.execPath,
      [
        cli,
        "design-resource",
        "bundle",
        "draft",
        "handoffs/selected-bundle",
        "--manifest",
        "design/observable-facts.json",
        "--max-handoff-bytes",
        "1048576",
        "--json",
      ],
      { cwd: root, maxBuffer: 16 * 1024 * 1024 },
    );
    const result = JSON.parse(stdout);
    assert.equal(result.status, "published");
    assert.equal(result.handoffs.length, 1);
    assert.equal(result.handoffs[0].target_key, "main-default");
    assert.equal(result.manifests[0].collections.length, 19);
    assert.equal(
      result.manifests[0].collections.find(
        (collection) => collection.name === "fact_cells",
      ).expected_count,
      3038,
    );
    const publishedPath = "handoffs/selected-bundle/main.md";
    assert.equal(
      await readFile(path.join(root, publishedPath), "utf8"),
      await readFile(path.join(root, "draft/main.md"), "utf8"),
    );
    assert.equal(
      (await preflightDesignResourceHandoff(root, publishedPath)).counts
        .fact_cells,
      3038,
    );

    await assert.rejects(
      exec(
        process.execPath,
        [
          cli,
          "design-resource",
          "bundle",
          "draft",
          "handoffs/rejected-manifest-set",
          "--manifest",
          "design/observable-facts.json",
          "--manifest",
          "design/entry.html",
          "--max-handoff-bytes",
          "1048576",
        ],
        { cwd: root },
      ),
      /manifest_path_set_mismatch/u,
    );
    await assert.rejects(
      exec(
        process.execPath,
        [
          cli,
          "design-resource",
          "bundle",
          "draft",
          "handoffs/rejected-bundle",
          "--manifest",
          "design/observable-facts.json",
          "--max-handoff-bytes",
          "1",
        ],
        { cwd: root },
      ),
      /handoff_byte_limit_exceeded/u,
    );
    assert.deepEqual(
      (await readdir(path.join(root, "handoffs"))).sort(),
      ["selected-bundle"],
    );
  });
});

test("missing, duplicate, unresolved and unknown coverage fail closed", async () => {
  for (const [mutate, expected] of [
    [
      (handoff) => handoff.coverage.pop(),
      /coverage_fact_cell_set_mismatch:handoff/u,
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
      /coverage_fact_cell_mismatch:coverage\.motion\.not_applicable/u,
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
      /coverage_fact_refs_mismatch:coverage\.surface_flow\.covered/u,
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
      /resource_fact_closure_missing:resource\./u,
    ],
    [
      (handoff) => {
        handoff.resource_fact_closure[0].disposition = "supporting_only";
      },
      /supporting_only_resource_fact_forbidden:closure\.resource\.main/u,
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
    demoteFullTargetFacts(handoff, "visual_pixel");
    await writeDesignResourceHandoff(root, handoff);
    await assert.rejects(
      preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
      /exact_target_full_target_fact_missing:main-default:desktop-light-mouse:visual_pixel/u,
    );
  });

  await withFixture(async (root, handoff) => {
    handoff.targets[0].interpretation = "constraint";
    handoff.resources[0].role = "constraint";
    for (const fact of handoff.facts)
      if (fact.observation_scope === "full_target")
        fact.observation_scope = "subject";
    await writeDesignResourceHandoff(root, handoff);
    const result = await preflightDesignResourceHandoff(
      root,
      DESIGN_HANDOFF_PATH,
    );
    assert.equal(result.status, "ready");
    assert.equal(result.handoff.targets[0].interpretation, "constraint");
    assert.equal(
      result.handoff.facts.some(
        (fact) => fact.observation_scope === "full_target",
      ),
      false,
    );
  });
});

test("every subject, target and condition cell must close all eight dimensions", async () => {
  await withFixture(async (root, handoff) => {
    handoff.targets[0].interpretation = "constraint";
    handoff.resources[0].role = "constraint";
    for (const fact of handoff.facts)
      if (fact.observation_scope === "full_target")
        fact.observation_scope = "subject";
    handoff.conditions.push({
      ...structuredClone(handoff.conditions[0]),
      key: "mobile-default",
      viewport: {
        key: "mobile-390x844",
        width: 390,
        height: 844,
        unit: "px",
      },
    });
    handoff.targets[0].condition_refs.push("mobile-default");
    await writeDesignResourceHandoff(root, handoff);
    await assert.rejects(
      preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
      /manifest_condition_axis_value_unknown:mobile-default:viewport:mobile-390x844/u,
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
      /exact_target_full_target_fact_missing:main-secondary:desktop-light-mouse:layout_geometry/u,
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
      /coverage_subject_refs_mismatch:coverage\.surface_flow\.covered/u,
    );
  });
});

test("condition profile keys have one exact geometry or scale definition", async () => {
  for (const [mutate, expected] of [
    [
      (condition) => {
        condition.viewport.width += 1;
      },
      /condition_viewport_profile_conflict:desktop-1440x900:desktop-light-keyboard/u,
    ],
    [
      (condition) => {
        condition.density.pixel_ratio = 2;
      },
      /condition_density_profile_conflict:density-1x:desktop-light-keyboard/u,
    ],
    [
      (condition) => {
        condition.safe_area.bottom = 34;
      },
      /condition_safe_area_profile_conflict:zero-insets:desktop-light-keyboard/u,
    ],
    [
      (condition) => {
        condition.text_scale.multiplier = 2;
      },
      /condition_text_scale_profile_conflict:text-100-percent:desktop-light-keyboard/u,
    ],
  ]) {
    await withFixture(async (root, handoff) => {
      mutate(handoff.conditions[1]);
      await writeDesignResourceHandoff(root, handoff);
      await assert.rejects(
        preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
        expected,
      );
    });
  }
});

test("typed locators must resolve in the immutable resource", async () => {
  await withFixture(async (root, handoff) => {
    handoff.evidence[0].locator.value = "#does-not-exist";
    await writeDesignResourceHandoff(root, handoff);
    await assert.rejects(
      preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
      /locator_not_found:evidence\.frame-main:resource\.main:html_selector:#does-not-exist/u,
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
      const row = handoff.coverage.find(
        (item) =>
          item.dimension === dimension && item.disposition === "covered",
      );
      row.evidence_refs = ["frame-main"];
      for (const fact of handoff.facts)
        if (row.fact_refs.includes(fact.key))
          fact.evidence_refs = ["frame-main"];
      await writeDesignResourceHandoff(root, handoff);
      await assert.rejects(
        preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
        new RegExp(
          dimension === "motion"
            ? `fact_evidence_kind_incompatible:.*:${dimension}:frame-main:frame`
            : `proof_method_evidence_missing:.*:accessibility_semantics`,
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

test("the frozen manifest and residual handoff conserve every atomic universe collection", async () => {
  for (const [mutate, expected, refreshGeneration = true] of [
    [
      (_handoff, manifest) => {
        manifest.subjects.find(
          (subject) => subject.key === "part.card-label",
        ).parent_ref = "surface.main";
      },
      /manifest_handoff_subjects_row_mismatch:main-default:part\.card-label/u,
    ],
    [
      (_handoff, manifest) => {
        manifest.properties.pop();
      },
      /manifest_standard_property_missing/u,
    ],
    [
      (_handoff, manifest) => {
        manifest.lineage_nodes[0].value.sha256 = "0".repeat(64);
      },
      /located_value_digest_mismatch:manifest\.lineage_node/u,
    ],
    [
      (_handoff, manifest) => {
        const cellRef = manifest.fact_cells.at(-1).key;
        for (const census of manifest.inspector.census)
          census.fact_cell_refs = census.fact_cell_refs.filter(
            (ref) => ref !== cellRef,
          );
      },
      /manifest_census_fact_cell_set_mismatch/u,
    ],
    [
      (_handoff, manifest) => {
        manifest.inspector.identity = "changed-inspector";
      },
      /manifest_resource_closure_inspector_mismatch/u,
    ],
    [
      (_handoff, manifest) => {
        manifest.design_system.sha256 = "0".repeat(64);
      },
      /manifest_design_system_digest_mismatch/u,
    ],
    [
      (_handoff, manifest) => {
        manifest.subjects
          .find((subject) => subject.key === "relation.card-label")
          .relation_endpoints.pop();
      },
      /manifest_relation_endpoints_required/u,
    ],
    [
      (_handoff, manifest) => {
        manifest.asset_bindings.length = 0;
      },
      /manifest_asset_subject_binding_missing/u,
    ],
    [
      (_handoff, manifest) => {
        manifest.generation.collections.pop();
      },
      /manifest_generation_collection_set_mismatch/u,
      false,
    ],
    [
      (_handoff, manifest) => {
        manifest.generation.sampling = "representative";
      },
      /design_resource_fact_manifest\.generation\.sampling:must be one of forbidden/u,
      false,
    ],
    [
      (_handoff, manifest) => {
        manifest.generation.truncation = "allowed";
      },
      /design_resource_fact_manifest\.generation\.truncation:must be one of forbidden/u,
      false,
    ],
    [
      (_handoff, manifest) => {
        manifest.facts[0].value.locator.value = "/values/does-not-exist";
      },
      /locator_not_found/u,
    ],
    [
      (_handoff, manifest) => {
        manifest.inspector.census[0].basis_refs = [];
      },
      /manifest_census:.*:basis_refs_required/u,
    ],
    [
      (_handoff, manifest) => {
        manifest.inspector.census.find(
          (entry) => entry.key === "census.subject.component.card",
        ).kind = "custom_property";
      },
      /manifest_census_semantic_owner_missing:census\.subject\.component\.card:custom_property/u,
    ],
  ]) {
    await withFixture(async (root, handoff, manifest) => {
      mutate(handoff, manifest);
      await writeDesignResourceFactManifest(root, handoff, manifest, {
        refreshGeneration,
      });
      await assert.rejects(
        preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
        expected,
      );
    });
  }
});

test("atomic axes, dynamic subjects and unresolved blockers cannot collapse into labels", async () => {
  for (const [mutate, expected] of [
    [
      (handoff) => {
        handoff.variation_axis_dispositions.find(
          (axis) =>
            axis.subject_ref === "component.card" && axis.axis === "state",
        ).values[0].key = "all-21-state-catalog";
      },
      /must identify one atomic value, not a compound collection/u,
    ],
    [
      (handoff) => {
        handoff.variation_axis_dispositions.find(
          (axis) =>
            axis.subject_ref === "component.card" && axis.axis === "state",
        ).values[0].key = "initial,loading,error";
      },
      /must match \^\[a-z0-9\]/u,
    ],
    [
      (handoff) => {
        handoff.axis_dispositions = handoff.axis_dispositions.filter(
          (axis) => axis.axis !== "text_scale",
        );
      },
      /manifest_standard_axis_missing:text_scale/u,
    ],
    [
      (handoff) => {
        const extra = structuredClone(
          handoff.subjects.find((subject) => subject.kind === "surface"),
        );
        extra.key = "surface.outside-scope";
        extra.stable_keys = ["outside-scope"];
        extra.census_refs = ["census.subject.surface.main"];
        handoff.subjects.push(extra);
      },
      /scope_surface_subject_outside_scope:surface\.outside-scope/u,
    ],
    [
      (handoff) => {
        const subject = handoff.subjects.find(
          (item) => item.key === "component.card",
        );
        subject.presence = "virtualized";
      },
      /subject_dynamic_presence_rule_required:component\.card/u,
    ],
    [
      (handoff) => {
        const fact = handoff.facts[0];
        const proof = handoff.proof_obligations.find(
          (item) => item.fact_ref === fact.key,
        );
        handoff.acceptance_blockers.push({
          key: "unresolved-design-fact",
          target_refs: [fact.target_ref],
          subject_refs: [fact.subject_ref],
          dimensions: [fact.dimension],
          fact_cell_refs: [fact.cell_ref],
          fact_refs: [fact.key],
          proof_obligation_refs: [proof.key],
          source_item_refs: [...fact.source_item_refs],
          verification_methods: [proof.method],
          required_capabilities: ["browser-runtime"],
          description: "The Fact cannot yet be proven.",
        });
      },
      /acceptance_blockers_unresolved:unresolved-design-fact/u,
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

test("lineage, comparator and oracle authority remain Fact-scoped and method-specific", async () => {
  for (const [mutate, expected] of [
    [
      (handoff) => {
        handoff.facts.find(
          (fact) => fact.property_ref === "color.background",
        ).lineage.token_chain_refs = [];
      },
      /manifest_fact_design_system_chain_required/u,
    ],
    [
      (handoff) => {
        const fact = handoff.facts.find(
          (item) => item.property_ref === "color.background",
        );
        fact.lineage.design_system_ref = null;
        fact.lineage.token_chain_refs = [];
      },
      /manifest_style_fact_design_system_lineage_required/u,
    ],
    [
      (handoff) => {
        const width = handoff.facts.find(
          (fact) => fact.property_ref === "geometry.width",
        );
        const copy = handoff.facts.find(
          (fact) => fact.property_ref === "content.copy",
        );
        width.value = structuredClone(copy.value);
        width.lineage.resolved_value = structuredClone(copy.value);
      },
      /located_value_kind_mismatch:.*geometry\.width.*:length/u,
    ],
    [
      (handoff) => {
        const fact = handoff.facts.find(
          (item) => item.property_ref === "typography.font-size",
        );
        const proof = handoff.proof_obligations.find(
          (item) =>
            item.fact_ref === fact.key && item.method === "layout_geometry",
        );
        handoff.proof_obligations = handoff.proof_obligations.filter(
          (item) => item.key !== proof.key,
        );
        for (const row of handoff.coverage) {
          row.proof_obligation_refs = row.proof_obligation_refs.filter(
            (ref) => ref !== proof.key,
          );
          row.verification_methods = [
            ...new Set(
              handoff.proof_obligations
                .filter((item) => row.proof_obligation_refs.includes(item.key))
                .map((item) => item.method),
            ),
          ];
        }
      },
      /manifest_fact_required_proof_method_missing:.*:layout_geometry/u,
    ],
    [
      (handoff) => {
        const proof = handoff.proof_obligations.find(
          (item) => item.method === "visual_pixel",
        );
        proof.comparison.comparator = "exact_value";
      },
      /proof_comparator_method_incompatible:.*:visual_pixel:exact_value/u,
    ],
    [
      (handoff) => {
        handoff.oracles[0].capability_refs =
          handoff.oracles[0].capability_refs.filter(
            (capability) => capability !== "accessibility",
          );
      },
      /proof_oracle_capability_missing:.*:accessibility_semantics/u,
    ],
    [
      (handoff) => {
        const proof = handoff.proof_obligations.find(
          (item) => item.method === "layout_geometry",
        );
        const pixelProof = handoff.proof_obligations.find(
          (item) => item.method === "visual_pixel",
        );
        proof.comparison.mode = "tolerance";
        proof.comparison.tolerance = structuredClone(
          pixelProof.comparison.tolerance,
        );
        proof.comparison.mask = structuredClone(
          pixelProof.comparison.tolerance,
        );
      },
      /proof_mask_comparator_incompatible:.*:geometry_delta/u,
    ],
    [
      (handoff) => {
        handoff.facts[0].lineage.conflict_status = "resolved";
      },
      /manifest_fact_conflict_resolution_required/u,
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
    const { handoff, manifest } = await writeDesignResourceHandoffFixture(root);
    await action(root, handoff, manifest);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function demoteFullTargetFacts(handoff, method) {
  const proofs = new Set(
    handoff.proof_obligations
      .filter((proof) => proof.method === method)
      .map((proof) => proof.fact_ref),
  );
  for (const fact of handoff.facts)
    if (proofs.has(fact.key) && fact.observation_scope === "full_target")
      fact.observation_scope = "subject";
}
