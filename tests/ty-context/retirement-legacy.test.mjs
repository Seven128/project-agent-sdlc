import assert from "node:assert/strict";
import {mkdtemp,readFile,writeFile,rm,mkdir} from "node:fs/promises";
import {pathToFileURL} from "node:url";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {spawnSync} from "node:child_process";
import {createHash} from "node:crypto";
import {runUpgradeReport} from "../../packages/ty-context/dist/lib/upgrade.js";
import {runSync} from "../../packages/ty-context/dist/lib/sync-engine.js";
import {runSchema5Retirement,RETIREMENT_PENDING} from "../../packages/ty-context/dist/lib/retirement-runner.js";
import {loadContextCatalog} from "../../packages/ty-context/dist/lib/context-catalog/catalog-load.js";

// The full package regression prepares this pinned baseline once. Never use @latest.
const baseline = process.env.TY_CONTEXT_SCHEMA4_ROOT;
if (!baseline) throw new Error("Set TY_CONTEXT_SCHEMA4_ROOT to the built, pinned 8cf2391 package root; see tools/prepare_schema4_fixture.mjs.");
const old = async (file) => import(pathToFileURL(path.join(baseline,"dist/lib",file)).href);
const {runInit:oldInit} = await old("init.js");
async function fixture(t) {
 const root=await mkdtemp(path.join(os.tmpdir(),"tiny-v4-retire-"));
 t.after(()=>rm(root,{recursive:true,force:true}));
 await oldInit(root,{adopt:false,force:false});
 return root;
}

test("actual schema-4 installation upgrades and preserves body defaults and user files",async(t)=>{
 const root=await fixture(t);
 await writeFile(path.join(root,"user.txt"),"preserve me");
 const before=[...(await loadContextCatalog(root)).default_footprint.keys()];
 const report=await runUpgradeReport(root,{sessions_stopped:true});
 assert.equal(report.blocked,false,report.lines.join("\n"));
 assert.deepEqual([...(await loadContextCatalog(root)).default_footprint.keys()],before);
 assert.equal(await readFile(path.join(root,"user.txt"),"utf8"),"preserve me");
 assert.deepEqual((await runSync(root)).changed,[]);
});

for (const mode of ["complete","rollback"]) test(`old move interrupted -> blocked upgrade -> compatible ${mode} -> successful upgrade`,async(t)=>{
 const root=await fixture(t);
 const {planContextMove}=await old("context-move/context-move.js");
 const {registerContext}=await old("context-register/context-register.js");
 const {executeContextMutationPlan}=await old("context-mutation/mutation-commit.js");
 const recovery=await old("context-mutation/mutation-recovery.js");
 await writeFile(path.join(root,"project_context/areas/extra.md"),await readFile(path.join(root,"project_context/areas/main.md")));
 await registerContext({project_root:root,context_path:"project_context/areas/extra.md",role:"domain",read_policy:"on-demand",apply:true});
 const planned=await planContextMove({project_root:root,from_path:"project_context/areas/extra.md",to_path:"project_context/areas/renamed.md"});
 assert.equal(planned.result.can_apply,true);
 await assert.rejects(executeContextMutationPlan(root,planned.plan,{fault_after:`published_before_journal:${planned.plan.files[0].path}`}),/fault_injected/);
 const config=await readFile(path.join(root,".agent/config.yaml"),"utf8");
 const blocked=await runUpgradeReport(root,{sessions_stopped:true});
 assert.equal(blocked.blocked,true);
 assert.match(blocked.lines.join("\n"),/unfinished Context transaction/);
 assert.equal(await readFile(path.join(root,".agent/config.yaml"),"utf8"),config);
 await (mode === "complete" ? recovery.completeContextMutation : recovery.rollbackContextMutation)(root);
 const report=await runUpgradeReport(root,{sessions_stopped:true});
 assert.equal(report.blocked,false,report.lines.join("\n"));
});

test("upgrade interrupted after manifest publication blocks sync and resumes from saved file state",async(t)=>{
 const root=await fixture(t);
 await assert.rejects(runSchema5Retirement(root,{sessions_stopped:true,checkpoint:async(name)=>{if(name==="published:project_context/context.toml") throw new Error("stop fixture");}}),/stop fixture/);
 await assert.rejects(runSync(root),/upgrade_incomplete/);
 await readFile(path.join(root,RETIREMENT_PENDING));
 const report=await runUpgradeReport(root,{sessions_stopped:true});
 assert.equal(report.blocked,false,report.lines.join("\n"));
 await assert.rejects(readFile(path.join(root,RETIREMENT_PENDING)),{code:"ENOENT"});
});

