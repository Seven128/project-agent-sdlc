# Package verification

Use Node.js 24 or newer and npm ci. npm run build --workspace project-tiny-context-harness clears generated dist and compiles TypeScript. npm test runs the ordinary package regression; focused work can run node --test on affected files after building.

Keep tests for Context parsing/defaults/Unicode, explicit references, creation/mutation/concurrency/recovery, safe installation, exports/redaction and source parity. Pinned baseline migration tests prepare isolated 8cf2391 sources with their committed dependency lock; old dependencies are test-only. The Git object must be present (CI fetch-depth 0). Never replace the fixture with latest or manually fabricated old recovery behavior.

Distribution changes also require source sync twice with no second change, check-source, and actual tarball clean-consumer init and upgrade checks. After changes rerun affected checks on the final candidate. Windows results do not establish Linux case-sensitive behavior; retain platform-conditional tests and report skips.

No test identity proof, critical sentinel, ROI theorem or workflow completion certificate is part of package validation. Product/model quality is outside these structural and software checks.
