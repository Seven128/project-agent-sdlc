import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runValidator } from "../../packages/ty-context/dist/lib/validators.js";

test("Minimal Context validators accept complete project_context facts", async () => {
  const root = await createContextProject();
  try {
    const contextReport = await runValidator(root, "validate-context");
    assert.deepEqual(contextReport.errors, []);
    assert.match(
      contextReport.info.join("\n"),
      /Minimal Context validation passed/,
    );

    const harnessReport = await runValidator(root, "validate-harness");
    assert.deepEqual(harnessReport.errors, []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("validate-context accepts one exact controlling Source declaration", async () => {
  const root = await createContextProject({
    module: `${completeAreaContext()}\n<!-- ty-context-controlling-source domain="product" path="docs/product-source.md" -->\n`,
    extraFiles: {
      "docs/product-source.md": "# Product Source\n",
    },
  });
  try {
    const report = await runValidator(root, "validate-context");
    assert.deepEqual(report.errors, []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("validate-context fails closed for malformed, invalid, and conflicting controlling Source declarations", async () => {
  const cases = [
    {
      name: "malformed attribute order",
      marker:
        '<!-- ty-context-controlling-source path="docs/product-source.md" domain="product" -->',
      extraFiles: { "docs/product-source.md": "# Product Source\n" },
      expected: /invalid controlling Source declaration/u,
    },
    {
      name: "missing target",
      marker:
        '<!-- ty-context-controlling-source domain="product" path="docs/missing.md" -->',
      extraFiles: {},
      expected: /missing controlling Source/u,
    },
    {
      name: "noncanonical separators",
      marker:
        '<!-- ty-context-controlling-source domain="product" path="docs\\product-source.md" -->',
      extraFiles: { "docs/product-source.md": "# Product Source\n" },
      expected: /invalid controlling Source/u,
    },
  ];

  for (const item of cases) {
    const root = await createContextProject({
      module: `${completeAreaContext()}\n${item.marker}\n`,
      extraFiles: item.extraFiles,
    });
    try {
      const report = await runValidator(root, "validate-context");
      assert.match(report.errors.join("\n"), item.expected, item.name);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }

  const root = await createContextProject({
    module: `${completeAreaContext()}\n<!-- ty-context-controlling-source domain="product" path="docs/product-source.md" -->\n`,
    manifest: `${completeDefaultContextManifest()}\n[[context]]\npath = "project_context/areas/conflict.md"\nrole = "area"\nread_policy = "on-demand"\ntriggers = ["conflict"]\n`,
    extraFiles: {
      "docs/product-source.md": "# Product Source\n",
      "project_context/areas/conflict.md":
        '# Conflict\n<!-- ty-context-controlling-source domain="technical" path="docs/product-source.md" -->\n',
    },
  });
  try {
    const report = await runValidator(root, "validate-context");
    assert.match(report.errors.join("\n"), /domain conflict declarations/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("validate-context ignores code modularity findings and waiver metadata", async () => {
  const root = await createContextGitProject({
    configExtra: `
modularity:
  waivers:
    - path: src/large.ts
      category: hurry
      owner: test-maintainers
      introduced_at: "2026-07-14"
      reason: "Invalid category should not affect validate-context."
      tracking_issue: "TEST-001"
      expiry_condition: "Remove after the validator split."
`,
  });
  try {
    const report = await runValidator(root, "validate-context");
    assert.deepEqual(report.errors, []);
    assert.match(report.info.join("\n"), /Minimal Context validation passed/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("validate-code-modularity reports formatter-only line expansion without failing the regression gate", async () => {
  const root = await createContextGitProject();
  try {
    const report = await runValidator(root, "validate-code-modularity");
    assert.deepEqual(report.errors, []);
    assert.match(
      report.info.join("\n"),
      /code modularity audited=1 warning=0 waived=0 limit=2/,
    );
    assert.match(
      report.info.join("\n"),
      /observed-risk: src\/large\.ts 3 lines/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("validate-harness preserves line-risk reporting without treating formatting as structural regression", async () => {
  const root = await createContextGitProject();
  try {
    const report = await runValidator(root, "validate-harness");
    assert.match(report.info.join("\n"), /Minimal Context validation passed/);
    assert.deepEqual(report.errors, []);
    assert.match(
      report.info.join("\n"),
      /observed-risk: src\/large\.ts 3 lines/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("validate-harness fails when context validation fails", async () => {
  const root = await createContextProject({
    global: `# Project / Delivery Context

## Project Goal

- Ship the package.
`,
  });
  try {
    const report = await runValidator(root, "validate-harness");
    assert.match(report.errors.join("\n"), /Non-goals \/ Boundaries/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("omitted modularity policy behaves as scoped_waivers and allows valid waivers", async () => {
  const root = await createContextGitProject({
    configExtra: `
modularity:
  limit: 2
  waivers:
    - path: src/large.ts
      category: legacy_migration
      owner: test-maintainers
      introduced_at: "2026-07-14"
      reason: "Existing legacy module exceeds the hard source size bound."
      tracking_issue: "TEST-002"
      expiry_condition: "Extract provider adapters and retry policy."
`,
  });
  try {
    const report = await runValidator(root, "validate-code-modularity");
    assert.deepEqual(report.errors, []);
    assert.match(
      report.info.join("\n"),
      /observed-risk: src\/large\.ts 3 lines/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("explicit scoped_waivers policy allows valid waivers", async () => {
  const root = await createContextGitProject({
    configExtra: `
modularity:
  limit: 2
  policy: scoped_waivers
  waivers:
    - path: src/large.ts
      category: legacy_migration
      owner: test-maintainers
      introduced_at: "2026-07-14"
      reason: "Existing legacy module exceeds the hard source size bound."
      tracking_issue: "TEST-003"
      expiry_condition: "Extract provider adapters and retry policy."
`,
  });
  try {
    const report = await runValidator(root, "validate-code-modularity");
    assert.deepEqual(report.errors, []);
    assert.match(
      report.info.join("\n"),
      /observed-risk: src\/large\.ts 3 lines/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("strict_except_generated policy rejects any waiver config", async () => {
  const root = await createContextGitProject({
    configExtra: `
modularity:
  limit: 2
  policy: strict_except_generated
  waivers:
    - path: src/large.ts
      category: legacy_migration
      owner: test-maintainers
      introduced_at: "2026-07-14"
      reason: "Existing legacy module exceeds the hard source size bound."
      tracking_issue: "TEST-004"
      expiry_condition: "Extract provider adapters and retry policy."
`,
  });
  try {
    const report = await runValidator(root, "validate-code-modularity");
    assert.match(
      report.errors.join("\n"),
      /modularity\.waivers is not allowed when modularity\.policy is strict_except_generated/,
    );
    assert.match(
      report.info.join("\n"),
      /observed-risk: src\/large\.ts 3 lines/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("strict_except_generated policy still skips generated touched source", async () => {
  const root = await createContextProject({
    configExtra: `
modularity:
  limit: 1
  policy: strict_except_generated
`,
  });
  try {
    await mkdir(path.join(root, "src"), { recursive: true });
    await writeFile(
      path.join(root, "src", "generated.ts"),
      lines(["// Code generated by tool. DO NOT EDIT.", "one"]),
      "utf8",
    );
    run("git", ["init"], root);
    run("git", ["config", "user.name", "Codex"], root);
    run("git", ["config", "user.email", "codex@example.local"], root);
    run("git", ["add", "."], root);
    run("git", ["commit", "-m", "initial"], root);
    await writeFile(
      path.join(root, "src", "generated.ts"),
      lines(["// Code generated by tool. DO NOT EDIT.", "one", "two", "three"]),
      "utf8",
    );

    const report = await runValidator(root, "validate-code-modularity");
    assert.deepEqual(report.errors, []);
    assert.match(
      report.info.join("\n"),
      /code modularity audited=0 warning=0 waived=0 limit=1/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("unknown modularity policy fails validate-code-modularity and validate-harness", async () => {
  const root = await createContextGitProject({
    configExtra: `
modularity:
  limit: 2
  policy: freestyle
`,
  });
  try {
    const codeReport = await runValidator(root, "validate-code-modularity");
    const harnessReport = await runValidator(root, "validate-harness");
    assert.match(
      codeReport.errors.join("\n"),
      /modularity\.policy must be one of scoped_waivers, strict_except_generated/,
    );
    assert.match(
      harnessReport.errors.join("\n"),
      /modularity\.policy must be one of scoped_waivers, strict_except_generated/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

const malformedModularityWaiverCases = [
  [
    "unknown waiver category",
    `
modularity:
  limit: 2
  waivers:
    - path: src/large.ts
      category: hurry
      owner: test-maintainers
      introduced_at: "2026-07-14"
      reason: "This should not pass."
      tracking_issue: "TEST-005"
      expiry_condition: "Split later."
`,
    /category must be one of/,
  ],
  [
    "missing reason",
    `
modularity:
  limit: 2
  waivers:
    - path: src/large.ts
      category: legacy_migration
      owner: test-maintainers
      introduced_at: "2026-07-14"
      tracking_issue: "TEST-006"
      expiry_condition: "Split later."
`,
    /reason must be a non-empty string/,
  ],
  [
    "missing expiry condition",
    `
modularity:
  limit: 2
  waivers:
    - path: src/large.ts
      category: legacy_migration
      owner: test-maintainers
      introduced_at: "2026-07-14"
      reason: "This should not pass."
      tracking_issue: "TEST-007"
`,
    /expiry_condition must be a non-empty string/,
  ],
  [
    "missing owner",
    `
modularity:
  limit: 2
  waivers:
    - path: src/large.ts
      category: legacy_migration
      introduced_at: "2026-07-14"
      reason: "This should not pass."
      tracking_issue: "TEST-008"
      expiry_condition: "Split later."
`,
    /owner must be a non-empty string/,
  ],
  [
    "invalid introduced date",
    `
modularity:
  limit: 2
  waivers:
    - path: src/large.ts
      category: legacy_migration
      owner: test-maintainers
      introduced_at: "soon"
      reason: "This should not pass."
      tracking_issue: "TEST-009"
      expiry_condition: "Split later."
`,
    /introduced_at must be an ISO YYYY-MM-DD date/,
  ],
  [
    "missing tracking issue",
    `
modularity:
  limit: 2
  waivers:
    - path: src/large.ts
      category: legacy_migration
      owner: test-maintainers
      introduced_at: "2026-07-14"
      reason: "This should not pass."
      expiry_condition: "Split later."
`,
    /tracking_issue must be a non-empty string/,
  ],
  [
    "outside-root path",
    `
modularity:
  limit: 2
  waivers:
    - path: ../outside.ts
      category: legacy_migration
      owner: test-maintainers
      introduced_at: "2026-07-14"
      reason: "This should not pass."
      tracking_issue: "TEST-010"
      expiry_condition: "Split later."
`,
    /path must stay inside the project root/,
  ],
];

test("validate-code-modularity rejects every malformed waiver field", async (t) => {
  const assertMalformedWaiver = async (index) => {
    const [, configExtra, pattern] = malformedModularityWaiverCases[index];
    const root = await createContextGitProject({ configExtra });
    try {
      const report = await runValidator(root, "validate-code-modularity");
      assert.match(report.errors.join("\n"), pattern);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  };
  await t.test("unknown waiver category", () => assertMalformedWaiver(0));
  await t.test("missing reason", () => assertMalformedWaiver(1));
  await t.test("missing expiry condition", () => assertMalformedWaiver(2));
  await t.test("missing owner", () => assertMalformedWaiver(3));
  await t.test("invalid introduced date", () => assertMalformedWaiver(4));
  await t.test("missing tracking issue", () => assertMalformedWaiver(5));
  await t.test("outside-root path", () => assertMalformedWaiver(6));
});

test("validate-context accepts role-based context graph entries", async () => {
  const root = await createContextProject({
    manifest: completeContextManifest(),
    extraFiles: {
      "project_context/areas/main/foundation/trading.md":
        completeFoundationContext(),
      "project_context/areas/main/contracts/order.md":
        completeContractContext(),
      "project_context/areas/main/verification.md":
        completeVerificationContext(),
      "project_context/areas/main/deployment.md": completeDeploymentContext(),
    },
  });
  try {
    const report = await runValidator(root, "validate-context");
    assert.deepEqual(report.errors, []);
    assert.match(
      report.info.join("\n"),
      /loaded project_context\/context\.toml with 1 area\(s\) and 4 context node\(s\)/,
    );
    assert.match(report.info.join("\n"), /context graph file\(s\)/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("validate-context treats context roles as semantic labels", async () => {
  const root = await createContextProject({
    manifest: completeContextManifest(),
    module: `# Main Area

This compact area context is intentionally not forced into a section template.
`,
    extraFiles: {
      "project_context/areas/main/foundation/trading.md": `---
context_role: foundation
read_policy: optional
---
# Trading Foundation

## Role

- Define trading vocabulary.

## Use When

- Extending trading concepts.

## Do Not Use For

- Routine UI edits.

## Source Body

- Source assertions live here.
`,
      "project_context/areas/main/contracts/order.md":
        completeContractContext(),
      "project_context/areas/main/verification.md": `---
context_role: verification
read_policy: default
---
# Verification

## Verification Paths

- npm test
`,
      "project_context/areas/main/deployment.md": `---
context_role: deployment
read_policy: on-demand
---
# Deployment

## Deployment Paths

- docker compose config
`,
    },
  });
  try {
    const report = await runValidator(root, "validate-context");
    assert.deepEqual(report.errors, []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("validate-context rejects missing Schema v4 context graph manifest", async () => {
  const root = await createContextProject({ manifest: null });
  try {
    const report = await runValidator(root, "validate-context");
    assert.match(
      report.errors.join("\n"),
      /project_context\/context\.toml is missing/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("validate-context rejects unsupported future schema versions", async () => {
  const root = await createContextProject({ schemaVersion: "5" });
  try {
    const report = await runValidator(root, "validate-context");
    assert.match(
      report.errors.join("\n"),
      /unsupported Harness schema version 5/,
    );
    assert.match(
      report.errors.join("\n"),
      /npx --yes --package project-tiny-context-harness@latest ty-context validate-context/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("validate-context rejects invalid context graph metadata", async () => {
  const root = await createContextProject({
    manifest: `[[areas]]
id = "main"
root = "."
context = "project_context/areas/main.md"
kind = "app"
default = true
forbidden_runtime_dependencies = "domains/intelhub"

[[context]]
path = "project_context/areas/main/foundation/trading.md"
role = "glossary"
read_policy = "sometimes"
triggers = ["trading"]
`,
    extraFiles: {
      "project_context/areas/main/foundation/trading.md":
        completeFoundationContext(),
    },
  });
  try {
    const report = await runValidator(root, "validate-context");
    const errors = report.errors.join("\n");
    assert.match(errors, /forbidden_runtime_dependencies/);
    assert.match(errors, /unsupported context role: glossary/);
    assert.match(errors, /unsupported read_policy: sometimes/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

const unsupportedProductSurfaceRoles = [
  "surface-contract",
  "product-surface",
  "web-contract",
  "app-contract",
  "game-surface",
];

test("validate-context rejects every unsupported Product Surface role", async (t) => {
  const assertUnsupportedRole = async (role) => {
    const root = await createContextProject({
      manifest: `[[areas]]
id = "main"
root = "."
context = "project_context/areas/main.md"
kind = "app"
default = true

[[context]]
path = "project_context/areas/product-surface-contracts.md"
role = "${role}"
`,
      extraFiles: {
        "project_context/areas/product-surface-contracts.md":
          "# Product Surface Contract\n",
      },
    });
    try {
      const report = await runValidator(root, "validate-context");
      assert.match(
        report.errors.join("\n"),
        new RegExp(`unsupported context role: ${role}`),
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  };
  await t.test("surface-contract", () =>
    assertUnsupportedRole("surface-contract"),
  );
  await t.test("product-surface", () =>
    assertUnsupportedRole("product-surface"),
  );
  await t.test("web-contract", () => assertUnsupportedRole("web-contract"));
  await t.test("app-contract", () => assertUnsupportedRole("app-contract"));
  await t.test("game-surface", () => assertUnsupportedRole("game-surface"));
});

test("validate-context rejects export artifacts registered in context graph", async () => {
  const root = await createContextProject({
    manifest: `[[areas]]
id = "main"
root = "."
context = "project_context/areas/main.md"
kind = "app"
default = true

[[context]]
path = "project_context/当前项目context-20260607T080910Z.md"
role = "archive"
`,
    extraFiles: {
      "project_context/当前项目context-20260607T080910Z.md": "# Export\n",
    },
  });
  try {
    const report = await runValidator(root, "validate-context");
    assert.match(report.errors.join("\n"), /temporary export artifact/);
    assert.match(report.errors.join("\n"), /tmp\/ty-context\/context-exports/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("validate-context rejects export artifacts registered as implementation-index", async () => {
  const root = await createContextProject({
    manifest: `[[areas]]
id = "main"
root = "."
context = "project_context/areas/main.md"
kind = "app"
default = true

[[context]]
path = "project_context/code-level-implementation-20260607T080910Z.md"
role = "implementation-index"
`,
    extraFiles: {
      "project_context/code-level-implementation-20260607T080910Z.md":
        "# Bundle\n",
    },
  });
  try {
    const report = await runValidator(root, "validate-context");
    assert.match(
      report.errors.join("\n"),
      /must not reference temporary export artifact/,
    );
    assert.match(report.errors.join("\n"), /implementation-index/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("validate-context rejects missing required recovery facts", async () => {
  const root = await createContextProject({
    global: `# Project / Delivery Context

## Project Goal

- Ship the package.

## Verification Entry Points

- npm test
`,
  });
  try {
    const report = await runValidator(root, "validate-context");
    assert.match(report.errors.join("\n"), /Non-goals \/ Boundaries/);
    assert.match(report.errors.join("\n"), /Next Safe Action/);
    assert.match(report.errors.join("\n"), /Context Index/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("validate-context rejects verification-result claims inside context", async () => {
  const root = await createContextProject({
    global: completeGlobalContext().replace("- npm test", "- npm test passed"),
  });
  try {
    const report = await runValidator(root, "validate-context");
    assert.match(
      report.errors.join("\n"),
      /must list verification entry points/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("validate-context accepts durable verification path context without execution claims", async () => {
  const root = await createContextProject({
    global: completeGlobalContext().replace(
      "- npm test\n- make validate-context",
      [
        "- Bridge smoke: prepare local runtime env, start the mock provider, and publish the fixture through the bridge publisher.",
        "- Command: `node scripts/provider-smoke.mjs --fixture local`.",
        "- Expected signal: receiver reaches queued stage and status output names mock-provider mode.",
        "- Acceptable warning: local self-signed TLS warning from the mock endpoint.",
        "- Excluded dead end: do not retry the live provider path without an operator session.",
      ].join("\n"),
    ),
  });
  try {
    const report = await runValidator(root, "validate-context");
    assert.deepEqual(report.errors, []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("validate-context rejects verification-result claims inside architecture context", async () => {
  const root = await createContextProject({
    architecture: completeArchitectureContext().replace(
      "- npm test --workspace project-tiny-context-harness",
      "- npm test passed",
    ),
  });
  try {
    const report = await runValidator(root, "validate-context");
    assert.match(
      report.errors.join("\n"),
      /must list verification entry points/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("validate-context rejects deployment-result claims inside deployment context", async () => {
  const root = await createContextProject({
    manifest: `[[areas]]
id = "main"
root = "."
context = "project_context/areas/main.md"
kind = "app"
default = true

[[context]]
path = "project_context/areas/main/deployment.md"
role = "deployment"
`,
    extraFiles: {
      "project_context/areas/main/deployment.md":
        completeDeploymentContext().replace(
          "- docker compose config",
          "- deployed successfully",
        ),
    },
  });
  try {
    const report = await runValidator(root, "validate-context");
    assert.match(
      report.errors.join("\n"),
      /must list verification entry points/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("old stage validators are not supported by Minimal Context Harness", async () => {
  const root = await createContextProject();
  try {
    const report = await runValidator(root, "validate-dev");
    assert.deepEqual(report.info, []);
    assert.match(report.errors.join("\n"), /unknown validator: validate-dev/);
    assert.match(
      report.errors.join("\n"),
      /Minimal Context Harness supports validate-context, validate-code-modularity and validate-harness only/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function createContextProject(overrides = {}) {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "ty-context-context-validator-"),
  );
  await mkdir(path.join(root, ".agent", "ty-context-managed"), {
    recursive: true,
  });
  await mkdir(path.join(root, "project_context", "areas"), { recursive: true });
  await writeFile(
    path.join(root, ".agent", "config.yaml"),
    `core:
  package: project-tiny-context-harness
  schema_version: "${overrides.schemaVersion ?? "4"}"
${overrides.configExtra ?? ""}
`,
    "utf8",
  );
  await writeFile(
    path.join(root, "project_context", "global.md"),
    overrides.global ?? completeGlobalContext(),
    "utf8",
  );
  await writeFile(
    path.join(root, "project_context", "architecture.md"),
    overrides.architecture ?? completeArchitectureContext(),
    "utf8",
  );
  await writeFile(
    path.join(root, "project_context", "areas", "main.md"),
    overrides.module ?? completeAreaContext(),
    "utf8",
  );
  const manifest =
    overrides.manifest === undefined
      ? completeDefaultContextManifest()
      : overrides.manifest;
  if (manifest !== null) {
    await writeFile(
      path.join(root, "project_context", "context.toml"),
      manifest,
      "utf8",
    );
  }
  for (const [relative, content] of Object.entries(
    overrides.extraFiles ?? {},
  )) {
    const target = path.join(root, ...relative.split("/"));
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content, "utf8");
  }
  return root;
}

async function createContextGitProject(overrides = {}) {
  const root = await createContextProject({
    ...overrides,
    configExtra:
      overrides.configExtra ??
      `
modularity:
  limit: 2
`,
  });
  await mkdir(path.join(root, "src"), { recursive: true });
  await writeFile(
    path.join(root, "src", "large.ts"),
    lines(["one", "two"]),
    "utf8",
  );
  run("git", ["init"], root);
  run("git", ["config", "user.name", "Codex"], root);
  run("git", ["config", "user.email", "codex@example.local"], root);
  run("git", ["add", "."], root);
  run("git", ["commit", "-m", "initial"], root);
  await writeFile(
    path.join(root, "src", "large.ts"),
    lines(["one", "two", "three"]),
    "utf8",
  );
  return root;
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  return result;
}

function lines(values) {
  return `${values.join("\n")}\n`;
}

function completeGlobalContext() {
  return `# Project / Delivery Context

## Project Goal

- Maintain a Minimal Context Harness package.

## Non-goals / Boundaries

- Do not replace product tests or project-specific quality gates.

## Background

- The package keeps the smallest durable context a fresh agent needs.

## Design Rationale

- Context quality is the Harness responsibility; product quality remains with project tests.

## Architecture Context

- See project_context/architecture.md for the restrained architecture context.

## Verification Entry Points

- npm test
- make validate-context

## Current State

- Minimal Context files are the canonical long-lived fact source.

## Next Safe Action

- Read project_context/global.md, then the affected area context before changing code.

## Context Index

- [main](areas/main.md)
`;
}

function completeArchitectureContext() {
  return `# Architecture Context

## System Boundary

- The package owns CLI commands, managed assets, sync behavior and Context validation.

## Component Map

- CLI commands call library modules for init, sync, upgrade, doctor and validation.

## Data / Control Flow

- Users run the CLI; the package reads configuration, writes managed assets and validates project_context files.

## Design Rationale

- Architecture context stays minimal and records only durable boundaries that are hard to infer from code.

## Constraints And Tradeoffs

- The Harness keeps context quality small and does not own project product quality.

## Verification Implications

- npm test --workspace project-tiny-context-harness

## Open Risks

- Package assets can drift if source sync is skipped.
`;
}

function completeAreaContext() {
  return `# Area Context: main

## Responsibility

- Keep package initialization, sync, migration and validation behavior coherent.

## User / System Contract

- Users can initialize, sync, validate and migrate context explicitly.

## Core Data / API / State

- project_context/global.md, project_context/context.toml and project_context/areas/**/*.md are the durable facts.

## Key Constraints

- The Harness validates context recoverability, not product behavior.

## Code Entry Points

- packages/ty-context/src/

## Test Entry Points

- npm test --workspace project-tiny-context-harness

## Open Risks

- Context could become too verbose if architecture notes duplicate implementation details.
`;
}

function completeContextManifest() {
  return `[[areas]]
id = "main"
root = "."
context = "project_context/areas/main.md"
kind = "app"
default = true

[[context]]
path = "project_context/areas/main/foundation/trading.md"
role = "foundation"
read_policy = "optional"
triggers = ["trading", "foundation"]

[[context]]
path = "project_context/areas/main/contracts/order.md"
role = "contract"
triggers = ["order", "contract", "compatibility"]

[[context]]
path = "project_context/areas/main/verification.md"
role = "verification"
read_policy = "default"
triggers = ["test", "verify", "verification", "smoke", "ci"]

[[context]]
path = "project_context/areas/main/deployment.md"
role = "deployment"
read_policy = "on-demand"
triggers = ["deploy", "deployment", "runtime", "cloud", "docker"]
`;
}

function completeDefaultContextManifest() {
  return `[[areas]]
id = "main"
root = "."
context = "project_context/areas/main.md"
kind = "app"
default = true
`;
}

function completeFoundationContext() {
  return `---
context_role: foundation
read_policy: optional
---
# Trading Foundation

## Role

- Define durable trading vocabulary and conceptual assertions.

## Use When

- Extending or calibrating trading concepts.

## Do Not Use For

- Routine implementation work that only needs code entry points.

## Derived Contracts

- Area contexts must not treat these concepts as product test evidence.

## Source Body

- Foundational assertions live here as source material for future contracts.
`;
}

function completeContractContext() {
  return `---
context_role: contract
---
# Order Contract

## Producer

- The order service produces normalized order payloads.

## Consumer

- UI and reporting modules consume order payloads.

## Schema/Shape

- The payload contains id, status and timestamps.

## Compatibility

- Additive fields are allowed; renaming existing fields requires migration.

## Tests

- npm test --workspace project-tiny-context-harness
`;
}

function completeVerificationContext() {
  return `---
context_role: verification
read_policy: default
---
# Verification

## Verification Paths

- npm test

## Required Preparation

- No special setup.

## Expected Signals

- Test runner reaches completion.
`;
}

function completeDeploymentContext() {
  return `---
context_role: deployment
read_policy: on-demand
---
# Deployment

## Deployment Paths

- docker compose config

## Required Preparation

- Docker Compose file is present.

## Expected Signals

- Compose config renders services.
`;
}
