import type { DesignResourceHandoffPreflightV1 } from "./design-resource-handoff-types.js";
import { canonicalValueJson, sha256Hex } from "./strict-codec.js";

type HandoffSetFailure = (code: string, detail: string) => never;
type KeyedRow = { key: string };

export interface DesignResourceHandoffSetIntegrity {
  consume(preflight: DesignResourceHandoffPreflightV1): void;
  finish(): void;
}

interface HandoffSetIssue {
  code: string;
  detail: string;
}

interface ScopeHandoffIndex {
  headers: Map<string, string>;
  sharedRows: Map<string, Map<string, string>>;
  resourcePaths: Map<string, { key: string; digest: string }>;
  resourceClosures: Map<string, { key: string; digest: string }>;
}

export function createDesignResourceHandoffSetIntegrity(
  fail: HandoffSetFailure,
): DesignResourceHandoffSetIntegrity {
  const scopes = new Map<string, ScopeHandoffIndex>();
  const sourceItems = new Set<string>();
  let issue: HandoffSetIssue | null = null;

  function record(code: string, detail: string): void {
    issue ??= { code, detail };
  }

  function sharedHeader(
    scope: ScopeHandoffIndex,
    name: string,
    value: unknown,
  ): void {
    const digest = canonicalDigest(value);
    const previous = scope.headers.get(name);
    if (previous && previous !== digest)
      record("handoff_set_header_conflict", name);
    else scope.headers.set(name, digest);
  }

  function sharedCollection(
    scope: ScopeHandoffIndex,
    name: string,
    rows: KeyedRow[],
  ): void {
    const index = scope.sharedRows.get(name) ?? new Map<string, string>();
    scope.sharedRows.set(name, index);
    for (const row of rows) {
      const digest = canonicalDigest(row);
      const previous = index.get(row.key);
      if (previous && previous !== digest)
        record("handoff_set_shared_row_conflict", `${name}:${row.key}`);
      else index.set(row.key, digest);
    }
  }

  return {
    consume(preflight) {
      if (issue) return;
      const handoff = preflight.handoff;
      const scope = scopeIndex(scopes, handoff.scope.key);
      sharedHeader(scope, "provenance", handoff.provenance);
      sharedHeader(scope, "proposal", handoff.proposal);

      sharedCollection(scope, "resources", handoff.resources);
      sharedCollection(scope, "conditions", handoff.conditions);
      sharedCollection(scope, "properties", handoff.properties);
      sharedCollection(
        scope,
        "resource_fact_closure",
        handoff.resource_fact_closure,
      );
      for (const closure of handoff.resource_fact_closure) {
        const digest = canonicalDigest(closure);
        const previous = scope.resourceClosures.get(closure.resource_ref);
        if (
          previous &&
          (previous.key !== closure.key || previous.digest !== digest)
        )
          record(
            "handoff_set_resource_closure_conflict",
            `${closure.resource_ref}:${previous.key}:${closure.key}`,
          );
        else
          scope.resourceClosures.set(closure.resource_ref, {
            key: closure.key,
            digest,
          });
      }

      for (const resource of handoff.resources) {
        const digest = canonicalDigest(resource);
        const previous = scope.resourcePaths.get(resource.path);
        if (
          previous &&
          (previous.key !== resource.key || previous.digest !== digest)
        )
          record(
            "handoff_set_resource_path_conflict",
            `${resource.path}:${previous.key}:${resource.key}`,
          );
        else
          scope.resourcePaths.set(resource.path, {
            key: resource.key,
            digest,
          });
      }
      for (const sourceItem of preflight.source_item_keys) {
        if (sourceItems.has(sourceItem))
          record("handoff_set_source_item_duplicate", sourceItem);
        else sourceItems.add(sourceItem);
      }
    },
    finish() {
      if (issue) fail(issue.code, issue.detail);
    },
  };
}

function scopeIndex(
  scopes: Map<string, ScopeHandoffIndex>,
  key: string,
): ScopeHandoffIndex {
  const existing = scopes.get(key);
  if (existing) return existing;
  const created = {
    headers: new Map<string, string>(),
    sharedRows: new Map<string, Map<string, string>>(),
    resourcePaths: new Map<string, { key: string; digest: string }>(),
    resourceClosures: new Map<string, { key: string; digest: string }>(),
  };
  scopes.set(key, created);
  return created;
}

function canonicalDigest(value: unknown): string {
  return sha256Hex(canonicalValueJson(value));
}
