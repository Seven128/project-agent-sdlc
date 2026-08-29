import { runDoctor } from "../lib/doctor.js";
import { CONTEXT_DOCTOR_DEFAULTS } from "../lib/context-doctor/context-doctor-types.js";

interface DoctorCommandOptions {
  strict: boolean;
  help: boolean;
  context_file_soft_budget_bytes: number;
  long_line_code_points: number;
  trigger_fanout_contexts: number;
}

export async function doctor(args: string[] = []): Promise<void> {
  const options = parseDoctorArgs(args);
  if (options.help) {
    console.log(doctorHelp());
    return;
  }
  const report = await runDoctor(process.cwd(), options);
  for (const line of report.info) {
    console.log(line);
  }
  for (const warning of report.warnings) {
    console.warn(`warning: ${warning}`);
  }
  for (const error of report.errors) {
    console.error(`error: ${error}`);
  }
  if (
    report.errors.length > 0 ||
    (options.strict && report.warnings.length > 0)
  ) {
    process.exitCode = 1;
  }
}

function parseDoctorArgs(args: string[]): DoctorCommandOptions {
  const options: DoctorCommandOptions = {
    strict: false,
    help: false,
    context_file_soft_budget_bytes:
      CONTEXT_DOCTOR_DEFAULTS.context_file_soft_budget_bytes,
    long_line_code_points: CONTEXT_DOCTOR_DEFAULTS.long_line_code_points,
    trigger_fanout_contexts: CONTEXT_DOCTOR_DEFAULTS.trigger_fanout_contexts,
  };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--strict") options.strict = true;
    else if (argument === "--help" || argument === "-h") options.help = true;
    else if (argument === "--max-line-length")
      index = readPositiveInteger(args, index, argument, (value) => {
        options.long_line_code_points = value;
      });
    else if (argument === "--context-file-soft-budget")
      index = readPositiveInteger(args, index, argument, (value) => {
        options.context_file_soft_budget_bytes = value;
      });
    else if (argument === "--trigger-fanout-threshold")
      index = readPositiveInteger(args, index, argument, (value) => {
        options.trigger_fanout_contexts = value;
      });
    else throw new Error(`unknown doctor argument: ${argument}`);
  }
  return options;
}

function readPositiveInteger(
  args: string[],
  index: number,
  flag: string,
  apply: (value: number) => void,
): number {
  const raw = args[index + 1];
  if (!raw) throw new Error(`doctor ${flag} requires a positive integer`);
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || String(parsed) !== raw)
    throw new Error(`doctor ${flag} requires a positive integer`);
  apply(parsed);
  return index + 1;
}

function doctorHelp(): string {
  return `ty-context doctor [--strict]
  [--max-line-length <code-points>]
  [--context-file-soft-budget <bytes>]
  [--trigger-fanout-threshold <contexts>]

All new size, line, fan-out, unregistered-file, explicit-link and stable-key
findings are advisory by default. --strict is opt-in and exits nonzero when a
warning exists; projects must adopt it explicitly before using it in CI.`;
}
