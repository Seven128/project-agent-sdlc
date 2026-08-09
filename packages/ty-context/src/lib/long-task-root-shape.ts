import { parseGlobalCounterfactuals } from "./long-task-acceptance-shape.js";
import { parseCheck } from "./long-task-check-shape.js";
import {
  array,
  boolean,
  key,
  literal,
  object,
  parseApplicableKeyedStatements,
  parseClaimApplicability,
  parseKeyedPaths,
  repositoryFiles,
  string,
  strings,
} from "./long-task-delivery-shape.js";
import type {
  DeliveryContractV2,
  LongTaskRiskFacts,
  RiskFactName,
} from "./long-task-delivery-types.js";
import { EXECUTION_TARGET_CAPABILITIES } from "./execution-target-capabilities.js";

const RISK_FACTS = [
  "public_api_or_schema_change",
  "persistent_data_change",
  "data_migration",
  "security_boundary_change",
  "permission_boundary_change",
  "irreversible_external_effect",
  "critical_user_path",
  "full_population_operation",
  "multi_repository_change",
  "weak_observability",
] as const satisfies readonly RiskFactName[];

export function parseTask(value: unknown): DeliveryContractV2["task"] {
  const row = object(
    value,
    "task",
    [
      "id",
      "title",
      "goal",
      "target_profile",
      "execution_targets",
      "source_paths",
      "context_refs",
    ],
    ["context_snapshot_mode"],
  );
  const targetProfile = object(row.target_profile, "task.target_profile", [
    "key",
    "description",
    "required_state",
    "required_target_refs",
  ]);
  return {
    id: key(row.id, "task.id"),
    title: string(row.title, "task.title"),
    goal: string(row.goal, "task.goal"),
    target_profile: {
      key: key(targetProfile.key, "task.target_profile.key"),
      description: string(
        targetProfile.description,
        "task.target_profile.description",
      ),
      required_state: literal(
        targetProfile.required_state,
        [
          "implementation_complete",
          "target_profile_usable",
          "production_release_ready",
        ] as const,
        "task.target_profile.required_state",
      ),
      required_target_refs: strings(
        targetProfile.required_target_refs,
        "task.target_profile.required_target_refs",
      ).map((item, index) =>
        key(item, `task.target_profile.required_target_refs[${index}]`),
      ),
    },
    execution_targets: array(
      row.execution_targets,
      "task.execution_targets",
    ).map((item, index) => {
      const label = `task.execution_targets[${index}]`;
      const target = object(
        item,
        label,
        [
          "key",
          "description",
          "role",
          "runtime_family",
          "root_entrypoint",
          "capabilities",
        ],
        ["root_argv"],
      );
      return {
        key: key(target.key, `${label}.key`),
        description: string(target.description, `${label}.description`),
        role: literal(
          target.role,
          ["product", "support", "observer"] as const,
          `${label}.role`,
        ),
        runtime_family: literal(
          target.runtime_family,
          [
            "browser",
            "native",
            "desktop",
            "service",
            "process",
            "external",
          ] as const,
          `${label}.runtime_family`,
        ),
        root_entrypoint: string(
          target.root_entrypoint,
          `${label}.root_entrypoint`,
        ),
        ...(Object.hasOwn(target, "root_argv")
          ? {
              root_argv: strings(target.root_argv, `${label}.root_argv`).map(
                (argument, argumentIndex) => {
                  if (argument.includes("\0"))
                    throw new Error(
                      `delivery_contract_invalid:execution_target_root_argv_invalid:${label}:${argumentIndex}`,
                    );
                  return argument;
                },
              ),
            }
          : {}),
        capabilities: strings(target.capabilities, `${label}.capabilities`).map(
          (item, capabilityIndex) =>
            literal(
              item,
              EXECUTION_TARGET_CAPABILITIES,
              `${label}.capabilities[${capabilityIndex}]`,
            ),
        ),
      };
    }),
    source_paths: repositoryFiles(row.source_paths, "task.source_paths"),
    context_refs: repositoryFiles(row.context_refs, "task.context_refs"),
    context_snapshot_mode: Object.hasOwn(row, "context_snapshot_mode")
      ? literal(
          row.context_snapshot_mode,
          ["referenced", "full"] as const,
          "task.context_snapshot_mode",
        )
      : "full",
  };
}

