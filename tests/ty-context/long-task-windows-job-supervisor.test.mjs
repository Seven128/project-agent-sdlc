import assert from "node:assert/strict";
import test from "node:test";

import * as windowsJobTestSupport from "./long-task-windows-job-supervisor-test-support.mjs";

import {
  assertAssignFailureCannotResume,
  assertPackedTarballUsesPackageHelper,
} from "./long-task-windows-job-supervisor-package-fixture.mjs";
import {
  assertPowerShellCompatibility,
  assertWindowsJobProtocol,
} from "./long-task-windows-job-supervisor-protocol-fixture.mjs";
import { assertWindowsJobRuntimeMatrix } from "./long-task-windows-job-supervisor-runtime-fixture.mjs";

test("Windows Job identity helper rejects missing, duplicate, and invalid process evidence", () => {
  const readFromRows =
    windowsJobTestSupport.readExpectedProcessIdentitiesFromRows;
  assert.equal(typeof readFromRows, "function");
  assert.throws(
    () =>
      readFromRows(
        [{ root_pid: 101 }, { child_pid: 102 }],
        ["root_pid", "child_pid", "grandchild_pid"],
      ),
    /missing_process_identity:grandchild_pid/u,
  );
  assert.throws(
    () =>
      readFromRows(
        [{ root_pid: 101 }, { child_pid: 101 }],
        ["root_pid", "child_pid"],
      ),
    /duplicate_process_identity/u,
  );
  assert.throws(
    () =>
      readFromRows(
        [{ root_pid: 101 }, { child_pid: 0 }],
        ["root_pid", "child_pid"],
      ),
    /invalid_process_identity/u,
  );
  assert.deepEqual(
    readFromRows(
      [{ root_pid: 101 }, { child_pid: 102 }, { grandchild_pid: 103 }],
      ["root_pid", "child_pid", "grandchild_pid"],
    ),
    {
      root_pid: 101,
      child_pid: 102,
      grandchild_pid: 103,
    },
  );
});

test("Windows Job supervisor result and stream protocol fails closed", async () => {
  await assertWindowsJobProtocol();
});

test(
  "canonical helper accepts strict UTF-8 requests on Windows PowerShell 5.1 and PowerShell 7",
  { skip: process.platform !== "win32" },
  async (t) => {
    await assertPowerShellCompatibility(t);
  },
);

test(
  "[critical:windows-job-pre-resume-containment] Windows contained execution closes short roots, descendants, timeout, overflow, and parallel Jobs",
  { skip: process.platform !== "win32" },
  async () => {
    await assertWindowsJobRuntimeMatrix();
  },
);

test(
  "AssignProcessToJobObject failure leaves the suspended product unable to escape",
  { skip: process.platform !== "win32" },
  async () => {
    await assertAssignFailureCannotResume();
  },
);

test(
  "the packed tarball runs its package-owned Windows Job helper",
  { skip: process.platform !== "win32" },
  async () => {
    await assertPackedTarballUsesPackageHelper();
  },
);
