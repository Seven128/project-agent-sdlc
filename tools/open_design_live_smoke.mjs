import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

const REQUIRED_DISCOVERY_TOOLS = Object.freeze([
  "list_agents",
  "list_skills",
  "list_plugins",
  "create_project",
  "get_project",
  "start_run",
  "get_run",
  "list_files",
  "get_artifact",
]);

class JsonLineMcpClient {
  constructor(command, args, options) {
    this.timeoutMs = options.timeoutMs;
    this.nextId = 1;
    this.stdoutBuffer = "";
    this.stderrBytes = 0;
    this.pending = new Map();
    this.childExit = null;
    this.child = spawn(command, args, {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
      env: options.env,
    });
    this.child.stderr.on("data", (chunk) => {
      this.stderrBytes += chunk.length;
    });
    this.child.stdout.setEncoding("utf8");
    this.child.stdout.on("data", (chunk) => this.onStdout(chunk));
    this.child.once("error", (error) => this.failAll(error));
    this.child.once("exit", (code, signal) => this.onExit(code, signal));
  }

  onStdout(chunk) {
    this.stdoutBuffer += chunk;
    for (;;) {
      const newline = this.stdoutBuffer.indexOf("\n");
      if (newline < 0) return;
      const line = this.stdoutBuffer.slice(0, newline).trim();
      this.stdoutBuffer = this.stdoutBuffer.slice(newline + 1);
      if (!line) continue;
      let message;
      try {
        message = JSON.parse(line);
      } catch {
        this.failAll(
          new Error("Open Design MCP emitted a non-JSON stdio message"),
        );
        continue;
      }
      const request = this.pending.get(message.id);
      if (!request) continue;
      this.pending.delete(message.id);
      clearTimeout(request.timer);
      if (message.error) request.reject(toMcpError(request.method, message));
      else request.resolve(message.result);
    }
  }

  onExit(code, signal) {
    this.childExit = { code, signal };
    this.failAll(
      new Error(
        `Open Design MCP exited before discovery completed (code=${code ?? "null"}, signal=${signal ?? "none"}, stderr_bytes=${this.stderrBytes})`,
      ),
    );
  }

  failAll(error) {
    for (const request of this.pending.values()) {
      clearTimeout(request.timer);
      request.reject(error);
    }
    this.pending.clear();
  }

  notify(method, params = {}) {
    if (!this.child.stdin.writable)
      throw new Error("Open Design MCP stdin is not writable");
    this.child.stdin.write(
      `${JSON.stringify({ jsonrpc: "2.0", method, params })}\n`,
    );
  }

  request(method, params = {}) {
    if (this.childExit)
      return Promise.reject(
        new Error(
          `Open Design MCP already exited (code=${this.childExit.code ?? "null"})`,
        ),
      );
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(
          new Error(
            `Open Design MCP ${method} timed out after ${this.timeoutMs}ms`,
          ),
        );
      }, this.timeoutMs);
      this.pending.set(id, { method, resolve, reject, timer });
      this.child.stdin.write(
        `${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`,
      );
    });
  }

  close() {
    this.child.stdin.end();
    if (this.child.exitCode === null && this.child.signalCode === null)
      this.child.kill();
  }
}

export async function runOpenDesignMcpDiscoverySmoke(options) {
  const normalized = normalizeOptions(options);
  const client = new JsonLineMcpClient(normalized.command, normalized.args, {
    timeoutMs: normalized.timeoutMs,
    env: normalized.env,
  });
  try {
    const initialized = await initialize(client);
    const tools = await listTools(client);
    const toolNames = tools.map((tool) => tool.name).sort();
    assertRequiredTools(toolNames);
    const toolSchema = fingerprintRelevantToolSchemas(tools);
    const projectBinding = inspectProjectBindingSchema(tools);
    const runCapabilities = inspectRunCapabilities(tools);
    const resources = await inspectDesignSystemResources(client);
    const probes = await probeDiscoveryTools(client);
    return {
      schema_version: "open-design-discovery-smoke-v3",
      provider: {
        name: initialized?.serverInfo?.name ?? "unknown",
        version: initialized?.serverInfo?.version ?? "unknown",
        protocol_version: initialized?.protocolVersion ?? "2025-06-18",
      },
      tool_count: toolNames.length,
      required_tools: [...REQUIRED_DISCOVERY_TOOLS],
      tool_schema: toolSchema,
      project_binding: projectBinding,
      run_capabilities: runCapabilities,
      design_system_resources: resources,
      probes,
      mutations_performed: false,
    };
  } finally {
    client.close();
  }
}

