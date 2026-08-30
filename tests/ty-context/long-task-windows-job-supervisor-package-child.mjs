const [moduleUrl, script, root] = process.argv.slice(2);
if (!moduleUrl || !script || !root)
  throw new Error("windows_job_package_child_arguments");

const commandModule = await import(moduleUrl);
const execution = await commandModule.spawnCommandOnce(
  process.execPath,
  [script],
  root,
  3_000,
  process.env,
  true,
);
process.stdout.write(
  `${JSON.stringify({
    exit_code: execution.exit_code,
    stdout_base64: execution.stdout.toString("base64"),
  })}\n`,
);
