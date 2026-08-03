import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { preflightDesignResourceHandoff } from "../../packages/ty-context/dist/index.js";
import { designResourceSymbolicObligationKey } from "../../packages/ty-context/dist/lib/design-resource-symbolic-fact-validation.js";
import { denoteDesignResourceSymbolicPoint } from "../../packages/ty-context/dist/lib/design-resource-symbolic-denotation.js";
import { canonicalJson } from "../../packages/ty-context/dist/lib/strict-codec.js";
import {
  SYMBOLIC_HANDOFF_PATH,
  SYMBOLIC_SOURCE_ITEM_KEY,
  SYMBOLIC_TARGET_KEY,
  writeDesignResourceSymbolicHandoffFixture,
} from "./design-resource-symbolic-handoff-fixture.mjs";
import {
  enableCompactSymbolicApplicability,
  enableFixtureTrustedNoninterference,
  refreshSymbolicFixtureDerivedIdentities,
  rekeySymbolicFixtureCertificate,
} from "./design-resource-symbolic-handoff-fixture-model.mjs";
import { fixtureSha } from "./design-resource-symbolic-handoff-fixture-support.mjs";
import {
  forgePassedSourceArtifact,
  readSourceArtifact,
  sourceIrReadsOmittedAxis,
} from "./design-resource-symbolic-source-attack-fixture.mjs";

test("opt-in UI V2 preflight closes Rules, obligations, applicability and one set-valued certificate", async () => {
  await withFixture(async (root) => {
    const fixture = await writeDesignResourceSymbolicHandoffFixture(root);
    const result = await preflightDesignResourceHandoff(
      root,
      SYMBOLIC_HANDOFF_PATH,
    );
    assert.equal(
      result.preflight_schema_version,
      "design-resource-handoff-preflight-v2",
    );
    assert.equal(result.handoff.representation, "symbolic_rules_v2");
    assert.equal(result.rule_projections.length, 8);
    assert.equal(result.metrics.semantic_obligations, 8);
    assert.equal(result.metrics.certificate_obligations, 1);
    assert.equal(result.metrics.certificate_covered_omitted_axes, 0);
    assert.equal(result.metrics.certificate_covered_dependency_edges, 0);
    assert.ok(result.metrics.canonical_dag_nodes > 0);
    assert.ok(result.metrics.canonical_bytes > 0);
    assert.equal(result.metrics.theoretical_ground_cardinality, "4");
    assert.equal(fixture.certificate.fact_rule_refs.length, 8);
    assert.equal(fixture.certificate.omitted_axis_refs.length, 0);
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
      manifest.disposition_regions = manifest.disposition_regions.filter(
        (item) => item.key !== row.key,
      );
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
        if (field === "rule")
          fixture.manifest.fact_rules[0].key = "rule.invalid";
        if (field === "obligation") {
          const previous = fixture.manifest.semantic_proof_obligations[0].key;
          fixture.manifest.semantic_proof_obligations[0].key =
            "obligation.invalid";
          const rule = fixture.manifest.fact_rules.find((item) =>
            item.semantic_obligation_refs.includes(previous),
          );
          rule.semantic_obligation_refs = rule.semantic_obligation_refs.map(
            (item) => (item === previous ? "obligation.invalid" : item),
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
      manifest.noninterference_certificates[0].fact_rule_refs.pop();
    });
    await assert.rejects(
      preflightDesignResourceHandoff(root, SYMBOLIC_HANDOFF_PATH),
      /v2_certificate_rule_digest_mismatch/u,
    );
  });
  await withFixture(async (root) => {
    await writeDesignResourceSymbolicHandoffFixture(root, ({ manifest }) => {
      const certificate = manifest.noninterference_certificates[0];
      certificate.fact_rule_refs.push(certificate.fact_rule_refs[0]);
    });
    await assert.rejects(
      preflightDesignResourceHandoff(root, SYMBOLIC_HANDOFF_PATH),
      /v2_certificate_rule_ref_duplicate/u,
    );
  });
  await withFixture(async (root) => {
    await writeDesignResourceSymbolicHandoffFixture(root, ({ manifest }) => {
      const rule = manifest.fact_rules[0];
      rule.semantic_obligation_refs.push(rule.semantic_obligation_refs[0]);
    });
    await assert.rejects(
      preflightDesignResourceHandoff(root, SYMBOLIC_HANDOFF_PATH),
      /v2_rule_obligation_ref_duplicate/u,
    );
  });
});

