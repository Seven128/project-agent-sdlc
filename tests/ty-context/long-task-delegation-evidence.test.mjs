import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { delegationEvidenceMetrics } from "../../examples/delivery-benchmark/mechanism/runner/delegation-evidence.mjs";
import { validateAttribution } from "../../examples/delivery-benchmark/mechanism/runner/delegation-evidence-validation.mjs";
import {
  changedPaths,
  changeScopeMetrics,
} from "../../examples/delivery-benchmark/mechanism/runner/metrics.mjs";
import { sha256 } from "../../examples/delivery-benchmark/mechanism/runner/shared.mjs";
import {
  assertDelegationEvidenceStates,
  verifyCompoundFallbackReason,
  verifyRejectedDelegationTraces,
  verifyTierObservationTyping,
} from "./helpers/long-task-delegation-evidence-assertions.mjs";
import {
  verifyBaselineWorkerPacketSelection,
  verifySoloFallbackWorkerFailures,
} from "./helpers/long-task-delegation-policy-assertions.mjs";
import {
  delegationTrace,
  git,
  verifyDelegationSuitabilityPolicy,
} from "./helpers/long-task-delegation-evidence-fixture.mjs";

test("delegation suitability owns all five solo reasons", () => {
  verifyDelegationSuitabilityPolicy();
});

