import type { DesignResourceObservableFactManifestV1 } from "./design-resource-fact-manifest-types.js";
import type { DesignResource } from "./design-resource-handoff-file-primitives.js";
import type {
  DesignResourceHandoffTargetV1,
  DesignResourceHandoffV1,
} from "./design-resource-handoff-types.js";
import {
  invalid,
  nonempty,
  refsKnown,
  unique,
} from "./design-resource-fact-universe-helpers.js";

export function validateManifestDesignSystem(
  manifest: DesignResourceObservableFactManifestV1,
  handoff: DesignResourceHandoffV1,
  target: DesignResourceHandoffTargetV1,
  resources: Map<string, DesignResource>,
): void {
  const snapshot = manifest.design_system;
  const styleBearing = handoff.scope.style_dependency !== "non-fidelity";
  if (styleBearing && snapshot.disposition !== "used")
    invalid("manifest_design_system_required", manifest.target_key);
  if (!styleBearing && snapshot.disposition !== "not_applicable")
    invalid(
      "manifest_design_system_not_applicable_required",
      manifest.target_key,
    );
  if (snapshot.id !== handoff.provenance.design_system_id)
    invalid(
      "manifest_design_system_id_mismatch",
      `${snapshot.id}:${handoff.provenance.design_system_id}`,
    );
  const resource = resources.get(snapshot.resource_ref);
  if (!resource)
    invalid("manifest_design_system_resource_unknown", snapshot.resource_ref);
  if (!target.resource_refs.includes(snapshot.resource_ref))
    invalid(
      "manifest_design_system_resource_outside_target",
      `${target.key}:${snapshot.resource_ref}`,
    );
  if (resource.sha256 !== snapshot.sha256)
    invalid(
      "manifest_design_system_digest_mismatch",
      `${snapshot.resource_ref}:${snapshot.sha256}:${resource.sha256}`,
    );
}

export function validateManifestSubjects(
  manifest: DesignResourceObservableFactManifestV1,
  census: Map<
    string,
    DesignResourceObservableFactManifestV1["inspector"]["census"][number]
  >,
): void {
  const subjects = new Map(
    manifest.subjects.map((subject) => [subject.key, subject]),
  );
  const roots = manifest.subjects.filter(
    (subject) =>
      subject.parent_ref === null &&
      (subject.kind === "surface" || subject.kind === "flow"),
  );
  if (!roots.length)
    invalid("manifest_subject_root_required", manifest.target_key);
  for (const subject of manifest.subjects)
    validateSubject(subject, subjects, census);
  validateSubjectParentAcyclic(manifest, subjects);
}

function validateSubject(
  subject: DesignResourceObservableFactManifestV1["subjects"][number],
  subjects: Map<
    string,
    DesignResourceObservableFactManifestV1["subjects"][number]
  >,
  census: Map<
    string,
    DesignResourceObservableFactManifestV1["inspector"]["census"][number]
  >,
): void {
  nonempty(
    subject.census_refs,
    `manifest_subject_census_required:${subject.key}`,
  );
  refsKnown(
    subject.census_refs,
    census,
    "manifest_subject_census_unknown",
    subject.key,
  );
  if (subject.presence === "always" && subject.presence_rule_ref !== null)
    invalid("manifest_always_presence_rule_forbidden", subject.key);
  if (subject.presence !== "always" && subject.presence_rule_ref === null)
    invalid("manifest_dynamic_presence_rule_required", subject.key);
  validatePresenceAndPopulation(subject, census);
  for (const ref of [
    subject.parent_ref,
    subject.instance_of_ref,
    subject.override_of_ref,
    subject.family_ref,
    subject.portal_host_ref,
  ])
    if (ref !== null && !subjects.has(ref))
      invalid("manifest_subject_relation_unknown", `${subject.key}:${ref}`);
  if (
    subject.parent_ref === null &&
    subject.kind !== "surface" &&
    subject.kind !== "flow"
  )
    invalid("manifest_subject_parent_required", subject.key);
  if (subject.presence === "portal" && subject.portal_host_ref === null)
    invalid("manifest_portal_host_required", subject.key);
  validateRelationSubject(subject, subjects);
}

function validatePresenceAndPopulation(
  subject: DesignResourceObservableFactManifestV1["subjects"][number],
  census: Map<
    string,
    DesignResourceObservableFactManifestV1["inspector"]["census"][number]
  >,
): void {
  if (subject.presence_rule_ref !== null) {
    const presenceRule = census.get(subject.presence_rule_ref);
    if (!presenceRule)
      invalid(
        "manifest_presence_rule_census_unknown",
        `${subject.key}:${subject.presence_rule_ref}`,
      );
    if (
      !["declaration", "state", "dynamic_population"].includes(
        presenceRule.kind,
      )
    )
      invalid(
        "manifest_presence_rule_census_kind_invalid",
        `${subject.key}:${subject.presence_rule_ref}:${presenceRule.kind}`,
      );
  }
  if (subject.presence === "virtualized" && subject.population_ref === null)
    invalid("manifest_virtualized_population_required", subject.key);
  if (subject.population_ref === null) return;
  const population = census.get(subject.population_ref);
  if (!population)
    invalid(
      "manifest_population_census_unknown",
      `${subject.key}:${subject.population_ref}`,
    );
  if (population.kind !== "dynamic_population")
    invalid(
      "manifest_population_census_kind_invalid",
      `${subject.key}:${subject.population_ref}:${population.kind}`,
    );
}

function validateRelationSubject(
  subject: DesignResourceObservableFactManifestV1["subjects"][number],
  subjects: Map<string, unknown>,
): void {
  if (subject.kind !== "relation") {
    if (subject.relation_endpoints.length)
      invalid("manifest_nonrelation_endpoints_forbidden", subject.key);
    return;
  }
  if (subject.relation_endpoints.length < 2)
    invalid("manifest_relation_endpoints_required", subject.key);
  unique(
    subject.relation_endpoints.map((item) => item.role),
    `manifest_relation_endpoint_role_duplicate:${subject.key}`,
  );
  for (const endpoint of subject.relation_endpoints)
    if (
      endpoint.subject_ref === subject.key ||
      !subjects.has(endpoint.subject_ref)
    )
      invalid(
        "manifest_relation_endpoint_invalid",
        `${subject.key}:${endpoint.role}:${endpoint.subject_ref}`,
      );
}

function validateSubjectParentAcyclic(
  manifest: DesignResourceObservableFactManifestV1,
  subjects: Map<
    string,
    DesignResourceObservableFactManifestV1["subjects"][number]
  >,
): void {
  for (const subject of manifest.subjects) {
    const visited = new Set<string>();
    let current: typeof subject | undefined = subject;
    while (current?.parent_ref) {
      if (visited.has(current.key))
        invalid("manifest_subject_parent_cycle", subject.key);
      visited.add(current.key);
      current = subjects.get(current.parent_ref);
    }
  }
}
