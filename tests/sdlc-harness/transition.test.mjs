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
    next: TESTING
  TESTING:
    role: tester
    skill: pjsdlc_tester
    next: RELEASING
  RELEASING:
    role: release_manager
    skill: pjsdlc_release_manager
    next: COMPLETED
  COMPLETED:
    role: manager
    skill: pjsdlc_manager
    next: IDLE
  IDLE:
    role: manager
    skill: pjsdlc_manager
    next: REQUIREMENT_GATHERING
  RFC_RECALIBRATION:
    role: rfc_owner
    skill: pjsdlc_rfc_recalibrate
    next: SPRINTING
  BLOCKED:
    role: manager
    skill: pjsdlc_manager
    next: REQUIREMENT_GATHERING
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

  await writeLifecycle(
    `project_name: "Fixture"
version: "v0.1"
current_phase: "REVIEWING"
active_role: "reviewer"
active_skill: "pjsdlc_reviewer"
suspended_phase: ""
allowed_next_phases:
  - "TESTING"
`
  );
  execFileSync("python3", ["tools/transition.py", "--to", "TESTING"], { cwd: root });
  lifecycle = await readLifecycle();
  assert.match(lifecycle, /current_phase: "TESTING"/);
  assert.match(lifecycle, /active_role: "tester"/);
  assert.match(lifecycle, /- "RELEASING"/);

  for (const phase of ["SPRINTING", "REVIEWING", "TESTING", "RELEASING"]) {
    await writeLifecycle(
      `project_name: "Fixture"
version: "v0.1"
current_phase: "${phase}"
active_role: "fixture"
active_skill: "fixture"
suspended_phase: ""
allowed_next_phases:
  - "NEXT"
`
    );
    execFileSync("python3", ["tools/transition.py", "--to", "RFC_RECALIBRATION"], { cwd: root });
    lifecycle = await readLifecycle();
    assert.match(lifecycle, /current_phase: "RFC_RECALIBRATION"/);
    assert.match(lifecycle, /active_role: "rfc_owner"/);
    assert.match(lifecycle, /active_skill: "pjsdlc_rfc_recalibrate"/);
    assert.match(lifecycle, new RegExp(`suspended_phase: "${phase}"`));
    assert.match(lifecycle, /- "SPRINTING"/);
  }

  for (const phase of ["REQUIREMENT_GATHERING", "ARCHITECTING"]) {
    await writeLifecycle(
      `project_name: "Fixture"
version: "v0.1"
current_phase: "${phase}"
active_role: "fixture"
active_skill: "fixture"
suspended_phase: ""
allowed_next_phases:
  - "NEXT"
`
    );
    assert.throws(
      () => execFileSync("python3", ["tools/transition.py", "--to", "RFC_RECALIBRATION"], { cwd: root, stdio: "pipe" }),
      new RegExp(`Illegal transition ${phase} -> RFC_RECALIBRATION`)
    );
  }

  await writeLifecycle(
    `project_name: "Fixture"
version: "v0.1"
current_phase: "RFC_RECALIBRATION"
active_role: "rfc_owner"
active_skill: "pjsdlc_rfc_recalibrate"
suspended_phase: "REVIEWING"
allowed_next_phases:
  - "SPRINTING"
`
  );
  execFileSync("python3", ["tools/transition.py", "--to", "SPRINTING"], { cwd: root });
  lifecycle = await readLifecycle();
  assert.match(lifecycle, /current_phase: "SPRINTING"/);
  assert.match(lifecycle, /active_role: "developer"/);
  assert.match(lifecycle, /active_skill: "pjsdlc_dev_sprint"/);
  assert.match(lifecycle, /suspended_phase: ""/);
  assert.match(lifecycle, /- "REVIEWING"/);
} finally {
  await rm(root, { recursive: true, force: true });
}

async function writeLifecycle(content) {
  await writeFile(path.join(root, ".codex/state/lifecycle.yaml"), content, "utf8");
}

async function readLifecycle() {
  return readFile(path.join(root, ".codex/state/lifecycle.yaml"), "utf8");
}
