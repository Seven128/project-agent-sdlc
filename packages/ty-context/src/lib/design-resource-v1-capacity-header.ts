import { invalidDesignResourceHandoff } from "./design-resource-handoff-validation-primitives.js";
import { DESIGN_RESOURCE_SYMBOLIC_FACT_POLICY } from "./design-resource-symbolic-fact-policy.js";

const V1_SCHEMA = "design-resource-observable-fact-manifest-v1";

export const DESIGN_RESOURCE_V1_REGENERATION_GUIDANCE =
  "regenerate_as=design-resource-handoff-v2:fact_model=symbolic_rules_v2";

export interface DesignResourceV1CapacityHeader {
  schema_version: typeof V1_SCHEMA;
  collection_counts: ReadonlyMap<string, number>;
}

export function parseDesignResourceV1CapacityHeader(
  prefix: string,
): DesignResourceV1CapacityHeader {
  try {
    const reader = new BoundedJsonReader(prefix);
    const header = reader.readRootHeader();
    if (header.first_key !== "schema_version")
      invalid(
        "v1_manifest_capacity_header_order_invalid",
        `first_key=${header.first_key ?? "missing"}:required=schema_version`,
      );
    if (header.schema_version !== V1_SCHEMA)
      invalid(
        "v1_manifest_capacity_header_schema_invalid",
        `schema_version=${String(header.schema_version)}`,
      );
    if (!header.generation)
      invalid(
        "v1_manifest_capacity_header_missing_or_late",
        `prefix_limit=${DESIGN_RESOURCE_SYMBOLIC_FACT_POLICY.v1_capacity.capacity_header_prefix_max_bytes}:${DESIGN_RESOURCE_V1_REGENERATION_GUIDANCE}`,
      );
    const collections = objectValue(
      header.generation,
      "v1_manifest_capacity_header_generation_invalid",
    ).collections;
    if (!Array.isArray(collections))
      invalid("v1_manifest_capacity_header_collections_invalid", "not_array");
    const collectionCounts = new Map<string, number>();
    for (const value of collections) {
      const collection = objectValue(
        value,
        "v1_manifest_capacity_header_collection_invalid",
      );
      if (typeof collection.name !== "string" || !collection.name)
        invalid("v1_manifest_capacity_header_collection_name_invalid", "");
      if (
        typeof collection.expected_count !== "number" ||
        !Number.isSafeInteger(collection.expected_count) ||
        collection.expected_count < 0
      )
        invalid(
          "v1_manifest_capacity_header_expected_count_invalid",
          collection.name,
        );
      if (collectionCounts.has(collection.name))
        invalid(
          "v1_manifest_capacity_header_collection_duplicate",
          collection.name,
        );
      collectionCounts.set(collection.name, collection.expected_count);
    }
    return {
      schema_version: V1_SCHEMA,
      collection_counts: collectionCounts,
    };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith("design_resource_handoff_invalid:")
    )
      throw error;
    const message = error instanceof Error ? error.message : String(error);
    invalid(
      "v1_manifest_capacity_header_missing_or_late",
      `prefix_limit=${DESIGN_RESOURCE_SYMBOLIC_FACT_POLICY.v1_capacity.capacity_header_prefix_max_bytes}:reason=${message}:${DESIGN_RESOURCE_V1_REGENERATION_GUIDANCE}`,
    );
  }
}

interface RootHeader {
  first_key: string | null;
  schema_version: unknown;
  generation: unknown;
}

class BoundedJsonReader {
  private offset = 0;
  private depth = 0;

  constructor(private readonly input: string) {}

  readRootHeader(): RootHeader {
    this.whitespace();
    this.character("{");
    const result: RootHeader = {
      first_key: null,
      schema_version: undefined,
      generation: undefined,
    };
    this.whitespace();
    if (this.peek() === "}") throw new Error("root_empty");
    for (;;) {
      const key = this.string();
      result.first_key ??= key;
      this.whitespace();
      this.character(":");
      this.whitespace();
      const value = this.value();
      if (key === "schema_version") result.schema_version = value;
      if (key === "generation") {
        result.generation = value;
        return result;
      }
      this.whitespace();
      const delimiter = this.peek();
      if (delimiter === "}") return result;
      this.character(",");
      this.whitespace();
    }
  }

