import { CLI_EXIT_CODES, CliCommandError } from "../cli-exit.js";
import {
  normalizeContextRole,
  type ContextRole,
} from "../context-catalog/catalog-portable-contract.js";
import { normalizeContextPath } from "../context-catalog/catalog-paths.js";
import { normalizeContextFilePath } from "../context-create/context-create-path.js";
import type { ContextRegisterInput } from "./context-register-types.js";

const CURRENT_POLICIES = new Set(["default", "on-demand"]);

export interface NormalizedRegisterInput {
  path: string;
  role: ContextRole;
  read_policy: "default" | "on-demand";
  read_when?: string;
  triggers: string[];
  default_children: string[];
}

export function normalizeContextRegisterInput(
  input: ContextRegisterInput,
): NormalizedRegisterInput {
  const contextPath = normalizeContextFilePath(
    input.context_path,
    "context register",
  );
  const role = normalizeContextRole(input.role);
  if (!role)
    argumentFailure(`context register has unsupported role: ${input.role}`);
  const readPolicy = input.read_policy ?? "on-demand";
  if (!CURRENT_POLICIES.has(readPolicy))
    argumentFailure(
      "context register --read-policy must be default or on-demand",
    );
  return {
    path: contextPath,
    role,
    read_policy: readPolicy as "default" | "on-demand",
    read_when: optionalBoundedText(input.read_when, "read-when", 1024),
    triggers: boundedUniqueValues(input.triggers ?? [], "trigger", 64, 128),
    default_children: boundedUniqueValues(
      (input.default_children ?? []).map(normalizeContextPath),
      "default-child",
      64,
      512,
    ),
  };
}

function optionalBoundedText(
  value: string | undefined,
  label: string,
  maximum: number,
): string | undefined {
  if (value === undefined) return undefined;
  const normalized = value.normalize("NFC").trim();
  if (!normalized || [...normalized].length > maximum)
    argumentFailure(
      `context register --${label} must contain 1-${maximum} code points`,
    );
  return normalized;
}

function boundedUniqueValues(
  values: string[],
  label: string,
  maximumCount: number,
  maximumLength: number,
): string[] {
  if (values.length > maximumCount)
    argumentFailure(
      `context register accepts at most ${maximumCount} --${label} values`,
    );
  const normalized = values.map((value) => value.normalize("NFC").trim());
  if (normalized.some((value) => !value || [...value].length > maximumLength))
    argumentFailure(
      `context register --${label} values must contain 1-${maximumLength} code points`,
    );
  if (new Set(normalized).size !== normalized.length)
    argumentFailure(`context register has duplicate --${label} values`);
  return normalized;
}

function argumentFailure(messageText: string): never {
  throw new CliCommandError(CLI_EXIT_CODES.arguments, messageText);
}
