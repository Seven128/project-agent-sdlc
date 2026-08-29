export const CLI_EXIT_CODES = {
  success: 0,
  arguments: 2,
  catalog: 3,
  incomplete: 4,
  io: 5,
  internal: 6,
} as const;

export type CliExitCode = (typeof CLI_EXIT_CODES)[keyof typeof CLI_EXIT_CODES];

export class CliCommandError extends Error {
  readonly exit_code: CliExitCode;

  constructor(exitCode: CliExitCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "CliCommandError";
    this.exit_code = exitCode;
  }
}

export function cliExitCode(error: unknown): CliExitCode | null {
  return error instanceof CliCommandError ? error.exit_code : null;
}
