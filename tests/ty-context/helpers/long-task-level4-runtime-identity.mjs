import { readFile } from "node:fs/promises";
import path from "node:path";
import { deriveFormalRuntimeTcbIdentity } from "../../../tools/long_task_formal_runtime_tcb.mjs";
import { realProcessRoiBenchmarkImplementationPaths } from "../../../tools/long_task_real_process_roi_runner.mjs";
import {
  canonical,
  sha256,
} from "../../../tools/long_task_real_process_roi_scoring.mjs";
import { digest } from "./long-task-level4-test-utils.mjs";

export async function buildLevel4RuntimeTcbIdentity(
  repositoryRoot,
  providerModel = null,
) {
  const entries = [];
  for (const relative of realProcessRoiBenchmarkImplementationPaths) {
    const bytes = await readFile(path.join(repositoryRoot, ...relative.split("/")));
    entries.push({ path: relative, bytes: bytes.length, sha256: digest(bytes) });
  }
  entries.sort((left, right) => left.path.localeCompare(right.path));
  const benchmarkImplementationIdentity = {
    entries,
    identity_sha256: sha256(canonical(entries)),
  };
  const environment = {
    platform: process.platform,
    arch: process.arch,
    node: process.version,
    node_exec_path: process.execPath,
  };
  const runtimeTcbIdentity = await deriveFormalRuntimeTcbIdentity({
    environment,
    benchmarkImplementationIdentity,
    providerModel,
  });
  return { runtimeTcbIdentity, benchmarkImplementationIdentity, environment };
}
