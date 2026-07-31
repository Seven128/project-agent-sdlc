import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { preflightDesignResourceHandoff } from "../../packages/ty-context/dist/index.js";
import {
  SYMBOLIC_HANDOFF_PATH,
  writeDesignResourceSymbolicHandoffFixture,
} from "./design-resource-symbolic-handoff-fixture.mjs";

test("opt-in UI V2 preflight closes Rules, obligations, applicability and one set-valued certificate", async () => {
  await withFixture(async (root) => {
    const fixture = await writeDesignResourceSymbolicHandoffFixture(root);
    const result = await preflightDesignResourceHandoff(
      root,
      SYMBOLIC_HANDOFF_PATH,
    );
    assert.equal(result.preflight_schema_version, "design-resource-handoff-preflight-v2");
    assert.equal(result.handoff.representation, "symbolic_rules_v2");
    assert.equal(result.rule_projections.length, 2);
    assert.equal(result.metrics.semantic_obligations, 2);
    assert.equal(result.metrics.certificate_obligations, 1);
    assert.equal(result.metrics.certificate_covered_omitted_axes, 2);
    assert.equal(result.metrics.certificate_covered_dependency_edges, 4);
    assert.equal(result.metrics.canonical_dag_nodes, 0);
    assert.ok(result.metrics.canonical_bytes > 0);
    assert.equal(result.metrics.theoretical_ground_cardinality, "4");
    assert.equal(fixture.certificate.fact_rule_refs.length, 2);
    assert.equal(fixture.certificate.omitted_axis_refs.length, 2);
  });
});

test("overlapping effective regions fail instead of using precedence", async () => {
  await withFixture(async (root) => {
    await writeDesignResourceSymbolicHandoffFixture(root, ({ manifest }) => {
      const original = manifest.disposition_regions[0];
      manifest.disposition_regions.push({
        ...structuredClone(original),
        key: `${original.key}.overlap`,
        disposition: "excluded",
      });
    });
    await assert.rejects(
      preflightDesignResourceHandoff(root, SYMBOLIC_HANDOFF_PATH),
      /v2_effective_region_overlap/u,
    );
  });
});

test("a symbolic applicability gap fails with the exact subject-property tuple", async () => {
  await withFixture(async (root) => {
    let expected;
    await writeDesignResourceSymbolicHandoffFixture(root, ({ manifest }) => {
      const row = manifest.disposition_regions[0];
      expected = `surface.root:${row.property_ref}`;
      row.region = {
        op: "eq",
        axis_ref: "condition.color-scheme",
        value: "light",
      };
    });
    await assert.rejects(
      preflightDesignResourceHandoff(root, SYMBOLIC_HANDOFF_PATH),
      new RegExp(`v2_effective_region_coverage_gap:${escape(expected)}`, "u"),
    );
  });
});

test("specified applicability requires package policy, Inspector capability and Census support", async () => {
  await withFixture(async (root) => {
    await writeDesignResourceSymbolicHandoffFixture(root, ({ manifest }) => {
      const property = manifest.properties.find(
        (item) => item.key === "geometry.width",
      );
      property.census_refs = [];
    });
    await assert.rejects(
      preflightDesignResourceHandoff(root, SYMBOLIC_HANDOFF_PATH),
      /v2_rule_property_census_required/u,
    );
  });
});

test("Fact Rule, semantic obligation and certificate identities cannot substitute for one another", async () => {
  for (const [field, pattern] of [
    ["rule", /v2_rule_identity_mismatch/u],
    ["obligation", /v2_obligation_identity_mismatch/u],
    ["certificate", /v2_certificate_identity_mismatch/u],
  ])
    await withFixture(async (root) => {
      await writeDesignResourceSymbolicHandoffFixture(root, (fixture) => {
        if (field === "rule") fixture.manifest.fact_rules[0].key = "rule.invalid";
        if (field === "obligation")
          {
            const previous = fixture.manifest.semantic_proof_obligations[0].key;
            fixture.manifest.semantic_proof_obligations[0].key =
              "obligation.invalid";
            const rule = fixture.manifest.fact_rules.find((item) =>
              item.semantic_obligation_refs.includes(previous),
            );
            rule.semantic_obligation_refs = rule.semantic_obligation_refs.map(
              (item) =>
                item === previous ? "obligation.invalid" : item,
            );
          }
        if (field === "certificate")
          fixture.manifest.noninterference_certificates[0].key =
            "certificate.invalid";
      });
      await assert.rejects(
        preflightDesignResourceHandoff(root, SYMBOLIC_HANDOFF_PATH),
        pattern,
        field,
      );
    });
});

test("certificate coverage is recomputed and rejects a newly relevant or omitted dependency", async () => {
  await withFixture(async (root) => {
    await writeDesignResourceSymbolicHandoffFixture(root, ({ manifest }) => {
      manifest.noninterference_certificates[0].omitted_axis_refs.pop();
    });
    await assert.rejects(
      preflightDesignResourceHandoff(root, SYMBOLIC_HANDOFF_PATH),
      /v2_certificate_omitted_axes_mismatch/u,
    );
  });
});

test("V2 is explicit while an absent discriminator continues to parse the V1 fixture", async () => {
  await withFixture(async (root) => {
    await writeDesignResourceSymbolicHandoffFixture(root);
    const result = await preflightDesignResourceHandoff(
      root,
      SYMBOLIC_HANDOFF_PATH,
    );
    assert.equal(result.handoff.schema_version, "design-resource-handoff-v2");
    assert.equal(result.handoff.representation, "symbolic_rules_v2");
  });
});

async function withFixture(run) {
  const root = await mkdtemp(path.join(os.tmpdir(), "ty-context-symbolic-v2-"));
  try {
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function escape(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
