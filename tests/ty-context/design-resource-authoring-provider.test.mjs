import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { runOpenDesignMcpDiscoverySmoke } from "../../tools/open_design_live_smoke.mjs";

const fixture = fileURLToPath(
  new URL("./fixtures/mock-open-design-mcp.mjs", import.meta.url),
);
const providerGuidance = fileURLToPath(
  new URL(
    "../../.codex/ty-context-managed/skills/design-resource-authoring/references/open-design-provider.md",
    import.meta.url,
  ),
);

test("highest-performance guidance distributes every selection boundary without claiming runtime proof", async () => {
  const guidance = await readFile(providerGuidance, "utf8");
  const cases = [
    [
      "eligible models are filtered before authoritative highest selection",
      /Filter to eligible models before ranking[\s\S]*provider's explicit capability order or documented recommended-replacement relation/iu,
    ],
    [
      "reasoning-only control selects the highest declared effort and qualifies model control",
      /exposes reasoning control but no model control[\s\S]*request the proved highest effort[\s\S]*model selection could not be independently enforced/iu,
    ],
    [
      "a missing remembered example yields to the real discovered highest model",
      /missing remembered example model is not an error[\s\S]*different actual highest model/iu,
    ],
    [
      "multiple eligible but unrankable models fail closed",
      /cannot order two or more eligible candidates[\s\S]*highest_performance_unverified[\s\S]*instead of guessing/iu,
    ],
    [
      "an uncontrollable or unobservable run stays explicitly unverified",
      /exposes neither control[\s\S]*default generation path may be used[\s\S]*highest_performance_unverified/iu,
    ],
    [
      "request-effective mismatch fails",
      /Compare requested values with the effective model[\s\S]*A mismatch fails the run/iu,
    ],
    [
      "ordinary reads do not trigger generation selection",
      /Pure discovery, reads, resource enumeration, metadata queries[\s\S]*do not trigger this policy/iu,
    ],
  ];
  for (const [name, pattern] of cases)
    assert.match(guidance, pattern, name);

  assert.match(
    guidance,
    /Price, model-name shape, publication date[\s\S]*provider list order are not ranking evidence/iu,
  );
  assert.match(guidance, /currently defines no fallback entries/iu);
  assert.match(
    guidance,
    /Repository tests can prove only[\s\S]*Only a normalized live provider trace[\s\S]*prove the model and effort actually used/iu,
  );
});

test("Open Design discovery transport verifies capabilities without provider mutations", async () => {
  const result = await runOpenDesignMcpDiscoverySmoke({
    command: process.execPath,
    args: [fixture],
  });
  assert.equal(result.schema_version, "open-design-discovery-smoke-v2");
  assert.equal(result.provider.name, "mock-open-design");
  assert.equal(result.mutations_performed, false);
  assert.ok(result.required_tools.includes("start_run"));
  assert.ok(result.required_tools.includes("get_artifact"));
  assert.ok(result.required_tools.includes("get_project"));
  assert.deepEqual(result.project_binding, {
    create_project_design_system_input: true,
    get_project_verification_tool: true,
  });
  assert.equal(result.design_system_resources.template_present, true);
  assert.equal(result.design_system_resources.template_method_supported, true);
  assert.equal(result.design_system_resources.concrete_resource_count, 1);
  assert.equal(result.design_system_resources.sample_read, true);
  assert.deepEqual(Object.keys(result.probes).sort(), [
    "list_agents",
    "list_plugins",
    "list_skills",
  ]);
  for (const probe of Object.values(result.probes)) {
    assert.equal(probe.content_blocks, 1);
    assert.equal(probe.has_structured_content, true);
  }
});

test("mock provider gaps and discovery errors fail closed", async () => {
  for (const [mode, expected] of [
    ["missing-tool", /missing required.*get_artifact/iu],
    ["probe-error", /list_skills returned isError=true/iu],
    ["missing-binding", /missing the designSystem binding input/iu],
  ]) {
    await assert.rejects(
      runOpenDesignMcpDiscoverySmoke({
        command: process.execPath,
        args: [fixture],
        env: { ...process.env, MOCK_OPEN_DESIGN_MODE: mode },
      }),
      expected,
    );
  }

  const concreteOnly = await runOpenDesignMcpDiscoverySmoke({
    command: process.execPath,
    args: [fixture],
    env: { ...process.env, MOCK_OPEN_DESIGN_MODE: "missing-template-method" },
  });
  assert.equal(
    concreteOnly.design_system_resources.template_method_supported,
    false,
  );
  assert.equal(concreteOnly.design_system_resources.concrete_resource_count, 1);
  assert.equal(concreteOnly.design_system_resources.sample_read, true);
});

test(
  "live Open Design discovery smoke is explicitly opt-in and read-only",
  { skip: process.env.TY_CONTEXT_OPEN_DESIGN_LIVE !== "1" },
  async () => {
    const command = process.env.TY_CONTEXT_OPEN_DESIGN_MCP_COMMAND;
    assert.ok(command, "TY_CONTEXT_OPEN_DESIGN_MCP_COMMAND is required");
    const args = JSON.parse(
      process.env.TY_CONTEXT_OPEN_DESIGN_MCP_ARGS_JSON ?? "[]",
    );
    const result = await runOpenDesignMcpDiscoverySmoke({ command, args });
    assert.equal(result.mutations_performed, false);
    assert.ok(result.tool_count >= result.required_tools.length);
    assert.equal(result.project_binding.create_project_design_system_input, true);
    assert.ok(
      result.design_system_resources.template_present ||
        result.design_system_resources.concrete_resource_count > 0,
    );
  },
);