test("committed renames retain both endpoints in scope and actor attribution", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "tiny-context-delegation-rename-"));
  try {
    await mkdir(path.join(root, "irrelevant"));
    await mkdir(path.join(root, "allowed"));
    await writeFile(path.join(root, "irrelevant/source.txt"), "source\n");
    git(root, ["init", "-b", "main"]);
    git(root, ["config", "user.name", "Delegation Rename Test"]);
    git(root, ["config", "user.email", "delegation@example.invalid"]);
    git(root, ["config", "core.autocrlf", "false"]);
    git(root, ["add", "."]);
    git(root, ["commit", "-m", "initial"]);
    const initial = git(root, ["rev-parse", "HEAD"]);
    git(root, ["mv", "irrelevant/source.txt", "allowed/target.txt"]);
    git(root, ["commit", "-m", "rename"]);

    const changed = await changedPaths(root, initial);
    assert.deepEqual(changed, ["allowed/target.txt", "irrelevant/source.txt"]);
    const scope = changeScopeMetrics(changed, {
      allowed_change_paths: ["allowed/target.txt"],
    });
    assert.equal(scope.correct, false);
    assert.deepEqual(scope.unexpected_change_paths, ["irrelevant/source.txt"]);

    const issues = [];
    validateAttribution(
      [
        {
          actor_id: "agent-a",
          packet_id: "allowed",
          changed_paths: ["allowed/target.txt"],
        },
      ],
      [],
      new Map([
        [
          "allowed",
          { allowed_paths: ["allowed/target.txt"] },
        ],
      ]),
      changed,
      issues,
    );
    assert.ok(issues.includes("actor_attribution_not_closed"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("delegation evidence validates exact actors but rejects every repository-supplied provenance claim", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "tiny-context-delegation-trace-"));
  const tracePath = path.join(path.dirname(root), `${path.basename(root)}-trace.json`);
  try {
    await mkdir(path.join(root, "src"));
    await writeFile(path.join(root, "src/a.mjs"), "export const a = 0;\n");
    await writeFile(path.join(root, "src/b.mjs"), "export const b = 0;\n");
    await writeFile(path.join(root, "src/c.mjs"), "export const c = 0;\n");
    await writeFile(path.join(root, "context.md"), "# Context\n");
    git(root, ["init", "-b", "main"]);
    git(root, ["config", "user.name", "Delegation Evidence Test"]);
    git(root, ["config", "user.email", "delegation@example.invalid"]);
    git(root, ["config", "core.autocrlf", "false"]);
    git(root, ["add", "."]);
    git(root, ["commit", "-m", "initial"]);
    const initial = git(root, ["rev-parse", "HEAD"]);
    const initialTree = git(root, ["rev-parse", "HEAD^{tree}"]);

    await writeFile(path.join(root, "src/a.mjs"), "export const a = 1;\n");
    await writeFile(path.join(root, "src/b.mjs"), "export const b = 1;\n");
    await writeFile(path.join(root, "src/c.mjs"), "export const c = 1;\n");
    await writeFile(path.join(root, "context.md"), "# Context\n\nUpdated.\n");
    git(root, ["add", "."]);
    git(root, ["commit", "-m", "candidate"]);
    const head = git(root, ["rev-parse", "HEAD"]);
    const tree = git(root, ["rev-parse", "HEAD^{tree}"]);
    const metadata = {
      task_id: "delegation-evidence",
      track: "long-task-delegation",
      variant_id: "long-task-delegation-positive-default",
      variant_role: "candidate",
      pair_id: "pair-1",
      replicate: 1,
      initial_commit: initial,
      initial_tree: initialTree,
      baseline_commit: "0".repeat(40),
      fixture_sha256: "a".repeat(64),
      experiment_set_sha256: "b".repeat(64),
      model: "gpt-5.6-sol",
      reasoning: "high",
      provider: "openai",
      workflow_guidance_source: {
        content_bundle_sha256: "1".repeat(64),
        guidance_provenance_sha256: "2".repeat(64),
        profile_content_sha256: "3".repeat(64),
        profile_expectation: {
          agent_type: "long_task_implementation",
          model: "gpt-5.6-luna",
          model_reasoning_effort: "max",
          child_agents_enabled: false,
          service_tier_override: false,
          unobservable_tier_status:
            "service_tier_inheritance_unverified",
        },
        hook_content_sha256: "4".repeat(64),
      },
      benchmark_inputs_sha256: "6".repeat(64),
      delegation_admission_policy_sha256: "c".repeat(64),
      harness_runtime_identity: { identity_sha256: "d".repeat(64) },
      run_input_identity: { sha256: "e".repeat(64) },
      source_checkout_candidate: {
        head_commit: "7".repeat(40),
        head_tree: "8".repeat(40),
        working_tree: { clean: true, digest: "9".repeat(64) },
      },
    };
    const gold = {
      delegation_packets: [
        {
          packet_id: "a",
          owner: "owner-a",
          allowed_paths: ["src/a.mjs"],
          independently_safe: true,
          positive_expected_parallel_benefit: true,
        },
        {
          packet_id: "b",
          owner: "owner-b",
          allowed_paths: ["src/b.mjs"],
          independently_safe: true,
          positive_expected_parallel_benefit: true,
        },
        {
          packet_id: "c",
          owner: "owner-c",
          allowed_paths: ["src/c.mjs"],
          independently_safe: false,
          positive_expected_parallel_benefit: false,
        },
      ],
    };
    const changedPaths = ["context.md", "src/a.mjs", "src/b.mjs", "src/c.mjs"];
    const original = delegationTrace(metadata, initial, initialTree, head, tree);
    original.packets.push(gold.delegation_packets[2]);
    original.host.parent_changed_paths.push("src/c.mjs");

    const claimedHostEnvelope = await evaluate(original, true);
    const unattested = await evaluate(original, false);

    const parentFallback = structuredClone(original);
    parentFallback.host.profile = {
      available: false,
      status: "installed_profile_missing",
    };
    parentFallback.host.guard_probe.exact_spawn_allowed = false;
    parentFallback.host.parent_changed_paths = changedPaths;
    parentFallback.host.workers = [];
    parentFallback.host.worker_events = [];
    parentFallback.costs.child_tokens = 0;
    parentFallback.solo_reason_id = "exact_profile_unavailable";
    const fallback = await evaluate(parentFallback, true);
    assertDelegationEvidenceStates({
      claimedHostEnvelope,
      unattested,
      fallback,
    });
    await verifyCompoundFallbackReason(parentFallback, original, evaluate);
    await verifyTierObservationTyping(original, evaluate);
    await verifySoloFallbackWorkerFailures(original, gold, evaluate);
    await verifyBaselineWorkerPacketSelection(
      original,
      gold,
      metadata,
      evaluate,
    );
    await verifyRejectedDelegationTraces(original, evaluate);

    async function evaluate(value, attested, overrides = {}) {
      await writeFile(tracePath, `${JSON.stringify(value, null, 2)}\n`);
      const hostProvenance = attested
        ? {
            kind: "host_owned_delegation_trace_v1",
            trace_sha256: sha256(value),
            capabilities: [
              "hook_guard",
              "effective_execution",
              "capacity",
              "actor_mutations",
              "lifecycle",
              "costs",
            ],
          }
        : null;
      return delegationEvidenceMetrics(
        tracePath,
        {
          metadata: overrides.metadata ?? metadata,
          gold: overrides.gold ?? gold,
          changedPaths,
          runDir: root,
        },
        { hostProvenance },
      );
    }
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(tracePath, { force: true });
  }
});
