import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export async function applyVariantGuidance(runDir, variant, task) {
  const agentsPath = path.join(runDir, "AGENTS.md");
  let agents = await readFile(agentsPath, "utf8").catch(() => fallbackAgents());
  if (variant === "context-resolve-r0") {
    agents = insertBeforeManaged(agents, contextResolverOverride(task));
  }
  if (variant === "workflow-four-step") {
    agents = replaceDefaultWorkflow(agents, fourStepWorkflow());
  }
  if (variant.startsWith("authoring-")) {
    agents = insertBeforeManaged(agents, authoringVariantOverride(variant));
  }
  await writeFile(agentsPath, agents, "utf8");
  return workflowInstructionBytes(agents);
}

export function renderAgentPrompt(task, variant) {
  const authoring = task.track_family === "long-task-authoring";
  return `# Tiny Context Mechanism Benchmark Task\n\n` +
    `- task_id: ${task.id}\n- variant_id: ${variant}\n\n` +
    `## Rules\n\n` +
    `- Work only inside this prepared repository. Do not inspect the source benchmark repository, another run, gold files, hidden probes, or operator logs.\n` +
    `- Follow AGENTS.md and the repository Context. Do not create a second plan, result authority, scheduler, or benchmark-specific product mechanism.\n` +
    `- Do not call benchmark observer, timer, scoring, quality-probe, or comparison commands. The operator owns measurement.\n` +
    `- Use \`node tools/ty-context.mjs\` for ty-context commands when that wrapper exists; do not inspect or modify the external source checkout behind it.\n` +
    `- Before finishing, write .benchmark/agent-result.json using the provided template. Context/source reads and rounds are diagnostic self-report unless a normalized host trace or deterministic resolver output exists.\n` +
    `- Report real verification only. A failed or unrun check must not be marked passed.\n\n` +
    `## Task\n\n${task.prompt.trim()}\n\n` +
    (authoring ? `## Authoring Boundary\n\n- Product implementation and Final Gate are out of scope. A ready Preflight and first formal Compile are the end boundary.\n- Save each Preflight JSON object in agent-result.preflight_reports and the Compile JSON object in agent-result.compile_report.\n` : `## Delivery Boundary\n\n- Implement the behavior, add regression coverage, run project-native verification, perform Contract Conformance, and make one clean commit.\n`);
}

function contextResolverOverride(task) {
  const args = [
    ...task.terms.flatMap((value) => ["--term", quote(value)]),
    ...task.paths.flatMap((value) => ["--path", quote(value)]),
    ...task.facets.flatMap((value) => ["--facet", quote(value)])
  ].join(" ");
  return `## Benchmark Variant: Stateless Context Resolve R0\n\nFor this measured run, replace the manual bounded-search step with exactly one stateless resolver call before Context Delta:\n\n\`\`\`sh\nnode tools/context-resolve-r0.mjs --root . ${args} --explain --json > .benchmark/context-resolve.json\n\`\`\`\n\nRead every required result and semantically review candidates. The resolver creates no index, cache, registry, state, Context authority, or automatic Long-Task reference. When uncertain, read more rather than silently excluding a candidate. This override is not additive to another bounded search.\n\n`;
}

function fourStepWorkflow() {
  return `## Default Workflow Contract\n\nUnless an active Long-Task binding exists, use this four-step expression. These are order-of-thought labels, not persisted phases or artifacts.\n\n1. **Resolve** — read core/default Context, collect manifest candidates, perform the bounded Context search, confirm goal/owner/boundaries/verification, and decide the initial \`Context Delta: none|required\`.\n2. **Change** — use the platform internal plan, update owning Context first when required, implement precisely, and re-evaluate Context Delta whenever implementation reveals a durable fact.\n3. **Prove** — run the project-owned lint, type, unit/integration, browser, API/Schema, smoke, or architecture checks proportionate to the task.\n4. **Reconcile** — perform Contract Conformance and Context drift checks, then report implementation, verification, Context status, and blockers.\n\nFor a selected implementation handoff, run shared design-resource preflight, open every selected exact/constraint resource and follow its exactly-one canonical adoption record. Keep exact task-local accounting of covered Source Items, declared methods, blockers, targets and conditions; route every item to the production owner, cold-start journey and an attributable final-candidate check. Any unresolved, unmapped, unexecuted, stale or indistinguishable item blocks a complete claim. An active Long-Task uses only its existing Claims/Assertions/bindings/Final Gate carrier.\n\nThe default workflow creates no plan file, matrix, verdict, evidence ledger, Claim set, lifecycle state, Gate or second authority.\n\n`;
}

function authoringVariantOverride(variant) {
  const text = {
    "authoring-compact-v2": "Use the current Compact V2 authoring surface and keep all currently required Source and Risk fields explicit.",
    "authoring-source-derived": "Use the candidate Source-derived authoring surface: omit only source_ref and statement when the current package documents deterministic marker derivation. Do not emulate unsupported syntax.",
    "authoring-risk-derived": "Use the candidate marker-derived Source and Risk surface when supported: Risk marker tuples remain the only manually authored tuple source. Do not infer risk semantics.",
    "authoring-v3-candidate": "Use only the candidate V3 authoring syntax actually documented by this checkout. It must compile to canonical V2-equivalent authority and must not infer Outcome, owner, proof, risk, or product meaning."
  }[variant];
  return `## Benchmark Variant: Long-Task Authoring\n\n${text}\n\n`;
}

function replaceDefaultWorkflow(agents, replacement) {
  const pattern = /## Default Workflow Contract[\s\S]*?(?=## Long-Task Routing)/u;
  return pattern.test(agents) ? agents.replace(pattern, replacement) : insertBeforeManaged(agents, replacement);
}

function insertBeforeManaged(agents, section) {
  const marker = "<!-- ty-context:managed:begin -->";
  const index = agents.indexOf(marker);
  return index >= 0 ? `${agents.slice(0, index)}${section}${agents.slice(index)}` : `${section}${agents}`;
}

function workflowInstructionBytes(agents) {
  const match = /## Default Workflow Contract[\s\S]*?(?=## Long-Task Routing|$)/u.exec(agents);
  return Buffer.byteLength(match?.[0] ?? agents, "utf8");
}

function quote(value) { return JSON.stringify(String(value)); }
function fallbackAgents() {
  return `# Benchmark Agent Router\n\n## Default Workflow Contract\n\nRead core/default Context, perform one bounded Context search, decide Context Delta, use an internal plan, implement, run project verification, perform Contract Conformance, and check Context drift.\n\n## Long-Task Routing\n\nUse Long-Task only when explicitly invoked or an active binding exists.\n`;
}
