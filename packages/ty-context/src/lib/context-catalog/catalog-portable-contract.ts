import { createRequire } from "node:module";

export type ContextRole =
  | "global"
  | "architecture"
  | "area"
  | "domain"
  | "subdomain"
  | "foundation"
  | "archive"
  | "contract"
  | "verification"
  | "deployment"
  | "implementation-index"
  | "decision-rationale";

interface ContextRulesFile {
  context_schema_version: number;
  roles: string[];
  role_aliases: Record<string, string>;
  read_policies: string[];
  legacy_read_policies: string[];
  top_level_fields: string[];
  area_fields: string[];
  context_fields: string[];
}

const require = createRequire(import.meta.url);
const rawRules = require("../../../assets/tools/context_rules.json") as unknown;
const rules = validateRules(rawRules);

export const CONTEXT_SCHEMA_VERSION = rules.context_schema_version;
export const CONTEXT_ROLES = Object.freeze([...rules.roles]);
export const CONTEXT_ROLE_ALIASES = Object.freeze({
  ...rules.role_aliases,
});
export const CONTEXT_READ_POLICIES = Object.freeze([...rules.read_policies]);
export const CONTEXT_LEGACY_READ_POLICIES = Object.freeze([
  ...rules.legacy_read_policies,
]);
export const CONTEXT_TOP_LEVEL_FIELDS = new Set(rules.top_level_fields);
export const CONTEXT_AREA_FIELDS = new Set(rules.area_fields);
export const CONTEXT_NODE_FIELDS = new Set(rules.context_fields);
export const CONTEXT_READ_POLICY_SET = new Set(CONTEXT_READ_POLICIES);
export const CONTEXT_LEGACY_READ_POLICY_SET = new Set(
  CONTEXT_LEGACY_READ_POLICIES,
);

export function normalizeContextRole(value: string): ContextRole | undefined {
  const normalized = value.trim().toLowerCase();
  const aliased = CONTEXT_ROLE_ALIASES[normalized] ?? normalized;
  return CONTEXT_ROLES.includes(aliased) ? (aliased as ContextRole) : undefined;
}

export function isContextReadPolicy(value: string): boolean {
  return CONTEXT_READ_POLICY_SET.has(value);
}

function validateRules(value: unknown): ContextRulesFile {
  if (!isRecord(value)) {
    throw new Error("context_rules_invalid:root");
  }
  const arrayFields = [
    "roles",
    "read_policies",
    "legacy_read_policies",
    "top_level_fields",
    "area_fields",
    "context_fields",
  ] as const;
  for (const field of arrayFields) {
    if (!isUniqueStringArray(value[field])) {
      throw new Error(`context_rules_invalid:${field}`);
    }
  }
  if (
    !Number.isInteger(value.context_schema_version) ||
    Number(value.context_schema_version) < 1
  ) {
    throw new Error("context_rules_invalid:context_schema_version");
  }
  if (
    !isRecord(value.role_aliases) ||
    Object.values(value.role_aliases).some(
      (entry) => typeof entry !== "string" || !entry.trim(),
    )
  ) {
    throw new Error("context_rules_invalid:role_aliases");
  }
  const typed = value as unknown as ContextRulesFile;
  if (
    typed.legacy_read_policies.some(
      (policy) => !typed.read_policies.includes(policy),
    )
  ) {
    throw new Error("context_rules_invalid:legacy_read_policies_subset");
  }
  if (
    Object.values(typed.role_aliases).some(
      (role) => !typed.roles.includes(role),
    )
  ) {
    throw new Error("context_rules_invalid:role_alias_target");
  }
  return typed;
}

function isUniqueStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((entry) => typeof entry === "string" && entry.trim()) &&
    new Set(value).size === value.length
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
