#!/usr/bin/env node
import { commands } from "./commands/index.js";
import { cliExitCode } from "./lib/cli-exit.js";

const [command = "help", ...args] = process.argv.slice(2);

async function main(): Promise<void> {
  const handler = commands[command];
  if (!handler) throw new Error(`Unknown command: ${command}`);
  await handler(args);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`ty-context: ${message}`);
  process.exitCode = cliExitCode(error) ?? 1;
});
