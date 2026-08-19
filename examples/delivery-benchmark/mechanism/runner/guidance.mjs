import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { applyDelegationGuidance, DELEGATION_GUIDANCE_VARIANTS } from "./delegation-guidance.mjs";
import { REPO_ROOT } from "./shared.mjs";

const execFileAsync = promisify(execFile);
const CANONICAL_MANAGED_PATH = ".codex/ty-context-managed/agents/AGENTS_CORE.md";
const MANAGED_BEGIN = "<!-- ty-context:managed:begin -->";
const MANAGED_END = "<!-- ty-context:managed:end -->";
const WORKFLOW_ASSURANCE_VARIANTS = new Set(["workflow-exact-ephemeral-baseline", "workflow-assurance-split"]);

export async function applyVariantGuidance(runDir, variant, task, options = {}) {
  const agentsPath = path.join(runDir, "AGENTS.md");
  if (DELEGATION_GUIDANCE_VARIANTS.has(variant)) return applyDelegationGuidance(runDir, variant, options);
  if (WORKFLOW_ASSURANCE_VARIANTS.has(variant)) {
    return applyCanonicalWorkflowGuidance({
      agentsPath,
      variant,
      variantConfig: options.variantConfig,
      repoRoot: options.repoRoot ?? REPO_ROOT,
      calibration: options.calibration === true,
    });
  }
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
  return {
    workflow_instruction_bytes: workflowInstructionBytes(agents),
    workflow_guidance_source: null,
  };
}

export function renderAgentPrompt(task, variant) {
  const authoring = task.track_family === "long-task-authoring";
  const delegation = task.track_family === "long-task-delegation";
  const routeSelection = task.benchmark_mode === "route_selection";
  return (
    `# Tiny Context Mechanism Benchmark Task\n\n` +
    `- task_id: ${task.id}\n- variant_id: ${variant}\n\n` +
    `## Rules\n\n` +
    `- Work only inside this prepared repository. Do not inspect the source benchmark repository, another run, gold files, hidden probes, or operator logs.\n` +
    `- Follow AGENTS.md and the repository Context. Do not create a second plan, result authority, scheduler, or benchmark-specific product mechanism.\n` +
    `- Do not call benchmark observer, timer, scoring, quality-probe, or comparison commands. The operator owns measurement.\n` +
    `- Use \`node tools/ty-context.mjs\` for ty-context commands when that wrapper exists; do not inspect or modify the external source checkout behind it.\n` +
    `- Before finishing, write .benchmark/agent-result.json using the provided template. Record the selected route plus separate implemented, verified, unverified and blocked scope; use complete only when no unverified or blocked scope remains. Context/source reads and rounds are diagnostic self-report unless a normalized host trace or deterministic resolver output exists.\n` +
    `- Report real verification only. A failed or unrun check must not be marked passed.\n\n` +
    `## Task\n\n${task.prompt.trim()}\n\n` +
    (authoring
      ? `## Authoring Boundary\n\n- Product implementation and Final Gate are out of scope. A ready Preflight and first formal Compile are the end boundary.\n- Save each Preflight JSON object in agent-result.preflight_reports and the Compile JSON object in agent-result.compile_report.\n`
      : delegation
        ? `## Active Long-Task Delegation Boundary\n\n- Use the explicitly selected Long-Task workflow and complete its real Source/Contract, Preflight, Compile, terminal-turn checkpoint, rolling implementation, current-candidate checks and Final Gate lifecycle.\n- When Compile requires the terminal-turn checkpoint, stop exactly as the installed Skill requires. Continue only when the host operator supplies the exact resume reply in a later turn.\n- Keep Source, Contract, Authority, Context, integration and all proof with the parent. Worker reports cannot prove completion.\n- The operator supplies any host-owned delegation trace separately; do not write, infer or repair it.\n`
        : routeSelection
          ? `## Route-Selection Boundary\n\n- Decide the workflow route from the stated assurance requirement. Do not implement product code, activate or execute Long-Task, create a Contract, or change repository files. Record the selected route and evidence-bounded completion status in agent-result.json.\n`
          : `## Delivery Boundary\n\n- Implement the behavior, add regression coverage, run project-native verification, repair failures, perform evidence-bounded Contract Conformance, and make one clean commit.\n`)
  );
}

