import { runDoctor } from "../lib/doctor.js";
import { CONTEXT_DOCTOR_DEFAULTS } from "../lib/context-doctor/context-doctor-types.js";

interface DoctorCommandOptions {
  strict: boolean;
  help: boolean;
  context_file_soft_budget_bytes: number;
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
  };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--strict") options.strict = true;
    else if (argument === "--help" || argument === "-h") options.help = true;
    else if (argument === "--context-file-soft-budget")
      index = readPositiveInteger(args, index, argument, (value) => {
        options.context_file_soft_budget_bytes = value;
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
  return "ty-context doctor [--strict] [--context-file-soft-budget <bytes>]\nChecks installation, structural Context, default body sizes and observable root startup overrides. Size findings are advisory unless --strict is selected; this does not verify factual or product correctness.";
}
