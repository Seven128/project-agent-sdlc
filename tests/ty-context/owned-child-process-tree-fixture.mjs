import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";

const [pidPath, mode = "timeout"] = process.argv.slice(2);
if (!pidPath) throw new Error("owned_child_process_tree_fixture_arguments");

const descendant = spawn(
  process.execPath,
  ["-e", "setInterval(() => {}, 1_000)"],
  { windowsHide: true, stdio: "ignore" },
);
await writeFile(
  pidPath,
  JSON.stringify({ parent: process.pid, descendant: descendant.pid }),
  "utf8",
);
if (mode === "success-leak") descendant.unref();
if (mode === "output-limit")
  process.stdout.write(Buffer.alloc(3 * 1024 * 1024, 65));
if (mode !== "success-leak") setInterval(() => {}, 1_000);
