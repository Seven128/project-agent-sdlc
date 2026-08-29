import { createHash } from "node:crypto";
import { chmod, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import {
  refreshFixtureSemanticManifest,
  semanticManifestIdentity,
} from "../tests/ty-context/long-task-semantic-refresh-fixture.mjs";
import { releaseTarballSemanticManifest } from "../tests/ty-context/long-task-semantic-variant-fixture.mjs";
import {
  admitPackageExactFixtureSemanticManifest,
  fixtureProductRootArgv,
  fixtureProductRootPath,
} from "../tests/ty-context/long-task-package-machine-fixture.mjs";
import { executionTargetSourceStatement } from "../packages/ty-context/dist/lib/long-task-source-target-index.js";

export async function writeReleaseTarballLongTaskFixture(root) {
  const workdir = path.join(root, ".long-task");
  const productRoot = fixtureProductRootPath();
  const productModule = "src/product.mjs";
  const productArgv = fixtureProductRootArgv(productModule, "installed");
  const executionTarget = {
    key: "installed-runtime",
    description: "Installed fixture runtime",
    role: "product",
    runtime_family: "process",
    root_entrypoint: productRoot,
    root_argv: productArgv,
    capabilities: ["process-runtime", "cold-start", "production-root"],
  };
  const executionTargetStatement =
    executionTargetSourceStatement(executionTarget);
  const semanticManifest = admitPackageExactFixtureSemanticManifest(
    releaseTarballSemanticManifest(),
  );
  const architectureInput = semanticManifest.inputs.find(
    (input) => input.source_ref === "packaged-architecture",
  );
  if (!architectureInput)
    throw new Error("release_tarball_architecture_input_missing");
  const architectureFragmentInput = semanticManifest.inputs.find(
    (input) =>
      input.kind === "source_fragment" &&
      input.basis_refs.includes("packaged-architecture"),
  );
  if (!architectureFragmentInput)
    throw new Error("release_tarball_architecture_fragment_input_missing");
  const executionTargetInputKey = "input.packaged-execution-target";
  const executionTargetFragmentInputKey =
    "input.fragment.packaged-execution-target.1";
  const executionTargetSha256 = createHash("sha256")
    .update(executionTargetStatement)
    .digest("hex");
  semanticManifest.scope.source_item_refs.push("packaged-execution-target");
  semanticManifest.inputs.push({
    ...structuredClone(architectureInput),
    key: executionTargetInputKey,
    source_ref: "packaged-execution-target",
    sha256: executionTargetSha256,
    basis_refs: ["packaged-execution-target"],
    rationale:
      "This marked Source item contributes to the fixture's exact non-UI Fact universe.",
  });
  semanticManifest.inputs.push({
    ...structuredClone(architectureFragmentInput),
    key: executionTargetFragmentInputKey,
    source_ref: `packaged-execution-target#fragment:1:${executionTargetSha256.slice(0, 16)}`,
    sha256: executionTargetSha256,
    disposition: "supporting_basis",
    basis_refs: ["packaged-execution-target"],
    rationale:
      "The complete execution-target Source Fragment projects to the same exact architecture Fact.",
  });
  for (const fact of semanticManifest.facts.filter((candidate) =>
    architectureInput.fact_refs.includes(candidate.key),
  )) {
    if (!fact.source_item_refs.includes("packaged-execution-target"))
      fact.source_item_refs.push("packaged-execution-target");
    if (!fact.provenance.basis_refs.includes(executionTargetInputKey))
      fact.provenance.basis_refs.push(executionTargetInputKey);
    if (!fact.provenance.basis_refs.includes(executionTargetFragmentInputKey))
      fact.provenance.basis_refs.push(executionTargetFragmentInputKey);
  }
  const verificationContextRef = "project_context/areas/main/verification.md";
  const verificationContext = await readFile(
    path.join(root, ...verificationContextRef.split("/")),
  );
  semanticManifest.inputs.push({
    key: "input.context-main-verification",
    kind: "context",
    source_ref: verificationContextRef,
    sha256: createHash("sha256").update(verificationContext).digest("hex"),
    disposition: "non_ui_material",
    fact_refs: semanticManifest.facts.map((fact) => fact.key),
    basis_refs: ["packaged-architecture"],
    rationale:
      "The package-generated verification Context is classified in the full Context snapshot.",
  });
  for (const fact of semanticManifest.facts)
    if (!fact.provenance.basis_refs.includes("input.context-main-verification"))
      fact.provenance.basis_refs.push("input.context-main-verification");
  for (const input of semanticManifest.inputs.filter(
    (candidate) => candidate.kind === "context",
  ))
    input.sha256 = createHash("sha256")
      .update(await readFile(path.join(root, ...input.source_ref.split("/"))))
      .digest("hex");
  refreshFixtureSemanticManifest(semanticManifest);
  const semanticManifestSha256 = semanticManifestIdentity(semanticManifest);
  await mkdir(path.join(root, "src"), { recursive: true });
  await mkdir(path.join(root, "tests"), { recursive: true });
  await mkdir(path.join(root, "artifacts"), { recursive: true });
  await mkdir(workdir, { recursive: true });
  await installProductRoot(root, productRoot);
  await writeFile(
    path.join(root, "src/state.json"),
    '{"ready":true,"relations_applicable":false}\n',
  );
  await writeFile(
    path.join(root, "tests/semantic-false.json"),
    '{"ready":false}\n',
  );
  await writeFile(
    path.join(root, "artifacts/proof.json"),
    '{"fixture_proof":true}\n',
  );
  await writeFile(
    path.join(root, "source.md"),
    `<!-- ty-source-background:start key=tarball-heading reason=markdown-structure -->
<a id="tarball-smoke-source"></a>
<!-- ty-source-background:end -->

<!-- ty-source-item:start key=packaged-verifier kind=technical_obligation -->
Use the packaged verifier.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=packaged-architecture kind=technical_obligation aspect=architecture -->
Preserve the packaged state owner and verifier boundary.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=packaged-execution-target kind=technical_obligation aspect=architecture -->
${executionTargetStatement}
<!-- ty-source-item:end -->

\`\`\`yaml semantic-fact-manifest-v1
${YAML.stringify(JSON.parse(JSON.stringify(semanticManifest)), { lineWidth: 0 }).trimEnd()}
\`\`\`
`,
  );
  await writeFile(
    path.join(root, productModule),
    `import { readFile } from "node:fs/promises";
let state = { ready: false, relations_applicable: false };
try { state = JSON.parse(await readFile(new URL("../src/state.json", import.meta.url), "utf8")); } catch {}
const ready = state.ready === true;
const assertion = (key) => "assertion.installed.installed-check." + key;
console.log(JSON.stringify({
  schema_version: "ty-context-product-observation-v1",
  observations: {
    "installed.result.observable": ready,
    "installed.architecture.boundary": ready,
    [assertion("installed-result")]: ready,
    [assertion("installed-obligation")]: ready,
    [assertion("installed-architecture")]: ready,
    [assertion("installed-liveness")]: true,
    [assertion("installed-relations-na")]: state.relations_applicable === true
  }
}));
`,
  );
  await writeFile(
    path.join(workdir, "delivery-contract.yaml"),
    `schema_version: long-task-delivery-v2
semantic_fact_manifest: {key: tarball-semantic-facts, source_path: source.md, sha256: "${semanticManifestSha256}"}
task:
  id: tarball-smoke
  title: Tarball smoke
  goal: Prove the installed long-task workflow.
  target_profile:
    key: installed-target
    description: The installed workflow is usable through its declared runtime.
    required_state: target_profile_usable
    required_target_refs: [installed-runtime]
  execution_targets:
    - key: ${executionTarget.key}
      description: ${executionTarget.description}
      role: ${executionTarget.role}
      runtime_family: ${executionTarget.runtime_family}
      root_entrypoint: ${executionTarget.root_entrypoint}
      root_argv: ${JSON.stringify(executionTarget.root_argv)}
      capabilities: ${JSON.stringify(executionTarget.capabilities)}
  source_paths: [source.md]
  context_refs: [project_context/areas/main.md]
  context_snapshot_mode: full
source_claims:
  - key: packaged-verifier
    source_ref: source.md
    statement: Use the packaged verifier.
    disposition:
      type: claim
      refs: [installed.obligation.packaged-verifier]
  - key: packaged-architecture
    source_ref: source.md
    statement: Preserve the packaged state owner and verifier boundary.
    disposition:
      type: claim
      refs: [installed.obligation.architecture]
  - key: packaged-execution-target
    source_ref: source.md
    statement: ${JSON.stringify(executionTargetStatement)}
    disposition:
      type: claim
      refs: [execution_target.installed-runtime]
stages:
  - key: delivery
    title: Delivery
    depends_on: []
    gate_outcome: installed
risk:
  facts: {}
global: {}
outcomes:
  - key: installed
    title: Installed workflow runs
    stage: delivery
    applicability:
      - key: installed-root-success
        target_ref: installed-runtime
        journey_role: success
        dimensions: [{key: installed-state, value: ready}]
        given_refs: [state-ready]
        when_refs: [inspect-installed]
    semantic_fact_bindings:
      manifest_ref: tarball-semantic-facts
      facts:
        - fact_ref: installed.result.observable
          claim_ref: semantic_fact.installed.result.observable
          applicability_ref: installed-root-success
        - fact_ref: installed.architecture.boundary
          claim_ref: semantic_fact.installed.architecture.boundary
          applicability_ref: installed-root-success
      proofs:
        - proof_ref: installed.result.observable.runtime
          fact_ref: installed.result.observable
          method: exact_value
          proof_surface: runtime_behavior
          evidence_capabilities: [semantic_fact]
          authority: machine
          check_ref: installed-check
          assertion_ref: installed-semantic-fact
        - proof_ref: installed.architecture.boundary.runtime
          fact_ref: installed.architecture.boundary
          method: exact_value
          proof_surface: runtime_behavior
          evidence_capabilities: [semantic_fact]
          authority: machine
          check_ref: installed-check
          assertion_ref: installed-architecture-semantic-fact
    product:
      observable_result: Installed CLI verifies current behavior.
      result_applicability_refs: [installed-root-success]
      success_path_required: true
      degradation_path_required: false
      owner:
        label: fixture
        context_refs: [project_context/areas/main.md]
        path_globs: [bin/**, src/**]
      control_relation_closure:
        state: not_applicable
        statement: This Outcome declares no user-visible Controls.
        applicability_refs: [installed-root-success]
    technical:
      obligations:
        - key: packaged-verifier
          statement: Use the packaged verifier.
          required_proof_surfaces: [runtime_behavior]
          applicability_refs: [installed-root-success]
        - key: architecture
          statement: Preserve the packaged state owner and verifier boundary.
          required_proof_surfaces: [runtime_behavior]
          applicability_refs: [installed-root-success]
      expected_change_paths: [src/**]
      allowed_support_paths: [bin/**]
      bindings:
        - key: product-root
          kind: file
          target: ${productRoot}
          carrier_paths: [${productRoot}]
          existence: existing
        - key: product-module
          kind: file
          target: ${productModule}
          carrier_paths: [${productModule}]
          existence: existing
        - key: state
          kind: file
          target: src/state.json
          carrier_paths: [src/state.json]
          existence: existing
    acceptance:
      checks:
        - key: installed-check
          journey_roles: [success, stage_gate]
          execution_target: {target_ref: installed-runtime, entrypoint: root}
          scenario:
            given: [{key: state-ready, statement: The fixture state exists.}]
            when: [{key: inspect-installed, statement: Inspect it with the installed verifier.}]
          proof_surface: runtime_behavior
          runner:
            type: project_binary
            target: ${productRoot}
            argv: ${JSON.stringify(productArgv)}
            effect: read_only
          verification_inputs: [tests/semantic-false.json]
          input_paths: [src/state.json]
          artifact_globs: [artifacts/proof.json]
          positive_assertions:
            - key: installed-result
              criterion: The installed packaged verifier reports the fixture ready.
              claims: [result]
              applicability_ref: installed-root-success
              observation: ready
              evidence_capabilities: [target_runtime]
              operator: equals
              expected: true
            - key: installed-obligation
              criterion: The packaged verifier obligation is satisfied.
              claims: [obligation.packaged-verifier]
              applicability_ref: installed-root-success
              observation: obligation_ready
              evidence_capabilities: [target_runtime]
              operator: equals
              expected: true
            - key: installed-semantic-fact
              criterion: The exact installed semantic Fact passes its frozen comparison.
              claims: [semantic_fact.installed.result.observable]
              applicability_ref: installed-root-success
              observation: semantic_fact_result
              evidence_capabilities: [semantic_fact]
              operator: equals
              expected: true
            - key: installed-architecture
              criterion: The packaged state owner and verifier boundary remain conformant.
              claims: [obligation.architecture]
              applicability_ref: installed-root-success
              observation: architecture_ready
              evidence_capabilities: [target_runtime]
              operator: equals
              expected: true
            - key: installed-architecture-semantic-fact
              criterion: The exact packaged architecture boundary Fact passes its frozen comparison.
              claims: [semantic_fact.installed.architecture.boundary]
              applicability_ref: installed-root-success
              observation: architecture_semantic_fact_result
              evidence_capabilities: [semantic_fact]
              operator: equals
              expected: true
            - key: installed-liveness
              criterion: The installed runtime remains live under semantic mutation.
              claims: []
              observation: target_live
              evidence_capabilities: [target_runtime]
              operator: equals
              expected: true
          negative_assertions:
            - key: installed-relations-na
              criterion: Cross-Control relations remain inapplicable when no Controls are declared.
              claims: [control_relation_closure]
              applicability_ref: installed-root-success
              observation: relations_applicable
              evidence_capabilities: [target_runtime]
              operator: equals
              expected: false
      counterfactual_controls:
        - key: replace-state-semantics
          binding_key: state
          claims: [result, obligation.packaged-verifier, obligation.architecture, semantic_fact.installed.result.observable, semantic_fact.installed.architecture.boundary]
          check_key: installed-check
          mutation:
            type: replace_json_value
            path: src/state.json
            pointer: /ready
            value: false
          expected_assertion_failures: [installed-result, installed-obligation, installed-architecture, installed-semantic-fact, installed-architecture-semantic-fact]
          preserved_assertions: [installed-liveness]
        - key: make-relations-applicable
          binding_key: state
          claims: [control_relation_closure]
          check_key: installed-check
          mutation:
            type: replace_json_value
            path: src/state.json
            pointer: /relations_applicable
            value: true
          expected_assertion_failures: [installed-relations-na]
          preserved_assertions: [installed-liveness]
`,
  );
  return workdir;
}

async function installProductRoot(root, relative) {
  const executableSource = process.execPath;
  const executablePath = path.join(root, ...relative.split("/"));
  await mkdir(path.dirname(executablePath), { recursive: true });
  await copyFile(executableSource, executablePath);
  if (process.platform !== "win32") await chmod(executablePath, 0o755);
}
