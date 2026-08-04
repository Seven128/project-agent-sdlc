import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

test("managed guidance includes Modularity Check workflow contract hints", () => {
  const managedAgents = read(".codex/ty-context-managed/agents/AGENTS_CORE.md");
  const packagedAgents = read("packages/ty-context/assets/agents/AGENTS_CORE.md");
  const managedSkill = read(".codex/ty-context-managed/skills/context_development_engineer/SKILL.md");
  const packagedSkill = read("packages/ty-context/assets/skills/context_development_engineer/SKILL.md");
  const managedMake = read(".codex/ty-context-managed/make/ty-context.mk");
  const packagedMake = read("packages/ty-context/assets/make/ty-context.mk");

  for (const agents of [managedAgents, packagedAgents]) {
    assert.match(agents, /Modularity Check: none\|required\|exception/);
    assert.match(agents, /internal plan|internal routing and maintenance questions/);
    assert.doesNotMatch(agents, /requires? a Task Contract file/i);
  }
  assert.equal(packagedSkill, managedSkill);
  assert.match(managedSkill, /source of truth and extension point/);
  assert.match(managedSkill, /existing owner\/facade\/adapter/);
  assert.match(managedSkill, /abstraction only for an evidenced change axis/);
  assert.match(managedSkill, /without duplicate truth or reverse dependency/);
  assert.match(
    managedSkill,
    /project-owned type\/lint\/AST\/dependency\/contract\/behavior\/benchmark\/probe checks/,
  );
  assert.match(managedSkill, /bounded project-owned exception/);
  assert.ok(
    Buffer.byteLength(managedSkill, "utf8") < 9_000,
    "engineering-design Skill stays a compact role adapter",
  );
  assert.doesNotMatch(managedSkill, /validate-code-modularity|JS\/TS family|line-only/);
  for (const makefile of [managedMake, packagedMake]) {
    assert.match(makefile, /ty-context-check-modularity/);
    assert.match(makefile, /validate-code-modularity/);
    assert.match(makefile, /TY_CONTEXT_MODULARITY_SCOPE/);
  }
});

test("public docs describe Modularity Check hard gate and scoped waivers", () => {
  for (const doc of [read("README.md"), read("packages/ty-context/README.md")]) {
    assert.match(doc, /Modularity Check: none\|required\|exception/);
    assert.match(doc, /validate-code-modularity/);
    assert.match(doc, /capability-aware portable risk signal/);
    assert.match(doc, /analysis=js-ts-heuristic\|python-heuristic\|line-only/);
    assert.match(doc, /unsupported metrics are `null` internally and `n\/a` in CLI output/);
    assert.match(doc, /not complete static analysis, architecture proof or runtime-performance evidence/);
    assert.match(doc, /Modularity Policy/);
    assert.match(doc, /Newly generated Harness configs default to `strict_except_generated`/);
    assert.match(doc, /strict_except_generated/);
    assert.match(doc, /scoped_waivers/);
    assert.match(doc, /modularity\.waivers/);
    assert.match(doc, /explicit `ty-context upgrade` removes only waivers/);
    assert.match(doc, /ordinary `sync` never performs that migration/);
    assert.match(doc, /owner.*introduced_at.*tracking_issue.*expiry_condition/s);
  }
});

function read(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}
