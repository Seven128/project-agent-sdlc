import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  unlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  counterfactualSandboxProcessExecution,
  createCounterfactualSandbox,
} from "../../packages/ty-context/dist/lib/long-task-counterfactual-sandbox.js";
import {
  prepareCounterfactualExecutionObservationGroup,
  prepareExecutionObservationUniverse,
} from "../../packages/ty-context/dist/lib/long-task-execution-observation.js";
import { rawExecutionGroupMayOverlap } from "../../packages/ty-context/dist/lib/long-task-verifier-execution.js";
import { compileProcessRuntimeClosure } from "../../packages/ty-context/dist/lib/long-task-process-runtime-closure.js";
import {
  canonicalValueJson,
  sha256Hex,
} from "../../packages/ty-context/dist/lib/strict-codec.js";

const regularMode = 0o100644;

test("execution observation freezes every raw group before an earlier runner can prime a later carrier", async () => {
  await withRoot(async (root) => {
    const files = {
      "state/first.json": Buffer.from('{"value":"first"}'),
      "state/second.json": Buffer.from('{"value":"second"}'),
    };
    await writeFixtureFiles(root, files);
    const first = staticCheck("raw:first", "assert:first", "state/first.json");
    const second = staticCheck(
      "raw:second",
      "assert:second",
      "state/second.json",
    );
    const prepared = await prepareExecutionObservationUniverse({
      groups: [[first], [second]],
      snapshot_root: root,
      workspace_manifest: manifest(files),
    });

    // This mutation represents the first group's runner trying to prime a
    // carrier that belongs to a later raw execution.
    await writeFile(
      path.join(root, "state", "second.json"),
      '{"value":"forged"}',
    );
    await prepared[0].finalize(rawExecution());
    const result = await prepared[1].finalize(rawExecution());

    assert.deepEqual(
      result.package_observations.map((entry) => entry.reason),
      ["static_observation_changed_by_runner"],
    );
  });
});

test("process observation rejects cross-group transient input replacement even after the original inode is restored", async () => {
  await withRoot(async (root) => {
    const files = {
      "state/first.json": Buffer.from('{"value":"first"}'),
      "bin/product.mjs": Buffer.from("export default true;\n"),
      "config/runtime.json": Buffer.from('{"mode":"production"}'),
      "config/secondary.json": Buffer.from('{"feature":true}'),
      "product/product-helper.mjs": Buffer.from("export const input = true;\n"),
    };
    await writeFixtureFiles(root, files);
    const first = staticCheck("raw:first", "assert:first", "state/first.json");
    const second = processCheck();
    const prepared = await prepareExecutionObservationUniverse({
      groups: [[first], [second]],
      snapshot_root: root,
      workspace_manifest: manifest(files),
    });
    const carrier = path.join(
      prepared[1].execution_root,
      "config",
      "runtime.json",
    );
    const backup = path.join(
      prepared[1].execution_root,
      "config",
      "runtime.original.json",
    );

    await rename(carrier, backup);
    await writeFile(carrier, '{"mode":"forged"}');
    await prepared[0].finalize(rawExecution());
    await unlink(carrier);
    await rename(backup, carrier);
    const result = await prepared[1].finalize(
      rawExecution([
        validProcessObservation(second.observation_authorities[0]),
      ]),
    );

    assert.equal(result.package_observations.length, 1);
    assert.equal(
      result.package_observations[0].reason,
      "process_observation_input_changed_by_runner",
    );
    assert.equal(result.package_observations[0].observation, null);
  });
});

