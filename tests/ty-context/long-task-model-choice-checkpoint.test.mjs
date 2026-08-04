import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import test from "node:test";
import {
  createDeliveryFixture,
  runCli,
} from "./long-task-delivery-fixtures.mjs";

const expectedCheckpoint = {
  required: true,
  phase: "post_authority_lock_pre_implementation",
  options: ["continue_current_model", "switch_model_then_resume"],
  turn_boundary: "end_current_turn",
  blocked_until_explicit_choice: [
    "product_implementation",
    "file_edits",
    "build",
    "test_execution",
  ],
  explicit_task_specific_choice_required: true,
  prior_explicit_task_specific_choice_satisfies: true,
  generic_continue_satisfies: false,
  message:
    "Authority Lock created. End the current turn before product implementation, file edits, builds, or tests. Ask the user to explicitly choose continue_current_model or switch_model_then_resume. Generic continue, resume, finish, or continue-goal language does not satisfy this checkpoint.",
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
    assert.deepEqual(first.execution_model_checkpoint.options, [
      "continue_current_model",
      "switch_model_then_resume",
    ]);
    assert.doesNotMatch(
      JSON.stringify(first.execution_model_checkpoint),
      /long_task_implementation|gpt-5\.6-luna/iu,
    );
    assert.equal(first.lifecycle_event, "authority_locked");
    assert.equal(first.delivery_completed_by_this_event, false);
    assert.equal(first.native_goal_effect, "none");
    assert.match(first.next_action, /End this turn now/iu);
    assert.match(first.next_action, /Do not implement, edit files, build, or test/iu);
    assert.match(first.next_action, /generic continue or resume[\s\S]*does not satisfy/iu);
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
