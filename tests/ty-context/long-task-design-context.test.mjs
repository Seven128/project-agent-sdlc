import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repo = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const read = (relative) => readFile(path.join(repo, relative), "utf8");
const missing = (relative) =>
  stat(path.join(repo, relative)).then(
    () => false,
    () => true,
  );

test("[critical:mechanism-causal-chain-continuity] Long-Task purpose, current implementation, and anti-degradation assurance stay causally aligned", async () => {
  const [
    spec,
    globalContext,
    rationale,
    workflow,
    implementationIndex,
    verification,
    manifest,
    designHandoff,
    designFactPolicy,
    authoringSkill,
    managedAgents,
    managedSkill,
    readme,
    readmeZh,
    packageReadme,
  ] = await Promise.all([
    read("PROJECT_SPEC.md"),
    read("project_context/global.md"),
    read(
      "project_context/areas/harness-package/decision-rationale/long-task-workflow.md",
    ),
    read(
      "project_context/areas/harness-package/contracts/workflow-contract.md",
    ),
    read("project_context/areas/harness-package/implementation-index.md"),
    read("project_context/areas/harness-package/verification.md"),
    read("project_context/context.toml"),
    read(
      "project_context/areas/harness-package/contracts/design-resource-handoff.md",
    ),
    read("packages/ty-context/src/lib/design-resource-fact-policy.ts"),
    read(".codex/skills/authoring/harness_package_design/SKILL.md"),
    read(".codex/ty-context-managed/agents/AGENTS_CORE.md"),
    read(".codex/ty-context-managed/skills/long-task-workflow/SKILL.md"),
    read("README.md"),
    read("README.zh-CN.md"),
    read("packages/ty-context/README.md"),
  ]);

  for (const heading of [
    "Long-Task Workflow Controlling Objective",
    "Long-Task Anti-Degradation Assurance",
    "Authority Scope And Trusted Results",
    "Contract Draft And Draft Outcome Semantics",
    "Source-Bound Contract Draft Boundary",
    "Integrated Contract Authoring Rationale",
    "Mechanism Admission Rule",
  ]) {
    assert.match(spec, new RegExp(`^## ${heading}$`, "mu"));
  }

  assert.match(spec, /prevent false completion inside declared authority/iu);
  assert.match(
    spec,
    /does not promise that implementation stays on course at every intermediate step/iu,
  );
  assert.match(spec, /does not promise that a model can finish the work/iu);
  assert.match(spec, /complete Contract against the current final snapshot/iu);
  assert.match(spec, /only two result classes are trustworthy/iu);
  assert.match(
    spec,
    /unsatisfied, unverifiable, insufficiently evidenced, stale/iu,
  );
  assert.match(
    spec,
    /machine_accepted_external_pending[\s\S]*not `AcceptedDeliveryTerminal`[\s\S]*not a vague third state/iu,
  );
  assert.match(
    spec,
    /MachineVerifiableDeclaredDrift = empty[\s\S]*not full `DeclaredObservableDrift = empty`/iu,
  );
  assert.match(
    spec,
    /cannot prove that the user never omitted a real requirement/iu,
  );

  assert.match(spec, /Realizes\(I_current, R1 ∧ R2\) ∧ K ∧ B => P/iu);
  assert.match(spec, /not a third implementation responsibility/iu);
  assert.match(
    rationale,
    /Current causal-chain truth[\s\S]*Cross-version non-degradation/iu,
  );
  assert.match(
    rationale,
    /current implementation realizes the first responsibility through Source-bound authoring[\s\S]*second through complete Claim\/applicability\/fact\/proof-surface expansion/iu,
  );
  assert.match(spec, /complete observable design fact/iu);
  assert.match(rationale, /Product Control is a semantic interaction unit/iu);
  assert.match(designHandoff, /resource_fact_closure/u);
  assert.match(designHandoff, /full_target.*visual_pixel/isu);
  assert.match(designHandoff, /Coverage_new ⊇ Coverage_old/iu);
  assert.match(designHandoff, /FalseNegative_new ⊆ FalseNegative_old/iu);
  for (const marker of [
    "complete_observable_design_fact_delivery",
    "resource_fact_inventory_closure_required",
    "exact_target_visual_pixel_required",
    "exact_fact_set_conservation_required",
    "unsupported_design_fact_blocks",
    "control_granularity_is_not_design_fact_granularity",
    "no_second_design_fact_authority",
    "authoring_obligation_universe_precedes_generation",
    "frozen_inspector_census_required",
    "first_class_condition_variation_property_axes_required",
    "atomic_fact_cell_identity_required",
    "expected_canonical_handoff_fact_universe_equality_required",
    "complete_generation_without_sampling_or_truncation_required",
    "fact_identity_and_proof_method_obligation_separation_required",
    "per_fact_expected_comparison_authority_required",
    "per_fact_current_result_required",
    "protected_fact_observation_redaction_required",
    "selected_design_fact_antidegradation_required",
  ])
    assert.match(designFactPolicy, new RegExp(`\\b${marker}\\b`, "u"));
  assert.match(
    [spec, globalContext, rationale, workflow].join("\n"),
    /explicit project-owner design-purpose decision[\s\S]*old\/new implication[\s\S]*replacement proof/iu,
  );
  assert.match(
    [spec, globalContext, rationale, workflow, verification].join("\n"),
    /positive net ROI[\s\S]*incremental[\s\S]*benefit[\s\S]*exceed/iu,
  );
  assert.match(
    [spec, globalContext, rationale, workflow].join("\n"),
    /no second Authority[\s\S]*(?:Gate|state)/iu,
  );

  for (const trigger of [
    "current implementation truth",
    "causal chain",
    "theory implementation gap",
    "anti-degradation assurance",
    "anti-degradation construction",
    "positive net ROI",
    "当前实现",
    "逻辑链",
    "理论与实际",
    "实现脱节",
    "防劣化保障",
    "防劣化建设",
  ]) {
    assert.match(manifest, new RegExp(`"${trigger}"`, "iu"));
  }

  for (const owner of [
    "packages/ty-context/src/lib/long-task-source-item-parser.ts",
    "packages/ty-context/src/lib/long-task-semantic-assurance-policy.ts",
    "packages/ty-context/src/lib/long-task-final-v2.ts",
    "packages/ty-context/src/lib/long-task-final-integrity.ts",
    "packages/ty-context/src/lib/design-resource-fact-policy.ts",
    "packages/ty-context/src/lib/design-resource-fact-manifest-types.ts",
    "packages/ty-context/src/lib/design-resource-fact-manifest-catalog.ts",
    "packages/ty-context/src/lib/design-resource-fact-manifest-universe.ts",
    "packages/ty-context/src/lib/design-resource-fact-manifest-validation.ts",
    "packages/ty-context/src/lib/design-resource-handoff-validation-facts.ts",
    "packages/ty-context/src/lib/long-task-design-resource-handoff.ts",
    "packages/ty-context/src/lib/long-task-evidence-capability-runtime.ts",
    "tests/ty-context/long-task-semantic-assurance-closure.test.mjs",
    "tests/ty-context/long-task-semantic-drift-closure.test.mjs",
    "tests/ty-context/long-task-semantic-drift-lifecycle.test.mjs",
    "tools/affected_test_selection.mjs",
    "packages/ty-context/source-mappings.yaml",
  ]) {
    assert.equal(
      await missing(owner),
      false,
      `${owner} must remain indexed code`,
    );
    assert.match(
      implementationIndex,
      new RegExp(
        path.basename(owner).replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"),
        "u",
      ),
    );
  }

  assert.match(implementationIndex, /^## Anti-Degradation Assurance Owners$/mu);
  assert.match(verification, /^## Anti-Degradation Assurance Evidence$/mu);
  assert.match(verification, /\[critical:mechanism-causal-chain-continuity\]/u);

  for (const surface of [
    authoringSkill,
    managedAgents,
    managedSkill,
    readme,
    packageReadme,
  ]) {
    assert.match(surface, /Anti-Degradation Assurance/iu);
    assert.match(surface, /project-owner design-purpose decision/iu);
  }
  assert.match(readmeZh, /防劣化保障/u);
  assert.match(readmeZh, /项目 owner[\s\S]*设计目的变更决策/u);
});

test("Contract Draft, Draft Outcome and Plan Item stay lifecycle concepts", async () => {
  const [spec, skill, sourceCode] = await Promise.all([
    read("PROJECT_SPEC.md"),
    read(".codex/ty-context-managed/skills/long-task-workflow/SKILL.md"),
    readSourceTree(),
  ]);

  assert.match(
    spec,
    /Contract Draft[\s\S]*first successful formal Compile[\s\S]*non-authoritative/iu,
  );
  assert.match(spec, /multiple model responses[\s\S]*Preflight diagnostics/iu);
  assert.match(
    spec,
    /Draft Outcome[\s\S]*lifecycle qualifier, not a new entity/iu,
  );
  assert.match(
    spec,
    /Plan Item[\s\S]*design-level collective term, not V2 schema/iu,
  );
  assert.match(
    spec,
    /Outcome Result cannot substitute for a Plan Item or AC/iu,
  );
  assert.doesNotMatch(
    sourceCode,
    /\bdraft_outcomes\b|\bplan_items\b|\bDraftOutcome\b|\bContractDraft\w*\b|\bDraftReceipt\b|\bAuthoringState\b/u,
  );

  assert.match(skill, /^## Controlling Objective$/mu);
  assert.match(skill, /^## Contract Draft And Outcome Decomposition$/mu);
  assert.match(skill, /need not be completed in one response/iu);
  assert.match(skill, /one `long-task-workflow` lifecycle/iu);
});

test("[critical:implementation-freedom-boundary] Goal-owned implementation freedom stays protected and non-authoritative", async () => {
  const [
    spec,
    globalContext,
    architecture,
    areaRoot,
    workflow,
    rationale,
    implementationIndex,
    verification,
    manifest,
    authoringSkill,
    managedAgents,
    managedSkill,
    managedLifecycle,
    readme,
    readmeZh,
    packageReadme,
  ] = await Promise.all([
    read("PROJECT_SPEC.md"),
    read("project_context/global.md"),
    read("project_context/architecture.md"),
    read("project_context/areas/harness-package.md"),
    read(
      "project_context/areas/harness-package/contracts/workflow-contract.md",
    ),
    read(
      "project_context/areas/harness-package/decision-rationale/long-task-workflow.md",
    ),
    read("project_context/areas/harness-package/implementation-index.md"),
    read("project_context/areas/harness-package/verification.md"),
    read("project_context/context.toml"),
    read(".codex/skills/authoring/harness_package_design/SKILL.md"),
    read(".codex/ty-context-managed/agents/AGENTS_CORE.md"),
    read(".codex/ty-context-managed/skills/long-task-workflow/SKILL.md"),
    read(
      ".codex/ty-context-managed/skills/long-task-workflow/references/authority-lifecycle.md",
    ),
    read("README.md"),
    read("README.zh-CN.md"),
    read("packages/ty-context/README.md"),
  ]);
  const combined = [
    spec,
    globalContext,
    architecture,
    areaRoot,
    workflow,
    rationale,
  ].join("\n");

  for (const concept of [
    "requirement coupling",
    "acceptance/verification-ready",
    "targeted verification",
    "localize failure",
    "resume ready Outcomes",
    "stale",
  ]) {
    assert.match(combined, new RegExp(concept, "iu"));
  }

  assert.match(
    combined,
    /`depends_on` means acceptance(?: and intermediate-proof)? readiness/iu,
  );
  assert.match(
    combined,
    /temporary[\s\S]*Rolling Frontier|Rolling Frontier[\s\S]*temporary/iu,
  );
  assert.match(
    combined,
    /not a persisted scheduler|Frontier is not persisted/iu,
  );
  assert.match(
    combined,
    /not a runtime type|adds no schema field or runtime type/iu,
  );
  assert.match(
    combined,
    /Outcome decomposes execution and diagnosis, not completion authority/iu,
  );
  assert.match(
    combined,
    /Frontier[\s\S]{0,240}(?:not an implementation gate|does not (?:authorize|restrict|gate|prescribe))/iu,
  );
  assert.match(
    combined,
    /(?:current )?Goal[\s\S]{0,180}(?:chooses|choosing) implementation order/iu,
  );
  assert.match(combined, /one Contract[\s\S]*one Final Gate/iu);

  assert.match(spec, /`F` the \*\*Implementation Freedom Boundary\*\*/u);
  assert.match(
    spec,
    /`F` is a protected efficiency and anti-process-bloat boundary, not a third implementation responsibility or another premise/iu,
  );
  assert.match(spec, /Realizes\(I_current, R1 ∧ R2\) ∧ K ∧ B => P/iu);
  assert.match(
    rationale,
    /accepted-terminal-state safety rather than path safety or termination/iu,
  );

  for (const surface of [
    globalContext,
    architecture,
    areaRoot,
    workflow,
    rationale,
    authoringSkill,
    managedAgents,
    managedSkill,
    readme,
    packageReadme,
  ])
    assert.match(surface, /Implementation Freedom Boundary/iu);

  const executionGuidance = [
    workflow,
    rationale,
    managedAgents,
    managedSkill,
    managedLifecycle,
    readme,
    packageReadme,
  ].join("\n");
  assert.match(
    executionGuidance,
    /one or multiple platform-native agents\/subagents/iu,
  );
  assert.match(
    executionGuidance,
    /(?:agent reports|their reports)[\s\S]{0,100}(?:not Progress|non-authoritative|not .*proof)/iu,
  );
  assert.match(
    executionGuidance,
    /converge[\s\S]{0,100}selected verification workspace|selected verification workspace[\s\S]{0,100}converge/iu,
  );
  assert.match(
    combined,
    /fixed implementation sequence[\s\S]{0,180}(?:phase|method)[\s\S]{0,180}per-edit/iu,
  );
  assert.match(
    combined,
    /(?:proposed )?mandatory development-stage constraint[\s\S]{0,400}distinct path[\s\S]{0,400}(?:lighter project-owned check|lighter project check)[\s\S]{0,400}positive net ROI/iu,
  );
  assert.match(
    [spec, globalContext, workflow, rationale, authoringSkill].join("\n"),
    /explicit project-owner design-purpose decision/iu,
  );

  for (const trigger of [
    "implementation freedom boundary",
    "development-stage restriction",
    "multi-agent implementation",
    "multiple agents",
    "实现自由边界",
    "开发阶段限制",
    "多开 agent",
    "多开agent",
  ])
    assert.match(manifest, new RegExp(`"${trigger}"`, "iu"));

  assert.match(implementationIndex, /implementation-freedom-boundary/iu);
  assert.match(verification, /\[critical:implementation-freedom-boundary\]/u);
  assert.match(readmeZh, /实现自由边界/u);
  assert.match(readmeZh, /单 agent\/多 agent|多开平台原生 agent/u);

  for (const obsolete of [
    /Implement only Outcomes in the derived current Stage frontier/iu,
    /Never proactively spawn, assign or coordinate parallel subagents/iu,
  ])
    assert.doesNotMatch(
      [managedSkill, managedLifecycle, readme, packageReadme].join("\n"),
      obsolete,
    );
});

test("target-runtime feedback stays live, rolling, and state-free", async () => {
  const [
    spec,
    workflow,
    rationale,
    efficiency,
    skill,
    generatedSkill,
    packagedSkill,
    contractAuthoring,
    generatedContractAuthoring,
    packagedContractAuthoring,
    evidenceDesign,
    generatedEvidenceDesign,
    packagedEvidenceDesign,
    lifecycle,
    generatedLifecycle,
    packagedLifecycle,
    publicReadmes,
    sourceCode,
  ] = await Promise.all([
    read("PROJECT_SPEC.md"),
    read(
      "project_context/areas/harness-package/contracts/workflow-contract.md",
    ),
    read(
      "project_context/areas/harness-package/decision-rationale/long-task-workflow.md",
    ),
    read("docs/long-task-workflow-efficiency.md"),
    read(".codex/ty-context-managed/skills/long-task-workflow/SKILL.md"),
    read(".codex/skills/long-task-workflow/SKILL.md"),
    read("packages/ty-context/assets/skills/long-task-workflow/SKILL.md"),
    read(
      ".codex/ty-context-managed/skills/long-task-workflow/references/contract-authoring.md",
    ),
    read(".codex/skills/long-task-workflow/references/contract-authoring.md"),
    read(
      "packages/ty-context/assets/skills/long-task-workflow/references/contract-authoring.md",
    ),
    read(
      ".codex/ty-context-managed/skills/long-task-workflow/references/evidence-design.md",
    ),
    read(".codex/skills/long-task-workflow/references/evidence-design.md"),
    read(
      "packages/ty-context/assets/skills/long-task-workflow/references/evidence-design.md",
    ),
    read(
      ".codex/ty-context-managed/skills/long-task-workflow/references/authority-lifecycle.md",
    ),
    read(".codex/skills/long-task-workflow/references/authority-lifecycle.md"),
    read(
      "packages/ty-context/assets/skills/long-task-workflow/references/authority-lifecycle.md",
    ),
    Promise.all([
      read("README.md"),
      read("README.zh-CN.md"),
      read("packages/ty-context/README.md"),
    ]).then((values) => values.join("\n")),
    readSourceTree(),
  ]);

  assert.equal(generatedSkill, skill);
  assert.equal(packagedSkill, skill);
  assert.equal(generatedContractAuthoring, contractAuthoring);
  assert.equal(packagedContractAuthoring, contractAuthoring);
  assert.equal(generatedEvidenceDesign, evidenceDesign);
  assert.equal(packagedEvidenceDesign, evidenceDesign);
  assert.equal(generatedLifecycle, lifecycle);
  assert.equal(packagedLifecycle, lifecycle);

  const combined = [
    spec,
    workflow,
    rationale,
    efficiency,
    skill,
    contractAuthoring,
    evidenceDesign,
    lifecycle,
    publicReadmes,
  ].join("\n");

  assert.match(combined, /proxy surface[\s\S]*target runtime/iu);
  assert.match(
    combined,
    /target-runtime Check[\s\S]*current (?:Check|runner|Raw Execution|Gate) execution/iu,
  );
  assert.match(
    combined,
    /tracked (?:or generated )?(?:status )?report[\s\S]*not (?:be )?the sole (?:runtime )?proof/iu,
  );
  assert.match(combined, /earliest (?:owning )?Outcome/iu);
  assert.match(combined, /first runnable (?:slice|boundary)/iu);
  assert.match(combined, /coalesc/iu);
  assert.match(
    combined,
    /recommended[\s\S]{0,220}(?:not mandatory|advisory|Goal owns|Goal-owned|does not gate implementation order)/iu,
  );
  assert.match(
    combined,
    /refresh(?:es|ed)?[\s\S]{0,180}only before (?:an )?intermediate (?:decision|reliance)/iu,
  );
  assert.match(
    combined,
    /Final Gate[\s\S]{0,200}(?:stale or absent Progress|ignores Progress)[\s\S]{0,160}reruns?/iu,
  );
  assert.match(combined, /`input_paths`[\s\S]*Binding carrier/iu);
  assert.match(combined, /smallest sound causal envelope/iu);
  assert.match(
    combined,
    /defensible (?:path|route) from the declared target root/iu,
  );
  assert.match(
    combined,
    /no second executing `diagnose-check`|Do not add a second executing `diagnose-check`/iu,
  );
  assert.match(
    combined,
    /(?:heartbeat|descendant-process (?:cleanup|cancellation))[\s\S]{0,240}(?:project-owned runner|project-runner responsibilities)/iu,
  );
  assert.match(combined, /Final Gate[\s\S]*rerun/iu);
  assert.match(
    combined,
    /no (?:open-ended )?`platform_impact`|adds no `platform_impact`|Do not add `platform_impact`/iu,
  );
  assert.match(
    combined,
    /no .*per-platform (?:Progress|progress|completion status)|invent per-platform progress\/status/iu,
  );
  assert.match(combined, /per[- ]Outcome[\/ ](?:or|and).*per[- ]edit/iu);
  assert.match(
    combined,
    /`progress_passing`[\s\S]*targeted repair evidence[\s\S]*`final_workflow_status: null`[\s\S]*unfinished/iu,
  );

  assert.doesNotMatch(
    sourceCode,
    /\bplatform_impact\b|\bplatform_smoke_verified\b/u,
  );
  assert.match(sourceCode, /\bimplementation_complete\b/u);
});

test("Source repair and Contract mapping converge in one Source-bound Draft loop", async () => {
  const [spec, sourcePlan, sourceAuthoring, longTask, agents, publicReadmes] =
    await Promise.all([
      read("PROJECT_SPEC.md"),
      read(".codex/ty-context-managed/skills/source-plan-authoring/SKILL.md"),
      read(
        ".codex/ty-context-managed/skills/long-task-workflow/references/source-authoring.md",
      ),
      read(".codex/ty-context-managed/skills/long-task-workflow/SKILL.md"),
      read(".codex/ty-context-managed/agents/AGENTS_CORE.md"),
      Promise.all([
        read("README.md"),
        read("README.zh-CN.md"),
        read("packages/ty-context/README.md"),
      ]).then((contents) => contents.join("\n")),
    ]);

  assert.match(sourcePlan, /Retired: Source Plan Authoring/iu);
  assert.match(sourcePlan, /no longer defines a separate handoff/iu);
  assert.match(
    sourcePlan,
    /select `\$long-task-workflow`[\s\S]*host's Skill selector/iu,
  );
  assert.match(
    sourcePlan,
    /pre-existing Source Plan remains valid Source/iu,
  );
  assert.match(sourcePlan, /Do not rewrite it merely for compatibility/iu);
  assert.match(
    sourceAuthoring,
    /neither an earlier Source-authoring phase nor a standalone Source Plan stage/iu,
  );
  assert.match(
    sourceAuthoring,
    /Assign every proposal, selected design resource[\s\S]*a stable input ID/iu,
  );
  assert.match(
    sourceAuthoring,
    /`direct`[\s\S]*`derived`[\s\S]*`delegated`[\s\S]*`evidence-backed`[\s\S]*`decision_required`/iu,
  );
  assert.match(
    sourceAuthoring,
    /materialize exactly one project-native Markdown Source/iu,
  );
  assert.match(
    sourceAuthoring,
    /fidelity versus cost[\s\S]*ask one concise targeted clarification/iu,
  );
  assert.match(spec, /Source-Bound Contract Draft Boundary/iu);
  assert.match(spec, /meaning-preserving structural decomposition/iu);
  assert.match(
    spec,
    /repository bindings[\s\S]*real repository or Context evidence/iu,
  );
  assert.match(spec, /defensible recommended plan choice[\s\S]*real Source/iu);
  assert.match(
    spec,
    /writable initial proposal[\s\S]*revised as the real Source/iu,
  );
  assert.match(longTask, /Every .*material input enters.*Draft immediately/iu);
  assert.match(
    sourceAuthoring,
    /neither an earlier Source-authoring phase nor a standalone Source Plan stage/iu,
  );
  assert.match(
    sourceAuthoring,
    /real Source understandable[\s\S]*before Preflight\/Compile/iu,
  );
  assert.match(agents, /loaded Skill[\s\S]*own Source\/Contract authoring/iu);
  assert.match(publicReadmes, /compatibility pointer/iu);
  assert.match(publicReadmes, /initial proposal[\s\S]*Web GPT/iu);
  assert.match(
    publicReadmes,
    /revised proposal plus selected immutable resources/iu,
  );
  assert.doesNotMatch(
    sourcePlan,
    /ty-context long-task (?:init|preflight|compile)/u,
  );

  for (const root of [
    ".codex/ty-context-managed/skills",
    ".codex/skills",
    "packages/ty-context/assets/skills",
  ]) {
    for (const name of [
      "contract-authoring",
      "draft-authoring",
      "prepare-long-task-draft",
    ]) {
      assert.equal(await missing(path.join(root, name)), true);
    }
  }
});

test("source-rich facts and residual handoff preserve the Long-Task proof chain", async () => {
  const [
    skill,
    sourceAuthoring,
    contractAuthoring,
    evidenceDesign,
    spec,
    readmes,
  ] = await Promise.all([
    read(".codex/ty-context-managed/skills/long-task-workflow/SKILL.md"),
    read(
      ".codex/ty-context-managed/skills/long-task-workflow/references/source-authoring.md",
    ),
    read(
      ".codex/ty-context-managed/skills/long-task-workflow/references/contract-authoring.md",
    ),
    read(
      ".codex/ty-context-managed/skills/long-task-workflow/references/evidence-design.md",
    ),
    read("PROJECT_SPEC.md"),
    Promise.all([
      read("README.md"),
      read("README.zh-CN.md"),
      read("packages/ty-context/README.md"),
    ]).then((contents) => contents.join("\n")),
  ]);
  const guidance = [
    skill,
    sourceAuthoring,
    contractAuthoring,
    evidenceDesign,
    spec,
    readmes,
  ].join("\n");

  assert.match(guidance, /canonical (?:machine-readable )?(?:entry|source)/iu);
  assert.match(guidance, /dependency (?:set|closure)/iu);
  assert.match(guidance, /typed locator/iu);
  assert.match(guidance, /subject.*target.*condition.*dimension/isu);
  assert.match(
    guidance,
    /residual (?:structured )?(?:semantic\/coverage )?handoff/iu,
  );
  assert.match(contractAuthoring, /production `surface_bindings`/iu);
  assert.match(
    contractAuthoring,
    /`source_claims`[\s\S]*method-specific Source Claims[\s\S]*single-Claim Assertions[\s\S]*`design_conformance`[\s\S]*`interaction_trace`[\s\S]*`target_runtime`/iu,
  );
  assert.match(guidance, /Final Gate/iu);
  assert.match(
    evidenceDesign,
    /extraction success[\s\S]*cannot become product acceptance/iu,
  );
  assert.match(
    guidance,
    /mutable (?:provider )?link[\s\S]*(?:metadata-only|partial file set|flattened)[\s\S]*(?:incomplete|insufficient|cannot replace|cannot become)/iu,
  );
  assert.match(spec, /provider-neutral residual adapter/iu);
  assert.match(spec, /No matrix[\s\S]*second Authority\/Gate\/state/iu);
});

test("registered rationale owns history, mechanism mapping and trusted limits", async () => {
  const [manifest, rationale, globalContext, verification] = await Promise.all([
    read("project_context/context.toml"),
    read(
      "project_context/areas/harness-package/decision-rationale/long-task-workflow.md",
    ),
    read("project_context/global.md"),
    read("project_context/areas/harness-package/verification.md"),
  ]);

  assert.match(
    manifest,
    /decision-rationale\/long-task-workflow\.md[\s\S]*role = "decision-rationale"[\s\S]*read_policy = "on-demand"/u,
  );
  for (const trigger of [
    "long-task objective",
    "false completion",
    "contract draft",
    "draft outcome",
    "rolling frontier",
    "target runtime",
    "rolling runtime smoke",
    "proxy evidence",
    "stale report",
    "why design generation stays external",
    "decision criteria",
    "tradeoff preference",
    "research before selection",
    "authority revision",
    "blocker-driven revision",
    "revision return",
    "revision diagnosis",
    "approval summary",
    "scope expansion",
    "terminal scope",
    "native goal completion",
    "Web GPT",
    "Codex authoring",
  ]) {
    assert.match(manifest, new RegExp(`"${trigger}"`, "u"));
  }

  assert.match(rationale, /Web GPT[\s\S]*single-response length/iu);
  assert.match(rationale, /Once work enters Codex/iu);
  for (const mechanism of [
    "Material/background/formal Source ownership closure",
    "Atomic non-Result Claim Coverage",
    "Control field and cross-Control relation closure",
    "Claim applicability and one-Claim Assertion closure",
    "Source AC to named Assertion semantic identity",
    "Shared Preflight/Compile activation-safety kernel",
    "First-Compile Authority Lock and Authority Revision",
    "Executing Agent cannot originate its own weakening decision",
    "Decision-relevance revision classification",
    "Exact material revision summary, self-contained decision brief and rolling return",
    "Stateless same-Contract candidate diagnosis",
    "Targeted verify is repair evidence only",
    "Adaptive rolling runtime feedback",
    "Manifest-backed atomic selected-design closure",
    "Behavioral semantic replacement plus independent liveness",
    "Same-snapshot Final Gate with pre/post protected-input recompile",
    "Stop/close rerun the Live Final Gate",
    "Machine/native terminal scope isolation",
    "Scope escape and risk escalation",
    "Counterfactual, Population and sensitivity proof",
    "Managed source, generated copy and package asset parity",
  ]) {
    assert.match(rationale, new RegExp(mechanism, "iu"));
  }
  assert.match(rationale, /brief is a projection of canonical summary data/iu);
  assert.match(rationale, /only two trustworthy outcomes/iu);
  assert.match(
    rationale,
    /complete-delivery accepted-terminal-state safety[\s\S]*not a termination guarantee/iu,
  );
  assert.match(
    rationale,
    /AcceptedDeliveryTerminal\(current snapshot\)[\s\S]*DeclaredObservableDrift = empty/iu,
  );
  assert.match(
    rationale,
    /machine_accepted_external_pending[\s\S]*MachineVerifiableDeclaredDrift = empty[\s\S]*no full `DeclaredObservableDrift = empty` claim/iu,
  );
  assert.match(rationale, /atomic Claim × applicability × proof surface/iu);
  assert.match(
    globalContext,
    /Preventing false completion[\s\S]*controlling objective[\s\S]*accepted-terminal-state safety/iu,
  );
  assert.match(verification, /Long-Task design consistency/iu);
});

test("revision diagnosis stays one-Contract and non-authoritative while decision revisions remain exact-bound", async () => {
  const [spec, globalContext, skill, lifecycle, publicReadmes] =
    await Promise.all([
      read("PROJECT_SPEC.md"),
      read("project_context/global.md"),
      read(".codex/ty-context-managed/skills/long-task-workflow/SKILL.md"),
      read(
        ".codex/ty-context-managed/skills/long-task-workflow/references/authority-lifecycle.md",
      ),
      Promise.all([
        read("README.md"),
        read("README.zh-CN.md"),
        read("packages/ty-context/README.md"),
      ]).then((values) => values.join("\n")),
    ]);
  const combined = [spec, globalContext, skill, lifecycle, publicReadmes].join(
    "\n",
  );
  assert.match(combined, /diagnose-revision/iu);
  assert.match(
    combined,
    /scope-only[\s\S]*existing active Check identities[\s\S]*acceptance_authorized: false/iu,
  );
  assert.match(
    combined,
    /writes no pending\/approval[\s\S]*Progress[\s\S]*Receipt/iu,
  );
  assert.match(
    combined,
    /previous Authority remains active[\s\S]*exact (?:approval|user decision)[\s\S]*Final Gate/iu,
  );
  assert.match(
    combined,
    /Authority changed[\s\S]*user decision required|Authority change is separated from user decision/iu,
  );
  assert.match(
    combined,
    /explicit current-task instruction[\s\S]*exactly covers every listed decision reason[\s\S]*(?:generic|blanket)/iu,
  );
  assert.match(
    lifecycle,
    /(?:machine-proven monotonic|proven monotonic evidence) strengthening[\s\S]*mechanically bounded repair/iu,
  );
  assert.match(
    lifecycle,
    /Product\/Source Claim\/target\/external-confirmation change[\s\S]*exact (?:user-decision|revision) identity/iu,
  );
  assert.doesNotMatch(
    skill,
    /Semantic changes, proof weakening, runner or verifier-content changes, and risk-increase candidates are preview-only/iu,
  );
  assert.match(
    combined,
    /adoption[\s\S]*not (?:a )?delivery completion[\s\S]*rolling (?:implementation|execution|repair)/iu,
  );
  assert.match(
    combined,
    /Product\/Source Claim\/target\/external-confirmation change/iu,
  );
  assert.match(
    combined,
    /declared_machine_authority[\s\S]*native_goal_effect/iu,
  );
  assert.match(
    combined,
    /same `delivery-contract\.yaml`[\s\S]*not a pending Draft authority/iu,
  );
});

test("blocker revisions use causal evidence without adding completion state", async () => {
  const [skill, contractAuthoring, evidence, contract, rationale] =
    await Promise.all([
    read(".codex/ty-context-managed/skills/long-task-workflow/SKILL.md"),
    read(
      ".codex/ty-context-managed/skills/long-task-workflow/references/contract-authoring.md",
    ),
    read(
      ".codex/ty-context-managed/skills/long-task-workflow/references/evidence-design.md",
    ),
    read(
      "project_context/areas/harness-package/contracts/workflow-contract.md",
    ),
    read(
      "project_context/areas/harness-package/decision-rationale/long-task-workflow.md",
    ),
    ]);
  const combined = [
    skill,
    contractAuthoring,
    evidence,
    contract,
    rationale,
  ].join("\n");
  assert.match(
    combined,
    /(?:difficulty or delay[\s\S]*never reclassifies machine-verifiable scope as external|work is difficult, delayed[\s\S]*Reclassify or remove machine-verifiable scope only through an explicit marked Source change)/iu,
  );
  assert.match(
    combined,
    /furthest independently failing boundary[\s\S]*(?:causal Counterfactual|wrong-semantic|replace_json_value|replace_text)/iu,
  );
  assert.match(
    combined,
    /claim-local [`']?replace_json_value[`']? or [`']?replace_text[`']?[\s\S]*target-runtime liveness/iu,
  );
  assert.doesNotMatch(
    combined,
    /requires every behavioral Claim-bearing Assertion[\s\S]{0,160}`replace_file` wrong-semantic/iu,
  );
  assert.match(
    combined,
    /veto-only[\s\S]*never (?:lets Agent judgment replace|substitutes Agent judgment for) Final Gate/iu,
  );
  assert.match(combined, /no persistent `authority_revision_in_progress`/iu);
  assert.match(
    combined,
    /bounded target profile|bounded required-target|no open-ended .*taxonomy/iu,
  );
});

test("Long-Task carries shared engineering quality once through Final Gate", async () => {
  const [skill, authoring, lifecycle, workflow, rationale, spec] =
    await Promise.all([
      read(".codex/ty-context-managed/skills/long-task-workflow/SKILL.md"),
      read(
        ".codex/ty-context-managed/skills/long-task-workflow/references/contract-authoring.md",
      ),
      read(
        ".codex/ty-context-managed/skills/long-task-workflow/references/authority-lifecycle.md",
      ),
      read(
        "project_context/areas/harness-package/contracts/workflow-contract.md",
      ),
      read(
        "project_context/areas/harness-package/decision-rationale/long-task-workflow.md",
      ),
      read("PROJECT_SPEC.md"),
    ]);
  const guidance = [
    skill,
    authoring,
    lifecycle,
    workflow,
    rationale,
    spec,
  ].join("\n");

  assert.match(
    guidance,
    /Architecture Deliberation[\s\S]*before (?:formal Compile and )?(?:the first )?implementation/iu,
  );
  assert.match(
    skill,
    /Put durable conclusions in owning Context and material falsifiable delivery conclusions in real marked Source plus existing Contract fields/iu,
  );
  assert.match(
    authoring,
    /Source-backed technical obligation, global constraint or forbidden shortcut[\s\S]*owner Context[\s\S]*Binding[\s\S]*project-owned executable type, compiler, lint, AST, dependency, contract, behavior, benchmark or probe Check/iu,
  );
  assert.match(
    lifecycle,
    /sole Long-Task `Engineering Quality Conformance`\/`Architecture Conformance` carrier/iu,
  );
  assert.match(
    skill,
    /no separate default Contract Conformance closure/iu,
  );
  assert.match(
    workflow,
    /Do not run a separate default Contract Conformance closure before or after it/iu,
  );
  assert.match(
    rationale,
    /Adding a second quality Gate, field, Receipt or default Contract Conformance pass would duplicate ownership and runtime cost/iu,
  );
  assert.match(
    rationale,
    /independent read-only Global product-conformance Check[\s\S]*distinct from the shared Engineering Quality\/Architecture Conformance obligation/iu,
  );
  assert.match(
    guidance,
    /proves (?:exactly |only )?(?:that |the )?declared[\s\S]{0,120}(?:not|never) overall code quality/iu,
  );
  assert.match(guidance, /independent Assertion|separate Assertion/iu);
  assert.doesNotMatch(guidance, /quality_conformance_state|quality_gate_receipt/iu);
  assert.match(
    guidance,
    /changed candidate|candidate change|later candidate.*invalidates/iu,
  );
  assert.doesNotMatch(
    guidance,
    /architecture_conformance_state|architecture_gate_receipt/iu,
  );
});

test("Mechanism Admission Rule is explicit and creates no registry", async () => {
  const [spec, rationale, workflow, efficiency] = await Promise.all([
    read("PROJECT_SPEC.md"),
    read(
      "project_context/areas/harness-package/decision-rationale/long-task-workflow.md",
    ),
    read(
      "project_context/areas/harness-package/contracts/workflow-contract.md",
    ),
    read("docs/long-task-workflow-efficiency.md"),
  ]);
  const section = spec.match(
    /## Mechanism Admission Rule\r?\n([\s\S]*?)\r?\n## 3\. Workflow Route And Long-Task Proof Profiles/u,
  )?.[1];
  assert.ok(section, "Mechanism Admission Rule section must exist");
  assert.equal(section.match(/^\d+\.\s/gmu)?.length, 9);
  assert.match(section, /false-completion or delivery-drift path/iu);
  assert.match(section, /invariant/iu);
  assert.match(section, /fail closed/iu);
  assert.match(section, /second Authority, second plan or scheduling plane/iu);
  assert.match(
    section,
    /not a new mechanism matrix, Receipt or runtime Registry/iu,
  );
  assert.match(rationale, /not a matrix file, Receipt or runtime Registry/iu);

  const policy = [section, rationale, workflow, efficiency].join("\n");
  assert.match(
    policy,
    /Every Long-Task change starts from the controlling design purpose/iu,
  );
  assert.match(
    policy,
    /cost of introducing the change[\s\S]*(?:subsequent |its )?ROI judgment/iu,
  );
  assert.match(
    policy,
    /mechanism semantics[\s\S]*change the mechanism and its verification[\s\S]*(?:Otherwise change only|stays at) (?:the |its )?owning point/iu,
  );
  assert.match(
    policy,
    /Coverage_new\s*⊇\s*Coverage_old[\s\S]*FalseNegative_new\s*⊆\s*FalseNegative_old/iu,
  );
  assert.match(
    policy,
    /(?:cannot|cannot be) prove(?:d)?[\s\S]*preserve the current formal acceptance path/iu,
  );
  assert.match(
    policy,
    /(?:cost reduction|lower cost)[\s\S]*never compensates? for (?:reduced|weaker) drift/iu,
  );
  assert.match(
    policy,
    /incremental (?:purpose-fulfillment )?benefit[\s\S]*exceeds? all incremental costs[\s\S]*(?:consideration set|considered)[\s\S]*(?:not|does not) automatically adopt/iu,
  );
  assert.match(
    policy,
    /measured data, benchmarks or operational evidence[\s\S]*When none exists[\s\S]*user or project owner[\s\S]*rigorous causal (?:argument|reasoning)[\s\S]*(?:simple, )?bounded validation/iu,
  );
  assert.match(
    policy,
    /Long-Task Workflow itself[\s\S]*(?:before mature longitudinal data existed|rather than mature longitudinal data)[\s\S]*(?:logic and basic validation|logic-and-basic-validation)/iu,
  );
  assert.match(
    policy,
    /(?:total cost|cost) is comparable[\s\S]*(?:purpose more effectively|stronger purpose fulfillment)[\s\S]*purpose fulfillment is comparable[\s\S]*lower implementation and operating cost/iu,
  );
});

test("Harness Authoring Skill routes Long-Task changes through mechanism admission", async () => {
  const skill = await read(
    ".codex/skills/authoring/harness_package_design/SKILL.md",
  );
  assert.match(skill, /Long-Task Workflow Controlling Objective/iu);
  assert.match(skill, /Authority Scope And Trusted Results/iu);
  assert.match(skill, /Mechanism Admission Rule/iu);
  assert.match(skill, /decision-rationale\/long-task-workflow\.md/iu);
  for (const concept of [
    "false-completion/delivery-drift path",
    "invariant",
    "overlap",
    "cost",
    "fail closed",
    "second Authority",
    "second plan",
    "scheduling plane",
  ]) {
    assert.match(skill, new RegExp(concept, "iu"));
  }
  assert.match(skill, /任何 Long-Task Workflow 改动[\s\S]*既定设计目的/iu);
  assert.match(
    skill,
    /引入和迁移成本[\s\S]*增量设计目的收益大于全部增量成本/iu,
  );
  assert.match(
    skill,
    /不涉及机制的，只修改对应 owner 点，不把局部问题升级成新机制/iu,
  );
  assert.match(
    skill,
    /Coverage_new\s*⊇\s*Coverage_old[\s\S]*FalseNegative_new\s*⊆\s*FalseNegative_old/iu,
  );
  assert.match(
    skill,
    /增量设计目的收益大于全部增量成本[\s\S]*正 ROI[\s\S]*考虑集[\s\S]*不自动采用/iu,
  );
  assert.match(
    skill,
    /优先使用数据、benchmark 或实际证据[\s\S]*没有数据时[\s\S]*用户或项目 owner[\s\S]*严密的因果论证[\s\S]*边界明确的验证/iu,
  );
  assert.match(
    skill,
    /成本相差不大，优先优化达到机制目的的效果[\s\S]*效果相近，优先优化实现成本/iu,
  );
  assert.match(skill, /不生成 Mechanism Matrix、Receipt、Registry/iu);
  assert.match(
    skill,
    /(?:不生成|未创建) matrix、Receipt、Registry 或 runtime state/iu,
  );
});

async function readSourceTree() {
  const root = path.join(repo, "packages/ty-context/src");
  const entries = await readdir(root, { recursive: true });
  const files = entries
    .filter((entry) => /\.(?:ts|json)$/u.test(entry))
    .map((entry) => path.join(root, entry));
  return (await Promise.all(files.map((file) => readFile(file, "utf8")))).join(
    "\n",
  );
}
