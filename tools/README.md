# Repository tools

Current package maintenance uses build_package.mjs, prepare_schema4_fixture.mjs and prepare_release.mjs. Package regression is selected in tests/ty-context/run-package-suite.mjs. verify_active_source_portability.mjs is an optional local path audit.

The launch_*, external_pr_*, github_*, npm_publish_access_check and sync_release_version helpers belong to the historical launch kit. They are not invoked by current package CI or required for 0.12.0 release preparation. Their old document assumptions and external publishing actions require separate review before reuse. Retained historical tests for these helpers are not part of the current package regression suite.
