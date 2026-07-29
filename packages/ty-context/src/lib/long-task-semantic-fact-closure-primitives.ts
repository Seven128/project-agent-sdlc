export function resolveSemanticFactPointer(
  value: unknown,
  pointer: string,
  label: string,
): unknown {
  if (pointer === "") return value;
  if (!pointer.startsWith("/"))
    semanticFactClosureInvalid(
      "located_value_pointer_invalid",
      `${label}:${pointer}`,
    );
  let current: unknown = value;
  for (const segment of pointer
    .slice(1)
    .split("/")
    .map((item) => item.replaceAll("~1", "/").replaceAll("~0", "~"))) {
    if (Array.isArray(current)) {
      if (!/^(0|[1-9][0-9]*)$/u.test(segment))
        semanticFactClosureInvalid(
          "located_value_pointer_invalid",
          `${label}:${pointer}`,
        );
      current = current[Number(segment)];
    } else if (current && typeof current === "object")
      current = (current as Record<string, unknown>)[segment];
    else current = undefined;
    if (current === undefined)
      semanticFactClosureInvalid(
        "located_value_pointer_missing",
        `${label}:${pointer}`,
      );
  }
  return current;
}

export function uniqueSemanticFactClosureValues(
  values: string[],
  label: string,
): void {
  if (new Set(values).size !== values.length)
    semanticFactClosureInvalid(`${label}_duplicate`, values.join(","));
}

export function sameSemanticFactClosureSet(
  left: string[],
  right: string[],
): boolean {
  return (
    left.length === right.length &&
    new Set(left).size === left.length &&
    left.every((item) => right.includes(item))
  );
}

export function assertSameSemanticFactClosureSet(
  left: string[],
  right: string[],
  label: string,
): void {
  if (!sameSemanticFactClosureSet(left, right))
    semanticFactClosureInvalid(label, {
      expected: [...right].sort(),
      actual: [...left].sort(),
    });
}

export function semanticFactClosureInvalid(
  code: string,
  detail: unknown,
): never {
  throw new Error(
    `semantic_fact_closure_invalid:${code}:${typeof detail === "string" ? detail : JSON.stringify(detail)}`,
  );
}
