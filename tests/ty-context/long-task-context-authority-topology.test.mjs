import assert from "node:assert/strict";
import test from "node:test";
import { contextAuthorityTopologyHash } from "../../packages/ty-context/dist/lib/long-task-context-authority-topology.js";

const SELECTED = [
  "project_context/context.toml",
  "project_context/global.md",
  "project_context/architecture.md",
  "project_context/areas/main.md",
  "project_context/areas/main/verification.md",
  "project_context/areas/main/implementation-index.md",
];

function manifest() {
  return {
    areas: [
      {
        line: 1,
        id: "main",
        root: "packages/app",
        context: "project_context/areas/main.md",
        kind: "app",
        default: true,
        forbidden_runtime_dependencies: ["legacy/**"],
      },
      {
        line: 8,
        id: "other",
        root: "packages/other",
        context: "project_context/areas/other.md",
        kind: "service",
        default: false,
        forbidden_runtime_dependencies: [],
      },
    ],
    contexts: [
      {
        line: 20,
        path: "project_context/areas/main/verification.md",
        role: "verification",
        read_when: "Tests or verification change.",
        read_policy: "on-demand",
        triggers: ["test", "verify"],
        default_children: [
          "project_context/areas/main/implementation-index.md",
        ],
      },
      {
        line: 30,
        path: "project_context/areas/main/implementation-index.md",
        role: "implementation-index",
        read_policy: "on-demand",
        triggers: ["entry point"],
        default_children: [],
      },
      {
        line: 40,
        path: "project_context/areas/other/contract.md",
        role: "contract",
        read_policy: "on-demand",
        triggers: ["other contract"],
        default_children: [],
      },
    ],
  };
}

function clone(value) {
  return structuredClone(value);
}

test("retrieval-only Context metadata does not revise selected authority topology", () => {
  const base = manifest();
  const retrievalEdit = clone(base);
  retrievalEdit.areas[0].default = false;
  retrievalEdit.contexts[0].line = 999;
  retrievalEdit.contexts[0].read_when = "Different model-facing guidance.";
  retrievalEdit.contexts[0].read_policy = "default";
  retrievalEdit.contexts[0].triggers = ["ci", "verification", "test"];
  retrievalEdit.contexts[1].triggers = ["navigation", "source entry"];

  assert.equal(
    contextAuthorityTopologyHash(retrievalEdit, SELECTED),
    contextAuthorityTopologyHash(base, SELECTED),
  );
});

test("unselected Context structure does not revise the active authority topology", () => {
  const base = manifest();
  const unrelatedEdit = clone(base);
  unrelatedEdit.areas[1].root = "packages/renamed-other";
  unrelatedEdit.contexts[2].role = "foundation";
  unrelatedEdit.contexts[2].default_children = [
    "project_context/areas/other/archive.md",
  ];

  assert.equal(
    contextAuthorityTopologyHash(unrelatedEdit, SELECTED),
    contextAuthorityTopologyHash(base, SELECTED),
  );
});

test("selected authority-bearing Context topology changes remain hash-visible", () => {
  const baseHash = contextAuthorityTopologyHash(manifest(), SELECTED);
  const cases = [
    (value) => {
      value.areas[0].root = "packages/renamed-app";
    },
    (value) => {
      value.areas[0].context = "project_context/areas/renamed.md";
    },
    (value) => {
      value.areas[0].forbidden_runtime_dependencies = ["forbidden/**"];
    },
    (value) => {
      value.contexts[0].role = "implementation-index";
    },
    (value) => {
      value.contexts[0].default_children = [];
    },
    (value) => {
      value.contexts[0].path = "project_context/areas/main/deployment.md";
    },
  ];

  for (const mutate of cases) {
    const changed = manifest();
    mutate(changed);
    assert.notEqual(contextAuthorityTopologyHash(changed, SELECTED), baseHash);
  }
});

test("authority topology is stable under ordering and path separators", () => {
  const base = manifest();
  const reordered = clone(base);
  reordered.areas[0].forbidden_runtime_dependencies.reverse();
  reordered.areas.reverse();
  reordered.contexts.reverse();
  reordered.contexts[2].default_children = [
    "project_context\\areas\\main\\implementation-index.md",
  ];
  reordered.contexts[2].path = "project_context\\areas\\main\\verification.md";
  reordered.contexts[1].path =
    "project_context\\areas\\main\\implementation-index.md";

  assert.equal(
    contextAuthorityTopologyHash(reordered, SELECTED),
    contextAuthorityTopologyHash(base, SELECTED),
  );
});

test("authority topology canonicalizes NFC-equivalent Area ids and Context paths", () => {
  const decomposedArea = "Cafe\u0301";
  const composedArea = decomposedArea.normalize("NFC");
  const decomposedContext = "project_context/areas/Cafe\u0301/verification.md";
  const composedContext = decomposedContext.normalize("NFC");
  const decomposedChild = "project_context/areas/Cafe\u0301/rules.md";
  const composedChild = decomposedChild.normalize("NFC");
  const makeManifest = (areaId, contextPath, childPath) => ({
    areas: [
      {
        line: 1,
        id: areaId,
        root: ".",
        context: contextPath,
        kind: "repository",
        default: true,
        forbidden_runtime_dependencies: [],
      },
    ],
    contexts: [
      {
        line: 8,
        path: contextPath,
        role: "verification",
        read_policy: "default",
        triggers: [],
        default_children: [childPath],
      },
      {
        line: 14,
        path: childPath,
        role: "contract",
        read_policy: "on-demand",
        triggers: [],
        default_children: [],
      },
    ],
  });

  assert.equal(
    contextAuthorityTopologyHash(
      makeManifest(decomposedArea, decomposedContext, decomposedChild),
      [composedContext, composedChild],
    ),
    contextAuthorityTopologyHash(
      makeManifest(composedArea, composedContext, composedChild),
      [composedContext, composedChild],
    ),
  );
});
