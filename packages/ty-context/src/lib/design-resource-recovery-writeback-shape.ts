import { DESIGN_RESOURCE_PATCH_SCHEMA } from "./design-resource-recovery-schema.js";
import {
  type DesignResourceExactPatch,
  type DesignResourceProviderIdentity,
  type DesignResourceProviderReferences,
  type DesignResourceProviderResourceIdentity,
  type DesignResourceRecoveryWriteback,
  type DesignResourceWritebackInput,
} from "./design-resource-recovery-types.js";
import {
  arrayOf,
  digest,
  literal,
  multilineText,
  object,
  oneOf,
  optionalArrayOf,
  stringSet,
  text,
} from "./design-resource-recovery-codec-primitives.js";

const ENCODINGS = ["utf8", "utf8-bom", "utf16le", "utf16be"] as const;

export function parseProviderReferences(
  value: unknown,
  label: string,
): DesignResourceProviderReferences {
  const row = object(value, label, ["project", "run", "resources"]);
  return {
    project: parseProviderIdentity(row.project, `${label}.project`),
    run: parseProviderIdentity(row.run, `${label}.run`),
    resources: optionalArrayOf(
      row.resources,
      `${label}.resources`,
      parseProviderResourceIdentity,
    ),
  };
}

export function parsePatch(
  value: unknown,
  label: string,
): DesignResourceExactPatch {
  const row = object(value, label, ["schema_version", "operations"]);
  literal(
    row.schema_version,
    DESIGN_RESOURCE_PATCH_SCHEMA,
    `${label}.schema_version`,
  );
  return {
    schema_version: DESIGN_RESOURCE_PATCH_SCHEMA,
    operations: arrayOf(
      row.operations,
      `${label}.operations`,
      (item, itemLabel) => {
        const operation = object(item, itemLabel, [
          "operation_id",
          "target_keys",
          "before_text",
          "after_text",
          "expected_occurrences",
        ]);
        literal(
          operation.expected_occurrences,
          1,
          `${itemLabel}.expected_occurrences`,
        );
        return {
          operation_id: text(
            operation.operation_id,
            `${itemLabel}.operation_id`,
          ),
          target_keys: stringSet(
            operation.target_keys,
            `${itemLabel}.target_keys`,
          ),
          before_text: multilineText(
            operation.before_text,
            `${itemLabel}.before_text`,
          ),
          after_text: multilineText(
            operation.after_text,
            `${itemLabel}.after_text`,
          ),
          expected_occurrences: 1 as const,
        };
      },
    ),
  };
}

export function parseWritebackInput(
  value: unknown,
  label: string,
  complete: false,
): DesignResourceWritebackInput;
export function parseWritebackInput(
  value: unknown,
  label: string,
  complete: true,
): DesignResourceRecoveryWriteback;
export function parseWritebackInput(
  value: unknown,
  label: string,
  complete: boolean,
): DesignResourceWritebackInput | DesignResourceRecoveryWriteback {
  const fields = [
    "target_locator",
    "pre_write_raw_byte_digest",
    "patch",
    "patch_identity",
    "expected_post_write_raw_byte_digest",
    "resource_identities",
    "accepted_delta_ids",
  ];
  if (complete) fields.push("target_encoding", "target_eol_policy");
  const row = object(value, label, fields);
  const base: DesignResourceWritebackInput = {
    target_locator: text(row.target_locator, `${label}.target_locator`),
    pre_write_raw_byte_digest: digest(
      row.pre_write_raw_byte_digest,
      `${label}.pre_write_raw_byte_digest`,
    ),
    patch: parsePatch(row.patch, `${label}.patch`),
    patch_identity: digest(row.patch_identity, `${label}.patch_identity`),
    expected_post_write_raw_byte_digest: digest(
      row.expected_post_write_raw_byte_digest,
      `${label}.expected_post_write_raw_byte_digest`,
    ),
    resource_identities: optionalArrayOf(
      row.resource_identities,
      `${label}.resource_identities`,
      parseResourceDigestIdentity,
    ),
    accepted_delta_ids: stringSet(
      row.accepted_delta_ids,
      `${label}.accepted_delta_ids`,
      { allowEmpty: true },
    ),
  };
  if (!complete) return base;
  return {
    ...base,
    target_encoding: oneOf(
      row.target_encoding,
      ENCODINGS,
      `${label}.target_encoding`,
    ),
    target_eol_policy: oneOf(
      row.target_eol_policy,
      ["none", "lf", "crlf", "cr"] as const,
      `${label}.target_eol_policy`,
    ),
  };
}

function parseProviderIdentity(
  value: unknown,
  label: string,
): DesignResourceProviderIdentity {
  const row = object(value, label, ["key", "locator", "immutable_identity"]);
  return {
    key: text(row.key, `${label}.key`),
    locator: text(row.locator, `${label}.locator`),
    immutable_identity: text(
      row.immutable_identity,
      `${label}.immutable_identity`,
    ),
  };
}

function parseProviderResourceIdentity(
  value: unknown,
  label: string,
): DesignResourceProviderResourceIdentity {
  const row = object(value, label, [
    "key",
    "locator",
    "immutable_identity",
    "raw_byte_digest",
  ]);
  return {
    ...parseProviderIdentity(
      {
        key: row.key,
        locator: row.locator,
        immutable_identity: row.immutable_identity,
      },
      label,
    ),
    raw_byte_digest: digest(row.raw_byte_digest, `${label}.raw_byte_digest`),
  };
}

function parseResourceDigestIdentity(
  value: unknown,
  label: string,
): { key: string; raw_byte_digest: string } {
  const row = object(value, label, ["key", "raw_byte_digest"]);
  return {
    key: text(row.key, `${label}.key`),
    raw_byte_digest: digest(row.raw_byte_digest, `${label}.raw_byte_digest`),
  };
}
