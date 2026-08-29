import { fixtureSemanticManifest } from "./long-task-semantic-manifest-fixture.mjs";
import {
  digestText,
  refreshFixtureSemanticManifest,
} from "./long-task-semantic-refresh-fixture.mjs";
import { executionTargetSourceStatement } from "../../packages/ty-context/dist/lib/long-task-source-target-index.js";

export function authoringTemplateSemanticManifest(options = {}) {
  const replacements = new Map([
    ["fixture-semantic-facts", "replace-semantic-facts"],
    ["first", "replace-outcome"],
    ["first-observable", "replace-requirement"],
    ["fixture-architecture", "replace-architecture"],
    ["fixture-execution-target", "replace-execution-target"],
    ["input.first-observable", "input.replace-requirement"],
    ["input.fixture-architecture", "input.replace-architecture"],
    [
      "input.fragment.fixture-architecture.1",
      "input.fragment.replace-architecture.1",
    ],
    ["input.fixture-execution-target", "input.replace-execution-target"],
    ["subject.first.outcome", "subject.replace-outcome.outcome"],
    [
      "subject.first.fixture-architecture",
      "subject.replace-outcome.architecture",
    ],
    ["condition.first.baseline", "condition.replace-outcome.baseline"],
    ["cell.first.observable", "cell.replace-outcome.observable"],
    [
      "cell.first.architecture-boundary",
      "cell.replace-outcome.architecture-boundary",
    ],
    ["fact.first.observable", "replace.result.observable"],
    ["fact.first.architecture-boundary", "replace.architecture.boundary"],
    ["proof.first.observable.exact", "replace.result.observable.runtime"],
    [
      "proof.first.architecture-boundary.exact",
      "replace.architecture.boundary.runtime",
    ],
    ["remove-first-state", "replace-semantic-carrier"],
    ["owner.fixture", "owner.replace"],
  ]);
  const manifest = replaceExactSemanticRefs(
    fixtureSemanticManifest({ executionTarget: options.executionTarget }),
    replacements,
  );
  const sourceStatements = new Map([
    ["replace-requirement", "Preserve one atomic source requirement."],
    [
      "replace-architecture",
      "Preserve the declared owner, dependency direction, verifier boundary and architecture conformance.",
    ],
    ...(options.executionTarget
      ? [
          [
            "replace-execution-target",
            executionTargetSourceStatement(options.executionTarget),
          ],
        ]
      : []),
  ]);
  for (const input of manifest.inputs) {
    if (input.kind === "source_item")
      input.sha256 = digestText(sourceStatements.get(input.source_ref));
  }
  synchronizeVariantSourceFragments(manifest, sourceStatements);
  const owningContext = manifest.inputs.find(
    (input) => input.source_ref === "project_context/areas/main.md",
  );
  const extraContextInput = {
    ...structuredClone(owningContext),
    key: "input.context-replace-me",
    source_ref: "project_context/areas/replace-me.md",
    sha256: digestText("# Replace owner\n"),
  };
  manifest.inputs.push(extraContextInput);
  for (const factRef of extraContextInput.fact_refs) {
    const fact = manifest.facts.find((item) => item.key === factRef);
    if (fact && !fact.provenance.basis_refs.includes(extraContextInput.key))
      fact.provenance.basis_refs.push(extraContextInput.key);
  }
  return refreshFixtureSemanticManifest(manifest);
}