test("unresolved dispositions and acceptance blockers never become ready", async () => {
  for (const disposition of ["decision_required", "unavailable", "blocking"])
    await withFixture(async (root) => {
      await writeDesignResourceSymbolicHandoffFixture(root, ({ manifest }) => {
        manifest.disposition_regions[0].disposition = disposition;
      });
      await assert.rejects(
        preflightDesignResourceHandoff(root, SYMBOLIC_HANDOFF_PATH),
        new RegExp(`v2_unresolved_disposition:.*:${disposition}`, "u"),
      );
    });
  await withFixture(async (root) => {
    await writeDesignResourceSymbolicHandoffFixture(root, ({ manifest }) => {
      manifest.acceptance_blockers.push({
        key: "unresolved-symbolic-proof",
        target_refs: [manifest.target_key],
        subject_refs: [manifest.subjects[0].key],
        dimensions: ["visual_content"],
        fact_cell_refs: [],
        fact_refs: [],
        proof_obligation_refs: [],
        source_item_refs: [SYMBOLIC_SOURCE_ITEM_KEY],
        verification_methods: ["visual_pixel"],
        required_capabilities: ["browser-runtime"],
        description: "The symbolic proof remains unresolved.",
      });
    });
    await assert.rejects(
      preflightDesignResourceHandoff(root, SYMBOLIC_HANDOFF_PATH),
      /acceptance_blockers_unresolved:unresolved-symbolic-proof/u,
    );
  });
});

test("an omitted axis fails closed until a trusted non-interference proof exists", async () => {
  await withFixture(async (root) => {
    await writeDesignResourceSymbolicHandoffFixture(root, (model) => {
      model.rules[0].rule.region = structuredClone(
        model.manifest.reachable_region,
      );
      refreshSymbolicFixtureDerivedIdentities(model);
    });
    await assert.rejects(
      preflightDesignResourceHandoff(root, SYMBOLIC_HANDOFF_PATH),
      /v2_noninterference_proof_unavailable:.*variation\.state/u,
    );
  });
});

test("package profiles derive structural N/A without materializing the subject-property matrix", async () => {
  await withFixture(async (root) => {
    await writeDesignResourceSymbolicHandoffFixture(root, (model) => {
      enableCompactSymbolicApplicability(model);
    });
    const result = await preflightDesignResourceHandoff(
      root,
      SYMBOLIC_HANDOFF_PATH,
    );
    assert.equal(result.manifest.disposition_regions.length, 0);
    assert.equal(result.manifest.fact_rules.length, 8);
    assert.deepEqual(
      denoteDesignResourceSymbolicPoint(result, {
        subject_or_relation_ref: "surface.root",
        target_ref: SYMBOLIC_TARGET_KEY,
        condition_assignment: { "condition.color-scheme": "dark" },
        variation_assignment: { "variation.state": "active" },
        property_ref: "typography.font-family",
        population_ref: null,
        quantifier: { kind: "one", minimum: 1, maximum: 1 },
      }),
      {
        disposition: "not_applicable",
        expected_semantics: null,
        proof_obligations: [],
      },
    );
  });
});

test("Inspector custom-property closure and instance exceptions preserve unique logical dispositions", async () => {
  await withFixture(async (root) => {
    await writeDesignResourceSymbolicHandoffFixture(root, (model) => {
      enableCompactSymbolicApplicability(model);
      model.manifest.structural_applicability.subject_profile_bindings[0].profile_refs.push(
        "profile.property.typography.font-family",
      );
      model.manifest.structural_applicability.instance_exceptions.push({
        key: "exception.surface-root.font-family",
        subject_ref: "surface.root",
        property_ref: "typography.font-family",
        disposition: "not_applicable",
        census_refs: ["census.subject.root"],
        source_item_refs: [SYMBOLIC_SOURCE_ITEM_KEY],
        basis_refs: ["census.subject.root"],
        rationale:
          "The frozen Inspector records that this exact surface instance has no text content.",
      });

      const widthProperty = model.properties.find(
        (item) => item.key === "geometry.width",
      );
      model.properties.push({
        ...structuredClone(widthProperty),
        key: "custom.fixture-width",
        standard: false,
        census_refs: ["census.property.custom-fixture-width"],
      });
      const widthCensus = model.census.find(
        (item) => item.key === "census.property.width",
      );
      model.census.push({
        ...structuredClone(widthCensus),
        key: "census.property.custom-fixture-width",
        kind: "custom_property",
        fact_refs: [],
      });
      for (const projection of model.rules.filter(
        (item) => item.rule.property_ref === "geometry.width",
      )) {
        const clone = structuredClone(projection);
        clone.rule.property_ref = "custom.fixture-width";
        clone.rule.census_refs = [
          "census.subject.root",
          "census.property.custom-fixture-width",
        ];
        model.rules.push(clone);
      }
      model.manifest.structural_applicability.inspector_custom_property_closure.push(
        {
          property_ref: "custom.fixture-width",
          applicable_subject_refs: ["surface.root"],
          census_refs: ["census.property.custom-fixture-width"],
          source_item_refs: [SYMBOLIC_SOURCE_ITEM_KEY],
          basis_refs: ["census.property.custom-fixture-width"],
          rationale:
            "The frozen Inspector completely enumerates the one custom property and its applicable subject.",
        },
      );
      refreshSymbolicFixtureDerivedIdentities(model);
    });
    const result = await preflightDesignResourceHandoff(
      root,
      SYMBOLIC_HANDOFF_PATH,
    );
    assert.equal(result.manifest.disposition_regions.length, 0);
    assert.equal(
      denoteDesignResourceSymbolicPoint(result, {
        subject_or_relation_ref: "surface.root",
        target_ref: SYMBOLIC_TARGET_KEY,
        condition_assignment: { "condition.color-scheme": "dark" },
        variation_assignment: { "variation.state": "active" },
        property_ref: "custom.fixture-width",
        population_ref: null,
        quantifier: { kind: "one", minimum: 1, maximum: 1 },
      }).disposition,
      "specified",
    );
    assert.equal(
      denoteDesignResourceSymbolicPoint(result, {
        subject_or_relation_ref: "surface.root",
        target_ref: SYMBOLIC_TARGET_KEY,
        condition_assignment: { "condition.color-scheme": "light" },
        variation_assignment: { "variation.state": "idle" },
        property_ref: "typography.font-family",
        population_ref: null,
        quantifier: { kind: "one", minimum: 1, maximum: 1 },
      }).disposition,
      "not_applicable",
    );
  });
});