function normalizeOptions(options = {}) {
  if (!options.command) throw new Error("Open Design MCP command is required");
  const args = options.args ?? [];
  if (!Array.isArray(args) || !args.every((value) => typeof value === "string"))
    throw new Error("Open Design MCP args must be an array of strings");
  return {
    command: options.command,
    args,
    timeoutMs: options.timeoutMs ?? 15_000,
    env: options.env ?? process.env,
  };
}

async function initialize(client) {
  const initialized = await client.request("initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: {
      name: "project-tiny-context-harness-open-design-smoke",
      version: "1.0.0",
    },
  });
  client.notify("notifications/initialized");
  return initialized;
}

async function listTools(client) {
  const listed = await client.request("tools/list");
  return (listed?.tools ?? []).filter(
    (tool) => tool && typeof tool.name === "string",
  );
}

function assertRequiredTools(toolNames) {
  const missing = REQUIRED_DISCOVERY_TOOLS.filter(
    (name) => !toolNames.includes(name),
  );
  if (missing.length > 0)
    throw new Error(
      `Open Design MCP is missing required discovery/commissioning tools: ${missing.join(", ")}`,
    );
}

function fingerprintRelevantToolSchemas(tools) {
  const relevant = tools
    .filter((tool) => REQUIRED_DISCOVERY_TOOLS.includes(tool.name))
    .map((tool) => ({
      name: tool.name,
      input_schema: canonicalizeJson(tool.inputSchema ?? null),
    }))
    .sort((left, right) =>
      left.name < right.name ? -1 : left.name > right.name ? 1 : 0,
    );
  const digest = createHash("sha256")
    .update(JSON.stringify(relevant), "utf8")
    .digest("hex");
  return {
    sha256: `sha256:${digest}`,
    tool_names: relevant.map((tool) => tool.name),
  };
}

function canonicalizeJson(value) {
  if (Array.isArray(value)) return value.map((item) => canonicalizeJson(item));
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalizeJson(value[key])]),
    );
  return value;
}

function inspectRunCapabilities(tools) {
  const startRun = tools.find((tool) => tool.name === "start_run");
  const properties = startRun?.inputSchema?.properties ?? {};
  const inputFields = Object.keys(properties).sort();
  const firstPresent = (candidates) =>
    candidates.find((candidate) => Object.hasOwn(properties, candidate)) ??
    null;
  const reasoningInputs = inputFields.filter((field) =>
    ["reasoning", "reasoningEffort", "reasoning_effort"].includes(field),
  );
  const visualReferenceInputs = inputFields.filter((field) =>
    ["attachments", "imagePaths", "image_paths", "images"].includes(field),
  );
  const promptInput = firstPresent(["prompt"]);
  const requestIdentityInput = firstPresent(["requestId", "request_id"]);
  const primarySkillInput = firstPresent(["skill"]);
  const additionalSkillsInput = firstPresent(["skills"]);
  const agentInput = firstPresent(["agent"]);
  return {
    input_fields: inputFields,
    prompt_input: promptInput,
    request_identity_input: requestIdentityInput,
    primary_skill_input: primarySkillInput,
    additional_skills_input: additionalSkillsInput,
    agent_selection_input: agentInput,
    model_selection_input: firstPresent(["model"]),
    service_tier_input: firstPresent(["serviceTier", "service_tier"]),
    reasoning_control_inputs: reasoningInputs,
    visual_reference_inputs: visualReferenceInputs,
    attributed_agent_run_schema_advertised: Boolean(
      promptInput && requestIdentityInput && agentInput,
    ),
    skill_composition_schema_advertised: Boolean(
      primarySkillInput && additionalSkillsInput,
    ),
    skill_composition_semantics_verified: false,
    direct_visual_reference_transport_advertised:
      visualReferenceInputs.length > 0,
    effective_runtime_provenance_verified: false,
  };
}

