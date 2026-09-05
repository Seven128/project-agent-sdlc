import { loadContextCatalog } from "../lib/context-catalog/catalog-load.js";
import { CLI_EXIT_CODES, CliCommandError } from "../lib/cli-exit.js";

export async function contextList(args: string[]): Promise<void> {
  if (
    !args.includes("--default") ||
    args.some((arg) => !["--default", "--json"].includes(arg))
  )
    throw new Error("Usage: ty-context context list --default [--json]");
  const catalog = await loadContextCatalog(process.cwd());
  const complete = !catalog.diagnostics.some(
    (entry) => entry.severity === "error",
  );
  const files = [...catalog.default_footprint].map(([path, reasons]) => ({
    path,
    reasons: [...reasons],
  }));
  if (args.includes("--json"))
    console.log(
      JSON.stringify(
        { complete, files, diagnostics: catalog.diagnostics },
        null,
        2,
      ),
    );
  else {
    console.log(
      complete ? "Default body files:" : "Incomplete default body selection:",
    );
    for (const file of files)
      console.log(`${file.path} (${file.reasons.join(", ")})`);
    for (const entry of catalog.diagnostics)
      console.log(`${entry.severity}: ${entry.message}`);
  }
  if (!complete)
    throw new CliCommandError(
      CLI_EXIT_CODES.catalog,
      "Default Context selection is incomplete; resolve relevant diagnostics. Failure does not mean there are no other defaults.",
    );
}
