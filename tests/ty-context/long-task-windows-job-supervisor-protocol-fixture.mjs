import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  assertFreshWindowsJobStreamTarget,
  createWindowsJobSupervisorRequest,
  parseWindowsJobSupervisorResult,
  readWindowsJobStream,
} from "../../packages/ty-context/dist/lib/long-task-windows-job-supervisor-protocol.js";
import {
  optionalPwshExecutable,
  packagedHelperRoot,
  runPowerShellHelper,
  validSupervisorResult,
  windowsPowerShellExecutable,
} from "./long-task-windows-job-supervisor-test-support.mjs";

export async function assertWindowsJobProtocol() {
  const requestId = "request-a";
  const valid = validSupervisorResult(requestId);
  assert.equal(
    parseWindowsJobSupervisorResult(JSON.stringify(valid), requestId).exit_code,
    0,
  );
  await assert.rejects(
    async () =>
      parseWindowsJobSupervisorResult(
        JSON.stringify({ ...valid, Unexpected: true }),
        requestId,
      ),
    /process_observer_windows_job_result_invalid:response_fields/u,
  );
  const missing = structuredClone(valid);
  delete missing.WallClockId;
  await assert.rejects(
    async () =>
      parseWindowsJobSupervisorResult(JSON.stringify(missing), requestId),
    /process_observer_windows_job_result_invalid:response_fields/u,
  );
  const duplicate = JSON.stringify(valid).replace(
    `"RequestId":"${requestId}"`,
    `"RequestId":"${requestId}","RequestId":"${requestId}"`,
  );
  await assert.rejects(
    async () => parseWindowsJobSupervisorResult(duplicate, requestId),
    /process_observer_windows_job_result_invalid:response_json/u,
  );
  await assert.rejects(
    async () =>
      parseWindowsJobSupervisorResult(JSON.stringify(valid), "request-b"),
    /process_observer_windows_job_result_invalid:response_identity/u,
  );
  for (const change of [
    { ActiveProcessesAtResult: 1 },
    { DescendantsCleaned: false },
  ])
    await assert.rejects(
      async () =>
        parseWindowsJobSupervisorResult(
          JSON.stringify({ ...valid, ...change }),
          requestId,
        ),
      /process_observer_descendant_process_alive/u,
    );
  await assert.rejects(
    async () =>
      parseWindowsJobSupervisorResult(
        JSON.stringify({
          RequestId: requestId,
          Error: "formal_process_supervisor_assign_process_to_job",
        }),
        requestId,
      ),
    /process_observer_windows_job_unavailable:formal_process_supervisor_assign_process_to_job/u,
  );

  const root = await mkdtemp(path.join(os.tmpdir(), "windows-job-protocol-"));
  try {
    const stream = path.join(root, "stdout.bin");
    await assertFreshWindowsJobStreamTarget(stream);
    await writeFile(stream, Buffer.from("exact-stream", "utf8"));
    await assert.rejects(
      assertFreshWindowsJobStreamTarget(stream),
      /process_observer_windows_job_result_invalid:stream_preexisting/u,
    );
    assert.equal(
      (
        await readWindowsJobStream(
          stream,
          Buffer.byteLength("exact-stream"),
          1024,
        )
      ).toString("utf8"),
      "exact-stream",
    );
    await assert.rejects(
      readWindowsJobStream(stream, 1, 1024),
      /process_observer_windows_job_result_invalid:stream_identity/u,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

export async function assertPowerShellCompatibility(t) {
  const runtimes = [
    {
      label: "Windows PowerShell 5.1",
      executable: await windowsPowerShellExecutable(),
    },
  ];
  const pwsh = await optionalPwshExecutable();
  if (pwsh) runtimes.push({ label: "PowerShell 7", executable: pwsh });
  else
    t.diagnostic(
      "PowerShell 7 is not installed; optional compatibility probe skipped",
    );

  for (const runtime of runtimes)
    await t.test(runtime.label, async () => {
      const root = await mkdtemp(
        path.join(os.tmpdir(), "windows-job-powershell-"),
      );
      try {
        const request = createWindowsJobSupervisorRequest({
          requestId: `runtime-${randomUUID()}`,
          executable: process.execPath,
          argv: [
            "-e",
            "process.stdout.write(process.argv[1] + '|' + process.env.TY_CONTEXT_UNICODE_TEST)",
            "参数 with spaces",
          ],
          cwd: root,
          stdoutPath: path.join(root, "stdout.bin"),
          stderrPath: path.join(root, "stderr.bin"),
          timeoutMs: 5_000,
          combinedOutputLimitBytes: 2 * 1024 * 1024,
          environment: {
            ...process.env,
            TY_CONTEXT_UNICODE_TEST: "环境值",
          },
        });
        const validLine = JSON.stringify(request);
        const missing = structuredClone(request);
        delete missing.stderr_path;
        const unknown = { ...request, unexpected: true };
        const duplicate = validLine.replace(
          `"request_id":"${request.request_id}"`,
          '"request_id":"duplicate-a","request_id":"duplicate-b"',
        );
        const response = await runPowerShellHelper(
          runtime.executable,
          path.join(packagedHelperRoot, "windows_job_process_supervisor.ps1"),
          [
            validLine,
            JSON.stringify(missing),
            JSON.stringify(unknown),
            duplicate,
          ],
        );
        assert.equal(response.stderr, "");
        const lines = response.stdout.trim().split(/\r?\n/u);
        assert.equal(lines.length, 4);
        const result = parseWindowsJobSupervisorResult(
          lines[0],
          request.request_id,
        );
        assert.equal(
          (
            await readWindowsJobStream(
              request.stdout_path,
              result.stdout_bytes,
              request.combined_output_limit_bytes,
            )
          ).toString("utf8"),
          "参数 with spaces|环境值",
        );
        for (const line of lines.slice(1)) {
          const failure = JSON.parse(line);
          assert.deepEqual(Object.keys(failure).sort(), ["Error", "RequestId"]);
          assert.equal(failure.RequestId, null);
          assert.match(
            failure.Error,
            /formal_process_supervisor_request_(?:shape|duplicate_field)/u,
          );
        }
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    });
}
