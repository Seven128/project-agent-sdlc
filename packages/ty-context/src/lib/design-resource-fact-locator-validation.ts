import type { DesignResourceLocatedDigestV1 } from "./design-resource-fact-manifest-types.js";
import type { DesignResource } from "./design-resource-handoff-file-primitives.js";
import { invalidDesignResourceHandoff } from "./design-resource-handoff-validation-primitives.js";
import { resolveDesignResourceLocatorValue } from "./design-resource-fact-locator-resolver.js";
import { sha256Hex } from "./strict-codec.js";

export { resolveDesignResourceLocatorValue } from "./design-resource-fact-locator-resolver.js";
export { validateDesignResourceValueKind } from "./design-resource-fact-value-validation.js";

export function validateDesignResourceLocatedDigest(
  located: DesignResourceLocatedDigestV1,
  resources: Map<string, DesignResource>,
  contents: Map<string, Buffer>,
  label: string,
): Buffer {
  const resource = resources.get(located.locator.resource_ref);
  const bytes = contents.get(located.locator.resource_ref);
  if (!resource || !bytes)
    invalidDesignResourceHandoff(
      "located_value_resource_unknown",
      `${label}:${located.locator.resource_ref}`,
    );
  const value = resolveDesignResourceLocatorValue(
    located.locator,
    resource,
    bytes,
    label,
  );
  const actual = sha256Hex(value);
  if (actual !== located.sha256)
    invalidDesignResourceHandoff(
      "located_value_digest_mismatch",
      `${label}:${located.sha256}:${actual}`,
    );
  return value;
}
