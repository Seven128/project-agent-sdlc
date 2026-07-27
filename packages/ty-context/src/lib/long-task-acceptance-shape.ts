import type {
  CounterfactualControlV2,
  EnvironmentRequirementV2,
  GlobalCounterfactualControlV2,
  PopulationRequirementV2,
} from "./long-task-delivery-types.js";
import { parseKeyedStatements } from "./long-task-product-shape.js";
import {
  array,
  fail,
  key,
  literal,
  object,
  repositoryFile,
  repositoryFiles,
  string,
  strings,
} from "./long-task-shape-primitives.js";

export function parseCounterfactuals(
  value: unknown,
  label: string,
): CounterfactualControlV2[] {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = object(
      item,
      itemLabel,
      [
        "key",
        "binding_key",
        "claims",
        "check_key",
        "mutation",
        "expected_assertion_failures",
      ],
      ["preserved_assertions"],
    );
    const mutation = object(
      row.mutation,
      `${itemLabel}.mutation`,
      ["type"],
      ["paths", "path", "fixture_path"],
    );
    const type = literal(
      mutation.type,
      ["remove_paths", "replace_file"] as const,
      `${itemLabel}.mutation.type`,
    );
    return {
      key: key(row.key, `${itemLabel}.key`),
      binding_key: key(row.binding_key, `${itemLabel}.binding_key`),
      claims: strings(row.claims, `${itemLabel}.claims`),
      check_key: key(row.check_key, `${itemLabel}.check_key`),
      mutation:
        type === "remove_paths"
          ? {
              type,
              paths: repositoryFiles(
                mutation.paths,
                `${itemLabel}.mutation.paths`,
              ),
            }
          : {
              type,
              path: repositoryFile(mutation.path, `${itemLabel}.mutation.path`),
              fixture_path: repositoryFile(
                mutation.fixture_path,
                `${itemLabel}.mutation.fixture_path`,
              ),
            },
      expected_assertion_failures: strings(
        row.expected_assertion_failures,
        `${itemLabel}.expected_assertion_failures`,
      ).map((item, assertionIndex) =>
        key(
          item,
          `${itemLabel}.expected_assertion_failures[${assertionIndex}]`,
        ),
      ),
      preserved_assertions: Object.hasOwn(row, "preserved_assertions")
        ? strings(
            row.preserved_assertions,
            `${itemLabel}.preserved_assertions`,
          ).map((item, assertionIndex) =>
            key(item, `${itemLabel}.preserved_assertions[${assertionIndex}]`),
          )
        : [],
    };
  });
}

export function parseGlobalCounterfactuals(
  value: unknown,
  label: string,
): GlobalCounterfactualControlV2[] {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = object(
      item,
      itemLabel,
      [
        "key",
        "binding_ref",
        "claims",
        "check_key",
        "mutation",
        "expected_assertion_failures",
      ],
      ["preserved_assertions"],
    );
    const bindingRef = string(row.binding_ref, `${itemLabel}.binding_ref`);
    if (!/^[a-z0-9][a-z0-9-]*\.[a-z0-9][a-z0-9-]*$/u.test(bindingRef))
      fail(`${itemLabel}.binding_ref`, "must be <outcome-key>.<binding-key>");
    const claims = strings(row.claims, `${itemLabel}.claims`);
    if (!claims.length) fail(`${itemLabel}.claims`, "must not be empty");
    const failures = strings(
      row.expected_assertion_failures,
      `${itemLabel}.expected_assertion_failures`,
    ).map((entry, assertionIndex) =>
      key(entry, `${itemLabel}.expected_assertion_failures[${assertionIndex}]`),
    );
    if (!failures.length)
      fail(`${itemLabel}.expected_assertion_failures`, "must not be empty");
    return {
      key: key(row.key, `${itemLabel}.key`),
      binding_ref: bindingRef,
      claims,
      check_key: key(row.check_key, `${itemLabel}.check_key`),
      mutation: parseCounterfactualMutation(
        row.mutation,
        `${itemLabel}.mutation`,
      ),
      expected_assertion_failures: failures,
      preserved_assertions: Object.hasOwn(row, "preserved_assertions")
        ? strings(
            row.preserved_assertions,
            `${itemLabel}.preserved_assertions`,
          ).map((entry, assertionIndex) =>
            key(entry, `${itemLabel}.preserved_assertions[${assertionIndex}]`),
          )
        : [],
    };
  });
}

function parseCounterfactualMutation(
  value: unknown,
  label: string,
): CounterfactualControlV2["mutation"] {
  const mutation = object(
    value,
    label,
    ["type"],
    ["paths", "path", "fixture_path"],
  );
  const type = literal(
    mutation.type,
    ["remove_paths", "replace_file"] as const,
    `${label}.type`,
  );
  return type === "remove_paths"
    ? {
        type,
        paths: repositoryFiles(mutation.paths, `${label}.paths`),
      }
    : {
        type,
        path: repositoryFile(mutation.path, `${label}.path`),
        fixture_path: repositoryFile(
          mutation.fixture_path,
          `${label}.fixture_path`,
        ),
      };
}

export function parsePopulation(
  value: unknown,
  label: string,
): PopulationRequirementV2 {
  const row = object(value, label, [
    "check_key",
    "claims",
    "observations",
    "exclusion_rules",
  ]);
  const observations = object(row.observations, `${label}.observations`, [
    "eligible_ids",
    "observed_ids",
    "excluded_items",
  ]);
  return {
    check_key: key(row.check_key, `${label}.check_key`),
    claims: strings(row.claims, `${label}.claims`),
    observations: {
      eligible_ids: string(
        observations.eligible_ids,
        `${label}.observations.eligible_ids`,
      ),
      observed_ids: string(
        observations.observed_ids,
        `${label}.observations.observed_ids`,
      ),
      excluded_items: string(
        observations.excluded_items,
        `${label}.observations.excluded_items`,
      ),
    },
    exclusion_rules: parseKeyedStatements(
      row.exclusion_rules,
      `${label}.exclusion_rules`,
    ),
  };
}

export function parseEnvironmentRequirements(
  value: unknown,
  label: string,
): EnvironmentRequirementV2[] {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const base = object(
      item,
      itemLabel,
      ["key", "kind"],
      ["target", "host", "port", "timeout_ms"],
    );
    const kindValue = literal(
      base.kind,
      ["executable", "file", "directory", "env_var", "loopback_tcp"] as const,
      `${itemLabel}.kind`,
    );
    const requirementKey = key(base.key, `${itemLabel}.key`);
    if (kindValue !== "loopback_tcp")
      return {
        key: requirementKey,
        kind: kindValue,
        target:
          kindValue === "file" || kindValue === "directory"
            ? repositoryFile(base.target, `${itemLabel}.target`)
            : string(base.target, `${itemLabel}.target`),
      } as EnvironmentRequirementV2;
    const host = literal(
      base.host,
      ["127.0.0.1", "::1", "localhost"] as const,
      `${itemLabel}.host`,
    );
    const port = Number(base.port);
    const timeout = Number(base.timeout_ms);
    if (!Number.isInteger(port) || port < 1 || port > 65535)
      fail(`${itemLabel}.port`, "must be an integer from 1 to 65535");
    if (!Number.isInteger(timeout) || timeout < 10 || timeout > 60_000)
      fail(`${itemLabel}.timeout_ms`, "must be an integer from 10 to 60000");
    return {
      key: requirementKey,
      kind: kindValue,
      host,
      port,
      timeout_ms: timeout,
    };
  });
}