test("compact applicability rejects incomplete custom closure and ambiguous exceptions", async () => {
  for (const [mutate, pattern] of [
    [
      (model) => {
        const base = model.properties.find(
          (item) => item.key === "geometry.width",
        );
        model.properties.push({
          ...structuredClone(base),
          key: "custom.unclosed",
          standard: false,
          census_refs: ["census.property.width"],
        });
      },
      /v2_custom_property_closure_set_mismatch/u,
    ],
    [
      (model) => {
        model.manifest.structural_applicability.instance_exceptions.push({
          key: "exception.surface-root.font-family",
          subject_ref: "surface.root",
          property_ref: "typography.font-family",
          disposition: "not_applicable",
          census_refs: ["census.property.width"],
          source_item_refs: [SYMBOLIC_SOURCE_ITEM_KEY],
          basis_refs: ["census.property.width"],
          rationale: "An exception with the wrong Census authority.",
        });
      },
      /v2_applicability_exception_census_set_mismatch/u,
    ],
    [
      (model) => {
        const exception = {
          key: "exception.surface-root.font-family",
          subject_ref: "surface.root",
          property_ref: "typography.font-family",
          disposition: "not_applicable",
          census_refs: ["census.subject.root"],
          source_item_refs: [SYMBOLIC_SOURCE_ITEM_KEY],
          basis_refs: ["census.subject.root"],
          rationale: "Exact instance exception.",
        };
        model.manifest.structural_applicability.instance_exceptions.push(
          exception,
          { ...structuredClone(exception), key: `${exception.key}.duplicate` },
        );
      },
      /v2_applicability_exception_tuple_duplicate/u,
    ],
    [
      (model) => {
        model.manifest.structural_applicability.instance_exceptions.push({
          key: "exception.surface-root.width-noop",
          subject_ref: "surface.root",
          property_ref: "geometry.width",
          disposition: "applicable",
          census_refs: ["census.subject.root", "census.property.width"],
          source_item_refs: [SYMBOLIC_SOURCE_ITEM_KEY],
          basis_refs: ["census.subject.root"],
          rationale: "This does not actually override the profile.",
        });
      },
      /v2_applicability_exception_noop/u,
    ],
    [
      (model) => {
        model.manifest.structural_applicability.subject_profile_bindings[0].rationale =
          "";
      },
      /must be a non-empty string/u,
    ],
  ])
    await withFixture(async (root) => {
      await writeDesignResourceSymbolicHandoffFixture(root, (model) => {
        enableCompactSymbolicApplicability(model);
        mutate(model);
      });
      await assert.rejects(
        preflightDesignResourceHandoff(root, SYMBOLIC_HANDOFF_PATH),
        pattern,
      );
    });
});

test("only the three trusted source and production non-interference proofs can close omitted axes", async () => {
  for (const method of [
    "closed_world_static_dependency_closure",
    "restricted_ir_symbolic_equivalence",
    "finite_complete_domain_exhaustive_equivalence",
  ])
    await withFixture(async (root) => {
      await writeDesignResourceSymbolicHandoffFixture(root, (model) => {
        enableFixtureTrustedNoninterference(model, method);
      });
      const result = await preflightDesignResourceHandoff(
        root,
        SYMBOLIC_HANDOFF_PATH,
      );
      assert.equal(result.metrics.certificate_covered_omitted_axes, 2);
      assert.equal(result.metrics.certificate_covered_dependency_edges, 0);
      assert.equal(result.manifest.dependency_edges.length, 0);
    });
});