export function parseStages(value: unknown): DeliveryContractV2["stages"] {
  return array(value, "stages").map((item, index) => {
    const label = `stages[${index}]`;
    const row = object(item, label, [
      "key",
      "title",
      "depends_on",
      "gate_outcome",
    ]);
    return {
      key: key(row.key, `${label}.key`),
      title: string(row.title, `${label}.title`),
      depends_on: strings(row.depends_on, `${label}.depends_on`).map(
        (entry, dependencyIndex) =>
          key(entry, `${label}.depends_on[${dependencyIndex}]`),
      ),
      gate_outcome: key(row.gate_outcome, `${label}.gate_outcome`),
    };
  });
}

export function parseRisk(value: unknown): DeliveryContractV2["risk"] {
  const row = object(value, "risk", ["facts"], ["requested_level"]);
  const facts = object(row.facts, "risk.facts", [], [...RISK_FACTS]);
  return {
    requested_level: Object.hasOwn(row, "requested_level")
      ? literal(
          row.requested_level,
          ["auto", "standard", "strict"] as const,
          "risk.requested_level",
        )
      : "auto",
    facts: Object.fromEntries(
      RISK_FACTS.map((name) => [
        name,
        Object.hasOwn(facts, name)
          ? strings(facts[name], `risk.facts.${name}`).map((item, index) =>
              key(item, `risk.facts.${name}[${index}]`),
            )
          : [],
      ]),
    ) as LongTaskRiskFacts,
  };
}

export function parseGlobal(value: unknown): DeliveryContractV2["global"] {
  const row = object(
    value,
    "global",
    [],
    ["applicability", "product", "technical", "acceptance"],
  );
  const product = object(
    Object.hasOwn(row, "product") ? row.product : {},
    "global.product",
    [],
    ["non_goals"],
  );
  const technical = object(
    Object.hasOwn(row, "technical") ? row.technical : {},
    "global.technical",
    [],
    ["constraints", "forbidden_paths", "forbidden_shortcuts"],
  );
  const acceptance = object(
    Object.hasOwn(row, "acceptance") ? row.acceptance : {},
    "global.acceptance",
    [],
    ["checks", "counterfactual_controls", "external_confirmations"],
  );
  return {
    applicability: Object.hasOwn(row, "applicability")
      ? parseClaimApplicability(row.applicability, "global.applicability")
      : [],
    product: {
      non_goals: Object.hasOwn(product, "non_goals")
        ? parseApplicableKeyedStatements(
            product.non_goals,
            "global.product.non_goals",
          )
        : [],
    },
    technical: {
      constraints: Object.hasOwn(technical, "constraints")
        ? parseApplicableKeyedStatements(
            technical.constraints,
            "global.technical.constraints",
          )
        : [],
      forbidden_paths: Object.hasOwn(technical, "forbidden_paths")
        ? parseKeyedPaths(
            technical.forbidden_paths,
            "global.technical.forbidden_paths",
          )
        : [],
      forbidden_shortcuts: Object.hasOwn(technical, "forbidden_shortcuts")
        ? parseApplicableKeyedStatements(
            technical.forbidden_shortcuts,
            "global.technical.forbidden_shortcuts",
          )
        : [],
    },
    acceptance: {
      checks: Object.hasOwn(acceptance, "checks")
        ? array(acceptance.checks, "global.acceptance.checks").map(
            (item, index) =>
              parseCheck(item, `global.acceptance.checks[${index}]`),
          )
        : [],
      counterfactual_controls: Object.hasOwn(
        acceptance,
        "counterfactual_controls",
      )
        ? parseGlobalCounterfactuals(
            acceptance.counterfactual_controls,
            "global.acceptance.counterfactual_controls",
          )
        : [],
      external_confirmations: Object.hasOwn(
        acceptance,
        "external_confirmations",
      )
        ? array(
            acceptance.external_confirmations,
            "global.acceptance.external_confirmations",
          ).map((item, index) => {
            const label = `global.acceptance.external_confirmations[${index}]`;
            const entry = object(item, label, [
              "key",
              "description",
              "owner",
              "kind",
              "impact_claims",
              "blocks_target",
            ]);
            return {
              key: key(entry.key, `${label}.key`),
              description: string(entry.description, `${label}.description`),
              owner: string(entry.owner, `${label}.owner`),
              kind: literal(
                entry.kind,
                [
                  "functional_prerequisite",
                  "field_validation",
                  "production_release_gate",
                  "commercial_activation",
                  "expert_authority",
                ] as const,
                `${label}.kind`,
              ),
              impact_claims: strings(
                entry.impact_claims,
                `${label}.impact_claims`,
              ),
              blocks_target: boolean(
                entry.blocks_target,
                `${label}.blocks_target`,
              ),
            };
          })
        : [],
    },
  };
}
