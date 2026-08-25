import { fixtureSemanticManifest } from "./long-task-delivery-fixtures.mjs";
import { fixtureSourceStatements } from "./long-task-semantic-manifest-fixture.mjs";
import { digestText } from "./long-task-semantic-refresh-fixture.mjs";
import { deriveMaterialSourceFragments } from "../../packages/ty-context/dist/lib/long-task-source-fragments.js";

export function sourceClosureFixture(options = {}) {
  const manifest = fixtureSemanticManifest({
    explicitFragments: options.explicitFragments !== false,
  });
  const items = manifest.scope.source_item_refs.map((key) =>
    sourceItem(
      key,
      key === "fixture-architecture" ? "technical_obligation" : "requirement",
      fixtureSourceStatements[key],
    ),
  );
  return { manifest, items };
}

export function sourceItem(key, kind, text) {
  return {
    key,
    kind,
    source_path: "source.md",
    normalized_text: text,
    text_sha256: digestText(text),
  };
}

export function setSourceText(manifest, items, key, text, options = {}) {
  const item = items.find((candidate) => candidate.key === key);
  item.normalized_text = text;
  item.text_sha256 = digestText(text);
  manifest.inputs.find(
    (candidate) =>
      candidate.kind === "source_item" && candidate.source_ref === key,
  ).sha256 = item.text_sha256;
  if (options.explicitFragments !== false)
    replaceFragmentProjections(manifest, item);
}

export function addSourceBasis(
  manifest,
  items,
  { key, kind, text, disposition, factRefs, fragmentDisposition },
) {
  items.push(sourceItem(key, kind, text));
  manifest.scope.source_item_refs.push(key);
  manifest.inputs.push({
    key: `input.${key}`,
    kind: "source_item",
    source_ref: key,
    sha256: digestText(text),
    disposition,
    fact_refs: factRefs,
    basis_refs: [key],
    rationale: "A bounded regression Source basis.",
  });
  addFragmentProjections(
    manifest,
    items.at(-1),
    factRefs,
    disposition,
    undefined,
    undefined,
    fragmentDisposition,
  );
}

export function replaceFragmentProjection(
  manifest,
  item,
  { disposition, factRefs, basisRefs, rationale },
) {
  removeFragmentProjections(manifest, item.key);
  addFragmentProjections(
    manifest,
    item,
    factRefs,
    "non_ui_material",
    basisRefs,
    rationale,
    disposition,
  );
}

function replaceFragmentProjections(manifest, item) {
  const sourceInput = manifest.inputs.find(
    (candidate) =>
      candidate.kind === "source_item" && candidate.source_ref === item.key,
  );
  removeFragmentProjections(manifest, item.key);
  addFragmentProjections(
    manifest,
    item,
    sourceInput.fact_refs,
    sourceInput.disposition,
  );
}

function removeFragmentProjections(manifest, sourceKey) {
  const removed = new Set(
    manifest.inputs
      .filter(
        (input) =>
          (input.kind === "source_fragment" ||
            input.kind === "semantic_anchor") &&
          input.source_ref.startsWith(`${sourceKey}#fragment:`),
      )
      .map((input) => input.key),
  );
  manifest.inputs = manifest.inputs.filter((input) => !removed.has(input.key));
  for (const fact of manifest.facts)
    fact.provenance.basis_refs = fact.provenance.basis_refs.filter(
      (ref) => !removed.has(ref),
    );
}

function addFragmentProjections(
  manifest,
  item,
  factRefs,
  sourceDisposition,
  basisRefs = [item.key],
  rationale = "The fixture explicitly dispositions this complete material Fragment.",
  dispositionOverride,
) {
  const fragmentDisposition =
    dispositionOverride ?? (sourceDisposition === "supporting_only"
      ? "supporting_basis"
      : "fact_bearing");
  for (const fragment of deriveMaterialSourceFragments(item)) {
    const key = `input.fragment.${item.key}.${fragment.ordinal}`;
    manifest.inputs.push({
      key,
      kind: "source_fragment",
      source_ref: fragment.key,
      sha256: fragment.text_sha256,
      disposition: fragmentDisposition,
      fact_refs: factRefs,
      basis_refs: basisRefs,
      rationale,
    });
    for (const factRef of factRefs) {
      const fact = manifest.facts.find((candidate) => candidate.key === factRef);
      if (fact && !fact.provenance.basis_refs.includes(key))
        fact.provenance.basis_refs.push(key);
    }
  }
}

export function assertion(contract, key) {
  return contract.outcomes[0].acceptance.checks[0].positive_assertions.find(
    (row) => row.key === key,
  );
}
