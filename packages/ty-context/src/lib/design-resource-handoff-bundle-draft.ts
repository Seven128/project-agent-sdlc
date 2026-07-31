import { lstat, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ParsedDesignResourceHandoffInputV1 } from "./design-resource-handoff-input-types.js";
import { parseDesignResourceHandoffMarkdown } from "./design-resource-handoff-parser.js";
import type {
  DesignResourceHandoffResourceV1,
  DesignResourceHandoffTargetV1,
} from "./design-resource-handoff-types.js";
import { repoRelative } from "./long-task-workspace.js";

type BundleFailure = (code: string, detail: string) => never;

export interface StagedDesignResourceHandoffDraft {
  bytes: Buffer;
  parsed: ParsedDesignResourceHandoffInputV1;
  target: DesignResourceHandoffTargetV1;
  manifest_resource: DesignResourceHandoffResourceV1;
}

export async function stageDesignResourceHandoffDraft(
  repository: string,
  draftDirectory: string,
  temporaryDirectory: string,
  entryName: string,
  maxBytes: number,
  fail: BundleFailure,
): Promise<StagedDesignResourceHandoffDraft> {
  const draftFile = path.join(draftDirectory, entryName);
  const info = await lstat(draftFile);
  if (typeof info.nlink === "number" && info.nlink > 1)
    fail("draft_hardlink_not_allowed", entryName);
  assertByteLimit(entryName, info.size, maxBytes, fail);
  const bytes = await readFile(draftFile);
  assertByteLimit(entryName, bytes.length, maxBytes, fail);
  const content = bytes.toString("utf8");
  if (!Buffer.from(content, "utf8").equals(bytes))
    fail("handoff_utf8_invalid", entryName);

  const stagedFile = path.join(temporaryDirectory, entryName);
  await writeFile(stagedFile, bytes, { flag: "wx" });
  const stagedPath = repoRelative(repository, stagedFile);
  const parsed = parseDesignResourceHandoffMarkdown(stagedPath, content);
  if (
    parsed.handoff.schema_version !== "design-resource-handoff-v1" ||
    !("representation" in parsed.handoff) ||
    parsed.handoff.representation !== "manifest_backed"
  )
    fail("manifest_backed_representation_required", entryName);
  if (parsed.handoff.targets.length !== 1)
    fail(
      "one_target_per_handoff_required",
      `${entryName}:${parsed.handoff.targets.length}`,
    );
  const target = parsed.handoff.targets[0];
  const manifestResource = parsed.handoff.resources.find(
    (resource) =>
      resource.key === target.source_profile.fact_manifest_resource_ref,
  );
  if (!manifestResource) fail("target_manifest_resource_missing", target.key);
  return {
    bytes,
    parsed: parsed as ParsedDesignResourceHandoffInputV1,
    target,
    manifest_resource: manifestResource,
  };
}

function assertByteLimit(
  entryName: string,
  actual: number,
  maximum: number,
  fail: BundleFailure,
): void {
  if (actual > maximum)
    fail("handoff_byte_limit_exceeded", `${entryName}:${actual}:${maximum}`);
}
