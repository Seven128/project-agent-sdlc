import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  createDeliveryFixture,
  runCli,
} from "./long-task-delivery-fixtures.mjs";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

const expectedCheckpoint = {
  required: true,
  phase: "post_authority_lock_pre_implementation",
  action: "change_model_in_host_then_continue",
  resume_token: "continue",
  turn_boundary: "end_current_turn",
  blocked_until_resume: [
    "product_implementation",
    "file_edits",
    "build",
    "test_execution",
  ],
  model_change_owner: "host_or_user",
  model_change_observable_by_harness: false,
  generic_continue_satisfies: true,
  message:
    "Authority Lock created. End the current turn before product implementation, file edits, builds, or tests. After handling the model change, send [continue]. Harness cannot observe or verify the model change.",
};

test("first Authority Lock emits one execution-model checkpoint and later Compile does not repeat it", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await runCli(fixture.root, ["enable", "long-task"]);

    const first = await runCli(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
    ]);
    assert.deepEqual(first.execution_model_checkpoint, expectedCheckpoint);
    assert.equal(Object.hasOwn(first.execution_model_checkpoint, "options"), false);
    assert.equal(
      Object.hasOwn(
        first.execution_model_checkpoint,
        "explicit_task_specific_choice_required",
      ),
      false,
    );
    assert.doesNotMatch(
      JSON.stringify(first.execution_model_checkpoint),
      /continue_current_model|switch_model_then_resume|long_task_implementation|gpt-5\.6-luna/iu,
    );
    assert.equal(first.lifecycle_event, "authority_locked");
    assert.equal(first.delivery_completed_by_this_event, false);
    assert.equal(first.native_goal_effect, "none");
    assert.match(first.next_action, /End this turn now/iu);
    assert.match(first.next_action, /Do not implement, edit files, build, or test/iu);
    assert.match(first.next_action, /wait for \[continue\]/iu);
    assert.match(first.next_action, /cannot observe or verify the model change/iu);
    assert.doesNotMatch(first.next_action, /begin rolling implementation/iu);

    const repeated = await runCli(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
    ]);
    assert.deepEqual(repeated.execution_model_checkpoint, { required: false });
    assert.equal(repeated.lifecycle_event, "authority_recompiled_unchanged");
    assert.equal(repeated.delivery_completed_by_this_event, false);
    assert.equal(repeated.native_goal_effect, "none");
    assert.equal(repeated.compiled_identity, first.compiled_identity);
    assert.equal(repeated.authority_revision, first.authority_revision);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("current checkpoint surfaces expose only the host-change continuation protocol", async () => {
  const currentSurfaces = [
    "AGENTS.md",
    "PROJECT_SPEC.md",
    "README.md",
    "README.zh-CN.md",
    "packages/ty-context/README.md",
    "packages/ty-context/src/commands/long-task-revision.ts",
    "project_context/areas/harness-package.md",
    "project_context/areas/harness-package/contracts/workflow-contract.md",
    "project_context/areas/harness-package/decision-rationale/long-task-workflow.md",
    ".codex/ty-context-managed/agents/AGENTS_CORE.md",
    ".codex/ty-context-managed/skills/long-task-workflow/SKILL.md",
    ".codex/ty-context-managed/skills/long-task-workflow/references/authority-lifecycle.md",
  ];
  const content = (
    await Promise.all(
      currentSurfaces.map((file) =>
        readFile(path.join(repositoryRoot, file), "utf8"),
      ),
    )
  ).join("\n");
  assert.doesNotMatch(
    content,
    /continue_current_model|switch_model_then_resume/iu,
  );
  assert.match(content, /处理好模型更换之后，请发送【继续】。/u);
  assert.match(content, /After handling the model change, send \[continue\]\./u);
  assert.match(content, /cannot observe or verify/iu);
});