test("current production input defeats an internally self-consistent omitted-axis graph with an attributable witness", async () => {
  await withFixture(async (root) => {
    await writeDesignResourceSymbolicHandoffFixture(
      root,
      (model) => enableFixtureTrustedNoninterference(model),
      {
        pageSuffix:
          '<script>globalThis.__currentAxis = "variation.state";</script>',
      },
    );
    await assert.rejects(
      preflightDesignResourceHandoff(root, SYMBOLIC_HANDOFF_PATH),
      (error) => {
        assert.match(
          String(error),
          /v2_noninterference_current_input_counterexample/u,
        );
        assert.match(String(error), /variation\.state/u);
        assert.match(String(error), /resource\.page/u);
        return true;
      },
    );
  });
});

test("current Source IR defeats a forged internally closed dependency graph after every submitted digest is refreshed", async () => {
  await withFixture(async (root) => {
    await writeDesignResourceSymbolicHandoffFixture(
      root,
      (model) => enableFixtureTrustedNoninterference(model),
      {
        mutateSourceIr: sourceIrReadsOmittedAxis,
        afterProofArtifacts: async (context) =>
          forgePassedSourceArtifact(
            context,
            "closed_world_static_dependency_closure",
          ),
      },
    );
    await assert.rejects(
      preflightDesignResourceHandoff(root, SYMBOLIC_HANDOFF_PATH),
      /v2_noninterference_artifact_current_input_mismatch/u,
    );
  });
});

test("current Source IR defeats forged Rule-equal predicates instead of trusting their hashes", async () => {
  await withFixture(async (root) => {
    await writeDesignResourceSymbolicHandoffFixture(
      root,
      (model) =>
        enableFixtureTrustedNoninterference(
          model,
          "restricted_ir_symbolic_equivalence",
        ),
      {
        mutateSourceIr: sourceIrReadsOmittedAxis,
        afterProofArtifacts: async (context) =>
          forgePassedSourceArtifact(
            context,
            "restricted_ir_symbolic_equivalence",
          ),
      },
    );
    await assert.rejects(
      preflightDesignResourceHandoff(root, SYMBOLIC_HANDOFF_PATH),
      /v2_noninterference_artifact_current_input_mismatch/u,
    );
  });
});

test("finite Source Oracle enumerates the complete domain and records a concrete omitted-axis assignment", async () => {
  await withFixture(async (root) => {
    let recomputedWitness;
    await writeDesignResourceSymbolicHandoffFixture(
      root,
      (model) =>
        enableFixtureTrustedNoninterference(
          model,
          "finite_complete_domain_exhaustive_equivalence",
        ),
      {
        mutateSourceIr: sourceIrReadsOmittedAxis,
        afterProofArtifacts: async (context) => {
          const artifact = await readSourceArtifact(context);
          recomputedWitness = artifact.failure_witness;
          await forgePassedSourceArtifact(
            context,
            "finite_complete_domain_exhaustive_equivalence",
          );
        },
      },
    );
    assert.equal(recomputedWitness.kind, "complete_domain_counterexample");
    assert.equal(recomputedWitness.side, "source");
    assert.equal(recomputedWitness.axis_ref, "variation.state");
    assert.equal(recomputedWitness.path, "design/symbolic-source-ir.json");
    assert.ok(recomputedWitness.assignment);
    await assert.rejects(
      preflightDesignResourceHandoff(root, SYMBOLIC_HANDOFF_PATH),
      /v2_noninterference_artifact_current_input_mismatch/u,
    );
  });
});

test("a legal Source artifact becomes stale when current Source bytes change even after declared resource digests are synchronized", async () => {
  await withFixture(async (root) => {
    await writeDesignResourceSymbolicHandoffFixture(
      root,
      (model) => enableFixtureTrustedNoninterference(model),
      {
        afterProofArtifacts: async (context) => {
          const sourceResource = context.inputResources.find(
            (resource) => resource.key === "resource.symbolic-source-ir",
          );
          const sourcePath = path.join(root, sourceResource.path);
          const sourceIr = JSON.parse(await readFile(sourcePath, "utf8"));
          sourceIrReadsOmittedAxis(sourceIr);
          const content = canonicalJson(sourceIr);
          const digest = fixtureSha(content);
          await writeFile(sourcePath, content);
          sourceResource.sha256 = digest;
          context.model.manifest.inspector.input_resources.find(
            (input) => input.resource_ref === sourceResource.key,
          ).sha256 = digest;
        },
      },
    );
    await assert.rejects(
      preflightDesignResourceHandoff(root, SYMBOLIC_HANDOFF_PATH),
      /v2_noninterference_artifact_current_input_mismatch/u,
    );
  });
});

