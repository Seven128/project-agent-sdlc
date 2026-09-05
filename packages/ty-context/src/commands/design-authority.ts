import {
  inspectDesignAuthorityClosure,
  loadCurrentDesignAuthorityClosure,
} from "../lib/design-authority-closure.js";
import type { DesignAuthorityInspection } from "../lib/design-authority-types.js";
import { CLI_EXIT_CODES, CliCommandError } from "../lib/cli-exit.js";
import { canonicalJson } from "../lib/strict-codec.js";
import { projectDesignAuthorityTokensFromEntry } from "../lib/design-authority-tokens.js";

export async function designAuthority(args: string[]): Promise<void> {
  const [subcommand = "help", ...rest] = args;
  if (subcommand === "help" || subcommand === "--help" || subcommand === "-h") {
    console.log(help());
    return;
  }
  if (subcommand === "inspect") return inspect(rest);
  if (subcommand === "tokens") return tokens(rest);
  throw new CliCommandError(
    CLI_EXIT_CODES.arguments,
    `unknown design-authority subcommand: ${subcommand}`,
  );
}

async function inspect(args: string[]): Promise<void> {
  const { format, requireShowcase } = parseInspectOptions(args);
  const result = await inspectDesignAuthorityClosure(process.cwd());
  if (format === "json") process.stdout.write(canonicalJson(result));
  else process.stdout.write(renderInspection(result));
  if (
    result.status !== "valid" ||
    (requireShowcase && result.showcase.status !== "valid")
  )
    process.exitCode = CLI_EXIT_CODES.catalog;
}

async function tokens(args: string[]): Promise<void> {
  const fromEntry = args.length === 1 && args[0] === "--from-entry";
  if (args.length && !fromEntry)
    throw new CliCommandError(
      CLI_EXIT_CODES.arguments,
      "design-authority tokens accepts only --from-entry",
    );
  let projected: string | null = null;
  try {
    if (fromEntry) {
      const result = await projectDesignAuthorityTokensFromEntry(process.cwd());
      if (!result.success)
        throw new Error(`DESIGN.md is not locally exportable: ${result.error}`);
      projected = result.content;
    } else {
      const closure = await loadCurrentDesignAuthorityClosure(process.cwd());
      projected = closure.generated_tokens;
    }
  } catch (error) {
    throw new CliCommandError(
      CLI_EXIT_CODES.catalog,
      `cannot project Design Authority Tokens: ${message(error)}`,
      { cause: error },
    );
  }
  if (projected === null)
    throw new CliCommandError(
      CLI_EXIT_CODES.catalog,
      "cannot project Design Authority Tokens: DESIGN.md is not locally exportable",
    );
  process.stdout.write(projected);
}

function parseInspectOptions(args: string[]): {
  format: "text" | "json";
  requireShowcase: boolean;
} {
  let format: "text" | "json" = "text";
  let requireShowcase = false;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--json") format = "json";
    else if (argument === "--require-showcase") requireShowcase = true;
    else if (argument === "--format") {
      const value = args[index + 1];
      if (value !== "text" && value !== "json")
        throw new CliCommandError(
          CLI_EXIT_CODES.arguments,
          "design-authority inspect --format must be text or json",
        );
      format = value;
      index += 1;
    } else
      throw new CliCommandError(
        CLI_EXIT_CODES.arguments,
        `unknown design-authority inspect argument: ${argument}`,
      );
  }
  return { format, requireShowcase };
}

function renderInspection(result: DesignAuthorityInspection): string {
  const lines = [`Design Authority: ${result.status}`, `Mode: ${result.mode}`];
  if (result.identity) {
    lines.push(`Entry: ${result.identity.entry_path}`);
    lines.push(`Manifest: ${result.identity.manifest_path ?? "none (legacy)"}`);
    lines.push(`Closure digest: ${result.identity.closure_digest}`);
    lines.push(`Revision: ${result.identity.revision ?? "not declared"}`);
    lines.push(`Members: ${result.members.length}`);
    for (const member of result.members)
      lines.push(
        `  - ${member.path} (${member.kind}, ${member.normalized_bytes} bytes)`,
      );
  }
  if (result.diagnostics.length) {
    lines.push("Diagnostics:");
    for (const diagnostic of result.diagnostics)
      lines.push(
        `  - ${diagnostic.severity} ${diagnostic.code}${diagnostic.path ? ` [${diagnostic.path}]` : ""}: ${diagnostic.detail}`,
      );
  } else lines.push("Diagnostics: none");
  lines.push(`Showcase: ${result.showcase.status}`);
  if (result.showcase.manifest_path)
    lines.push(`Showcase manifest: ${result.showcase.manifest_path}`);
  if (result.showcase.indexes)
    lines.push(
      `Showcase indexes: ${result.showcase.indexes.token_families} token families, ${result.showcase.indexes.components} components, ${result.showcase.indexes.target_conditions} target conditions`,
    );
  if (result.showcase.diagnostics.length) {
    lines.push("Showcase diagnostics:");
    for (const diagnostic of result.showcase.diagnostics)
      lines.push(
        `  - ${diagnostic.severity} ${diagnostic.code}${diagnostic.path ? ` [${diagnostic.path}]` : ""}: ${diagnostic.detail}`,
      );
  } else lines.push("Showcase diagnostics: none");
  lines.push("Authority adoption: not performed");
  return `${lines.join("\n")}\n`;
}

function help(): string {
  return `ty-context design-authority commands:
  design-authority inspect [--format text|json] [--require-showcase]
                       Validate and explain the current complete closure;
                       optionally require its non-authoritative static showcase
  design-authority tokens [--from-entry]
                       Print the deterministic DTCG projection from DESIGN.md;
                       --from-entry permits read-only projection while a bundle
                       is being revised and its old digest is intentionally stale

Both commands are read-only. They never create a manifest, update a digest,
select a design direction or adopt a Design Authority revision.`;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
