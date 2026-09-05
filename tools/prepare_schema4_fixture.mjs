import {execFileSync} from "node:child_process";
import {mkdtempSync,mkdirSync,openSync,closeSync,unlinkSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

export const SCHEMA4_BASELINE = "8cf2391295cbec271f148dc44f074bedeea767b5";
export function prepareSchema4Fixture(repository) {
 const parent=path.join(repository,".artifacts/schema4-fixtures");
 mkdirSync(parent,{recursive:true});
 const root=mkdtempSync(path.join(parent,"baseline-"));
 const archive=path.join(root,"source.tar");
 const descriptor=openSync(archive,"wx");
 try {execFileSync("git",["archive","--format=tar",SCHEMA4_BASELINE,"packages/ty-context","package.json","package-lock.json"],{cwd:repository,stdio:["ignore",descriptor,"pipe"]});}
 finally {closeSync(descriptor);}
 execFileSync("tar",["-xf",archive,"-C",root],{stdio:"pipe"});
 unlinkSync(archive);
 const packageRoot=path.join(root,"packages/ty-context");
 const npmCli=process.env.npm_execpath ?? path.join(path.dirname(process.execPath),"node_modules/npm/bin/npm-cli.js");
 execFileSync(process.execPath,[npmCli,"ci","--ignore-scripts","--no-audit","--no-fund"],{cwd:root,stdio:"pipe",windowsHide:true});
 execFileSync(process.execPath,[path.join(root,"node_modules/typescript/lib/tsc.js"),"-p",path.join(packageRoot,"tsconfig.json")],{cwd:root,stdio:"pipe",windowsHide:true});
 return packageRoot;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
 console.log(prepareSchema4Fixture(path.resolve(fileURLToPath(new URL("..",import.meta.url)))));
}