test("unsupported executable Source fails closed with a Source-side resource witness", async () => {
  await withFixture(async (root) => {
    await writeDesignResourceSymbolicHandoffFixture(
      root,
      (model) => enableFixtureTrustedNoninterference(model),
      { pageSuffix: "<script>void Reflect.get(globalThis, 'state')</script>" },
    );
    await assert.rejects(
      preflightDesignResourceHandoff(root, SYMBOLIC_HANDOFF_PATH),
      (error) => {
        const message = String(error);
        assert.match(
          message,
          /v2_noninterference_current_input_counterexample/u,
        );
        assert.match(message, /"side":"source"/u);
        assert.match(message, /resource\.page/u);
        assert.match(message, /unsupported_source/u);
        return true;
      },
    );
  });
});

test("the restricted Source IR rejects author verdict fields and proof artifacts cannot self-enter the semantic input closure", async () => {
  await withFixture(async (root) => {
    await writeDesignResourceSymbolicHandoffFixture(
      root,
      (model) => enableFixtureTrustedNoninterference(model),
      {
        mutateSourceIr(sourceIr) {
          sourceIr.author_verdict = "passed";
        },
      },
    );
    await assert.rejects(
      preflightDesignResourceHandoff(root, SYMBOLIC_HANDOFF_PATH),
      /v2_noninterference_current_input_counterexample.*invalid_symbolic_source_ir/u,
    );
  });

  await withFixture(async (root) => {
    await writeDesignResourceSymbolicHandoffFixture(
      root,
      (model) => enableFixtureTrustedNoninterference(model),
      {
        afterProofArtifacts({ model, artifactResources }) {
          const artifact = artifactResources.find(
            (item) => item.key === "resource.noninterference.source",
          );
          model.manifest.inspector.input_resources.push({
            resource_ref: artifact.key,
            path: artifact.path,
            sha256: artifact.sha256,
          });
          for (const proof of [
            model.certificate.source_noninterference_proof,
            model.certificate.production_noninterference_proof,
          ])
            proof.input_resource_refs = [
              ...new Set([...proof.input_resource_refs, artifact.key]),
            ].sort();
        },
      },
    );
    await assert.rejects(
      preflightDesignResourceHandoff(root, SYMBOLIC_HANDOFF_PATH),
      /v2_inspector_input_resource_set_mismatch/u,
    );
  });
});

test("current production executable, style, template, interactive and unsupported dependencies fail closed", async () => {
  for (const pageSuffix of [
    "<script>fetch(globalThis.dynamicUrl)</script>",
    "<script>Reflect.get(globalThis, 'mode')</script>",
    "<script>getComputedStyle(document.body)</script>",
    "<script>void navigator.mediaDevices</script>",
    "<script>const key = ['variation', 'state'].join('.'); globalThis[key] = true</script>",
    "<script>globalThis.constant = true</script>",
    "<style>main { color: red }</style>",
    '<main onclick="void 0">eventful</main>',
    "<template><main>deferred</main></template>",
    '<img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=">',
    "<x-runtime-widget>custom</x-runtime-widget>",
  ])
    await withFixture(async (root) => {
      await writeDesignResourceSymbolicHandoffFixture(
        root,
        (model) => enableFixtureTrustedNoninterference(model),
        { pageSuffix },
      );
      await assert.rejects(
        preflightDesignResourceHandoff(root, SYMBOLIC_HANDOFF_PATH),
        /v2_noninterference_current_input_counterexample.*unsupported_dependency/u,
      );
    });
});

