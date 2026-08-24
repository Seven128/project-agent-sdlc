import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { parseAndValidateLongTaskCodexAgentProfile } from "../../packages/ty-context/dist/lib/long-task-codex-agent-profile.js";

export async function assertLongTaskStaticConsistency(repoRoot) {
  const packageJson = JSON.parse(
    await readFile(
      path.join(repoRoot, "packages/ty-context/package.json"),
      "utf8",
    ),
  );
  const projectSpec = await readFile(
    path.join(repoRoot, "PROJECT_SPEC.md"),
    "utf8",
  );
  const workflowContext = await readFile(
    path.join(
      repoRoot,
      "project_context/areas/harness-package/contracts/workflow-contract.md",
    ),
    "utf8",
  );
  const publishWorkflow = await readFile(
    path.join(repoRoot, ".github/workflows/npm-publish.yml"),
    "utf8",
  );
  const gitignore = await readFile(path.join(repoRoot, ".gitignore"), "utf8");
  const managedAgentProfile = await readFile(
    path.join(
      repoRoot,
      ".codex/ty-context-managed/agents/long-task-implementation.toml",
    ),
    "utf8",
  );
  const rootReadme = await readFile(path.join(repoRoot, "README.md"), "utf8");
  const rootReadmeZh = await readFile(
    path.join(repoRoot, "README.zh-CN.md"),
    "utf8",
  );
  const packageReadme = await readFile(
    path.join(repoRoot, "packages/ty-context/README.md"),
    "utf8",
  );
  const longTaskSkill = await readFile(
    path.join(
      repoRoot,
      ".codex/ty-context-managed/skills/long-task-workflow/SKILL.md",
    ),
    "utf8",
  );
  const installedAgentProfile = await readFile(
    path.join(repoRoot, ".codex/agents/long-task-implementation.toml"),
    "utf8",
  );
  const packagedAgentProfile = await readFile(
    path.join(
      repoRoot,
      "packages/ty-context/assets/agents/long-task-implementation.toml",
    ),
    "utf8",
  );
  const expectedVersion = publishWorkflow.match(
    /expected_version:[\s\S]*?default:\s*"([^"\r\n]+)"/u,
  )?.[1];
  assert.ok(expectedVersion, "npm publish workflow must declare expected_version");
  assert.equal(packageJson.version, expectedVersion);
  assert.doesNotMatch(
    projectSpec,
    /package version for this architecture is `0\.5\.0`|Version 0\.5 keeps/u,
  );
  assert.doesNotMatch(
    `${projectSpec}\n${workflowContext}`,
    /manual-only Outcome|external\/manual acceptance required/u,
  );
  assert.match(
    `${projectSpec}\n${workflowContext}`,
    /machine_accepted_external_pending/u,
  );
  assert.match(
    `${projectSpec}\n${workflowContext}`,
    /delivery_accepted/u,
  );
  assert.match(
    `${projectSpec}\n${workflowContext}`,
    /acceptance_scope: declared_delivery_authority/u,
  );
  assert.doesNotMatch(
    `${projectSpec}\n${workflowContext}`,
    /accepted terminal commands identify `acceptance_scope: declared_machine_authority`/u,
  );
  assert.match(gitignore, /^\.codex\/hooks\.json$/mu);
  assert.equal(installedAgentProfile, managedAgentProfile);
  assert.equal(packagedAgentProfile, managedAgentProfile);
  assert.match(
    managedAgentProfile,
    /^# ty-context:managed:long-task-implementation-worker$/mu,
  );
  const validation = parseAndValidateLongTaskCodexAgentProfile(
    managedAgentProfile,
  );
  assert.equal(validation.valid, true, JSON.stringify(validation));
  const profile = validation.profile;
  const canonicalModel = managedAgentProfile.match(
    /^model = "([^"\r\n]+)"$/mu,
  )?.[1];
  const canonicalEffort = managedAgentProfile.match(
    /^model_reasoning_effort = "([^"\r\n]+)"$/mu,
  )?.[1];
  assert.ok(canonicalModel);
  assert.ok(canonicalEffort);
  assert.equal(profile.name, "long_task_implementation");
  assert.equal(profile.model, canonicalModel);
  assert.equal(profile.model_reasoning_effort, canonicalEffort);
  assert.equal(profile.agents.enabled, false);
  assert.ok(packageReadme.includes(canonicalModel));
  assert.ok(packageReadme.includes(`model_reasoning_effort = "${canonicalEffort}"`));
  for (const content of [
    rootReadme,
    rootReadmeZh,
    projectSpec,
    workflowContext,
    longTaskSkill,
  ])
    assert.equal(content.includes(canonicalModel), false);
  assert.match(profile.developer_instructions, /after .*checkpoint/iu);
  assert.match(profile.developer_instructions, /Source, Contract, Authority, or Context writeback/iu);
  assert.match(profile.developer_instructions, /Progress, Evidence, Receipt, or Final Gate/iu);
  assert.match(profile.developer_instructions, /Do not claim acceptance or completion authority/iu);
  assert.match(profile.developer_instructions, /Do not choose models/iu);
  assert.match(profile.developer_instructions, /Do not create or switch branches or worktrees/iu);
  assert.match(profile.developer_instructions, /queue, registry, or Worker DAG/iu);
  if (await pathExists(path.join(repoRoot, ".git"))) {
    const tracked = await gitOutput(repoRoot, [
      "ls-files",
      "--",
      ".codex/hooks.json",
    ]);
    const deleted = await gitOutput(repoRoot, [
      "ls-files",
      "--deleted",
      "--",
      ".codex/hooks.json",
    ]);
    assert.ok(
      !tracked || deleted === ".codex/hooks.json",
      "the package-owned runtime Hook may exist locally but must not be source",
    );
  } else {
    assert.equal(
      await pathExists(path.join(repoRoot, ".codex/hooks.json")),
      false,
      "an immutable source snapshot must not materialize the ignored runtime Hook",
    );
  }
}

async function pathExists(target) {
  return Boolean(await stat(target).catch(() => null));
}

async function gitOutput(cwd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn("git", args, { cwd, windowsHide: true });
    const stdout = [];
    const stderr = [];
    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(Buffer.concat(stdout).toString("utf8").trim());
      else reject(new Error(Buffer.concat(stderr).toString("utf8")));
    });
  });
}
