import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
  access,
  mkdir,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { evaluateDeliveryAssertion } from "../../packages/ty-context/dist/lib/long-task-assertions-v2.js";
import { classifyRepositoryPatternOverlap } from "../../packages/ty-context/dist/lib/long-task-paths.js";
import { loadActiveLongTaskAuthority } from "../../packages/ty-context/dist/lib/long-task-state.js";
import {
  canonicalValueJson,
  sha256Hex,
} from "../../packages/ty-context/dist/lib/strict-codec.js";
import {
  commitCandidate,
  createDeliveryFixture,
  runCli,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";

const exec = promisify(execFile);
const fixture = await createDeliveryFixture();
try {
  await mkdir(path.join(fixture.root, "artifacts"), { recursive: true });
  await writeFile(
    path.join(fixture.root, "artifacts", "proof.json"),
    '{"proved":true}\n',
  );
  fixture.contract.outcomes[0].acceptance.checks[0].expected_output_paths = [
    "artifacts/proof.json",
  ];
  fixture.contract.outcomes[0].technical.allowed_support_paths.push(
    "artifacts/proof.json",
  );
  fixture.contract.outcomes[0].product.owner.path_globs.push(
    "artifacts/proof.json",
  );
  await writeContract(fixture.workdir, fixture.contract);
  await runCli(fixture.root, ["enable", "long-task"]);
  const compiled = await runCli(fixture.root, [
    "long-task",
    "compile",
    fixture.workdir,
  ]);
  const initial = (await loadActiveLongTaskAuthority(fixture.root)).authority;
  const progress = await runCli(fixture.root, [
    "long-task",
    "verify",
    fixture.workdir,
  ]);
  assert.ok(progress.check_results.every((check) => check.attempts === 1));

  const cacheFile = path.join(
    fixture.workdir,
    ".ty-context",
    "compiled-contract.json",
  );
  await rm(cacheFile);
  const weakened = structuredClone(fixture.contract);
  weakened.outcomes[0].acceptance.checks[0].expected_output_paths = [];
  await writeContract(fixture.workdir, weakened);
  await assert.rejects(
    runCli(fixture.root, ["long-task", "compile", fixture.workdir]),
    /authority_revision_requires_revise_flag/u,
  );
  await assert.rejects(
    runCli(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
      "--revise",
    ]),
    /authority_change_requires_user_decision/u,
  );

  await writeContract(fixture.workdir, fixture.contract);
  const rebuilt = await runCli(fixture.root, [
    "long-task",
    "compile",
    fixture.workdir,
  ]);
  assert.equal(rebuilt.compiled_identity, compiled.compiled_identity);
  const restored = (await loadActiveLongTaskAuthority(fixture.root)).authority;
  assert.deepEqual(restored.initial_task_base, initial.initial_task_base);

  const forged = JSON.parse(await readFile(cacheFile, "utf8"));
  forged.outcomes[0].acceptance.checks[0].positive_assertions[0].expected =
    false;
  delete forged.compiled_identity;
  forged.compiled_identity = sha256Hex(canonicalValueJson(forged));
  await writeFile(cacheFile, `${JSON.stringify(forged)}\n`);
  const verified = await runCli(fixture.root, [
    "long-task",
    "verify",
    fixture.workdir,
  ]);
  assert.equal(verified.compiled_identity, compiled.compiled_identity);
  assert.equal(verified.findings.length, 0);

  assert.equal(
    evaluateDeliveryAssertion(
      {
        key: "missing-negative",
        criterion: "The negative proof remains explicit.",
        claims: ["result"],
        observation: "missing",
        evidence_capabilities: ["state_delta"],
        operator: "equals",
        expected: false,
      },
      {},
    ),
    false,
  );
  assert.equal(
    classifyRepositoryPatternOverlap(
      "**",
      "tests/oracle.mjs",
    ).status,
    "proven_overlap",
  );

  await commitCandidate(fixture.root);
  const final = await runCli(
    fixture.root,
    ["long-task", "final-gate", fixture.workdir],
    { skipCandidateCommit: true },
  );
  assert.equal(final.workflow_status, "machine_accepted");
  assert.equal(final.compiled_identity, compiled.compiled_identity);

  const branches = (
    await exec("git", ["branch", "--format=%(refname:short)"], {
      cwd: fixture.root,
      windowsHide: true,
    })
  ).stdout
    .trim()
    .split(/\r?\n/u)
    .filter(Boolean);
  assert.equal(branches.length, 1);
  const worktrees = (
    await exec("git", ["worktree", "list", "--porcelain"], {
      cwd: fixture.root,
      windowsHide: true,
    })
  ).stdout.match(/^worktree /gmu);
  assert.equal(worktrees?.length ?? 0, 1);
  const agentFiles = await readdir(path.join(fixture.root, ".codex/agents"));
  assert.deepEqual(agentFiles, ["long-task-implementation.toml"]);
  const agentProfile = await readFile(
    path.join(
      fixture.root,
      ".codex/agents/long-task-implementation.toml",
    ),
    "utf8",
  );
  assert.match(agentProfile, /^name = "long_task_implementation"$/mu);
  assert.match(agentProfile, /^model = "gpt-5\.6-luna"$/mu);
  assert.match(agentProfile, /^model_reasoning_effort = "max"$/mu);
  for (const relative of [
    ".codex/workers",
    ".codex/appserver",
    ".codex/campaigns",
  ])
    await assert.rejects(access(path.join(fixture.root, relative)));

  console.log(
    JSON.stringify({
      status: "passed",
      compiled_identity: compiled.compiled_identity,
      initial_task_base_sha256: sha256Hex(
        canonicalValueJson(initial.initial_task_base),
      ),
      final_gate: final.workflow_status,
      branches: branches.length,
      worktrees: worktrees?.length ?? 0,
      model_retries: 0,
      agent_profile: true,
      agent_runtime: false,
      worker_runtime: false,
      cache_authority: false,
      missing_observation_proof: false,
      global_wildcard_isolated: true,
    }),
  );
} finally {
  await rm(fixture.root, { recursive: true, force: true });
}
