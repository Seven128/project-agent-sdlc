# Opt-in DRA Visual Diagnostic

This directory belongs to the existing delivery-benchmark owner. It defines a descriptive visual comparison, not another admission track.

`protocol.json` freezes eight representative cases, five generation routes, ten review dimensions, at least three repeats, blinded randomized review and the no-ranking/no-threshold boundary. Every actual run must bind each route to an immutable Provider/Skill/version/commit identity and use the exact fixed case input. Results may describe the observed cases and raw limitations only.

Validate the frozen boundary:

```sh
node examples/delivery-benchmark/mechanism/runner/visual_diagnostic.mjs freeze-check
```

For an actual run, prepare a private bindings file with schema `dra-visual-diagnostic-bindings-v1`, the current `protocol_sha256`, and exactly one `variant_bindings` row per protocol variant. Each row supplies `variant_key`, `execution_route_identity`, `provider_identity`, `provider_version`, immutable `implementation_commit_or_tag`, `model_identity`, `reasoning_effort` and `capability_evidence_ref`. Then create a blinded schedule in a previously nonexistent artifact directory:

```sh
node examples/delivery-benchmark/mechanism/runner/visual_diagnostic.mjs prepare \
  --bindings .artifacts/dra-visual/bindings.json \
  --run-id dra-visual-01 \
  --seed <operator-secret-randomization-seed> \
  --repeats 3 \
  --out .artifacts/dra-visual/dra-visual-01
```

`blind-review.json` contains only opaque item keys, fixed case inputs and the complete review rubric. Keep `private-key.json` away from evaluators until every review is frozen. Fill every rubric row with one declared finding plus notes and record raw limitations; do not compute a winner, threshold or route preference.

The diagnostic never changes DRA admission, package publication, Provider routing or design selection. It does not produce a preferred Provider, score threshold, majority rule or registry. A future durable routing policy requires a separate `delivery-benchmark` owner change which freezes evaluators, order, baseline, thresholds and expiry before data collection.

No Provider run or visual-quality claim is committed with the protocol. Actual artifacts and reviews stay under `.artifacts/**` unless separate lifecycle governance authorizes a sanitized descriptive report.
