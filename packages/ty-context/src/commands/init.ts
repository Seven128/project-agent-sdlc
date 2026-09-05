import { runInit } from "../lib/init.js";
import { normalizeHarnessFolderName } from "../lib/harness-root.js";
import { writePackageHarnessRoot } from "../lib/package-json-config.js";
import { assertSupportedSchema } from "../lib/schema-guard.js";

export async function init(args: string[]): Promise<void> {
  const projectRoot = process.cwd();
  await assertSupportedSchema(projectRoot, "init");
  let folder: string | undefined;
  const flags = new Set<string>();
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--adopt" || arg === "--force") flags.add(arg);
    else if (arg === "--harness-folder" || arg === "--harnessFolderName") {
      folder = args[++i];
      if (!folder || folder.startsWith("--"))
        throw new Error("--harness-folder requires a directory");
    } else if (
      arg.startsWith("--harness-folder=") ||
      arg.startsWith("--harnessFolderName=")
    )
      folder = arg.slice(arg.indexOf("=") + 1);
    else throw new Error("Unknown init argument: " + arg);
  }
  if (folder !== undefined)
    await writePackageHarnessRoot(
      projectRoot,
      normalizeHarnessFolderName(folder),
    );
  for (const line of await runInit(projectRoot, {
    adopt: flags.has("--adopt"),
    force: flags.has("--force"),
  }))
    console.log(line);
}
