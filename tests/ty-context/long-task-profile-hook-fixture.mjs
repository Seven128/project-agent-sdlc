import assert from "node:assert/strict";
import path from "node:path";

const LEGACY_POSIX =
  'node "$(git rev-parse --show-toplevel)/.codex/hooks/long-task-hook.mjs"';
const LEGACY_WINDOWS =
  "powershell -NoProfile -Command \"$r=(git rev-parse --show-toplevel); node (Join-Path $r '.codex/hooks/long-task-hook.mjs')\"";

export function mixedHookConfig(packageHook) {
  const currentCommand = `node "${path.resolve(packageHook)}"`;
  const userOnlyGroup = {
    matcher: "user-only",
    metadata: { owner: "user" },
    hooks: [
      {
        type: "command",
        command: "node user-only-hook.mjs",
        user: "only",
      },
    ],
  };
  return {
    userOnlyGroup,
    config: {
      hooks: Object.fromEntries(
        [
          "PreToolUse",
          "SessionStart",
          "PostCompact",
          "Stop",
          "SubagentStart",
        ].map((event) => [
          event,
          [
            {
              matcher: "mixed",
              metadata: { preserve: true },
              hooks: [
                {
                  type: "command",
                  command: currentCommand,
                  commandWindows: currentCommand,
                  statusMessage:
                    "Tiny Context long-task live authority gate",
                },
                {
                  type: "command",
                  command: LEGACY_POSIX,
                  statusMessage:
                    "Tiny Context composite completion gate",
                },
                {
                  type: "command",
                  commandWindows: LEGACY_WINDOWS,
                  statusMessage:
                    "Tiny Context long-task completion gate",
                },
                {
                  type: "command",
                  command: "node composite-report.mjs",
                  user: "report",
                },
                {
                  type: "command",
                  command: "node user-composite-hook.mjs",
                  user: "composite",
                },
              ],
            },
            userOnlyGroup,
            ...(event === "SubagentStart"
              ? [{ hooks: [] }, { hooks: [] }]
              : []),
          ],
        ]),
      ),
    },
  };
}

export function assertEnabledHookEvents(hooks, userOnlyGroup) {
  for (const event of [
    "PreToolUse",
    "SessionStart",
    "PostCompact",
    "Stop",
    "SubagentStart",
  ]) {
    const all = hooks.hooks[event].flatMap((group) => group.hooks);
    const managed = all.filter((hook) =>
      String(hook.command ?? hook.commandWindows).includes(
        "dist\\long-task-hook.js",
      ) ||
      String(hook.command ?? hook.commandWindows).includes(
        "dist/long-task-hook.js",
      ),
    );
    assert.equal(managed.length, 1);
    assert.match(managed[0].command, /dist[\\/]long-task-hook\.js/u);
    assert.equal(managed[0].commandWindows, managed[0].command);
    assert.doesNotMatch(managed[0].command, /\.codex[\\/]hooks/u);
    assert.equal(managed[0].timeout, event === "Stop" ? 3600 : 10);
    const managedGroup = hooks.hooks[event].find((group) =>
      group.hooks.some((hook) => hook === managed[0]),
    );
    if (event === "PreToolUse")
      assert.equal(managedGroup.matcher, "^(spawn_agent|Agent)$");
    else if (event === "SubagentStart")
      assert.equal(managedGroup.matcher, "^long_task_implementation$");
    else assert.equal(Object.hasOwn(managedGroup, "matcher"), false);
    assert.equal(all.filter((hook) => hook.user).length, 3);
    assert.ok(
      all.some((hook) => hook.command === "node composite-report.mjs"),
    );
    assert.ok(
      all.some(
        (hook) => hook.command === "node user-composite-hook.mjs",
      ),
    );
    assert.equal(
      all.some(
        (hook) =>
          hook.command === LEGACY_POSIX ||
          hook.commandWindows === LEGACY_WINDOWS,
      ),
      false,
    );
    const mixed = hooks.hooks[event].find(
      (group) => group.matcher === "mixed",
    );
    assert.deepEqual(mixed.metadata, { preserve: true });
    assert.deepEqual(
      hooks.hooks[event].find(
        (group) => group.matcher === "user-only",
      ),
      userOnlyGroup,
    );
  }
}

export function assertDisabledHookEvents(hooks, userOnlyGroup) {
  for (const event of [
    "PreToolUse",
    "SessionStart",
    "PostCompact",
    "Stop",
    "SubagentStart",
  ]) {
    const groups = hooks.hooks[event];
    const all = groups.flatMap((group) => group.hooks);
    assert.equal(all.filter((hook) => hook.user).length, 3);
    assert.ok(
      all.some((hook) => hook.command === "node composite-report.mjs"),
    );
    assert.ok(
      all.some(
        (hook) => hook.command === "node user-composite-hook.mjs",
      ),
    );
    assert.equal(
      all.some((hook) =>
        String(hook.command ?? hook.commandWindows ?? "").includes(
          "long-task-hook",
        ),
      ),
      false,
    );
    assert.deepEqual(
      groups.find((group) => group.matcher === "user-only"),
      userOnlyGroup,
    );
  }
}
