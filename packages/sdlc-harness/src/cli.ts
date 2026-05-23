#!/usr/bin/env node
import { commands } from "./commands/index.js";

const [command = "help", ...args] = process.argv.slice(2);

async function main(): Promise<void> {
  const handler = commands[command] ?? commands.help;
  await handler(args);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`sdlc-harness: ${message}`);
  process.exitCode = 1;
});