function contextResolverOverride(task) {
  const args = [
    ...task.terms.flatMap((value) => ["--term", quote(value)]),
    ...task.paths.flatMap((value) => ["--path", quote(value)]),
    ...task.facets.flatMap((value) => ["--facet", quote(value)]),
  ].join(" ");
  return `## Benchmark Variant: Stateless Context Resolve R0\n\nFor this measured run, replace the manual bounded-search step with exactly one stateless resolver call before Context Delta:\n\n\`\`\`sh\nnode tools/context-resolve-r0.mjs --root . ${args} --explain --json > .benchmark/context-resolve.json\n\`\`\`\n\nRead every required result and semantically review candidates. The resolver creates no index, cache, registry, state, Context authority, or automatic Long-Task reference. When uncertain, read more rather than silently excluding a candidate. This override is not additive to another bounded search.\n\n`;
}

function fourStepWorkflow() {
  return `## Default Workflow Contract\n\nUnless an active Long-Task binding exists, use this four-step expression. These are order-of-thought labels, not persisted phases or artifacts.\n\n1. **Resolve** — read core/default Context, collect manifest candidates, perform the bounded Context search, confirm goal/owner/boundaries/verification, and decide the initial \`Context Delta: none|required\`.\n2. **Change** — use the platform internal plan, update owning Context first when required, implement precisely, and re-evaluate Context Delta whenever implementation reveals a durable fact.\n3. **Prove** — run the project-owned lint, type, unit/integration, browser, API/Schema, smoke, or architecture checks proportionate to the task.\n4. **Reconcile** — perform Contract Conformance and Context drift checks, then report implementation, verification, Context status, and blockers.\n\nFor a selected implementation handoff, run shared design-resource preflight, open every selected exact/constraint resource and follow its exactly-one canonical adoption record. Keep exact task-local accounting of covered Source Items, declared methods, blockers, targets and conditions; route every item to the production owner, cold-start journey and an attributable final-candidate check. Any unresolved, unmapped, unexecuted, stale or indistinguishable item blocks a complete claim. An active Long-Task uses only its existing Claims/Assertions/bindings/Final Gate carrier.\n\nThe default workflow creates no plan file, matrix, verdict, evidence ledger, Claim set, lifecycle state, Gate or second authority.\n\n`;
}