test("proof artifacts bind Oracle, environment, input, target, method result and canonical current bytes", async () => {
  for (const [mutate, pattern] of [
    [
      ({ model }) => {
        model.certificate.source_noninterference_proof.oracle_version =
          "forged-version";
      },
      /v2_noninterference_artifact_binding_mismatch/u,
    ],
    [
      ({ model }) => {
        model.certificate.source_noninterference_proof.oracle_implementation_sha256 =
          "0".repeat(64);
      },
      /v2_noninterference_artifact_binding_mismatch/u,
    ],
    [
      ({ model }) => {
        model.certificate.source_noninterference_proof.oracle_capability =
          "symbolic_noninterference.source.forged";
      },
      /v2_noninterference_oracle_capability_binding_mismatch/u,
    ],
    [
      ({ model }) => {
        model.certificate.source_noninterference_proof.environment_sha256 =
          "0".repeat(64);
      },
      /v2_noninterference_artifact_binding_mismatch/u,
    ],
    [
      ({ model }) => {
        model.manifest.environments[0].identity =
          "fixture-browser-environment.changed";
      },
      /v2_noninterference_artifact_current_input_mismatch/u,
    ],
    [
      async ({ root, directory, model, inputResources }) => {
        const content =
          '<!doctype html><main id="root">Current safe snapshot</main>\n';
        await writeFile(path.join(root, directory, "page.html"), content);
        const resource = inputResources.find(
          (item) => item.key === "resource.page",
        );
        resource.sha256 = fixtureSha(content);
        model.manifest.inspector.input_resources.find(
          (item) => item.resource_ref === resource.key,
        ).sha256 = resource.sha256;
      },
      /v2_noninterference_artifact_current_input_mismatch/u,
    ],
    [
      ({ model }) => {
        model.certificate.source_noninterference_proof.input_snapshot_sha256 =
          "0".repeat(64);
      },
      /v2_noninterference_artifact_binding_mismatch/u,
    ],
    [
      ({ model }) => {
        model.certificate.source_noninterference_proof.source_manifest_snapshot_sha256 =
          "0".repeat(64);
      },
      /v2_noninterference_artifact_binding_mismatch/u,
    ],
    [
      ({ model }) => {
        model.certificate.source_noninterference_proof.certificate_scope_sha256 =
          "0".repeat(64);
      },
      /v2_noninterference_artifact_binding_mismatch/u,
    ],
    [
      ({ model }) => {
        model.certificate.source_noninterference_proof.rule_scope_sha256 =
          "0".repeat(64);
      },
      /v2_noninterference_artifact_binding_mismatch/u,
    ],
    [
      ({ model }) => {
        model.certificate.production_noninterference_proof.target_snapshot_sha256 =
          "0".repeat(64);
      },
      /v2_noninterference_artifact_binding_mismatch/u,
    ],
    [
      ({ model }) => {
        model.certificate.production_noninterference_proof.method_result_sha256 =
          "0".repeat(64);
      },
      /v2_noninterference_artifact_binding_mismatch/u,
    ],
    [
      ({ model }) => {
        model.certificate.source_noninterference_proof.artifact_path =
          "design/not-the-artifact.json";
      },
      /v2_noninterference_artifact_resource_mismatch/u,
    ],
    [
      ({ model }) => {
        model.certificate.source_noninterference_proof.static_dependency_nodes =
          [];
      },
      /v2_source_noninterference_proof_cache_mismatch/u,
    ],
    [
      async ({ root, model, artifactResources }) => {
        const proof = model.certificate.production_noninterference_proof;
        const resource = artifactResources.find(
          (item) => item.key === proof.artifact_resource_ref,
        );
        const content = '{"tampered":true}\n';
        await writeFile(path.join(root, resource.path), content);
        resource.sha256 = fixtureSha(content);
        proof.artifact_sha256 = resource.sha256;
      },
      /v2_noninterference_artifact_current_input_mismatch/u,
    ],
  ])
    await withFixture(async (root) => {
      await writeDesignResourceSymbolicHandoffFixture(
        root,
        (model) => enableFixtureTrustedNoninterference(model),
        { afterProofArtifacts: mutate },
      );
      await assert.rejects(
        preflightDesignResourceHandoff(root, SYMBOLIC_HANDOFF_PATH),
        pattern,
      );
    });

  await withFixture(async (root) => {
    await writeDesignResourceSymbolicHandoffFixture(root, (model) => {
      enableFixtureTrustedNoninterference(model);
      model.manifest.oracles[0].sha256 = "0".repeat(64);
    });
    await assert.rejects(
      preflightDesignResourceHandoff(root, SYMBOLIC_HANDOFF_PATH),
      /v2_noninterference_package_oracle_identity_mismatch/u,
    );
  });
});

test("package-derived applicability rejects narrowed text, control, asset and single-property profiles plus free-form basis", async () => {
  for (const mutate of [
    (model) => {
      model.manifest.subjects[0].kind = "text";
      model.manifest.structural_applicability.subject_profile_bindings[0].basis_refs[0] =
        "package-policy.subject-kind.text.v1";
    },
    (model) => {
      model.manifest.subjects[0].kind = "control";
      model.manifest.structural_applicability.subject_profile_bindings[0].basis_refs[0] =
        "package-policy.subject-kind.control.v1";
    },
    (model) => {
      model.manifest.subjects[0].kind = "asset";
      model.manifest.structural_applicability.subject_profile_bindings[0].basis_refs[0] =
        "package-policy.subject-kind.asset.v1";
    },
    (model) => {
      model.manifest.structural_applicability.subject_profile_bindings[0].profile_refs =
        ["profile.property.geometry.width"];
    },
  ])
    await withFixture(async (root) => {
      await writeDesignResourceSymbolicHandoffFixture(root, (model) => {
        enableCompactSymbolicApplicability(model);
        mutate(model);
      });
      await assert.rejects(
        preflightDesignResourceHandoff(root, SYMBOLIC_HANDOFF_PATH),
        /v2_applicability_package_derived_set_mismatch/u,
      );
    });

  await withFixture(async (root) => {
    await writeDesignResourceSymbolicHandoffFixture(root, (model) => {
      enableCompactSymbolicApplicability(model);
      model.manifest.structural_applicability.subject_profile_bindings[0].basis_refs.push(
        "author.free-form-basis",
      );
    });
    await assert.rejects(
      preflightDesignResourceHandoff(root, SYMBOLIC_HANDOFF_PATH),
      /v2_applicability_basis_authority_unknown/u,
    );
  });
});

