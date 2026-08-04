import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { npmCommandSpec } from "../../tools/npm_command_spec.mjs";

test("Windows npm subprocesses are routed through ComSpec", () => {
  assert.deepEqual(
    npmCommandSpec(["--version"], {
      platform: "win32",
      environment: { ComSpec: "C:\\Windows\\System32\\cmd.exe" },
    }),
    {
      command: "C:\\Windows\\System32\\cmd.exe",
      args: ["/d", "/s", "/c", "call", "npm", "--version"],
    },
  );
});

test("POSIX npm subprocesses remain direct", () => {
  assert.deepEqual(
    npmCommandSpec(["--version"], { platform: "linux", environment: {} }),
    { command: "npm", args: ["--version"] },
  );
});

test(
  "the Windows npm command spec launches a real npm subprocess",
  { skip: process.platform !== "win32" },
  () => {
    const spec = npmCommandSpec(["--version"]);
    const result = spawnSync(spec.command, spec.args, {
      encoding: "utf8",
      windowsHide: true,
    });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout.trim(), /^\d+\.\d+\.\d+/u);
  },
);

test(
  "the Windows npm command spec waits for nested npm scripts",
  { skip: process.platform !== "win32" },
  () => {
    const directory = mkdtempSync(path.join(tmpdir(), "ty-context-npm-call-"));
    try {
      writeFileSync(
        path.join(directory, "package.json"),
        `${JSON.stringify(
          {
            private: true,
            scripts: {
              inner: "node -e \"console.log('inner-complete')\"",
              outer:
                "npm run inner && node -e \"console.log('outer-complete')\"",
            },
          },
          null,
          2,
        )}\n`,
        "utf8",
      );
      const spec = npmCommandSpec(["run", "outer"]);
      const result = spawnSync(spec.command, spec.args, {
        cwd: directory,
        encoding: "utf8",
        windowsHide: true,
      });
      assert.ifError(result.error);
      assert.equal(result.status, 0, result.stderr || result.stdout);
      assert.match(result.stdout, /inner-complete/u);
      assert.match(result.stdout, /outer-complete/u);
    } finally {
      rmSync(directory, { force: true, recursive: true });
    }
  },
);