export function publicExampleSemanticManifest(executionTarget) {
  const replacements = new Map([
    ["replace-semantic-facts", "example-semantic-facts"],
    ["replace-outcome", "observable-outcome"],
    ["replace-requirement", "observable-requirement"],
    ["replace-architecture", "architecture-owner"],
    ["replace-execution-target", "example-execution-target"],
    ["input.replace-requirement", "input.observable-requirement"],
    ["input.replace-architecture", "input.architecture-owner"],
    [
      "input.fragment.replace-architecture.1",
      "input.fragment.architecture-owner.1",
    ],
    ["input.replace-execution-target", "input.example-execution-target"],
    ["subject.replace-outcome.outcome", "subject.observable-outcome.outcome"],
    [
      "subject.replace-outcome.architecture",
      "subject.observable-outcome.architecture",
    ],
    [
      "condition.replace-outcome.baseline",
      "condition.observable-outcome.baseline",
    ],
    ["cell.replace-outcome.observable", "cell.observable-outcome.observable"],
    [
      "cell.replace-outcome.architecture-boundary",
      "cell.observable-outcome.architecture-boundary",
    ],
    ["replace.result.observable", "example.result.observable"],
    ["replace.architecture.boundary", "example.architecture.boundary"],
    ["replace.result.observable.runtime", "example.result.observable.runtime"],
    [
      "replace.architecture.boundary.runtime",
      "example.architecture.boundary.runtime",
    ],
    ["replace-semantic-carrier", "replace-observable-semantics"],
    ["owner.replace", "owner.observable"],
  ]);
  const manifest = replaceExactSemanticRefs(
    authoringTemplateSemanticManifest({ executionTarget }),
    replacements,
  );
  manifest.inputs = manifest.inputs.filter(
    (input) => input.source_ref !== "project_context/areas/replace-me.md",
  );
  for (const fact of manifest.facts)
    fact.provenance.basis_refs = fact.provenance.basis_refs.filter(
      (ref) => ref !== "input.context-replace-me",
    );
  const sourceStatements = new Map([
    ["observable-requirement", "The outcome is observable."],
    [
      "architecture-owner",
      "Preserve the observable module as the single state owner.",
    ],
    [
      "example-execution-target",
      executionTargetSourceStatement(executionTarget),
    ],
  ]);
  for (const input of manifest.inputs)
    if (input.kind === "source_item")
      input.sha256 = digestText(sourceStatements.get(input.source_ref));
  synchronizeVariantSourceFragments(manifest, sourceStatements);
  return refreshFixtureSemanticManifest(manifest);
}

export function releaseTarballSemanticManifest() {
  const replacements = new Map([
    ["replace-semantic-facts", "tarball-semantic-facts"],
    ["replace-outcome", "installed"],
    ["replace-requirement", "packaged-verifier"],
    ["replace-architecture", "packaged-architecture"],
    ["input.replace-requirement", "input.packaged-verifier"],
    ["input.replace-architecture", "input.packaged-architecture"],
    [
      "input.fragment.replace-architecture.1",
      "input.fragment.packaged-architecture.1",
    ],
    ["subject.replace-outcome.outcome", "subject.installed.outcome"],
    ["subject.replace-outcome.architecture", "subject.installed.architecture"],
    ["condition.replace-outcome.baseline", "condition.installed.baseline"],
    ["cell.replace-outcome.observable", "cell.installed.observable"],
    [
      "cell.replace-outcome.architecture-boundary",
      "cell.installed.architecture-boundary",
    ],
    ["replace.result.observable", "installed.result.observable"],
    ["replace.architecture.boundary", "installed.architecture.boundary"],
    [
      "replace.result.observable.runtime",
      "installed.result.observable.runtime",
    ],
    [
      "replace.architecture.boundary.runtime",
      "installed.architecture.boundary.runtime",
    ],
    ["replace-semantic-carrier", "replace-state-semantics"],
    ["owner.replace", "owner.installed"],
  ]);
  const manifest = replaceExactSemanticRefs(
    authoringTemplateSemanticManifest(),
    replacements,
  );
  manifest.inputs = manifest.inputs.filter(
    (input) => input.source_ref !== "project_context/areas/replace-me.md",
  );
  for (const fact of manifest.facts)
    fact.provenance.basis_refs = fact.provenance.basis_refs.filter(
      (ref) => ref !== "input.context-replace-me",
    );
  const sourceStatements = new Map([
    ["packaged-verifier", "Use the packaged verifier."],
    [
      "packaged-architecture",
      "Preserve the packaged state owner and verifier boundary.",
    ],
  ]);
  for (const input of manifest.inputs)
    if (input.kind === "source_item")
      input.sha256 = digestText(sourceStatements.get(input.source_ref));
  synchronizeVariantSourceFragments(manifest, sourceStatements);
  return refreshFixtureSemanticManifest(manifest);
}

function synchronizeVariantSourceFragments(manifest, sourceStatements) {
  for (const input of manifest.inputs.filter(
    (candidate) => candidate.kind === "source_fragment",
  )) {
    const sourceItemRef = input.basis_refs.find((reference) =>
      sourceStatements.has(reference),
    );
    if (!sourceItemRef) continue;
    const sha256 = digestText(sourceStatements.get(sourceItemRef));
    input.source_ref = `${sourceItemRef}#fragment:1:${sha256.slice(0, 16)}`;
    input.sha256 = sha256;
  }
}

function replaceExactSemanticRefs(value, replacements) {
  if (typeof value === "string") return replacements.get(value) ?? value;
  if (Array.isArray(value))
    return value.map((item) => replaceExactSemanticRefs(item, replacements));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      replaceExactSemanticRefs(item, replacements),
    ]),
  );
}
