import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { CounterfactualMutationV2 } from "./long-task-delivery-types.js";
import { canonicalValueJson } from "./strict-codec.js";

type NarrowMutation = Extract<
  CounterfactualMutationV2,
  { type: "replace_json_value" | "replace_text" }
>;

export async function applyNarrowSemanticMutation(
  root: string,
  mutation: NarrowMutation,
): Promise<void> {
  const target = path.join(root, ...mutation.path.split("/"));
  const current = await readFile(target, "utf8");
  const next = mutateSemanticText(current, mutation, false);
  await writeFile(target, next, "utf8");
}

export function mutateSemanticText(
  current: string,
  mutation: NarrowMutation,
  requireChange = true,
): string {
  if (mutation.type === "replace_text") {
    if (requireChange && mutation.match === mutation.replacement)
      throw new Error("counterfactual_replacement_must_change_carrier");
    const count = occurrences(current, mutation.match);
    if (count !== 1)
      throw new Error(`counterfactual_text_match_count:${count}`);
    return current.replace(mutation.match, mutation.replacement);
  }
  let value: unknown;
  try {
    value = JSON.parse(current);
  } catch {
    throw new Error("counterfactual_json_invalid");
  }
  const segments = mutation.pointer
    .slice(1)
    .split("/")
    .map((segment) => segment.replace(/~1/gu, "/").replace(/~0/gu, "~"));
  let owner: unknown = value;
  for (const segment of segments.slice(0, -1))
    owner = child(owner, segment, mutation.pointer);
  const leaf = segments.at(-1)!;
  if (!owner || typeof owner !== "object")
    throw new Error(`counterfactual_json_pointer_unknown:${mutation.pointer}`);
  if (Array.isArray(owner)) {
    const index = arrayIndex(leaf, owner.length, mutation.pointer);
    if (
      requireChange &&
      canonicalValueJson(owner[index]) === canonicalValueJson(mutation.value)
    )
      throw new Error("counterfactual_replacement_must_change_carrier");
    owner[index] = mutation.value;
  } else {
    const record = owner as Record<string, unknown>;
    if (!Object.hasOwn(record, leaf))
      throw new Error(
        `counterfactual_json_pointer_unknown:${mutation.pointer}`,
      );
    if (
      requireChange &&
      canonicalValueJson(record[leaf]) === canonicalValueJson(mutation.value)
    )
      throw new Error("counterfactual_replacement_must_change_carrier");
    record[leaf] = mutation.value;
  }
  return `${JSON.stringify(value, null, 2)}\n`;
}

function child(value: unknown, segment: string, pointer: string): unknown {
  if (!value || typeof value !== "object")
    throw new Error(`counterfactual_json_pointer_unknown:${pointer}`);
  if (Array.isArray(value))
    return value[arrayIndex(segment, value.length, pointer)];
  if (!Object.hasOwn(value, segment))
    throw new Error(`counterfactual_json_pointer_unknown:${pointer}`);
  return (value as Record<string, unknown>)[segment];
}

function arrayIndex(value: string, length: number, pointer: string): number {
  if (!/^(?:0|[1-9][0-9]*)$/u.test(value))
    throw new Error(`counterfactual_json_pointer_unknown:${pointer}`);
  const index = Number(value);
  if (!Number.isSafeInteger(index) || index >= length)
    throw new Error(`counterfactual_json_pointer_unknown:${pointer}`);
  return index;
}

function occurrences(value: string, search: string): number {
  let count = 0;
  let offset = 0;
  while (true) {
    const index = value.indexOf(search, offset);
    if (index < 0) return count;
    count += 1;
    offset = index + search.length;
  }
}
