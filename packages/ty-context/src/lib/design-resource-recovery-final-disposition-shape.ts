import type { DesignResourceFinalDisposition } from "./design-resource-recovery-types.js";
import {
  digest,
  object,
  oneOf,
  stringSet,
  text,
} from "./design-resource-recovery-codec-primitives.js";

export function parseDesignResourceFinalDisposition(
  value: unknown,
  label: string,
): DesignResourceFinalDisposition {
  const first = object(
    value,
    label,
    ["kind"],
    ["operation_id", "resource_ref", "condition_refs", "downstream_owner"],
  );
  const kind = oneOf(
    first.kind,
    [
      "proposal-written",
      "resource-owned-exact-visual",
      "not-adopted",
      "unresolved",
    ] as const,
    `${label}.kind`,
  );
  if (kind === "proposal-written") {
    const row = object(value, label, ["kind", "operation_id"]);
    return {
      kind,
      operation_id: text(row.operation_id, `${label}.operation_id`),
    };
  }
  if (kind === "resource-owned-exact-visual") {
    const row = object(value, label, [
      "kind",
      "resource_ref",
      "condition_refs",
      "downstream_owner",
    ]);
    return {
      kind,
      resource_ref: text(row.resource_ref, `${label}.resource_ref`),
      condition_refs: stringSet(row.condition_refs, `${label}.condition_refs`),
      downstream_owner: parseDownstreamOwner(
        row.downstream_owner,
        `${label}.downstream_owner`,
      ),
    };
  }
  object(value, label, ["kind"]);
  return { kind };
}

function parseDownstreamOwner(
  value: unknown,
  label: string,
): Extract<
  DesignResourceFinalDisposition,
  { kind: "resource-owned-exact-visual" }
>["downstream_owner"] {
  const row = object(value, label, [
    "kind",
    "locator",
    "raw_byte_digest",
    "resource_key",
  ]);
  return {
    kind: oneOf(
      row.kind,
      ["selected-source-record", "external-immutable"] as const,
      `${label}.kind`,
    ),
    locator: text(row.locator, `${label}.locator`),
    raw_byte_digest: digest(row.raw_byte_digest, `${label}.raw_byte_digest`),
    resource_key: text(row.resource_key, `${label}.resource_key`),
  };
}
