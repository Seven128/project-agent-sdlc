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

test("PROJECT_SPEC defines the controlling objective and trusted results", async () => {
  const spec = await read("PROJECT_SPEC.md");

  for (const heading of [
    "Long-Task Workflow Controlling Objective",
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
    /machine_accepted_external_pending[\s\S]*not full delivery completion[\s\S]*not a vague third state/iu,
  );
  assert.match(
    spec,
    /cannot prove that the user never omitted a real requirement/iu,
  );
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

test("Outcome decomposition improves repair without creating scheduling authority", async () => {
  const [spec, workflow, architecture] = await Promise.all([
    read("PROJECT_SPEC.md"),
    read(
      "project_context/areas/harness-package/contracts/workflow-contract.md",
    ),
    read("project_context/architecture.md"),
  ]);
  const combined = [spec, workflow, architecture].join("\n");

  for (const concept of [
    "requirement coupling",
    "dependency-ready",
    "targeted verification",
    "localize failure",
    "resume ready Outcomes",
    "stale",
  ]) {
    assert.match(combined, new RegExp(concept, "iu"));
  }

  assert.match(combined, /`depends_on` means acceptance readiness/iu);
  assert.match(combined, /Rolling Frontier[\s\S]*temporary/iu);
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
  assert.match(combined, /one Contract[\s\S]*one Final Gate/iu);
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
  assert.match(sourcePlan, /invoke `\/long-task-workflow`/iu);
  assert.match(
    sourcePlan,
    /pre-existing Source Plan remains valid ordinary Source/iu,
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
  assert.match(longTask, /Every input enters.*Draft immediately/iu);
  assert.match(
    longTask,
    /Source completeness is a Preflight\/Compile convergence requirement, not an earlier internal stage/iu,
  );
  assert.match(
    agents,
    /enter one Source-bound Contract Draft loop immediately/iu,
  );
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
  const [skill, sourceAuthoring, contractAuthoring, evidenceDesign, spec, readmes] =
    await Promise.all([
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
  assert.match(guidance, /residual (?:structured )?(?:semantic\/coverage )?handoff/iu);
  assert.match(
    guidance,
    /Source Claims[\s\S]*Controls\/`?surface_bindings`?[\s\S]*(?:method-specific|independent).*Assertions?[\s\S]*production[\s\S]*design_conformance[\s\S]*interaction[\s\S]*target-runtime[\s\S]*Final Gate/iu,
  );
  assert.match(
    evidenceDesign,
    /extraction success[\s\S]*cannot become product acceptance/iu,
  );
  assert.match(
    guidance,
    /mutable (?:provider )?link[\s\S]*(?:metadata-only|partial file set|flattened)[\s\S]*(?:incomplete|insufficient|cannot replace|cannot become)/iu,
  );
  assert.match(
    spec,
    /no provider-specific schema[\s\S]*second Authority[\s\S]*second Gate/iu,
  );
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
    "Material Source inventory",
    "Atomic non-Result Claim Coverage",
    "Source AC to named Assertion",
    "Shared Preflight/Compile activation-safety kernel",
    "First-Compile Authority Lock and Authority Revision",
    "Executing Agent cannot originate its own weakening decision",
    "Decision-relevance revision classification",
    "Exact material revision summary, self-contained decision brief and rolling return",
    "Stateless same-Contract candidate diagnosis",
    "Targeted verify is repair evidence only",
    "UI production-surface binding and design conformance",
    "Same-snapshot Final Gate",
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
    globalContext,
    /Preventing false completion[\s\S]*controlling objective/iu,
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
    skill,
    /machine-proven monotonic strengthening[\s\S]*mechanically bounded repair/iu,
  );
  assert.match(
    skill,
    /Product\/Source Claim\/target\/external-confirmation change[\s\S]*exact user-decision identity/iu,
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
  const [skill, evidence, contract, rationale] = await Promise.all([
    read(".codex/ty-context-managed/skills/long-task-workflow/SKILL.md"),
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
  const combined = [skill, evidence, contract, rationale].join("\n");
  assert.match(
    combined,
    /difficulty or delay[\s\S]*never reclassifies machine-verifiable scope as external/iu,
  );
  assert.match(
    combined,
    /furthest independently failing boundary[\s\S]*causal capability/iu,
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

test("Long-Task carries shared architecture quality once through Final Gate", async () => {
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
    /Source-backed technical obligation, global constraint or forbidden shortcut[\s\S]*owner Context[\s\S]*Binding[\s\S]*project-owned executable architecture check/iu,
  );
  assert.match(
    lifecycle,
    /sole Long-Task `Architecture Conformance` carrier/iu,
  );
  assert.match(
    skill,
    /Do not also run the default Workflow's standalone Contract Conformance closure/iu,
  );
  assert.match(
    workflow,
    /Do not run a separate default Contract Conformance closure before or after it/iu,
  );
  assert.match(
    rationale,
    /Adding a second architecture Gate, field, Receipt or default Contract Conformance pass would duplicate ownership and runtime cost/iu,
  );
  assert.match(
    rationale,
    /independent read-only Global product-conformance Check[\s\S]*distinct from the shared Architecture Conformance obligation/iu,
  );
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
    /## Mechanism Admission Rule\r?\n([\s\S]*?)\r?\n## 3\. Workflow Levels/u,
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
  assert.match(policy, /merely positive but marginal ROI is insufficient/iu);
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
  assert.match(skill, /改动会带来的引入成本纳入后续 ROI 判断/iu);
  assert.match(
    skill,
    /不涉及机制的，只修改对应 owner 点，不把局部问题升级成新机制/iu,
  );
  assert.match(skill, /ROI 必须为正且不能只是勉强为正/iu);
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
