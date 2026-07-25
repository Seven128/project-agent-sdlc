import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const runDir = path.resolve(process.argv[2] ?? process.cwd());
const checks = [];
async function check(id, label, action) {
  try { await action(); checks.push({ id, label, passed: true }); }
  catch (error) { checks.push({ id, label, passed: false, detail: error instanceof Error ? error.message : String(error) }); }
}
const load = (relative) => import(`${pathToFileURL(path.join(runDir, relative)).href}?probe=${Date.now()}-${Math.random()}`);

const { renderInvoiceBoard } = await load("src/ui/invoiceBoard.mjs");
const invoice = { id: "INV-1", total: 19.5, status: "draft", region: "US" };
const ready = renderInvoiceBoard([invoice]);
const loading = renderInvoiceBoard([], "loading");
const empty = renderInvoiceBoard([]);
const error = renderInvoiceBoard([], "error");

await check("UIUX-001", "surface, density, layout and column order match the selected target", () => {
  assert.equal(ready.surface, "invoice-board");
  assert.equal(ready.density, "compact");
  assert.equal(ready.layout, "desktop-table");
  assert.deepEqual(ready.columns, ["id", "status", "region", "total"]);
});
await check("UIUX-002", "ready rows preserve target component presentation and token", () => {
  assert.deepEqual(ready.rows, [{
    id: "INV-1",
    status: "draft",
    region: "US",
    total: 19.5,
    statusPresentation: "badge",
    statusToken: "--invoice-status-accent"
  }]);
});
await check("UIUX-003", "loading semantics match selected content and accessibility facts", () => {
  assert.equal(loading.message, "Loading invoice queue");
  assert.equal(loading.role, "status");
  assert.equal(loading.live, "polite");
  assert.equal(loading.ariaLabel, "Invoices");
});
await check("UIUX-004", "empty state preserves selected copy and asset semantics", () => {
  assert.equal(empty.message, "No invoices yet");
  assert.equal(empty.asset, "invoice-stack");
  assert.equal(empty.assetDecorative, true);
});
await check("UIUX-005", "error state preserves the selected retry control", () => {
  assert.equal(error.message, "Invoice board unavailable");
  assert.deepEqual(error.action, { id: "retry-invoices", label: "Retry" });
});
await check("UIUX-006", "motion facts preserve full and reduced-motion values", () => {
  assert.deepEqual(ready.motion, { durationMs: 120, reducedMotionDurationMs: 0 });
});
await check("UIUX-007", "the formal Agent run invoked successful shared handoff preflight", async () => {
  const events = (await readFile(path.join(runDir, ".benchmark", "ty-context-events.ndjson"), "utf8"))
    .trim().split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line));
  assert.ok(events.some((event) =>
    event.command === "design-resource preflight"
    && event.status === 0
    && event.argv.includes("design/handoffs/invoice-board.md")
  ));
});

const passed = checks.filter((item) => item.passed).length;
process.stdout.write(`${JSON.stringify({
  available: true,
  confidence: "high",
  data_source: "hidden_uiux_recovery_probe",
  passed,
  total: checks.length,
  decision: passed === checks.length ? "PASS" : "WARN",
  checks
})}\n`);
