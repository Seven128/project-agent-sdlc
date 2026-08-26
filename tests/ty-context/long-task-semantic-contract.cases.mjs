import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import YAML from "yaml";
import { compileDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-delivery-compiler.js";
import { scanMaterialTextInput } from "../../packages/ty-context/dist/lib/long-task-source-fragments.js";
import {
  createDeliveryFixture,
  refreshFixtureSemanticManifest,
  semanticManifestIdentity,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";
import {
  addFixtureCustomConditionAxis,
  mutateFixtureSemanticManifest,
} from "./long-task-semantic-fact-test-support.mjs";
import { FIXTURE_LEGACY_ORACLE_PATH } from "./long-task-package-machine-fixture.mjs";
import { digestText } from "./long-task-semantic-refresh-fixture.mjs";

test("Contract projection freezes the exact semantic Fact and proof set", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const compiled = await compileDeliveryContract(
      fixture.workdir,
      fixture.root,
      { require_completion_gate: false },
    );
    const check = compiled.outcomes[0].acceptance.checks[0];
    assert.equal(check.semantic_fact_expectations.length, 2);
    const observableExpectation = check.semantic_fact_expectations.find(
      (expectation) => expectation.fact_ref === "fact.first.observable",
    );
    assert.ok(observableExpectation);
    assert.equal(observableExpectation.fact_ref, "fact.first.observable");
    assert.equal(observableExpectation.comparison.mask, null);

    fixture.contract.outcomes[0].semantic_fact_bindings.facts = [];
    await writeContract(fixture.workdir, fixture.contract);
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
      /semantic_fact_binding_required|semantic_fact_bindings_fact_refs_required|contract_fact_set/u,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});
test("each applicable semantic condition value is projected into the Contract applicability", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await mutateFixtureSemanticManifest(fixture, (manifest) => {
      addFixtureCustomConditionAxis(manifest);
    });
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
      /contract_fact_applicability_condition_mismatch/u,
    );

    fixture.contract.outcomes[0].applicability[0].dimensions.push({
      key: "custom.delivery_channel",
      value: "api",
    });
    await writeContract(fixture.workdir, fixture.contract, {
      synchronizeSemanticManifest: false,
    });
    await assert.doesNotReject(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("ordinary Material Source cannot be hidden as supporting-only", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const sourcePath = path.join(fixture.root, "source.md");
    const source = await readFile(sourcePath, "utf8");
    const match = source.match(
      /```yaml semantic-fact-manifest-v1\r?\n([\s\S]*?)\r?\n```/u,
    );
    assert.ok(match);
    const manifest = YAML.parse(match[1]);
    const input = manifest.inputs.find(
      (item) => item.source_ref === "fixture-architecture",
    );
    input.disposition = "supporting_only";
    input.fact_refs = [];
    refreshFixtureSemanticManifest(manifest);
    const serialized = YAML.stringify(JSON.parse(JSON.stringify(manifest)), {
      lineWidth: 0,
    }).trimEnd();
    await writeFile(
      sourcePath,
      source.replace(
        match[0],
        `\`\`\`yaml semantic-fact-manifest-v1\n${serialized}\n\`\`\``,
      ),
    );
    fixture.contract.semantic_fact_manifest.sha256 =
      semanticManifestIdentity(manifest);
    await writeContract(fixture.workdir, fixture.contract, {
      synchronizeSemanticManifest: false,
    });
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
      /material_source_item_disposition_mismatch/u,
    );

    input.disposition = "non_ui_material";
    input.fact_refs = ["fact.first.observable"];
    manifest.facts[0].source_item_refs =
      manifest.facts[0].source_item_refs.filter(
        (item) => item !== "fixture-architecture",
      );
    refreshFixtureSemanticManifest(manifest);
    const lineageSerialized = YAML.stringify(
      JSON.parse(JSON.stringify(manifest)),
      { lineWidth: 0 },
    ).trimEnd();
    await writeFile(
      sourcePath,
      source.replace(
        match[0],
        `\`\`\`yaml semantic-fact-manifest-v1\n${lineageSerialized}\n\`\`\``,
      ),
    );
    fixture.contract.semantic_fact_manifest.sha256 =
      semanticManifestIdentity(manifest);
    await writeContract(fixture.workdir, fixture.contract, {
      synchronizeSemanticManifest: false,
    });
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
      /input_fact_lineage_mismatch/u,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("explicit supporting-basis fragments compile only with named delivery Facts", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const backgroundPath = "tests/fixture-background.md";
    const backgroundText =
      "Background rationale records why the observable behavior was selected.";
    await writeFile(path.join(fixture.root, backgroundPath), backgroundText);
    fixture.contract.outcomes[0].technical.allowed_support_paths.push(
      backgroundPath,
    );
    fixture.contract.outcomes[0].product.owner.path_globs.push(backgroundPath);
    const sourcePath = path.join(fixture.root, "source.md");
    const source = await readFile(sourcePath, "utf8");
    const match = source.match(
      /```yaml semantic-fact-manifest-v1\r?\n([\s\S]*?)\r?\n```/u,
    );
    assert.ok(match);
    const manifest = YAML.parse(match[1]);
    const attachment = {
      key: "input.fixture-background",
      kind: "attachment",
      source_ref: backgroundPath,
      sha256: digestText(backgroundText),
      disposition: "supporting_only",
      fact_refs: [],
      basis_refs: ["first-observable"],
      rationale:
        "This attachment is typed background for one exact product Fact cell.",
    };
    manifest.inputs.push(attachment);
    const [fragment] = scanMaterialTextInput({
      input_key: attachment.key,
      input_kind: attachment.kind,
      source_ref: attachment.source_ref,
      sha256: attachment.sha256,
      authority_source_item_refs: ["first-observable"],
      authority_domain: "product",
      normalized_text: backgroundText,
    }).fragments;
    assert.ok(fragment);
    const projection = {
      key: "input.fragment.fixture-background.1",
      kind: "source_fragment",
      source_ref: fragment.key,
      sha256: fragment.text_sha256,
      disposition: "supporting_basis",
      fact_refs: ["fact.first.observable"],
      basis_refs: ["first-observable"],
      rationale:
        "The typed relation proves this background supports the same Fact cell.",
      supporting_relation: {
        kind: "same_semantic_cell_non_normative",
        fact_ref: "fact.first.observable",
        fact_cell_ref: "cell.first.observable",
      },
    };
    manifest.inputs.push(projection);
    manifest.facts
      .find((fact) => fact.key === "fact.first.observable")
      .provenance.basis_refs.push(projection.key);
    await writeManifestSource(fixture, sourcePath, source, match[0], manifest);
    await assert.doesNotReject(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
    );

    projection.fact_refs = [];
    await writeManifestSource(fixture, sourcePath, source, match[0], manifest);
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
      /input_fact_disposition_mismatch|source_supporting_basis_fact_required/u,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Fact provenance must be authority-grounded and acyclic", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await mutateFixtureSemanticManifest(fixture, (manifest) => {
      const fact = manifest.facts[0];
      fact.provenance.authority_ref = fact.key;
      fact.provenance.basis_refs.push(fact.key);
    });
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
      /fact_authority_self_reference/u,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("declared semantic observers must be independent observer-role targets", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await mutateFixtureSemanticManifest(fixture, (manifest) => {
      manifest.proof_obligations[0].observer_refs = ["fixture-app"];
    });
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
      /proof_observer_target_role_mismatch/u,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("a project frozen semantic Oracle cannot replace the package-admitted observer", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const outcome = fixture.contract.outcomes[0];
    outcome.technical.allowed_support_paths =
      outcome.technical.allowed_support_paths.filter(
        (candidate) => candidate !== FIXTURE_LEGACY_ORACLE_PATH,
      );
    outcome.acceptance.checks[0].verification_inputs.push(
      FIXTURE_LEGACY_ORACLE_PATH,
    );
    const admittedOracle = structuredClone(outcome.semantic_fact_bindings);
    const oracleSha256 = createHash("sha256")
      .update(
        await readFile(
          path.join(fixture.root, ...FIXTURE_LEGACY_ORACLE_PATH.split("/")),
        ),
      )
      .digest("hex");
    await mutateFixtureSemanticManifest(fixture, (manifest) => {
      manifest.oracles[0] = {
        ...manifest.oracles[0],
        trust: "frozen_executable",
        identity: FIXTURE_LEGACY_ORACLE_PATH,
        sha256: oracleSha256,
      };
    });
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
      /custom_oracle_machine_completion_forbidden:semantic_fact:proof\.first\.observable\.exact:tests\/legacy-oracle\.mjs/u,
    );

    outcome.semantic_fact_bindings = admittedOracle;
    outcome.acceptance.checks[0].verification_inputs =
      outcome.acceptance.checks[0].verification_inputs.filter(
        (candidate) => candidate !== FIXTURE_LEGACY_ORACLE_PATH,
      );
    await mutateFixtureSemanticManifest(fixture, (manifest) => {
      manifest.oracles[0] = {
        ...manifest.oracles[0],
        trust: "named_external_tcb",
        identity: "ty-context-json-pointer-exact",
        version: "1.0.0",
        sha256: null,
      };
    });
    await assert.doesNotReject(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

async function writeManifestSource(
  fixture,
  sourcePath,
  source,
  originalBlock,
  manifest,
) {
  refreshFixtureSemanticManifest(manifest);
  const serialized = YAML.stringify(JSON.parse(JSON.stringify(manifest)), {
    lineWidth: 0,
  }).trimEnd();
  await writeFile(
    sourcePath,
    source.replace(
      originalBlock,
      `\`\`\`yaml semantic-fact-manifest-v1\n${serialized}\n\`\`\``,
    ),
  );
  fixture.contract.semantic_fact_manifest.sha256 =
    semanticManifestIdentity(manifest);
  await writeContract(fixture.workdir, fixture.contract, {
    synchronizeSemanticManifest: false,
  });
}