for (const changedPath of [
  "config/secondary.json",
  "bin/product.mjs",
  "product/product-helper.mjs",
]) {
  test(`process observation rejects post-freeze mutation of ${changedPath}`, async () => {
    await withRoot(async (root) => {
      const files = {
        "bin/product.mjs": Buffer.from("export default true;\n"),
        "config/runtime.json": Buffer.from('{"mode":"production"}'),
        "config/secondary.json": Buffer.from('{"feature":true}'),
        "product/product-helper.mjs": Buffer.from(
          "export const input = true;\n",
        ),
      };
      await writeFixtureFiles(root, files);
      const check = processCheck();
      const [prepared] = await prepareExecutionObservationUniverse({
        groups: [[check]],
        snapshot_root: root,
        workspace_manifest: manifest(files),
      });

      await writeFile(
        path.join(prepared.execution_root, ...changedPath.split("/")),
        Buffer.from(`changed:${changedPath}`),
      );
      const result = await prepared.finalize(
        rawExecution([
          validProcessObservation(check.observation_authorities[0]),
        ]),
      );

      assert.equal(result.package_observations.length, 1);
      assert.equal(
        result.package_observations[0].reason,
        "process_observation_input_changed_by_runner",
      );
      assert.equal(result.package_observations[0].observation, null);
    });
  });
}

test("process observation freezes repository files attributed only by the declared root argv", async () => {
  await withRoot(async (root) => {
    const files = {
      "bin/product.mjs": Buffer.from("export default true;\n"),
      "config/runtime.json": Buffer.from('{"mode":"production"}'),
      "runtime/unlisted-entry.mjs": Buffer.from("export const input = true;\n"),
      "product/product-helper.mjs": Buffer.from(
        "export const helper = true;\n",
      ),
    };
    await writeFixtureFiles(root, files);
    const check = processCheck();
    const rootArgv = [
      "--config=config/runtime.json",
      "runtime/unlisted-entry.mjs",
    ];
    check.runner.argv = rootArgv;
    check.observation_authorities[0].runtime_requirements.declared_root_argv =
      rootArgv;
    refreshProcessRuntimeClosure(check, {
      rootArgv,
      productionFiles: ["config/runtime.json", "runtime/unlisted-entry.mjs"],
    });
    const [prepared] = await prepareExecutionObservationUniverse({
      groups: [[check]],
      snapshot_root: root,
      workspace_manifest: manifest(files),
    });

    await writeFile(
      path.join(prepared.execution_root, "runtime", "unlisted-entry.mjs"),
      "export const input = 'forged';\n",
    );
    const result = await prepared.finalize(
      rawExecution([validProcessObservation(check.observation_authorities[0])]),
    );

    assert.equal(result.package_observations.length, 1);
    assert.equal(
      result.package_observations[0].reason,
      "process_observation_input_changed_by_runner",
    );
    assert.equal(result.package_observations[0].observation, null);
  });
});

test("process observation fails closed when a declared runtime-closure member has no pre-run member", async () => {
  await withRoot(async (root) => {
    const files = {
      "bin/product.mjs": Buffer.from("export default true;\n"),
      "config/runtime.json": Buffer.from('{"mode":"production"}'),
      "product/product-helper.mjs": Buffer.from("export const input = true;\n"),
    };
    await writeFixtureFiles(root, files);
    const check = processCheck({
      rootArgv: ["missing/runtime.json"],
      productionFiles: ["missing/runtime.json"],
      carrierPaths: ["missing/runtime.json"],
      inputPaths: ["missing/**"],
    });
    const [prepared] = await prepareExecutionObservationUniverse({
      groups: [[check]],
      snapshot_root: root,
      workspace_manifest: manifest(files),
    });
    const result = await prepared.finalize(
      rawExecution([validProcessObservation(check.observation_authorities[0])]),
    );

    assert.deepEqual(
      result.package_observations.map((entry) => entry.reason),
      ["process_observation_input_not_in_pre_run_snapshot"],
    );
  });
});

