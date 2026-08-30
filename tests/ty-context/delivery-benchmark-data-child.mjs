import { readFile } from "node:fs/promises";
import vm from "node:vm";

const [sourcePath] = process.argv.slice(2);
if (!sourcePath) throw new Error("delivery_benchmark_data_child_arguments");

const source = await readFile(sourcePath, "utf8");
const context = { window: {} };
vm.runInNewContext(source, context, {
  filename: "benchmark-data.js",
  timeout: 1_000,
});
process.stdout.write(
  JSON.stringify(context.window.__DELIVERY_BENCHMARK_DATA__),
);
