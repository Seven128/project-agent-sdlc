import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {cp,mkdtemp,mkdir,readFile,readdir,rm,writeFile} from "node:fs/promises";
import {createRequire} from "node:module";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import test from "node:test";

const repository=fileURLToPath(new URL("../..",import.meta.url));
const npmCli=process.env.npm_execpath ?? path.join(path.dirname(process.execPath),"node_modules/npm/bin/npm-cli.js");
const designSkillFiles=["SKILL.md","agents/openai.yaml","references/adoption.md","references/stitch.md"];
function run(cwd,args) {
  const result=spawnSync(process.execPath,args,{cwd,encoding:"utf8",windowsHide:true});
  assert.equal(result.status,0,`${args.join(" ")}\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}
async function files(root,relative="") {
  const result=[];
  for(const entry of await readdir(path.join(root,relative),{withFileTypes:true})) {
    const child=relative?`${relative}/${entry.name}`:entry.name;
    if(entry.isDirectory())result.push(...await files(root,child));else result.push(child);
  }
  return result.sort();
}

test("actual tarball supports optional design resources, minimal init and real schema4 upgrade without retired runtime",async(t)=>{
  const baseline=process.env.TY_CONTEXT_SCHEMA4_ROOT;
  assert.ok(baseline,"The package suite must prepare the pinned schema4 baseline");
  const root=await mkdtemp(path.join(os.tmpdir(),"tiny-tarball-"));
  t.after(()=>rm(root,{recursive:true,force:true}));
  let tarball,entries;
  if (process.env.TY_CONTEXT_TARBALL) {
    tarball=path.resolve(process.env.TY_CONTEXT_TARBALL);
    const listing=spawnSync("tar",["-tf",tarball],{encoding:"utf8",windowsHide:true});
    assert.equal(listing.status,0,listing.stderr);
    entries=listing.stdout.trim().split(/\r?\n/).map(file=>file.replace(/^package\//,""));
  } else {
    const packed=JSON.parse(run(path.join(repository,"packages/ty-context"),[npmCli,"pack","--ignore-scripts","--json","--pack-destination",root]));
    assert.equal(packed.length,1);
    entries=packed[0].files.map(file=>file.path);
    tarball=path.join(root,packed[0].filename);
  }
  assert.ok(entries.includes("dist/cli.js"));assert.ok(entries.includes("assets/agents/AGENTS_CORE.md"));
  assert.ok(entries.includes("migrations/schema-4-owned-assets.json"));
  assert.deepEqual(entries.filter(file=>file.startsWith("assets/skills/")).sort(),
    designSkillFiles.map(file=>`assets/skills/design-resource/${file}`));
  assert.ok(!entries.some(file=>/^(?:dist\/.*(?:long-task|design-resource|design-authority|symbolic)|assets\/(?:runtime|templates))/.test(file)));
  run(root,[npmCli,"install","--ignore-scripts","--no-audit","--no-fund",tarball]);
  const installed=path.join(root,"node_modules/project-tiny-context-harness"),cli=path.join(installed,"dist/cli.js");
  const packagedSkill=path.join(installed,"assets/skills/design-resource");
  const canonicalSkill=path.join(repository,".codex/ty-context-managed/skills/design-resource");
  assert.deepEqual(await files(path.join(installed,"assets/skills")),designSkillFiles.map(file=>`design-resource/${file}`));
  assert.deepEqual(await files(canonicalSkill),designSkillFiles);
  for(const file of designSkillFiles) {
    // Source parity permits CRLF normalization; preserve every other byte here.
    const expected=(await readFile(path.join(canonicalSkill,file),"utf8")).replace(/\r\n/g,"\n");
    assert.equal((await readFile(path.join(packagedSkill,file),"utf8")).replace(/\r\n/g,"\n"),expected,file);
  }
  const {parse:parseYaml}=createRequire(path.join(installed,"package.json"))("yaml");
  const skillMetadata=parseYaml(await readFile(path.join(packagedSkill,"agents/openai.yaml"),"utf8"));
  assert.deepEqual(skillMetadata.dependencies.tools.map(({type,value,transport,url})=>({type,value,transport,url})),[
    {type:"mcp",value:"stitch",transport:"streamable_http",url:"https://stitch.googleapis.com/mcp"},
  ]);
  const pkg=JSON.parse(await readFile(path.join(installed,"package.json"),"utf8"));
  for(const name of ["@google/design.md","impeccable","re2js"])assert.equal(pkg.dependencies[name],undefined);
  const fresh=path.join(root,"fresh");await mkdir(fresh);
  run(fresh,[cli,"init"]);
  assert.deepEqual(await files(fresh),[".agent/config.yaml","AGENTS.md","project_context/context.toml","project_context/global.md"]);
  const startup=await readFile(path.join(fresh,"AGENTS.md"),"utf8");
  assert.ok(startup.includes((await readFile(path.join(installed,"assets/agents/AGENTS_CORE.md"),"utf8")).trim()));
  run(fresh,[cli,"sync"]);assert.equal(await readFile(path.join(fresh,"AGENTS.md"),"utf8"),startup);
  assert.deepEqual(await files(fresh),[".agent/config.yaml","AGENTS.md","project_context/context.toml","project_context/global.md"]);
  const defaults=JSON.parse(run(fresh,[cli,"context","list","--default","--json"]));
  assert.equal(defaults.complete,true);
  assert.deepEqual(defaults.files.map(file=>file.path),["project_context/global.md"]);
  run(fresh,[cli,"validate-context"]);
  for(const command of ["long-task","design-resource","design-authority"]) {
    const retired=spawnSync(process.execPath,[cli,command,"help"],{cwd:fresh,encoding:"utf8",windowsHide:true});
    assert.notEqual(retired.status,0);
    assert.match(retired.stderr,/retired in schema 5/);
  }
  const localSkill=path.join(fresh,".codex/skills/design-resource");
  await mkdir(path.dirname(localSkill),{recursive:true});
  await cp(packagedSkill,localSkill,{recursive:true});
  assert.deepEqual(await files(localSkill),designSkillFiles);
  const localEdits=new Map();
  for(const file of designSkillFiles) {
    const copied=await readFile(path.join(localSkill,file));
    assert.deepEqual(copied,await readFile(path.join(packagedSkill,file)),file);
    const edited=Buffer.concat([copied,Buffer.from("\nProject-local resource guidance.\n")]);
    await writeFile(path.join(localSkill,file),edited);
    localEdits.set(file,edited);
  }
  const optedInFiles=await files(fresh);
  run(fresh,[cli,"sync"]);
  assert.deepEqual(await files(fresh),optedInFiles);
  for(const [file,edited] of localEdits)assert.deepEqual(await readFile(path.join(localSkill,file)),edited,file);
  assert.equal(await readFile(path.join(fresh,"AGENTS.md"),"utf8"),startup);
  assert.deepEqual(JSON.parse(run(fresh,[cli,"context","list","--default","--json"])),defaults);
  run(fresh,[cli,"validate-context"]);
  const legacy=path.join(root,"legacy");await mkdir(legacy);
  run(legacy,[path.join(baseline,"dist/cli.js"),"init","--adopt","--harness-folder",".agent"]);
  const legacyGlobal=await readFile(path.join(legacy,"project_context/global.md"));
  run(legacy,[cli,"upgrade","--sessions-stopped"]);
  assert.deepEqual(await readFile(path.join(legacy,"project_context/global.md")),legacyGlobal);
  run(legacy,[cli,"sync"]);run(legacy,[cli,"validate-context"]);
  assert.match(await readFile(path.join(legacy,".agent/config.yaml"),"utf8"),/schema_version: ["']?5/);
});
