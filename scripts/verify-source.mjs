import { access, readFile } from "node:fs/promises";import path from "node:path";import { fileURLToPath } from "node:url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const required=["AGENTS.md","feature_list.json","studio/studio_state.json","studio/graph.md","apps/studio-server/server.mjs","apps/studio-web/public/index.html","config/external-tools.lock.json","tools/adapters/rigging/doctor.py"];
const errors=[];for(const rel of required){try{await access(path.join(ROOT,rel))}catch{errors.push("missing: "+rel)}}
for(const rel of ["feature_list.json","studio/studio_state.json","config/external-tools.lock.json"]){try{JSON.parse(await readFile(path.join(ROOT,rel),"utf8"))}catch(e){errors.push("invalid json "+rel+": "+e.message)}}
if(errors.length){console.error("[KHOSAN SOURCE] FAIL\n - "+errors.join("\n - "));process.exit(1)}
console.log("[KHOSAN SOURCE] PASS");console.log(" - deployable Studio shell source present");console.log(" - core runtime JSON parses");
