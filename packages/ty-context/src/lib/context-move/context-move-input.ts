import { CLI_EXIT_CODES, CliCommandError } from "../cli-exit.js";
import { normalizeContextFilePath } from "../context-create/context-create-path.js";

export interface NormalizedContextMoveInput {
  from_path: string;
  to_path: string;
}

export function normalizeContextMoveInput(input: {
  from_path: string;
  to_path: string;
}): NormalizedContextMoveInput {
  const from = normalizeContextFilePath(input.from_path, "context move --from");
  const to = normalizeContextFilePath(input.to_path, "context move --to");
  if (from === to)
    invalid("context move --from and --to must be different paths");
  if (fold(from) === fold(to))
    invalid("context move does not support case-only path changes");
  return { from_path: from, to_path: to };
}

function fold(value: string): string {
  return value.normalize("NFC").toLocaleLowerCase("en-US");
}

function invalid(message: string): never {
  throw new CliCommandError(CLI_EXIT_CODES.arguments, message);
}
