import assert from "node:assert/strict";
import {rm} from "node:fs/promises";
import test from "node:test";
import {loadContextCatalog} from "../../packages/ty-context/dist/lib/context-catalog/catalog-load.js";
import {runValidator} from "../../packages/ty-context/dist/lib/validators.js";
import {createContextProject} from "./context-manifest-fixtures.mjs";

const marker=(file,domain="technical")=>`<!-- ty-context-controlling-source domain="${domain}" path="${file}" -->`;
async function project(t,content,extraFiles={}) {
 const root=await createContextProject({extraFiles:{"project_context/global.md":content,...extraFiles}});
 t.after(()=>rm(root,{recursive:true,force:true}));return root;
}
test("explicit local dependencies are validated, ordinary links and code examples are not",async(t)=>{
 const root=await project(t,`${marker("docs/api.md")}\n[Historical](missing.md)\n\`future-output.json\`\n`,{"docs/api.md":"API requirements"});
 assert.deepEqual((await runValidator(root,"validate-context")).errors,[]);
});
test("a design owner can declare a local adopted entry without recursively validating or defaulting its resources",async(t)=>{
 const entry="docs/design-resources/web/results/ADOPTED.md";
 const root=await project(t,"# Facts\n",{
   "project_context/areas/main.md":`# Results\n\n${marker(entry,"design")}\n`,
   [entry]:`# Current result-list composition\n
[Editable source](source/missing.html)
![Current reference](reference/missing.png)
[Native resource](source/current.design)
[Remote prototype](https://design.example.invalid/current)
${marker("docs/design-resources/web/results/nested-missing.md","design")}
`,
   "docs/design-resources/web/results/source/current.design":Buffer.from([0xff,0x00])
 });
 assert.deepEqual((await runValidator(root,"validate-context")).errors,[]);
 const catalog=await loadContextCatalog(root);
 const contextPaths=["project_context/architecture.md","project_context/areas/main.md","project_context/areas/main/verification.md","project_context/global.md"];
 assert.deepEqual([...catalog.default_footprint.keys()].sort(),contextPaths);
 assert.deepEqual(catalog.context_files.map(file=>file.path).sort(),contextPaths);
});
test("a missing adopted design entry reports its owning Context and exact declaration line",async(t)=>{
 const entry="docs/design-resources/web/results/ADOPTED.md";
 const root=await project(t,"# Facts\n",{
   "project_context/areas/main.md":`# Results\n\n${marker(entry,"design")}\n`
 });
 assert.deepEqual((await runValidator(root,"validate-context")).errors,[
   `project_context/areas/main.md:3 declared local dependency ${entry}: missing`
 ]);
});
test("declared local dependency syntax, missing files and noncanonical paths produce located errors",async(t)=>{
 for(const [value,expected] of [
 ['<!-- ty-context-controlling-source path="docs/api.md" domain="technical" -->',/invalid declared dependency/],
 [marker("missing.md"),/declared local dependency missing.md: missing/],
 [marker("../outside.md"),/declared local dependency .*: invalid/],
 [marker("docs\\api.md"),/declared local dependency .*: invalid/]
 ]) {
   const root=await project(t,value,{"docs/api.md":"API"});
   const errors=(await runValidator(root,"validate-context")).errors.join("\n");
   assert.match(errors,expected);assert.match(errors,/project_context\/global.md:1/);
 }
});
test("duplicate or conflicting explicit source ownership remains a structural diagnostic",async(t)=>{
 const root=await project(t,marker("docs/api.md"),{"docs/api.md":"API","project_context/other.md":marker("docs/api.md","product")});
 assert.match((await runValidator(root,"validate-context")).errors.join("\n"),/domain_conflict controlling-source declarations/);
});
test("retired validators fail explicitly rather than accepting weaker checks",async(t)=>{
 const root=await project(t,"# Facts\nTODO\nVersion 1 tests passed.");
 assert.deepEqual((await runValidator(root,"validate-context")).errors,[]);
 for(const command of ["validate-harness","validate-code-modularity","validate-plan"])
   assert.match((await runValidator(root,command)).errors.join("\n"),/retired or unknown/);
});