test("untrusted, dynamic, external, incomplete and sampled proofs fail closed", async () => {
  for (const [method, mutate, pattern] of [
    [
      "closed_world_static_dependency_closure",
      (_certificate, model) => {
        model.manifest.oracles[0].trust = "named_external_tcb";
        model.manifest.oracles[0].sha256 = null;
      },
      /v2_noninterference_frozen_oracle_required/u,
    ],
    [
      "closed_world_static_dependency_closure",
      (_certificate, model) => {
        model.manifest.oracles[0].capability_refs =
          model.manifest.oracles[0].capability_refs.filter(
            (capability) =>
              capability !==
              "symbolic_noninterference.production.closed_world_static_dependency_closure",
          );
      },
      /v2_noninterference_oracle_capability_missing/u,
    ],
    [
      "closed_world_static_dependency_closure",
      (certificate) =>
        certificate.source_noninterference_proof.dynamic_dependency_kinds.push(
          "reflection",
        ),
      /v2_noninterference_dynamic_dependency_unproved/u,
    ],
    [
      "closed_world_static_dependency_closure",
      (certificate) =>
        certificate.production_noninterference_proof.external_device_refs.push(
          "device.unfrozen-gpu",
        ),
      /v2_noninterference_external_device_unproved/u,
    ],
    [
      "closed_world_static_dependency_closure",
      (certificate) =>
        certificate.source_noninterference_proof.input_resource_refs.pop(),
      /v2_noninterference_input_closure_mismatch/u,
    ],
    [
      "closed_world_static_dependency_closure",
      (certificate) =>
        certificate.production_noninterference_proof.static_dependency_nodes[0].input_resource_refs.pop(),
      /v2_static_dependency_input_graph_mismatch/u,
    ],
    [
      "closed_world_static_dependency_closure",
      (certificate) => {
        const node =
          certificate.production_noninterference_proof
            .static_dependency_nodes[0];
        node.dependency_refs.push(node.key);
      },
      /v2_static_dependency_cycle/u,
    ],
    [
      "closed_world_static_dependency_closure",
      (certificate) =>
        certificate.production_noninterference_proof.static_dependency_nodes.push(
          {
            key: "dependency.production.unreachable",
            axis_refs: [],
            dependency_refs: [],
            input_resource_refs: [],
          },
        ),
      /v2_static_dependency_unreachable_node/u,
    ],
    [
      "closed_world_static_dependency_closure",
      (certificate) =>
        certificate.production_noninterference_proof.static_dependency_nodes[0].axis_refs.push(
          "variation.state",
        ),
      /v2_static_dependency_closure_mismatch/u,
    ],
    [
      "restricted_ir_symbolic_equivalence",
      (certificate) => {
        certificate.production_noninterference_proof.equivalence_cases[0].side_predicate =
          {
            op: "eq",
            axis_ref: "variation.state",
            value: "idle",
          };
      },
      /v2_side_predicate_rule_mismatch/u,
    ],
    [
      "restricted_ir_symbolic_equivalence",
      (certificate) => {
        certificate.source_noninterference_proof.method = "sampling";
      },
      /must be one of closed_world_static_dependency_closure/u,
    ],
    [
      "restricted_ir_symbolic_equivalence",
      (certificate) => {
        certificate.production_noninterference_proof.equivalence_cases[0].axis_erased_predicate =
          {
            op: "eq",
            axis_ref: "variation.state",
            value: "idle",
          };
      },
      /v2_equivalence_candidate_axis_not_erased/u,
    ],
    [
      "finite_complete_domain_exhaustive_equivalence",
      (certificate) => {
        certificate.production_noninterference_proof.complete_domain_cardinality =
          "3";
      },
      /v2_exhaustive_domain_cardinality_mismatch/u,
    ],
  ])
    await withFixture(async (root) => {
      await writeDesignResourceSymbolicHandoffFixture(root, (model) => {
        enableFixtureTrustedNoninterference(model, method);
        mutate(model.manifest.noninterference_certificates[0], model);
        rekeySymbolicFixtureCertificate(model);
      });
      await assert.rejects(
        preflightDesignResourceHandoff(root, SYMBOLIC_HANDOFF_PATH),
        pattern,
      );
    });
});

test("exact targets require separate full-domain layout and pixel proof coverage", async () => {
  await withFixture(async (root) => {
    await writeDesignResourceSymbolicHandoffFixture(root, (model) => {
      model.rules.find(
        (item) => item.rule.property_ref === "color.background",
      ).rule.observation_scope = "subject";
      refreshSymbolicFixtureDerivedIdentities(model);
    });
    await assert.rejects(
      preflightDesignResourceHandoff(root, SYMBOLIC_HANDOFF_PATH),
      /v2_exact_target_full_target_region_gap:visual_pixel/u,
    );
  });
});

