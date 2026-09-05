import assert from "node:assert/strict";
import {mkdtemp,writeFile,rm} from "node:fs/promises";
import {spawnSync} from "node:child_process";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import test from "node:test";
import {runInit} from "../../packages/ty-context/dist/lib/init.js";
import {runDoctor} from "../../packages/ty-context/dist/lib/doctor.js";
const cli=fileURLToPath(new URL("../../packages/ty-context/dist/cli.js",import.meta.url));
test("doctor size advice is nonblocking by default and strict is an explicit choice",async(t)=>{
 const root=await mkdtemp(path.join(os.tmpdir(),"tiny-doctor-"));t.after(()=>rm(root,{recursive:true,force:true}));
 await runInit(root,{adopt:false,force:false});await writeFile(path.join(root,"project_context/global.md"),"Durable information.\n".repeat(100));
 const report=await runDoctor(root,{context_file_soft_budget_bytes:10});assert.deepEqual(report.errors,[]);assert.match(report.warnings.join("\n"),/Review long default Context/);
 const args=[cli,"doctor","--context-file-soft-budget","10"];
 assert.equal(spawnSync(process.execPath,args,{cwd:root}).status,0);
 assert.equal(spawnSync(process.execPath,[...args,"--strict"],{cwd:root}).status,1);
 assert.notEqual(spawnSync(process.execPath,[cli,"doctor","--max-line-length","20"],{cwd:root}).status,0);
});