test("process execution snapshot contains only the frozen runtime closure and excludes expected Authority", async () => {
  await withRoot(async (root) => {
    const files = {
      "bin/product.mjs": Buffer.from("export default true;\n"),
      "config/runtime.json": Buffer.from('{"mode":"production"}'),
      "config/secondary.json": Buffer.from('{"feature":true}'),
      "product/product-helper.mjs": Buffer.from("export const input = true;\n"),
      "tests/expected-only.json": Buffer.from('{"expected":"secret"}'),
      "delivery-contract.yaml": Buffer.from("expected: secret\n"),
      "source/expected.json": Buffer.from('{"expected":"secret"}'),
    };
    await writeFixtureFiles(root, files);
    const check = processCheck();
    const [prepared] = await prepareExecutionObservationUniverse({
      groups: [[check]],
      snapshot_root: root,
      workspace_manifest: manifest(files),
      protected_authority_paths: [
        "delivery-contract.yaml",
        "source/expected.json",
      ],
    });

    assert.equal(
      await readFile(
        path.join(prepared.execution_root, "config", "runtime.json"),
        "utf8",
      ),
      '{"mode":"production"}',
    );
    await assert.rejects(
      access(path.join(prepared.execution_root, "delivery-contract.yaml")),
    );
    await assert.rejects(
      access(path.join(prepared.execution_root, "source", "expected.json")),
    );
    await assert.rejects(
      access(path.join(prepared.execution_root, "tests", "expected-only.json")),
    );
    await prepared.dispose();
  });
});

test("process Counterfactual reuses its independently narrowed sandbox without exposing Authority or evidence inputs", async () => {
  await withRoot(async (root) => {
    const files = {
      "bin/product.mjs": Buffer.from("export default true;\n"),
      "config/runtime.json": Buffer.from('{"mode":"production"}'),
      "config/secondary.json": Buffer.from('{"feature":true}'),
      "product/product-helper.mjs": Buffer.from("export const input = true;\n"),
      "tests/expected-only.json": Buffer.from('{"expected":"secret"}'),
      "source/expected.json": Buffer.from('{"expected":"secret"}'),
    };
    await writeFixtureFiles(root, files);
    const check = processCheck();
    check.internal_id = "process-counterfactual";
    check.input_paths.push("tests/**", "source/**");
    const control = {
      mutation: {
        type: "replace_json_value",
        path: "config/runtime.json",
        pointer: "/mode",
        value: "counterfactual",
      },
    };
    const sandbox = await createCounterfactualSandbox(
      root,
      check,
      control,
      ["config/runtime.json"],
      manifest(files),
      ["source/expected.json"],
      [check],
    );
    let processRoot;
    try {
      assert.equal(sandbox.mutation_source_root, sandbox.root);
      const processExecution = counterfactualSandboxProcessExecution(sandbox);
      assert.ok(processExecution);
      processRoot = processExecution.root;
      assert.notEqual(processExecution.root, sandbox.root);
      assert.equal(processExecution.mutation_source_root, root);
      await writeFile(
        path.join(sandbox.root, "config", "runtime.json"),
        '{"mode":"counterfactual"}',
      );
      await writeFile(
        path.join(processExecution.root, "config", "runtime.json"),
        '{"mode":"counterfactual"}',
      );
      await access(path.join(sandbox.root, "source", "expected.json"));
      await access(path.join(sandbox.root, "tests", "expected-only.json"));
      await assert.rejects(
        access(path.join(processExecution.root, "source", "expected.json")),
      );
      await assert.rejects(
        access(path.join(processExecution.root, "tests", "expected-only.json")),
      );
      const prepared = await prepareCounterfactualExecutionObservationGroup({
        checks: [check],
        sandbox,
        workspace_manifest: manifest(files),
        protected_authority_paths: ["source/expected.json"],
      });
      try {
        assert.equal(prepared.execution_root, processExecution.root);
        const result = await prepared.finalize(
          rawExecution([
            validProcessObservation(check.observation_authorities[0]),
          ]),
        );
        assert.equal(result.package_observations.length, 1);
        assert.equal(result.package_observations[0].reason, null);
        await access(
          path.join(processExecution.root, "config", "runtime.json"),
        );
      } finally {
        await prepared.dispose();
      }
    } finally {
      await sandbox.dispose();
    }
    await assert.rejects(access(sandbox.root));
    await assert.rejects(access(processRoot));
  });
});