  private value(): unknown {
    if (++this.depth > 64) throw new Error("depth_limit");
    try {
      const next = this.peek();
      if (next === '"') return this.string();
      if (next === "{") return this.object();
      if (next === "[") return this.array();
      if (next === "t") return this.literal("true", true);
      if (next === "f") return this.literal("false", false);
      if (next === "n") return this.literal("null", null);
      return this.number();
    } finally {
      this.depth -= 1;
    }
  }

  private object(): Record<string, unknown> {
    const value: Record<string, unknown> = {};
    this.character("{");
    this.whitespace();
    if (this.peek() === "}") {
      this.offset += 1;
      return value;
    }
    for (;;) {
      const key = this.string();
      if (Object.hasOwn(value, key)) throw new Error(`duplicate_key:${key}`);
      this.whitespace();
      this.character(":");
      this.whitespace();
      value[key] = this.value();
      this.whitespace();
      if (this.peek() === "}") {
        this.offset += 1;
        return value;
      }
      this.character(",");
      this.whitespace();
    }
  }

  private array(): unknown[] {
    const value: unknown[] = [];
    this.character("[");
    this.whitespace();
    if (this.peek() === "]") {
      this.offset += 1;
      return value;
    }
    for (;;) {
      value.push(this.value());
      this.whitespace();
      if (this.peek() === "]") {
        this.offset += 1;
        return value;
      }
      this.character(",");
      this.whitespace();
    }
  }

  private string(): string {
    this.character('"');
    let value = "";
    for (;;) {
      if (this.offset >= this.input.length) throw new Error("prefix_ended");
      const character = this.input[this.offset++];
      if (character === '"') return value;
      if (character === "\\") {
        if (this.offset >= this.input.length) throw new Error("prefix_ended");
        const escaped = this.input[this.offset++];
        const simple: Record<string, string> = {
          '"': '"',
          "\\": "\\",
          "/": "/",
          b: "\b",
          f: "\f",
          n: "\n",
          r: "\r",
          t: "\t",
        };
        if (escaped in simple) value += simple[escaped];
        else if (escaped === "u") {
          const hex = this.input.slice(this.offset, this.offset + 4);
          if (!/^[0-9a-fA-F]{4}$/u.test(hex))
            throw new Error("unicode_escape_invalid");
          value += String.fromCharCode(Number.parseInt(hex, 16));
          this.offset += 4;
        } else throw new Error("escape_invalid");
      } else {
        if (character.charCodeAt(0) < 0x20)
          throw new Error("string_control_character");
        value += character;
      }
    }
  }

  private number(): number {
    const remaining = this.input.slice(this.offset);
    const match = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/u.exec(
      remaining,
    );
    if (!match) throw new Error("number_invalid");
    this.offset += match[0].length;
    const value = Number(match[0]);
    if (!Number.isFinite(value)) throw new Error("number_non_finite");
    return value;
  }

  private literal<T>(token: string, value: T): T {
    if (this.input.slice(this.offset, this.offset + token.length) !== token)
      throw new Error(`literal_invalid:${token}`);
    this.offset += token.length;
    return value;
  }

  private whitespace(): void {
    while (/\s/u.test(this.input[this.offset] ?? "")) this.offset += 1;
  }

  private character(expected: string): void {
    if (this.input[this.offset] !== expected)
      throw new Error(`expected:${expected}:at=${this.offset}`);
    this.offset += 1;
  }

  private peek(): string {
    if (this.offset >= this.input.length) throw new Error("prefix_ended");
    return this.input[this.offset];
  }
}

function objectValue(value: unknown, code: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    invalid(code, "not_object");
  return value as Record<string, unknown>;
}

function invalid(code: string, detail: string): never {
  invalidDesignResourceHandoff(code, detail);
}
