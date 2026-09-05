import {spawnSync} from "node:child_process";
import {rmSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const repository=fileURLToPath(new URL("..",import.meta.url));
const packageRoot=path.resolve(repository,"packages/ty-context");
const output=path.resolve(packageRoot,"dist");
if (path.dirname(output)!==packageRoot || path.basename(output)!=="dist") throw Error("Unsafe build output path");
// Clean generated output so retired modules cannot remain in the tarball.
rmSync(output,{recursive:true,force:true});
const result=spawnSync(process.execPath,[path.join(repository,"node_modules/typescript/lib/tsc.js"),"-p",path.join(packageRoot,"tsconfig.json")],{cwd:repository,stdio:"inherit",windowsHide:true});
if (result.error) throw result.error;
process.exitCode=result.status ?? 1;
