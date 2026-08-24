import { fixtureSemanticManifest } from "./long-task-delivery-fixtures.mjs";
import { fixtureSourceStatements } from "./long-task-semantic-manifest-fixture.mjs";
import { digestText } from "./long-task-semantic-refresh-fixture.mjs";

export function sourceClosureFixture() {
  const manifest = fixtureSemanticManifest();
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

export function setSourceText(manifest, items, key, text) {
  const item = items.find((candidate) => candidate.key === key);
  item.normalized_text = text;
  item.text_sha256 = digestText(text);
  manifest.inputs.find(
    (candidate) =>
      candidate.kind === "source_item" && candidate.source_ref === key,
  ).sha256 = item.text_sha256;
}

export function addSourceBasis(
  manifest,
  items,
  { key, kind, text, disposition, factRefs },
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
}

export function assertion(contract, key) {
  return contract.outcomes[0].acceptance.checks[0].positive_assertions.find(
    (row) => row.key === key,
  );
}
