import { parseDesignResourceRecoveryCreateInput } from "../lib/design-resource-recovery-codec.js";
import { readRecoveryRepositoryFile } from "../lib/design-resource-recovery-files.js";
import {
  applyDesignResourceRecoveryWriteback,
  createDesignResourceRecoveryCheckpoint,
  inspectDesignResourceRecovery,
  previewDesignResourceRecoveryWriteback,
  removeDesignResourceRecoveryCheckpoint,
} from "../lib/design-resource-recovery.js";
import { canonicalJson } from "../lib/strict-codec.js";

export async function designResourceRecoveryCommand(
  args: string[],
): Promise<void> {
  const [action, sessionId, ...rest] = args;
  if (!action || !sessionId)
    throw new Error(
      "usage: ty-context design-resource recovery <create|inspect|preview|apply|remove> <session> [options]",
    );
  const options = recoveryOptions(rest);
  let result: unknown;
  if (action === "create")
    result = await create(process.cwd(), sessionId, options);
  else if (action === "inspect") {
    assertNoValueOptions(options, action);
    result = await inspectDesignResourceRecovery(process.cwd(), sessionId);
  } else if (action === "preview") {
    assertNoValueOptions(options, action);
    result = await previewDesignResourceRecoveryWriteback(
      process.cwd(),
      sessionId,
    );
  } else if (action === "apply")
    result = await apply(process.cwd(), sessionId, options);
  else if (action === "remove")
    result = await remove(process.cwd(), sessionId, options);
  else throw new Error(`Unknown design-resource recovery action: ${action}`);
  if (options.json) process.stdout.write(canonicalJson(result));
  else printRecoveryResult(action, result);
  if (
    action === "apply" &&
    (result as { status?: string }).status === "blocked"
  )
    process.exitCode = 2;
}

interface RecoveryOptions {
  input?: string;
  audit?: string;
  expectedSha256?: string;
  json: boolean;
}

async function create(
  repository: string,
  sessionId: string,
  options: RecoveryOptions,
): Promise<unknown> {
  if (!options.input || options.audit || options.expectedSha256)
    usage("create <session> --input <state.json>");
  const inputSnapshot = await readRecoveryRepositoryFile(
    repository,
    options.input,
    "design_resource_recovery_create_input",
  );
  const input = parseDesignResourceRecoveryCreateInput(
    inputSnapshot.bytes.toString("utf8"),
  );
  if (input.session_id !== sessionId)
    throw new Error(
      "design_resource_recovery_invalid:create_session_identity_mismatch",
    );
  return createDesignResourceRecoveryCheckpoint(repository, input);
}

async function apply(
  repository: string,
  sessionId: string,
  options: RecoveryOptions,
): Promise<unknown> {
  if (!options.audit || options.input || options.expectedSha256)
    usage("apply <session> --audit <audit.json>");
  return applyDesignResourceRecoveryWriteback(
    repository,
    sessionId,
    options.audit,
  );
}

async function remove(
  repository: string,
  sessionId: string,
  options: RecoveryOptions,
): Promise<unknown> {
  if (!options.expectedSha256 || options.input || options.audit)
    usage("remove <session> --expected-sha256 <sha256>");
  return removeDesignResourceRecoveryCheckpoint(
    repository,
    sessionId,
    options.expectedSha256,
  );
}

function recoveryOptions(args: string[]): RecoveryOptions {
  const result: RecoveryOptions = { json: false };
  for (let index = 0; index < args.length; index += 1) {
    const item = args[index];
    if (item === "--json") {
      result.json = true;
      continue;
    }
    const value = args[index + 1];
    if (!value || value.startsWith("--"))
      throw new Error(`${item} requires a value`);
    if (item === "--input") result.input = value;
    else if (item === "--audit") result.audit = value;
    else if (item === "--expected-sha256") result.expectedSha256 = value;
    else throw new Error(`Unknown design-resource recovery option: ${item}`);
    index += 1;
  }
  return result;
}

function assertNoValueOptions(options: RecoveryOptions, action: string): void {
  if (options.input || options.audit || options.expectedSha256)
    usage(`${action} <session>`);
}

function usage(value: string): never {
  throw new Error(
    `usage: ty-context design-resource recovery ${value} [--json]`,
  );
}

function printRecoveryResult(action: string, result: unknown): void {
  const row = result as Record<string, unknown>;
  if (action === "create") {
    console.log(`DRA recovery checkpoint: ${row.status}`);
    console.log(`Path: ${row.checkpoint_path}`);
    console.log(`SHA-256: ${row.checkpoint_raw_byte_digest}`);
    return;
  }
  if (action === "inspect" || action === "preview") {
    printInspection(row);
    if (action === "preview") printPatch(row);
    return;
  }
  if (action === "apply") {
    console.log(`DRA writeback: ${row.status}`);
    console.log(`Write transaction: ${row.write_transaction}`);
    console.log(`Reconciliation: ${JSON.stringify(row.reconciliation)}`);
    return;
  }
  console.log(`DRA recovery checkpoint removed: ${row.path}`);
}

function printInspection(row: Record<string, unknown>): void {
  const replay = row.replay as {
    base: { locator: string; raw_byte_digest: string };
    ordered_active_accepted_deltas: unknown[];
    rejected_deltas: unknown[];
    unresolved_deltas: unknown[];
    explicitly_unchanged_keys: string[];
  };
  console.log(`Base: ${replay.base.locator}@${replay.base.raw_byte_digest}`);
  console.log(
    `Delta: ${replay.ordered_active_accepted_deltas.length} accepted / ${replay.rejected_deltas.length} rejected / ${replay.unresolved_deltas.length} unresolved`,
  );
  console.log(
    `Explicitly unchanged: ${replay.explicitly_unchanged_keys.join(", ") || "none"}`,
  );
  console.log(`Writeback: ${JSON.stringify(row.writeback)}`);
}

function printPatch(row: Record<string, unknown>): void {
  const patch = row.patch as {
    patch: {
      operations: Array<{
        operation_id: string;
        target_keys: string[];
        before_text: string;
        after_text: string;
      }>;
    };
  };
  for (const operation of patch.patch.operations) {
    console.log(
      `Patch ${operation.operation_id} [${operation.target_keys.join(", ")}]:`,
    );
    console.log(`- ${operation.before_text}`);
    console.log(`+ ${operation.after_text}`);
  }
}
