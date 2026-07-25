export function indexDesignResourceItems<T extends { key: string }>(
  items: T[],
): Map<string, T> {
  return new Map(items.map((item) => [item.key, item]));
}

export function requireUniqueDesignResourceObjects(
  items: Array<{ key: string }>,
  code: string,
): void {
  requireUniqueDesignResourceValues(
    items.map((item) => item.key),
    code,
  );
}

export function requireUniqueDesignResourceValues<T>(
  values: T[],
  code: string,
): void {
  if (new Set(values).size !== values.length)
    invalidDesignResourceHandoff(code, "duplicate");
}

export function requireNonemptyDesignResourceValues(
  values: readonly unknown[],
  code: string,
): void {
  if (!values.length) invalidDesignResourceHandoff(code, "empty");
}

export function requireKnownDesignResourceRef(
  known: Map<string, unknown> | Set<string>,
  ref: string,
  kind: string,
): void {
  if (!known.has(ref)) invalidDesignResourceHandoff(`${kind}_ref_unknown`, ref);
}

export function requireDesignSourceItemKind(
  sourceItems: Map<string, string>,
  ref: string,
): void {
  const kind = sourceItems.get(ref)!;
  if (!["requirement", "control", "acceptance"].includes(kind))
    invalidDesignResourceHandoff(
      "design_source_item_kind_unsupported",
      `${ref}:${kind}`,
    );
}

export function invalidDesignResourceHandoff(
  code: string,
  detail: string,
): never {
  throw new Error(`design_resource_handoff_invalid:${code}:${detail}`);
}