test("V2 reuses V1 Oracle, comparator, exactness and protected-value proof policy", async () => {
  for (const [mutate, pattern] of [
    [
      ({ manifest }) => {
        manifest.oracles[0].trust = "frozen_executable";
      },
      /v2_oracle_digest_required/u,
    ],
    [
      (model) => {
        const baseProperty = model.properties.find(
          (item) => item.key === "geometry.width",
        );
        model.properties.push({
          ...structuredClone(baseProperty),
          key: "custom.incompatible-method",
          standard: false,
          required_methods: ["visual_pixel"],
          census_refs: ["census.property.custom-incompatible"],
        });
        model.census.push({
          ...structuredClone(
            model.census.find((item) => item.key === "census.property.width"),
          ),
          key: "census.property.custom-incompatible",
          fact_refs: [],
        });
        for (const projection of model.rules.filter(
          (item) => item.rule.property_ref === "geometry.width",
        )) {
          const clone = structuredClone(projection);
          clone.rule.property_ref = "custom.incompatible-method";
          clone.rule.census_refs = [
            "census.subject.root",
            "census.property.custom-incompatible",
          ];
          model.rules.push(clone);
        }
        refreshSymbolicFixtureDerivedIdentities(model);
      },
      /v2_proof_method_incompatible/u,
    ],
    [
      ({ manifest }) => {
        manifest.oracles[0].capability_refs =
          manifest.oracles[0].capability_refs.filter(
            (item) => item !== "render_capture",
          );
      },
      /v2_proof_oracle_capability_missing/u,
    ],
    [
      ({ manifest }) => {
        const obligation = manifest.semantic_proof_obligations.find(
          (item) => item.method === "visual_pixel",
        );
        obligation.comparison.comparator = "exact_value";
        rekeyObligation(manifest, obligation);
      },
      /v2_proof_comparator_method_incompatible/u,
    ],
    [
      ({ manifest }) => {
        const obligation = manifest.semantic_proof_obligations[0];
        obligation.comparison.tolerance = structuredClone(
          obligation.comparison.parameters,
        );
        rekeyObligation(manifest, obligation);
      },
      /v2_exact_proof_tolerance_forbidden/u,
    ],
    [
      ({ manifest }) => {
        const obligation = manifest.semantic_proof_obligations[0];
        obligation.protected_value_policy = "policy.redacted";
        rekeyObligation(manifest, obligation);
      },
      /v2_protected_value_policy_mismatch/u,
    ],
    [
      ({ manifest }) => {
        const obligation = manifest.semantic_proof_obligations[0];
        obligation.proof_surface = "proxy_only";
        rekeyObligation(manifest, obligation);
      },
      /v2_obligation_proxy_only_forbidden/u,
    ],
  ])
    await withFixture(async (root) => {
      await writeDesignResourceSymbolicHandoffFixture(root, mutate);
      await assert.rejects(
        preflightDesignResourceHandoff(root, SYMBOLIC_HANDOFF_PATH),
        pattern,
      );
    });
});

test("Inspector Census, population and located-resource closure fail closed", async () => {
  for (const [mutate, pattern] of [
    [
      ({ manifest }) => {
        manifest.inspector.implementation_sha256 = "0".repeat(64);
      },
      /v2_inspector_trust_digest_mismatch/u,
    ],
    [
      ({ manifest }) => {
        manifest.inspector.census[0].fact_refs.pop();
      },
      /v2_census_rule_set_mismatch/u,
    ],
    [
      ({ manifest }) => {
        manifest.environments[0].definition.sha256 = "f".repeat(64);
      },
      /located_value_digest_mismatch/u,
    ],
    [
      ({ manifest }) => {
        manifest.subjects[0].population_ref = "population.fixture";
        manifest.populations.push({
          key: "population.fixture",
          kind: "static",
          member_subject_refs: [],
          universe: structuredClone(manifest.environments[0].definition),
          enumeration: "complete",
          exclusions: [],
          quantifier: { kind: "all", minimum: null, maximum: null },
        });
      },
      /v2_population_member_set_mismatch/u,
    ],
  ])
    await withFixture(async (root) => {
      await writeDesignResourceSymbolicHandoffFixture(root, mutate);
      await assert.rejects(
        preflightDesignResourceHandoff(root, SYMBOLIC_HANDOFF_PATH),
        pattern,
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

function rekeyObligation(manifest, obligation) {
  const previous = obligation.key;
  const { key: _key, ...input } = obligation;
  obligation.key = designResourceSymbolicObligationKey(input);
  const rule = manifest.fact_rules.find(
    (item) => item.key === obligation.fact_rule_ref,
  );
  rule.semantic_obligation_refs = rule.semantic_obligation_refs.map((item) =>
    item === previous ? obligation.key : item,
  );
}