test("process Counterfactual keeps the isolated-copy fallback for a mutation outside the production closure", async () => {
  await withRoot(async (root) => {
    const files = {
      "bin/product.mjs": Buffer.from("export default true;\n"),
      "config/runtime.json": Buffer.from('{"mode":"production"}'),
      "config/secondary.json": Buffer.from('{"feature":true}'),
      "product/product-helper.mjs": Buffer.from("export const input = true;\n"),
      "tests/expected-only.json": Buffer.from('{"expected":"secret"}'),
    };
    await writeFixtureFiles(root, files);
    const check = processCheck();
    check.internal_id = "process-counterfactual-fallback";
    const sandbox = await createCounterfactualSandbox(
      root,
      check,
      {
        mutation: {
          type: "replace_json_value",
          path: "tests/expected-only.json",
          pointer: "/expected",
          value: "counterfactual",
        },
      },
      ["tests/expected-only.json"],
      manifest(files),
      [],
      [check],
    );
    try {
      assert.equal(sandbox.mutation_source_root, sandbox.root);
      assert.equal(counterfactualSandboxProcessExecution(sandbox), null);
      const prepared = await prepareCounterfactualExecutionObservationGroup({
        checks: [check],
        sandbox,
        workspace_manifest: manifest(files),
      });
      try {
        assert.notEqual(prepared.execution_root, sandbox.root);
        await assert.rejects(
          access(
            path.join(prepared.execution_root, "tests", "expected-only.json"),
          ),
        );
      } finally {
        await prepared.dispose();
      }
    } finally {
      await sandbox.dispose();
    }
  });
});

test("Raw Execution overlap requires one read-only idempotent package-process closure", () => {
  const check = processCheck();
  assert.equal(rawExecutionGroupMayOverlap([check]), true);
  assert.equal(
    rawExecutionGroupMayOverlap([
      { ...check, runner: { ...check.runner, effect: "test_sandbox" } },
    ]),
    false,
  );
  assert.equal(
    rawExecutionGroupMayOverlap([
      {
        ...check,
        environment_requirements: [
          {
            key: "service",
            kind: "loopback_tcp",
            host: "127.0.0.1",
            port: 4318,
            timeout_ms: 1000,
          },
        ],
      },
    ]),
    false,
  );
});

function staticCheck(rawIdentity, assertionRef, artifactPath) {
  return {
    raw_execution_identity: rawIdentity,
    observation_authorities: [
      observationAuthority({
        authority: "package_static_json_exact",
        assertion_ref: assertionRef,
        observation_identity: `observation:${assertionRef}`,
        carrier_paths: [artifactPath],
      }),
    ],
  };
}

function processCheck({
  rootArgv = [
    "--config=config/runtime.json",
    "--secondary=config/secondary.json",
    "product/product-helper.mjs",
  ],
  productionFiles = [
    "config/runtime.json",
    "config/secondary.json",
    "product/product-helper.mjs",
  ],
  carrierPaths = ["config/runtime.json"],
  inputPaths = ["config/**"],
} = {}) {
  const authority = observationAuthority({
    authority: "package_process_json_exact",
    assertion_ref: "assert:process",
    observation_identity: "observation:process",
    carrier_paths: carrierPaths,
  });
  authority.runtime_requirements.declared_root_argv = [...rootArgv];
  const check = {
    key: "process",
    raw_execution_identity: "raw:process",
    input_paths: inputPaths,
    verification_inputs: ["tests/**"],
    expected_output_paths: [],
    artifact_globs: [],
    verification_input_hashes: {},
    environment_requirements: [],
    runner: {
      effect: "read_only",
      idempotent: true,
      retry_policy: "none",
      resolved_target: "bin/product.mjs",
      resolved_cwd: ".",
      executable_argv_prefix: [],
      argv: [...rootArgv],
      frozen_files: {},
    },
    observation_authorities: [authority],
  };
  refreshProcessRuntimeClosure(check, { rootArgv, productionFiles });
  return check;
}

