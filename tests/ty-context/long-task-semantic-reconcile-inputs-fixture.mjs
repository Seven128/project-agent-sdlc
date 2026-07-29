import { readFile } from "node:fs/promises";
import path from "node:path";
import { captureContextGraphSnapshot } from "../../packages/ty-context/dist/lib/context-graph-snapshot.js";
import {
  reconcileFixtureBasisRefs,
} from "./long-task-semantic-reconcile-primitives-fixture.mjs";
import {
  digestText,
} from "./long-task-semantic-refresh-fixture.mjs";

export function rebuildFixtureSemanticInputs(
  manifest,
  inventory,
  authorityRefs,
  primaryAuthority,
) {
  const factRefs = manifest.facts.map((fact) => fact.key);
  const existingSourceInputs = new Map(
    manifest.inputs
      .filter((input) => input.kind === "source_item")
      .map((input) => [input.source_ref, input]),
  );
  manifest.scope.source_item_refs = inventory.items.map((item) => item.key);
  manifest.inputs = [
    ...inventory.items.map((item) => {
      const designOwned = inventory.designOwnedSourceItemRefs.has(item.key);
      const existing = existingSourceInputs.get(item.key);
      const disposition = designOwned ? "ui_design" : "non_ui_material";
      const retainedFactRefs = existing?.fact_refs.filter((ref) =>
        factRefs.includes(ref),
      );
      return {
        key: existing?.key ?? `input.${item.key}`,
        kind: "source_item",
        source_ref: item.key,
        sha256: item.text_sha256,
        disposition,
        fact_refs: designOwned
          ? []
          : retainedFactRefs?.length
            ? retainedFactRefs
            : factRefs,
        basis_refs: reconcileFixtureBasisRefs(
          existing?.basis_refs ?? [item.key],
          authorityRefs,
          item.key,
        ),
        rationale:
          existing?.disposition === disposition
            ? existing.rationale
            : designOwned
              ? "This Source item is owned by the strict design-resource handoff and contributes no non-UI semantic Fact."
              : "This atomic fixture Source item contributes to the exact non-UI Fact universe.",
      };
    }),
    ...manifest.inputs
      .filter((input) => input.kind !== "source_item")
      .map((input) => ({
        ...input,
        basis_refs: reconcileFixtureBasisRefs(
          input.basis_refs,
          authorityRefs,
          primaryAuthority,
        ),
      })),
  ];
}

export async function rebuildFixtureContextInputs(
  root,
  contract,
  manifest,
  authorityRefs,
  primaryAuthority,
) {
  const snapshot = await captureContextGraphSnapshot(
    root,
    contract.task.context_refs,
    contract.task.context_snapshot_mode,
  );
  const factRefs = manifest.facts.map((fact) => fact.key);
  const existingBySource = new Map(
    manifest.inputs
      .filter((input) => input.kind === "context")
      .map((input) => [input.source_ref, input]),
  );
  const retainedInputs = manifest.inputs.filter(
    (input) => input.kind !== "context",
  );
  const usedKeys = new Set(retainedInputs.map((input) => input.key));
  const contextInputs = [];
  const contextFileSet = new Set(snapshot.files);
  const orderedContextRefs = [
    ...manifest.inputs
      .filter(
        (input) =>
          input.kind === "context" &&
          contextFileSet.has(input.source_ref),
      )
      .map((input) => input.source_ref),
    ...snapshot.files.filter(
      (sourceRef) => !existingBySource.has(sourceRef),
    ),
  ];
  for (const sourceRef of orderedContextRefs) {
    const existing = existingBySource.get(sourceRef);
    const key =
      existing?.key ?? fixtureContextInputKey(sourceRef, usedKeys);
    usedKeys.add(key);
    contextInputs.push({
      key,
      kind: "context",
      source_ref: sourceRef,
      sha256: digestText(
        await readFile(path.join(root, ...sourceRef.split("/"))),
      ),
      disposition: "non_ui_material",
      fact_refs: factRefs,
      basis_refs: reconcileFixtureBasisRefs(
        existing?.basis_refs ?? [],
        authorityRefs,
        primaryAuthority,
      ),
      rationale:
        existing?.rationale ??
        "This exact full-Context input is classified and bound into the fixture Fact universe.",
    });
  }
  manifest.inputs = [...retainedInputs, ...contextInputs];
}

function fixtureContextInputKey(sourceRef, usedKeys) {
  const basename = path.posix
    .basename(sourceRef)
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
  const identity = digestText(sourceRef).slice(0, 12);
  let key = `input.context-${basename || "file"}-${identity}`;
  let collision = 1;
  while (usedKeys.has(key)) {
    key = `input.context-${basename || "file"}-${identity}-${collision}`;
    collision += 1;
  }
  return key;
}