test("modified managed Skill blocks retirement without replacing the old startup entry",async(t)=>{
 const root=await fixture(t);
 const skill=path.join(root,".agent/skills/context_product_plan/SKILL.md");
 await writeFile(skill,(await readFile(skill,"utf8"))+"\nUser customization\n");
 const agents=await readFile(path.join(root,"AGENTS.md"),"utf8");
 const report=await runUpgradeReport(root,{sessions_stopped:true});
 assert.equal(report.blocked,true);
 assert.match(report.lines.join("\n"),/modified old executable guidance/);
 assert.equal(await readFile(path.join(root,"AGENTS.md"),"utf8"),agents);
});

test("mixed hooks and Makefile keep user entries, additional Skill files block",async(t)=>{
 const root=await fixture(t);
 const make=await readFile(path.join(root,"Makefile"),"utf8");
 await writeFile(path.join(root,"Makefile"),make+"\nuser-target:\n\t@echo user\n");
 await mkdir(path.join(root,".codex"),{recursive:true});
 const command=`node "${path.join(root,"node_modules/project-tiny-context-harness/dist/long-task-hook.js")}"`;
 const user={type:"command",command:"echo keep-user",timeout:10};
 await writeFile(path.join(root,".codex/hooks.json"),JSON.stringify({custom:"keep",hooks:{Stop:[{hooks:[{type:"command",command,commandWindows:command,statusMessage:"Tiny Context long-task live authority gate",timeout:3600},user]}]}}));
 const extra=path.join(root,".agent/skills/context_product_plan/my-rules.md");
 await writeFile(extra,"My own rules");
 let report=await runUpgradeReport(root,{sessions_stopped:true});
 assert.equal(report.blocked,true); assert.match(report.lines.join("\n"),/additional user Skill content/);
 assert.equal(await readFile(extra,"utf8"),"My own rules");
 await rm(extra); // fixture explicitly resolves its own customization
 report=await runUpgradeReport(root,{sessions_stopped:true});
 assert.equal(report.blocked,false,report.lines.join("\n"));
 assert.deepEqual(JSON.parse(await readFile(path.join(root,".codex/hooks.json"),"utf8")),{custom:"keep",hooks:{Stop:[{hooks:[user]}]}});
 const after=await readFile(path.join(root,"Makefile"),"utf8");
 assert.match(after,/user-target:\n\t@echo user/); assert.doesNotMatch(after,/ty-context-managed\/make/);
});

