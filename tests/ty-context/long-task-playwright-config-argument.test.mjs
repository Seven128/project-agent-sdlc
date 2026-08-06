import assert from "node:assert/strict";
import test from "node:test";

import { playwrightConfigArgument } from "../../packages/ty-context/dist/lib/long-task-runner-freeze.js";

test("explicit Playwright config arguments are frozen instead of an unrelated nearest default", () => {
  assert.equal(
    playwrightConfigArgument(["--config", "miniapp/playwright.config.mjs"]),
    "miniapp/playwright.config.mjs",
  );
  assert.equal(
    playwrightConfigArgument(["--config=miniapp/playwright.config.mjs"]),
    "miniapp/playwright.config.mjs",
  );
  assert.equal(playwrightConfigArgument(["--project", "mobile"]), null);
});

test("missing or ambiguous explicit Playwright config fails closed", () => {
  assert.throws(
    () => playwrightConfigArgument(["--config"]),
    /playwright_config_argument_missing/u,
  );
  assert.throws(
    () =>
      playwrightConfigArgument([
        "--config",
        "one.mjs",
        "--config=two.mjs",
      ]),
    /playwright_config_argument_ambiguous/u,
  );
});