function refreshProcessRuntimeClosure(check, { rootArgv, productionFiles }) {
  const rootTarget = check.runner.resolved_target;
  const runtimeFiles = [
    ...new Set([
      ...productionFiles,
      ...check.observation_authorities.flatMap((authority) =>
        authority.carrier_refs.flatMap((carrier) => carrier.carrier_paths),
      ),
    ]),
  ];
  const carrierPaths = check.observation_authorities.flatMap((authority) =>
    authority.carrier_refs.flatMap((carrier) => carrier.carrier_paths),
  );
  check.runner.argv = [...rootArgv];
  const executionTarget = {
    key: "product",
    description: "The fixture process product root.",
    role: "product",
    runtime_family: "process",
    root_entrypoint: rootTarget,
    root_argv: [...rootArgv],
    capabilities: ["process-runtime", "cold-start", "production-root"],
  };
  check.process_runtime_closure = compileProcessRuntimeClosure({
    check,
    runner: check.runner,
    execution_target: executionTarget,
    observation_authorities: check.observation_authorities,
    production_bindings: [
      scopedBinding("fixture", {
        key: "binding:fixture",
        kind: "file",
        target: carrierPaths[0],
        carrier_paths: carrierPaths,
        existence: carrierPaths[0].startsWith("missing/")
          ? "planned"
          : "existing",
      }),
      ...[rootTarget, ...runtimeFiles]
        .filter((carrierPath) => !carrierPaths.includes(carrierPath))
        .map((carrierPath, index) =>
          scopedBinding("fixture", {
            key: `fixture-production-${index}`,
            kind: "file",
            target: carrierPath,
            carrier_paths: [carrierPath],
            existence: "existing",
          }),
        ),
    ],
    production_owner_paths: [
      "bin/**",
      "config/**",
      "product/**",
      "runtime/**",
      "missing/**",
    ],
    source_backed_execution_target: {
      target_ref: "product",
      canonical_target_ref: "execution_target.product",
      source_claim_key: "fixture-product-target",
      source_item_key: "fixture-product-target",
      source_path: "source.md",
      source_text_sha256: "a".repeat(64),
      target_identity: sha256Hex(canonicalValueJson(executionTarget)),
    },
    protected_authority_paths: ["source.md"],
  });
}

function observationAuthority({
  authority,
  assertion_ref,
  observation_identity,
  carrier_paths,
}) {
  return {
    authority,
    assertion_ref,
    obligation_ref: `obligation:${assertion_ref}`,
    method: "exact_value",
    observation_identity,
    locator_policy: { kind: "fixed_json_pointer", value: "/value" },
    carrier_refs: [{ binding_ref: "fixture.binding:fixture", carrier_paths }],
    runtime_requirements: {
      declared_root_argv: [],
    },
  };
}

function scopedBinding(outcomeKey, binding) {
  return {
    outcome_key: outcomeKey,
    local_key: binding.key,
    binding_ref: `${outcomeKey}.${binding.key}`,
    binding,
  };
}

function validProcessObservation(authority) {
  return {
    authority: authority.authority,
    observation_identity: authority.observation_identity,
    assertion_ref: authority.assertion_ref,
    obligation_ref: authority.obligation_ref,
    method: authority.method,
    raw_value: "production",
    observation: { capability: "fixture" },
    reason: null,
  };
}

function rawExecution(packageObservations = []) {
  return { package_observations: packageObservations };
}

function manifest(files) {
  return {
    repository_root: "fixture",
    git_head: "fixture-head",
    files: Object.entries(files).map(([filePath, bytes]) => ({
      path: filePath,
      mode: regularMode,
      size: bytes.byteLength,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    })),
    fingerprint: {
      head: "fixture-head",
      head_tree: "fixture-tree",
      index_tree: "fixture-tree",
      staged_diff_sha256: "0".repeat(64),
      unstaged_diff_sha256: "0".repeat(64),
      untracked_sha256: "0".repeat(64),
      status_sha256: "0".repeat(64),
      identity: "1".repeat(64),
    },
    snapshot_sha256: "1".repeat(64),
  };
}

async function writeFixtureFiles(root, files) {
  for (const [filePath, bytes] of Object.entries(files)) {
    const absolute = path.join(root, ...filePath.split("/"));
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, bytes);
  }
}

async function withRoot(action) {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "ty-execution-observation-"),
  );
  try {
    await action(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
