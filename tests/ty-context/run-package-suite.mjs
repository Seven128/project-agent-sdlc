import {spawnSync} from "node:child_process";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {prepareSchema4Fixture} from "../../tools/prepare_schema4_fixture.mjs";

const repository=fileURLToPath(new URL("../..",import.meta.url));
if (process.argv.length>2) throw Error("Run the package suite without retired workflow/sentinel options. Use node --test <files> for focused work.");
const tests=[
 "minimal-context.test.mjs","context-catalog.test.mjs","context-default-footprint.test.mjs",
 "context-create.test.mjs","context-register.test.mjs","context-register-transaction.test.mjs",
 "context-move.test.mjs","context-move-markdown-links.test.mjs","context-inspect.test.mjs",
 "context-manifest-parser.test.mjs","context-manifest-hardening.test.mjs","context-manifest-lossless-patch.test.mjs",
 "context-markdown-analysis.test.mjs","export-context.test.mjs","export-source-pack.test.mjs",
 "harness-root.test.mjs","package-source.test.mjs","retirement-legacy.test.mjs","tarball-consumer.test.mjs",
 "validators.test.mjs","sync-init-doctor.test.mjs","context-doctor.test.mjs","minimal-context-sample.test.mjs"
];
console.log(`Package regression: ${tests.length} files; Context, file safety, maintenance, export and pinned old-version migration.`);
console.log("Preparing isolated schema-4 baseline dependencies from its committed lockfile (test-only).");
const baseline=prepareSchema4Fixture(repository);
const result=spawnSync(process.execPath,["--test","--test-concurrency=4",...tests.map(file=>path.join(repository,"tests/ty-context",file))],{cwd:repository,env:{...process.env,TY_CONTEXT_SCHEMA4_ROOT:baseline},stdio:"inherit",windowsHide:true});
if(result.error)throw result.error;
process.exitCode=result.status ?? 1;
