import { access, readFile } from "node:fs/promises";import path from "node:path";import { fileURLToPath } from "node:url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const required=["AGENTS.md","feature_list.json","studio/studio_state.json","studio/graph.md","apps/studio-server/server.mjs","apps/studio-web/public/index.html","apps/studio-web/public/app.js","apps/studio-web/public/styles.css","config/external-tools.lock.json","tools/adapters/rigging/doctor.py","docs/18-DEVSPACE-CONNECTIVITY.md","docs/19-CHATGPT-DEVSPACE-PERSISTENT-WORKSPACE.md","docs/22-MULTI-PROJECT-WORKSPACE-ARCHITECTURE.md","studio/contracts/game-project.schema.json","studio/contracts/project-work-item.schema.json","scripts/smoke-multi-project.mjs","config/devspace.example.json","tools/devspace-connectivity/doctor.py"];
const jsonFiles=["feature_list.json","studio/studio_state.json","config/external-tools.lock.json","studio/contracts/game-project.schema.json","studio/contracts/project-work-item.schema.json"];
const errors=[];for(const rel of required){try{await access(path.join(ROOT,rel))}catch{errors.push("missing: "+rel)}}
for(const rel of jsonFiles){try{JSON.parse(await readFile(path.join(ROOT,rel),"utf8"))}catch(e){errors.push("invalid json "+rel+": "+e.message)}}
if(errors.length){console.error("[KHOSAN SOURCE] FAIL\n - "+errors.join("\n - "));process.exit(1)}
console.log("[KHOSAN SOURCE] PASS");console.log(" - deployable Studio shell source present");console.log(" - multi-project workspace contracts present");console.log(" - core runtime JSON parses");
