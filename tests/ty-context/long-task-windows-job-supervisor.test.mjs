import test from "node:test";

import {
  assertAssignFailureCannotResume,
  assertPackedTarballUsesPackageHelper,
} from "./long-task-windows-job-supervisor-package-fixture.mjs";
import {
  assertPowerShellCompatibility,
  assertWindowsJobProtocol,
} from "./long-task-windows-job-supervisor-protocol-fixture.mjs";
import { assertWindowsJobRuntimeMatrix } from "./long-task-windows-job-supervisor-runtime-fixture.mjs";

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
