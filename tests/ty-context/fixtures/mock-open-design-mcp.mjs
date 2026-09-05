import readline from "node:readline";

const mode = process.env.MOCK_OPEN_DESIGN_MODE ?? "success";
const toolNames = [
  "list_agents",
  "list_skills",
  "list_plugins",
  "create_project",
  "get_project",
  "start_run",
  "get_run",
  "list_files",
  "get_artifact",
];
if (mode === "missing-tool")
  toolNames.splice(toolNames.indexOf("get_artifact"), 1);
if (mode === "reverse-tool-order") toolNames.reverse();
const tools = toolNames.map((name) => ({
  name,
  description: `mock ${name}`,
  inputSchema: inputSchemaFor(name),
}));

function inputSchemaFor(name) {
  if (name === "create_project")
    return {
      type: "object",
      properties: {
        name: { type: "string" },
        ...(mode === "missing-binding"
          ? {}
          : { designSystem: { type: "string" } }),
      },
      required: ["name"],
    };
  if (name === "start_run") {
    const properties = {
      ...(mode === "missing-run-prompt" ? {} : { prompt: { type: "string" } }),
      requestId: { type: "string" },
      skill: { type: "string" },
      skills: { type: "array", items: { type: "string" } },
      agent: { type: "string" },
      model: { type: "string" },
      serviceTier: { type: "string" },
      inputs: { type: "object" },
      ...(mode === "visual-run-schema"
        ? {
            attachments: { type: "array", items: { type: "object" } },
            reasoningEffort: { type: "string" },
          }
        : {}),
    };
    return {
      type: "object",
      properties,
      required:
        mode === "missing-run-prompt" ? ["requestId"] : ["prompt", "requestId"],
    };
  }
  return { type: "object", properties: {} };
}

const lines = readline.createInterface({ input: process.stdin });
lines.on("line", (line) => {
  const message = JSON.parse(line);
  if (message.id === undefined) return;
  if (message.method === "initialize") {
    respond(message.id, {
      protocolVersion: "2025-06-18",
      capabilities: { tools: {} },
      serverInfo: { name: "mock-open-design", version: "0.0.0-test" },
    });
    return;
  }
  if (message.method === "tools/list") {
    respond(message.id, { tools });
    return;
  }
  if (message.method === "resources/list") {
    respond(message.id, {
      resources: [
        {
          uri: "od://design-systems/user:test/DESIGN.md",
          name: "Mock Design System",
          mimeType: "text/markdown",
        },
      ],
    });
    return;
  }
  if (message.method === "resources/templates/list") {
    if (mode === "missing-template-method") {
      process.stdout.write(
        `${JSON.stringify({ jsonrpc: "2.0", id: message.id, error: { code: -32601, message: "method not found" } })}\n`,
      );
      return;
    }
    respond(message.id, {
      resourceTemplates: [
        {
          uriTemplate: "od://design-systems/{id}/DESIGN.md",
          name: "Open Design systems",
          mimeType: "text/markdown",
        },
      ],
    });
    return;
  }
  if (message.method === "resources/read") {
    respond(message.id, {
      contents: [
        {
          uri: message.params?.uri,
          mimeType: "text/markdown",
          text: "# Mock Design System\n",
        },
      ],
    });
    return;
  }
  if (message.method === "tools/call") {
    if (mode === "probe-error" && message.params?.name === "list_skills") {
      respond(message.id, {
        content: [{ type: "text", text: "mock failure" }],
        isError: true,
      });
      return;
    }
    respond(message.id, {
      content: [{ type: "text", text: "[]" }],
      structuredContent: { items: [] },
      isError: false,
    });
    return;
  }
  process.stdout.write(
    `${JSON.stringify({ jsonrpc: "2.0", id: message.id, error: { code: -32601, message: "method not found" } })}\n`,
  );
});

function respond(id, result) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, result })}\n`);
}
