import { readFile } from "node:fs/promises";
import path from "node:path";
import type {
  DesignResourceHandoffEvidenceV1,
  ParsedDesignResourceHandoffV1,
} from "./design-resource-handoff-types.js";
import {
  isTextResource,
  type DesignResource,
} from "./design-resource-handoff-file-primitives.js";
import { invalidDesignResourceHandoff } from "./design-resource-handoff-validation-primitives.js";
import { resolveDesignResourceLocatorValue } from "./design-resource-fact-locator-validation.js";
import { validateDesignResourceImplementationDependencyClosure } from "./design-resource-handoff-web-dependency-validation.js";
import { assertProtectedRepositoryFile } from "./long-task-protected-files.js";

export async function validateDesignResourceFiles(
  repository: string,
  parsed: ParsedDesignResourceHandoffV1,
): Promise<void> {
  const resources = new Map(
    parsed.handoff.resources.map((resource) => [resource.key, resource]),
  );
  const contents = new Map<string, Buffer>();
  for (const resource of parsed.handoff.resources) {
    const file = await assertProtectedRepositoryFile(
      repository,
      path.resolve(repository, ...resource.path.split("/")),
      `design_resource:${resource.key}`,
    );
    contents.set(resource.key, await readFile(file));
  }
  for (const evidence of parsed.handoff.evidence)
    validateLocator(
      evidence,
      resources.get(evidence.resource_ref)!,
      contents.get(evidence.resource_ref)!,
    );
  for (const target of parsed.handoff.targets)
    if (
      target.source_profile.kind === "implementation_web" ||
      target.source_profile.kind === "implementation_app"
    )
      validateDesignResourceImplementationDependencyClosure(
        target,
        resources,
        contents,
      );
}

function validateLocator(
  evidence: DesignResourceHandoffEvidenceV1,
  resource: DesignResource,
  bytes: Buffer,
): void {
  const { kind, value } = evidence.locator;
  const label = `${evidence.key}:${resource.key}:${kind}:${value}`;
  validateEvidenceResourceCompatibility(evidence, resource);
  if (kind === "whole_resource") {
    if (value !== ".")
      invalidDesignResourceHandoff("locator_whole_resource_value", label);
    if (
      resource.media_type.startsWith("text/") &&
      !["asset", "motion_capture", "frame"].includes(evidence.kind)
    )
      invalidDesignResourceHandoff("locator_whole_resource_too_broad", label);
    return;
  }
  resolveDesignResourceLocatorValue(
    { resource_ref: resource.key, kind, value },
    resource,
    bytes,
    `evidence.${evidence.key}`,
  );
}

function validateEvidenceResourceCompatibility(
  evidence: DesignResourceHandoffEvidenceV1,
  resource: DesignResource,
): void {
  const machineReadableKinds = new Set([
    "prototype_transition",
    "motion_spec",
    "responsive_spec",
    "input_spec",
    "accessibility_spec",
    "semantic_tree",
    "token_spec",
    "annotation",
    "localization_spec",
    "system_ui_spec",
    "haptic_spec",
    "sound_spec",
    "render_environment",
    "relation_spec",
  ]);
  if (machineReadableKinds.has(evidence.kind) && !isTextResource(resource))
    invalidDesignResourceHandoff(
      "evidence_resource_media_type_incompatible",
      `${evidence.key}:${evidence.kind}:${resource.media_type}`,
    );
}