function authoringVariantOverride(variant) {
  const text = {
    "authoring-compact-v2": "Use the current Compact V2 authoring surface and keep all currently required Source and Risk fields explicit.",
    "authoring-source-derived":
      "Use the candidate Source-derived authoring surface: omit only source_ref and statement when the current package documents deterministic marker derivation. Do not emulate unsupported syntax.",
    "authoring-risk-derived":
      "Use the candidate marker-derived Source and Risk surface when supported: Risk marker tuples remain the only manually authored tuple source. Do not infer risk semantics.",
    "authoring-v3-candidate":
      "Use only the candidate V3 authoring syntax actually documented by this checkout. It must compile to canonical V2-equivalent authority and must not infer Outcome, owner, proof, risk, or product meaning.",
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

async function applyCanonicalWorkflowGuidance({ agentsPath, variant, variantConfig, repoRoot, calibration }) {
  const source = variantConfig?.guidance_source;
  const loaded = await loadCanonicalManagedProtocol(repoRoot, variant, source);
  let agentsBytes;
  try {
    agentsBytes = await readFile(agentsPath);
  } catch (error) {
    if (!calibration) {
      throw new Error(`Workflow Assurance prepare requires initialized AGENTS.md with one managed marker pair: ${error instanceof Error ? error.message : String(error)}`);
    }
    agentsBytes = Buffer.alloc(0);
  }
  const injected = injectCanonicalManagedProtocol(agentsBytes, loaded.protocol_bytes, { calibration, variant });
  const injectedSection = extractMeasuredSection(injected.protocol_bytes, source.measured_section, variant);
  const injectedSectionSha256 = sha256Bytes(injectedSection);
  if (injectedSectionSha256 !== loaded.provenance.measured_section_sha256) {
    throw new Error(`Workflow Assurance ${variant} injected measured section does not match its frozen Git object`);
  }
  await writeFile(agentsPath, injected.file_bytes);
  return {
    workflow_instruction_bytes: injectedSection.length,
    workflow_guidance_source: loaded.provenance,
  };
}

async function loadCanonicalManagedProtocol(repoRoot, variant, source) {
  validateGuidanceSource(variant, source);
  const objectLabel = `${source.commit}:${source.path}`;
  const blobOid = (await gitText(repoRoot, ["rev-parse", "--verify", objectLabel], objectLabel)).trim();
  if (!/^[0-9a-f]{40}$/u.test(blobOid)) throw new Error(`Workflow Assurance ${variant} resolved an invalid Git blob oid: ${blobOid}`);
  const objectType = (await gitText(repoRoot, ["cat-file", "-t", blobOid], objectLabel)).trim();
  if (objectType !== "blob") throw new Error(`Workflow Assurance ${variant} expected a Git blob at ${objectLabel}, got ${objectType}`);
  if (blobOid !== source.git_blob_oid) {
    throw new Error(`Workflow Assurance ${variant} Git blob oid mismatch for ${objectLabel}: expected ${source.git_blob_oid}, got ${blobOid}`);
  }
  const protocolBytes = await gitBytes(repoRoot, ["show", objectLabel], objectLabel);
  requireStrictUtf8(protocolBytes, variant);
  if (protocolBytes.at(-1) !== 0x0a) throw new Error(`Workflow Assurance ${variant} canonical managed protocol must retain its trailing LF byte`);
  const fileSha256 = sha256Bytes(protocolBytes);
  if (fileSha256 !== source.file_sha256) {
    throw new Error(`Workflow Assurance ${variant} full-file SHA-256 mismatch for ${objectLabel}: expected ${source.file_sha256}, got ${fileSha256}`);
  }
  const measuredSection = extractMeasuredSection(protocolBytes, source.measured_section, variant);
  const measuredSectionSha256 = sha256Bytes(measuredSection);
  if (measuredSectionSha256 !== source.measured_section.sha256) {
    throw new Error(`Workflow Assurance ${variant} measured-section SHA-256 mismatch for ${objectLabel}: expected ${source.measured_section.sha256}, got ${measuredSectionSha256}`);
  }
  return {
    protocol_bytes: protocolBytes,
    provenance: {
      kind: source.kind,
      commit: source.commit,
      path: source.path,
      git_blob_oid: blobOid,
      file_sha256: fileSha256,
      measured_section_sha256: measuredSectionSha256,
    },
  };
}

function validateGuidanceSource(variant, source) {
  if (!source || typeof source !== "object") throw new Error(`Workflow Assurance ${variant} requires guidance_source in experiment-set.json`);
  if (source.kind !== "git_managed_protocol_v1") throw new Error(`Workflow Assurance ${variant} requires guidance_source.kind git_managed_protocol_v1`);
  if (!/^[0-9a-f]{40}$/u.test(source.commit ?? "")) throw new Error(`Workflow Assurance ${variant} guidance_source.commit must be a 40-character lowercase SHA`);
  if (source.path !== CANONICAL_MANAGED_PATH) throw new Error(`Workflow Assurance ${variant} guidance_source.path must be ${CANONICAL_MANAGED_PATH}`);
  if (!/^[0-9a-f]{40}$/u.test(source.git_blob_oid ?? "")) throw new Error(`Workflow Assurance ${variant} guidance_source.git_blob_oid must be a 40-character lowercase oid`);
  if (!/^[0-9a-f]{64}$/u.test(source.file_sha256 ?? "")) throw new Error(`Workflow Assurance ${variant} guidance_source.file_sha256 must be lowercase SHA-256`);
  if (source.injection_scope !== "managed_protocol") throw new Error(`Workflow Assurance ${variant} guidance_source.injection_scope must be managed_protocol`);
  const section = source.measured_section;
  if (!section || typeof section !== "object") throw new Error(`Workflow Assurance ${variant} requires guidance_source.measured_section`);
  if (section.start_heading !== "## Default Workflow Contract" || section.end_heading !== "## Long-Task Routing") {
    throw new Error(`Workflow Assurance ${variant} measured headings must bind Default Workflow Contract through the line before Long-Task Routing`);
  }
  if (!/^[0-9a-f]{64}$/u.test(section.sha256 ?? "")) throw new Error(`Workflow Assurance ${variant} measured_section.sha256 must be lowercase SHA-256`);
}

function injectCanonicalManagedProtocol(agentsBytes, protocolBytes, { calibration, variant }) {
  const beginOffsets = allOffsets(agentsBytes, Buffer.from(MANAGED_BEGIN, "utf8"));
  const endOffsets = allOffsets(agentsBytes, Buffer.from(MANAGED_END, "utf8"));
  if (beginOffsets.length === 0 && endOffsets.length === 0) {
    if (!calibration) throw new Error(`Workflow Assurance ${variant} formal prepare requires one ${MANAGED_BEGIN} / ${MANAGED_END} pair`);
    const fileBytes = Buffer.from(protocolBytes);
    return { file_bytes: fileBytes, protocol_bytes: fileBytes };
  }
  if (beginOffsets.length !== 1 || endOffsets.length !== 1 || beginOffsets[0] >= endOffsets[0]) {
    throw new Error(`Workflow Assurance ${variant} AGENTS.md managed markers are missing, duplicated, or out of order`);
  }
  const begin = beginOffsets[0];
  const end = endOffsets[0];
  assertMarkerLine(agentsBytes, begin, MANAGED_BEGIN, variant);
  assertMarkerLine(agentsBytes, end, MANAGED_END, variant);
  const prefixEnd = markerLineEnd(agentsBytes, begin + Buffer.byteLength(MANAGED_BEGIN), variant);
  const prefix = agentsBytes.subarray(0, prefixEnd);
  const suffix = agentsBytes.subarray(end);
  const fileBytes = Buffer.concat([prefix, protocolBytes, suffix]);
  const protocolStart = prefix.length;
  return {
    file_bytes: fileBytes,
    protocol_bytes: fileBytes.subarray(protocolStart, protocolStart + protocolBytes.length),
  };
}

function extractMeasuredSection(protocolBytes, section, variant) {
  const starts = lineOffsets(protocolBytes, section.start_heading);
  const ends = lineOffsets(protocolBytes, section.end_heading);
  if (starts.length !== 1 || ends.length !== 1 || starts[0] >= ends[0]) {
    throw new Error(`Workflow Assurance ${variant} canonical managed protocol must contain one ordered ${section.start_heading} / ${section.end_heading} heading pair`);
  }
  return protocolBytes.subarray(starts[0], ends[0]);
}

async function gitBytes(repoRoot, args, objectLabel) {
  try {
    const { stdout } = await execFileAsync("git", args, {
      cwd: repoRoot,
      encoding: "buffer",
      windowsHide: true,
      maxBuffer: 64 * 1024 * 1024,
    });
    return Buffer.isBuffer(stdout) ? stdout : Buffer.from(stdout);
  } catch (error) {
    const detail = error?.stderr ? String(error.stderr).trim() : error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to load frozen Workflow Assurance Git object ${objectLabel}. Fetch that commit/object (deepen a shallow checkout when necessary) and retry prepare. ${detail}`);
  }
}

async function gitText(repoRoot, args, objectLabel) {
  const bytes = await gitBytes(repoRoot, args, objectLabel);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error(`Git metadata for frozen Workflow Assurance object ${objectLabel} is not valid UTF-8`);
  }
}

function requireStrictUtf8(bytes, variant) {
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error(`Workflow Assurance ${variant} canonical managed protocol is not valid UTF-8`);
  }
}

function lineOffsets(bytes, heading) {
  const needle = Buffer.from(heading, "utf8");
  return allOffsets(bytes, needle).filter((offset) => {
    const beforeIsLineBoundary = offset === 0 || bytes[offset - 1] === 0x0a;
    const after = offset + needle.length;
    const afterIsLineBoundary = after === bytes.length || bytes[after] === 0x0a;
    return beforeIsLineBoundary && afterIsLineBoundary;
  });
}

function allOffsets(bytes, needle) {
  const offsets = [];
  for (let offset = bytes.indexOf(needle); offset >= 0; offset = bytes.indexOf(needle, offset + 1)) offsets.push(offset);
  return offsets;
}

function assertMarkerLine(bytes, offset, marker, variant) {
  const beforeIsLineBoundary = offset === 0 || bytes[offset - 1] === 0x0a;
  const after = offset + Buffer.byteLength(marker);
  const afterIsLineBoundary = after === bytes.length || bytes[after] === 0x0a || (bytes[after] === 0x0d && bytes[after + 1] === 0x0a);
  if (!beforeIsLineBoundary || !afterIsLineBoundary) throw new Error(`Workflow Assurance ${variant} found a damaged managed marker line: ${marker}`);
}

function markerLineEnd(bytes, markerEnd, variant) {
  if (bytes[markerEnd] === 0x0a) return markerEnd + 1;
  if (bytes[markerEnd] === 0x0d && bytes[markerEnd + 1] === 0x0a) return markerEnd + 2;
  throw new Error(`Workflow Assurance ${variant} managed begin marker must end with LF or CRLF`);
}

function sha256Bytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function quote(value) {
  return JSON.stringify(String(value));
}
function fallbackAgents() {
  return `# Benchmark Agent Router\n\n## Default Workflow Contract\n\nRead core/default Context, perform one bounded Context search, decide Context Delta, use an internal plan, implement, run project verification, perform Contract Conformance, and check Context drift.\n\n## Long-Task Routing\n\nUse Long-Task only when explicitly invoked or an active binding exists.\n`;
}