function inspectProjectBindingSchema(tools) {
  const createProject = tools.find((tool) => tool.name === "create_project");
  const properties = createProject?.inputSchema?.properties ?? {};
  if (!Object.hasOwn(properties, "designSystem"))
    throw new Error(
      "Open Design MCP create_project is missing the designSystem binding input",
    );
  const getProject = tools.find((tool) => tool.name === "get_project");
  if (!getProject)
    throw new Error(
      "Open Design MCP is missing get_project binding verification",
    );
  return {
    create_project_design_system_input: true,
    get_project_verification_tool: true,
  };
}

async function inspectDesignSystemResources(client) {
  const listed = await client.request("resources/list");
  const templates = await requestOptionalMethod(
    client,
    "resources/templates/list",
  );
  const resources = Array.isArray(listed?.resources) ? listed.resources : [];
  const resourceTemplates = Array.isArray(templates?.resourceTemplates)
    ? templates.resourceTemplates
    : [];
  const concrete = resources.find(
    (resource) =>
      typeof resource?.uri === "string" &&
      resource.uri.startsWith("od://design-systems/") &&
      resource.uri.endsWith("/DESIGN.md"),
  );
  const template = resourceTemplates.find(
    (resource) =>
      typeof resource?.uriTemplate === "string" &&
      resource.uriTemplate.startsWith("od://design-systems/") &&
      resource.uriTemplate.endsWith("/DESIGN.md"),
  );
  if (!concrete && !template)
    throw new Error(
      "Open Design MCP exposes no od://design-systems/<id>/DESIGN.md resource surface",
    );
  let readable = false;
  if (concrete) {
    const result = await client.request("resources/read", {
      uri: concrete.uri,
    });
    readable =
      Array.isArray(result?.contents) &&
      result.contents.some(
        (content) =>
          typeof content?.text === "string" && content.text.trim().length > 0,
      );
    if (!readable)
      throw new Error(
        "Open Design MCP design-system resource returned no readable text",
      );
  }
  return {
    concrete_resource_count: resources.filter(
      (resource) =>
        typeof resource?.uri === "string" &&
        resource.uri.startsWith("od://design-systems/"),
    ).length,
    template_method_supported: templates !== null,
    template_present: Boolean(template),
    sample_read: readable,
  };
}

async function requestOptionalMethod(client, method, params = {}) {
  try {
    return await client.request(method, params);
  } catch (error) {
    if (error?.mcpCode === -32601) return null;
    throw error;
  }
}

async function probeDiscoveryTools(client) {
  const probes = {};
  for (const name of ["list_agents", "list_skills", "list_plugins"]) {
    const result = await client.request("tools/call", { name, arguments: {} });
    if (result?.isError)
      throw new Error(`Open Design MCP ${name} returned isError=true`);
    probes[name] = {
      content_blocks: Array.isArray(result?.content)
        ? result.content.length
        : 0,
      has_structured_content: result?.structuredContent !== undefined,
    };
  }
  return probes;
}

function toMcpError(method, message) {
  const error = new Error(
    `Open Design MCP ${method} failed (${message.error.code ?? "unknown"})`,
  );
  error.mcpCode = message.error.code;
  return error;
}

function parseArgsJson(value) {
  if (!value) return [];
  const parsed = JSON.parse(value);
  if (
    !Array.isArray(parsed) ||
    !parsed.every((item) => typeof item === "string")
  )
    throw new Error(
      "TY_CONTEXT_OPEN_DESIGN_MCP_ARGS_JSON must be a JSON string array",
    );
  return parsed;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const command = process.env.TY_CONTEXT_OPEN_DESIGN_MCP_COMMAND;
  if (!command)
    throw new Error(
      "Set TY_CONTEXT_OPEN_DESIGN_MCP_COMMAND and optional TY_CONTEXT_OPEN_DESIGN_MCP_ARGS_JSON to run the opt-in Open Design discovery smoke",
    );
  const result = await runOpenDesignMcpDiscoverySmoke({
    command,
    args: parseArgsJson(process.env.TY_CONTEXT_OPEN_DESIGN_MCP_ARGS_JSON),
  });
  console.log(JSON.stringify(result, null, 2));
}
