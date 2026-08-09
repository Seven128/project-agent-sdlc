# Process product fixture

This is the repository-owned product used by Long-Task process-observation controls and workload measurement. The product reads only `config/state.json` and emits the bounded `ty-context-product-observation-v1` interface on stdout. Expected values, Source, Context, Delivery Contracts, semantic manifests, reports, evidence, and test Oracles are deliberately outside its runtime closure.

Tests materialize a platform executable as the direct root and bind `src/product.mjs` plus `config/state.json` as production files. The Harness owns Expected and comparison; this product owns only Actual.
