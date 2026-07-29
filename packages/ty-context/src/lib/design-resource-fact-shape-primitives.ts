import type {
  DesignResourceLocatedDigestV1,
  DesignResourceTypedLocatorV1,
} from "./design-resource-fact-manifest-types.js";
import { DESIGN_RESOURCE_LOCATOR_KINDS } from "./design-resource-handoff-types.js";
import {
  sha256,
  stableKey,
} from "./design-resource-handoff-shape-primitives.js";
import { literal, object, string } from "./long-task-shape-primitives.js";

export function parseDesignResourceTypedLocator(
  value: unknown,
  label: string,
): DesignResourceTypedLocatorV1 {
  const row = object(value, label, ["resource_ref", "kind", "value"]);
  return {
    resource_ref: stableKey(row.resource_ref, `${label}.resource_ref`),
    kind: literal(row.kind, DESIGN_RESOURCE_LOCATOR_KINDS, `${label}.kind`),
    value: string(row.value, `${label}.value`),
  };
}

export function parseDesignResourceLocatedDigest(
  value: unknown,
  label: string,
): DesignResourceLocatedDigestV1 {
  const row = object(value, label, ["locator", "sha256"]);
  return {
    locator: parseDesignResourceTypedLocator(row.locator, `${label}.locator`),
    sha256: sha256(row.sha256, `${label}.sha256`),
  };
}
