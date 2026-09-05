import assert from "node:assert/strict";
import {mkdtemp,mkdir,readFile,writeFile,rm,symlink} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {runInit} from "../../packages/ty-context/dist/lib/init.js";
import {runSync} from "../../packages/ty-context/dist/lib/sync-engine.js";
import {runDoctor} from "../../packages/ty-context/dist/lib/doctor.js";
import {writePackageHarnessRoot} from "../../packages/ty-context/dist/lib/package-json-config.js";

async function fixture(t){const root=await mkdtemp(path.join(os.tmpdir(),"tiny-maintenance-"));t.after(()=>rm(root,{recursive:true,force:true}));return root;}
test("sync preserves user prose, durable files and unrelated local Skills",async(t)=>{
 const root=await fixture(t);await runInit(root,{adopt:false,force:false});
 const agents=path.join(root,"AGENTS.md"),global=path.join(root,"project_context/global.md");
 await writeFile(agents,"User before\n"+await readFile(agents,"utf8")+"User after\n");
 await writeFile(global,"Confirmed user decision");
 await mkdir(path.join(root,".agent/skills/my-skill"),{recursive:true});await writeFile(path.join(root,".agent/skills/my-skill/SKILL.md"),"User skill");
 const before=await readFile(agents);assert.deepEqual((await runSync(root)).changed,[]);
 assert.deepEqual(await readFile(agents),before);assert.equal(await readFile(global,"utf8"),"Confirmed user decision");
 assert.equal(await readFile(path.join(root,".agent/skills/my-skill/SKILL.md"),"utf8"),"User skill");
});
test("malformed managed markers block without overwriting startup text",async(t)=>{
 const root=await fixture(t);await runInit(root,{adopt:false,force:false});
 const file=path.join(root,"AGENTS.md"),content="User text\n<!-- ty-context:managed:begin -->\nMissing end";await writeFile(file,content);
 assert.ok((await runSync(root)).blocked.length);assert.equal(await readFile(file,"utf8"),content);
});
test("init and sync refuse linked destinations without changing the external target",async(t)=>{
 const outside=await fixture(t);await writeFile(path.join(outside,"outside.md"),"External original");
 const root=await fixture(t);await symlink(path.join(outside,"outside.md"),path.join(root,"AGENTS.md"),"file");
 await assert.rejects(runInit(root,{adopt:false,force:false}),/symlink/);
 assert.equal(await readFile(path.join(outside,"outside.md"),"utf8"),"External original");
 const linked=await fixture(t);await symlink(outside,path.join(linked,"project_context"),process.platform==="win32"?"junction":"dir");
 await assert.rejects(runInit(linked,{adopt:false,force:false}),/symlink|outside/);
 await assert.rejects(readFile(path.join(outside,"global.md")),{code:"ENOENT"});
});
test("custom roots preserve package fields and cannot hide an existing installation",async(t)=>{
 const root=await fixture(t);await writeFile(path.join(root,"package.json"),' {"name":"user-project","private":true}\n');
 await writePackageHarnessRoot(root,".codex");await runInit(root,{adopt:true,force:false});
 const pkg=JSON.parse(await readFile(path.join(root,"package.json"),"utf8"));assert.equal(pkg.name,"user-project");assert.equal(pkg.private,true);
 const before=await readFile(path.join(root,"package.json"));
 await assert.rejects(writePackageHarnessRoot(root,".other"),/cannot relocate/);assert.deepEqual(await readFile(path.join(root,"package.json")),before);
});
test("doctor reports observable startup shadowing without requiring design scaffolding",async(t)=>{
 const root=await fixture(t);await runInit(root,{adopt:false,force:false});
 await writeFile(path.join(root,"AGENTS.override.md"),"User override");
 const report=await runDoctor(root);assert.deepEqual(report.errors,[]);assert.match(report.warnings.join("\n"),/AGENTS.override.md/);
 await assert.rejects(readFile(path.join(root,"DESIGN.md")),{code:"ENOENT"});
});
