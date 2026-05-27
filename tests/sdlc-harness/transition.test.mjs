import assert from "node:assert/strict";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = await mkdtemp(path.join(tmpdir(), "sdlc-harness-transition-"));
const sourceRoot = fileURLToPath(new URL("../..", import.meta.url));

try {
  await mkdir(path.join(root, "tools"), { recursive: true });
  await mkdir(path.join(root, ".codex/state"), { recursive: true });
  await mkdir(path.join(root, ".codex/pjsdlc_managed/policies"), { recursive: true });
  await copyFile(path.join(sourceRoot, "tools/harness_utils.py"), path.join(root, "tools/harness_utils.py"));
  await copyFile(path.join(sourceRoot, "tools/transition.py"), path.join(root, "tools/transition.py"));
  await writeFile(
    path.join(root, ".codex/pjsdlc_managed/policies/phase_contracts.yaml"),
    `phases:
  REQUIREMENT_GATHERING:
    role: pm
    skill: pjsdlc_pm_prd
    next: ARCHITECTING
  ARCHITECTING:
    role: architect
    skill: pjsdlc_architect_design
    next: SPRINTING
    returns:
      - REQUIREMENT_GATHERING
  SPRINTING:
    role: developer
    skill: pjsdlc_dev_sprint
    next: REVIEWING
  REVIEWING:
    role: reviewer
    skill: pjsdlc_reviewer
`,
    "utf8"
  );

  await writeLifecycle(
    `project_name: "Fixture"
version: "v0.1"
current_phase: "REQUIREMENT_GATHERING"
active_role: "pm"
active_skill: "pjsdlc_pm_prd"
allowed_next_phases:
  - "ARCHITECTING"
`
  );
  execFileSync("python3", ["tools/transition.py", "--to", "ARCHITECTING"], { cwd: root });
  let lifecycle = await readLifecycle();
  assert.match(lifecycle, /current_phase: "ARCHITECTING"/);
  assert.match(lifecycle, /active_role: "architect"/);
  assert.match(lifecycle, /active_skill: "pjsdlc_architect_design"/);
  assert.match(lifecycle, /- "SPRINTING"/);
  assert.match(lifecycle, /- "REQUIREMENT_GATHERING"/);

  execFileSync("python3", ["tools/transition.py", "--to", "REQUIREMENT_GATHERING"], { cwd: root });
  lifecycle = await readLifecycle();
  assert.match(lifecycle, /current_phase: "REQUIREMENT_GATHERING"/);
  assert.match(lifecycle, /active_role: "pm"/);
  assert.match(lifecycle, /active_skill: "pjsdlc_pm_prd"/);
  assert.match(lifecycle, /- "ARCHITECTING"/);
  assert.doesNotMatch(lifecycle, /- "SPRINTING"/);

  await writeLifecycle(
    `project_name: "Fixture"
version: "v0.1"
current_phase: "ARCHITECTING"
active_role: "architect"
active_skill: "pjsdlc_architect_design"
allowed_next_phases:
  - "SPRINTING"
`
  );
  execFileSync("python3", ["tools/transition.py", "--to", "REQUIREMENT_GATHERING"], { cwd: root });
  lifecycle = await readLifecycle();
  assert.match(lifecycle, /current_phase: "REQUIREMENT_GATHERING"/);
  assert.match(lifecycle, /active_role: "pm"/);

  await writeLifecycle(
    `project_name: "Fixture"
version: "v0.1"
current_phase: "SPRINTING"
active_role: "developer"
active_skill: "pjsdlc_dev_sprint"
allowed_next_phases:
  - "REVIEWING"
`
  );
  assert.throws(
    () => execFileSync("python3", ["tools/transition.py", "--to", "REQUIREMENT_GATHERING"], { cwd: root, stdio: "pipe" }),
    /Illegal transition SPRINTING -> REQUIREMENT_GATHERING/
  );
} finally {
  await rm(root, { recursive: true, force: true });
}

async function writeLifecycle(content) {
  await writeFile(path.join(root, ".codex/state/lifecycle.yaml"), content, "utf8");
}

async function readLifecycle() {
  return readFile(path.join(root, ".codex/state/lifecycle.yaml"), "utf8");
}
