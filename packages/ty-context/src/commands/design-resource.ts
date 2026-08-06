import { publishDesignResourceHandoffBundle } from "../lib/design-resource-handoff-bundle.js";
import { preflightDesignResourceHandoff } from "../lib/design-resource-handoff-validation.js";
import { designResourceRecoveryCommand } from "./design-resource-recovery.js";
import {
  normalizeRepositoryCwd,
  normalizeRepositoryFile,
} from "../lib/long-task-paths.js";
import { canonicalJson } from "../lib/strict-codec.js";

export async function designResource(args: string[]): Promise<void> {
  const [subcommand = "help", ...rest] = args;
  if (subcommand === "help") {
    help();
    return;
  }
  if (subcommand === "bundle") {
    await bundle(rest);
    return;
  }
  if (subcommand === "recovery") {
    await designResourceRecoveryCommand(rest);
    return;
  }
  if (subcommand !== "preflight")
    throw new Error(`Unknown design-resource subcommand: ${subcommand}`);
  const json = rest.includes("--json");
  const positional = rest.filter((item) => item !== "--json");
  if (positional.length !== 1)
    throw new Error(
      "usage: ty-context design-resource preflight <handoff.md> [--json]",
    );
  const handoffPath = normalizeRepositoryFile(
    positional[0],
    "design_resource_handoff",
  );
  const result = await preflightDesignResourceHandoff(
    process.cwd(),
    handoffPath,
  );
  if (json) {
    process.stdout.write(canonicalJson(result));
    return;
  }
  console.log(`Design resource handoff ready: ${result.handoff_path}`);
  console.log(`Scope: ${result.handoff.scope.key}`);
  console.log(
    `Targets: ${result.handoff.targets.map((item) => item.key).join(", ")}`,
  );
  if ("metrics" in result) {
    console.log(
      `Coverage: ${result.manifest.subjects.length} subjects x ${result.manifest.properties.length} atomic properties (${result.rule_projections.length} symbolic Rules)`,
    );
    console.log(
      `Symbolic: ${result.metrics.semantic_obligations} semantic obligations, ${result.metrics.certificate_obligations} certificates, ${result.metrics.canonical_dag_nodes} DAG nodes, ${result.metrics.canonical_bytes} bytes`,
    );
    console.log(
      `Acceptance blockers: ${result.manifest.acceptance_blockers.length}`,
    );
  } else {
    console.log(
      `Coverage: ${result.counts.subjects} subjects x 8 dimensions (${result.counts.coverage} grouped rows)`,
    );
    console.log(`Acceptance blockers: ${result.counts.acceptance_blockers}`);
  }
}

async function bundle(args: string[]): Promise<void> {
  const positional: string[] = [];
  const manifests: string[] = [];
  let maxHandoffBytes: number | null = null;
  let json = false;
  for (let index = 0; index < args.length; index += 1) {
    const item = args[index];
    if (item === "--json") {
      json = true;
      continue;
    }
    if (item === "--manifest") {
      const value = args[index + 1];
      if (!value) throw new Error("--manifest requires a path");
      manifests.push(
        normalizeRepositoryFile(value, "design_resource_bundle_manifest"),
      );
      index += 1;
      continue;
    }
    if (item === "--max-handoff-bytes") {
      const value = args[index + 1];
      if (!value) throw new Error("--max-handoff-bytes requires an integer");
      maxHandoffBytes = Number(value);
      index += 1;
      continue;
    }
    if (item.startsWith("--"))
      throw new Error(`Unknown design-resource bundle option: ${item}`);
    positional.push(item);
  }
  if (
    positional.length !== 2 ||
    manifests.length === 0 ||
    maxHandoffBytes === null
  )
    throw new Error(
      "usage: ty-context design-resource bundle <draft-dir> <new-output-dir> --manifest <facts.json> [--manifest <facts.json> ...] --max-handoff-bytes <bytes> [--json]",
    );
  const result = await publishDesignResourceHandoffBundle({
    repository: process.cwd(),
    draft_directory: normalizeRepositoryCwd(
      positional[0],
      "design_resource_bundle_draft_directory",
    ),
    output_directory: normalizeRepositoryCwd(
      positional[1],
      "design_resource_bundle_output_directory",
    ),
    manifest_paths: manifests,
    max_handoff_bytes: maxHandoffBytes,
  });
  if (json) {
    process.stdout.write(canonicalJson(result));
    return;
  }
  console.log(
    `Design resource handoff bundle published: ${result.output_directory}`,
  );
  console.log(`Handoffs: ${result.handoffs.length}`);
  console.log(
    `Targets: ${result.handoffs.map((item) => item.target_key).join(", ")}`,
  );
}

function help(): void {
  console.log(`ty-context design-resource commands:
  preflight <handoff.md> [--json]
                       Validate one selected implementation handoff
  bundle <draft-dir> <new-output-dir> --manifest <facts.json> [...]
         --max-handoff-bytes <bytes> [--json]
                       Validate manifest-backed one-target handoffs and
                       atomically publish the complete target set; the
                       output parent directory must already exist
  recovery create <session> --input <state.json> [--json]
                       Create one explicit ignored task-local checkpoint
  recovery inspect <session> [--json]
                       Revalidate Base and derive replay/CAS state
  recovery preview <session> [--json]
                       Show the frozen exact writeback patch without writing
  recovery apply <session> --audit <audit.json> [--json]
                       CAS-apply and reread only after fresh balanced audit
  recovery remove <session> --expected-sha256 <sha256> [--json]
                       Remove only the digest-matched helper-owned checkpoint`);
}
