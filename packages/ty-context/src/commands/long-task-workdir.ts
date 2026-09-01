import { realpath } from "node:fs/promises";
import path from "node:path";

export async function resolveLongTaskCommandWorkdir(
  subcommand: string,
  workdirArgument: string | undefined,
): Promise<string> {
  if (!workdirArgument) throw new Error(`${subcommand} requires <workdir>`);
  const lexicalWorkdir = path.resolve(process.cwd(), workdirArgument);
  if (subcommand === "init") return lexicalWorkdir;
  return canonicalLongTaskCommandWorkdir(
    lexicalWorkdir,
    subcommand === "abandon",
  );
}

export async function canonicalLongTaskCommandWorkdir(
  workdir: string,
  allowMissing: boolean,
): Promise<string> {
  try {
    return await realpath(workdir);
  } catch (error) {
    if (
      allowMissing &&
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    )
      return workdir;
    throw error;
  }
}
