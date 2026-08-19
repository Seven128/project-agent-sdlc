import assert from "node:assert/strict";
import {
  access,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { prepareMechanismRun } from "../../../examples/delivery-benchmark/mechanism/runner/prepare.mjs";
import { delegationHarnessIdentityMetrics } from "../../../examples/delivery-benchmark/mechanism/runner/delegation-harness-identity.mjs";
import {
  delegationGuidanceMetrics,
  delegationInputMetrics,
} from "../../../examples/delivery-benchmark/mechanism/runner/score.mjs";
import { gitFile, gitText } from "./long-task-delegation-benchmark-fixture.mjs";

export async function verifyFormalDelegationPrepare(
  repoRoot,
  candidateDigest,
  baselineCommit,
) {
  const temporary = await mkdtemp(
    path.join(tmpdir(), "tiny-context-delegation-guidance-"),
  );
  const bundleRoot = path.join(
    repoRoot,
    "examples/delivery-benchmark/mechanism/guidance/long-task-delegation-v1",
  );
  const canonicalPaths = [
    ".codex/ty-context-managed/agents/AGENTS_CORE.md",
    ".codex/ty-context-managed/agents/long-task-implementation.toml",
    ".codex/ty-context-managed/skills/long-task-workflow/SKILL.md",
    ".codex/ty-context-managed/skills/long-task-workflow/agents/openai.yaml",
  ];
  const before = await Promise.all(
    canonicalPaths.map((value) => readFile(path.join(repoRoot, value))),
  );
  try {
    const prepared = [];
    for (const [variant, name] of [
      ["long-task-delegation-conditional", "baseline"],
      ["long-task-delegation-positive-default", "candidate"],
    ])
      prepared.push(
        await prepareMechanismRun({
          task: "long-task-disjoint-money-health",
          variant,
          pairId: "bundle-isolation",
          replicate: 1,
          model: "gpt-5.6-sol",
          reasoning: "high",
          provider: "openai",
          outDir: path.join(temporary, name),
          harnessCli: path.join(repoRoot, "packages/ty-context/dist/cli.js"),
        }),
      );
    const [baseline, candidate] = prepared;
    assert.equal(baseline.protocol_status, "formal");
    assert.equal(candidate.benchmark_inputs.length, 3);
    assert.match(candidate.benchmark_inputs_sha256, /^[0-9a-f]{64}$/u);
    assert.equal(
      candidate.workflow_guidance_source.content_bundle_sha256,
      candidateDigest,
    );
    assert.match(
      candidate.harness_runtime_identity.identity_sha256,
      /^[0-9a-f]{64}$/u,
    );
    assert.equal(
      (
        await delegationHarnessIdentityMetrics(
          candidate.harness_runtime_identity,
          candidate.out_dir,
        )
      ).correct,
      true,
    );
    const staleHarness = structuredClone(candidate.harness_runtime_identity);
    staleHarness.identity_sha256 = "0".repeat(64);
    assert.equal(
      (await delegationHarnessIdentityMetrics(staleHarness, candidate.out_dir))
        .correct,
      false,
    );
    assert.match(candidate.run_input_identity.sha256, /^[0-9a-f]{64}$/u);
    assert.equal((await delegationGuidanceMetrics(candidate)).correct, true);
    assert.equal(
      (
        await delegationInputMetrics(
          candidate,
          undefined,
          undefined,
          candidate.delegation_admission_policy,
        )
      ).correct,
      true,
    );
    const wrongHook = structuredClone(candidate);
    wrongHook.workflow_guidance_source.hook_content_sha256 = "0".repeat(64);
    assert.equal((await delegationGuidanceMetrics(wrongHook)).correct, false);
    const wrongTask = structuredClone(candidate);
    wrongTask.task.probe = "hidden/other.mjs";
    assert.equal(
      (
        await delegationInputMetrics(
          wrongTask,
          undefined,
          undefined,
          wrongTask.delegation_admission_policy,
        )
      ).correct,
      false,
    );
    assert.match(
      await readFile(
        path.join(candidate.out_dir, ".codex/skills/long-task-workflow/SKILL.md"),
        "utf8",
      ),
      /must create multiple exact workers/u,
    );
    assert.deepEqual(
      await readFile(
        path.join(candidate.out_dir, ".codex/agents/long-task-implementation.toml"),
      ),
      await readFile(
        path.join(bundleRoot, "agents/long-task-implementation.toml"),
      ),
    );
    assert.deepEqual(
      await readFile(
        path.join(baseline.out_dir, ".codex/skills/long-task-workflow/SKILL.md"),
      ),
      gitFile(
        repoRoot,
        baselineCommit,
        ".codex/ty-context-managed/skills/long-task-workflow/SKILL.md",
      ),
    );
    assert.match(
      await readFile(path.join(candidate.out_dir, "AGENTS.md"), "utf8"),
      /must create multiple exact workers/u,
    );
    for (const run of prepared)
      assert.equal(gitText(run.out_dir, ["status", "--short"]), "");
    const after = await Promise.all(
      canonicalPaths.map((value) => readFile(path.join(repoRoot, value))),
    );
    assert.deepEqual(after, before);

    const copiedCli = path.join(temporary, "foreign-cli.js");
    await writeFile(
      copiedCli,
      await readFile(path.join(repoRoot, "packages/ty-context/dist/cli.js")),
    );
    const rejectedOut = path.join(temporary, "rejected-cli");
    await assert.rejects(
      prepareMechanismRun({
        task: "long-task-disjoint-money-health",
        variant: "long-task-delegation-conditional",
        pairId: "wrong-cli",
        replicate: 1,
        model: "gpt-5.6-sol",
        reasoning: "high",
        provider: "openai",
        outDir: rejectedOut,
        harnessCli: copiedCli,
      }),
      /delegation_formal_harness_cli_mismatch/u,
    );
    await assert.rejects(access(rejectedOut));
    await assert.rejects(
      prepareMechanismRun({
        task: "long-task-disjoint-money-health",
        variant: "long-task-delegation-conditional",
        pairId: "missing-provider",
        replicate: 1,
        model: "gpt-5.6-sol",
        reasoning: "high",
        outDir: path.join(temporary, "missing-provider"),
      }),
      /--provider for long-task delegation/u,
    );
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}
