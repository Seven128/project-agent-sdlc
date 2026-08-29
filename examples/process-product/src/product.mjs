import { readFile } from "node:fs/promises";

const supportedOutcomes = ["first", "second"];
const requestedScope = process.argv[2] ?? "all";
const selectedOutcomes =
  requestedScope === "all" ? supportedOutcomes : [requestedScope];

if (selectedOutcomes.some((outcome) => !supportedOutcomes.includes(outcome)))
  throw new Error(`process_product_scope_unknown:${requestedScope}`);

const state = JSON.parse(
  await readFile(new URL("../config/state.json", import.meta.url), "utf8"),
);
const observations = {};

for (const outcome of selectedOutcomes) {
  const observable = state[outcome] === true;
  const relationsApplicable = state[`${outcome}_relations_applicable`] === true;
  const assertion = (key) => `assertion.${outcome}.${outcome}-check.${key}`;

  observations[`fact.${outcome}.observable`] = observable;
  observations[`fact.${outcome}.architecture-boundary`] = observable;
  observations[assertion(`${outcome}-result`)] = observable;
  observations[assertion(`${outcome}-requirement`)] = observable;
  observations[assertion(`${outcome}-obligation`)] = observable;
  observations[assertion(`${outcome}-liveness`)] = true;
  observations[assertion(`${outcome}-relations-na`)] = relationsApplicable;
  if (outcome === "first")
    observations[assertion("first-architecture")] = observable;
}

process.stdout.write(
  `${JSON.stringify({
    schema_version: "ty-context-product-observation-v1",
    observations,
  })}\n`,
);