test("pending migration cannot be redirected away from its immutable original plan",async(t)=>{
 const root=await fixture(t);
 await assert.rejects(runSchema5Retirement(root,{sessions_stopped:true,checkpoint:async(name)=>{if(name==="prepared")throw Error("stop");}}),/stop/);
 const file=path.join(root,RETIREMENT_PENDING),journal=JSON.parse(await readFile(file,"utf8"));
 journal.defaults.push("project_context/forged.md");
 await writeFile(file,JSON.stringify(journal));
 const report=await runUpgradeReport(root,{sessions_stopped:true});
 assert.equal(report.blocked,true); assert.match(report.lines.join("\n"),/upgrade_journal_plan_changed/);
 assert.match(await readFile(path.join(root,".agent/config.yaml"),"utf8"),/schema_version: ["']?4/);
});

test("current declared symbolic source blocks, ordinary old-resource links and historical records are retained for review",async(t)=>{
 const root=await fixture(t),global=path.join(root,"project_context/global.md");
 await writeFile(path.join(root,"selected.yaml"),'schema_version: design-resource-handoff-v2\nrepresentation: symbolic_rules_v2\n');
 const original=await readFile(global,"utf8");
 await writeFile(global,original+'\n<!-- ty-context-controlling-source domain="design" path="selected.yaml" -->\n');
 let report=await runUpgradeReport(root,{sessions_stopped:true});
 assert.equal(report.blocked,true); assert.match(report.lines.join("\n"),/selected.yaml.*requires retired interpretation/);
 for (const schema of ["semantic-fact-compact-carrier-v1","long-task-compact-carrier-v1"]) {
  await writeFile(path.join(root,"selected.yaml"),`schema_version: ${schema}\n`);
  report=await runUpgradeReport(root,{sessions_stopped:true});
  assert.equal(report.blocked,true); assert.ok(report.lines.some(line=>line.includes(schema)&&line.includes("requires retired interpretation")));
 }
 await writeFile(path.join(root,"selected.yaml"),'representation: symbolic_rules_v2\n');
 // A project can replace the current requirement with a directly readable extraction.
 await writeFile(path.join(root,"extracted.md"),'Adopted value: spacing 12 px.\nSource: [selected.yaml](selected.yaml).\n');
 await writeFile(global,original+'\n<!-- ty-context-controlling-source domain="design" path="extracted.md" -->\nHistory: old Final Gate passed.\n[Old record](../selected.yaml)\n');
 report=await runUpgradeReport(root,{sessions_stopped:true});
 assert.equal(report.blocked,false,report.lines.join("\n"));
 assert.match(report.lines.join("\n"),/project_context\/global.md:\d+: review old workflow wording/);
 assert.match(await readFile(path.join(root,"selected.yaml"),"utf8"),/symbolic_rules_v2/);
});

test("active package build commands are diagnosed before retiring their implementation",async(t)=>{
 const root=await fixture(t);
 await writeFile(path.join(root,"package.json"),JSON.stringify({scripts:{tokens:"ty-context design-authority tokens export --output tokens.css"}}));
 const report=await runUpgradeReport(root,{sessions_stopped:true});
 assert.equal(report.blocked,true); assert.match(report.lines.join("\n"),/package.json scripts.tokens/);
 assert.match(await readFile(path.join(root,".agent/config.yaml"),"utf8"),/schema_version: ["']?4/);
});

test("retirement removes only the target worktree record and local marker",async(t)=>{
 const root=await fixture(t);
 const git=(...args)=>{const r=spawnSync("git",args,{cwd:root,encoding:"utf8",windowsHide:true});assert.equal(r.status,0,r.stderr);return r.stdout.trim();};
 git("init","-q");
 const normalized=path.resolve(root).replaceAll("\\","/");
 const identity="wt-"+createHash("sha256").update(process.platform==="win32"?normalized.toLowerCase():normalized).digest("hex");
 const relative=`ty-context/long-task/worktrees/${identity}/active.json`,common=git("rev-parse","--path-format=absolute","--git-common-dir");
 await mkdir(path.dirname(path.join(common,relative)),{recursive:true});
 await writeFile(path.join(common,relative),JSON.stringify({schema_version:"active-long-task-authority-v3",worktree_identity:identity,repository_root:root}));
 git("config","--local",`ty-context.longTask.${identity}`,"own-binding");
 const sibling=path.join(common,"ty-context/long-task/worktrees/wt-sibling/active.json");
 await mkdir(path.dirname(sibling),{recursive:true}); await writeFile(sibling,"sibling bytes");
 git("config","--local","ty-context.longTask.wt-sibling","sibling-binding");
 const report=await runUpgradeReport(root,{sessions_stopped:true});
 assert.equal(report.blocked,false,report.lines.join("\n"));
 await assert.rejects(readFile(path.join(common,relative)),{code:"ENOENT"});
 assert.equal(await readFile(sibling,"utf8"),"sibling bytes");
 assert.equal(git("config","--local","--get","ty-context.longTask.wt-sibling"),"sibling-binding");
 assert.equal(spawnSync("git",["config","--local","--get",`ty-context.longTask.${identity}`],{cwd:root}).status,1);
});

test("baseline old sync and fixed-root init refuse schema5; old enable partial config mutation is rejected by the new writer",async(t)=>{
 const root=await fixture(t);
 const report=await runUpgradeReport(root,{sessions_stopped:true});
 assert.equal(report.blocked,false,report.lines.join("\n"));
 const cli=path.join(baseline,"dist/cli.js"),agents=await readFile(path.join(root,"AGENTS.md"));
 for (const args of [["sync"],["init","--adopt","--harness-folder",".agent"]]) {
   const result=spawnSync(process.execPath,[cli,...args],{cwd:root,encoding:"utf8",windowsHide:true});
   assert.notEqual(result.status,0,result.stdout); assert.match(result.stderr,/schema/);
   assert.deepEqual(await readFile(path.join(root,"AGENTS.md")),agents);
 }
 const configBefore=await readFile(path.join(root,".agent/config.yaml"));
 const enabled=spawnSync(process.execPath,[cli,"enable","long-task"],{cwd:root,encoding:"utf8",windowsHide:true});
 assert.notEqual(enabled.status,0);
 const configAfter=await readFile(path.join(root,".agent/config.yaml"));
 assert.notDeepEqual(configAfter,configBefore);
 assert.match(configAfter.toString(),/profiles:/);
 await assert.rejects(runSync(root),/retired_config_fields/);
 assert.deepEqual(await readFile(path.join(root,"AGENTS.md")),agents);
});

test("baseline bare init can reselect a different root and reinstall old assets; new writer refuses the resulting schema4",async(t)=>{
 const root=await fixture(t);
 assert.equal((await runUpgradeReport(root,{sessions_stopped:true})).blocked,false);
 const cli=path.join(baseline,"dist/cli.js");
 const result=spawnSync(process.execPath,[cli,"init","--adopt"],{cwd:root,encoding:"utf8",windowsHide:true});
 assert.equal(result.status,0,result.stderr);
 const pkg=JSON.parse(await readFile(path.join(root,"package.json"),"utf8"));
 assert.equal(pkg.tyContext.harnessFolderName,".codex");
 assert.match(await readFile(path.join(root,".codex/config.yaml"),"utf8"),/schema_version: ["']?4/);
 assert.match(await readFile(path.join(root,"AGENTS.md"),"utf8"),/Long-Task/);
 await assert.rejects(runSync(root),/upgrade_required/);
});
