import {mkdtemp,mkdir,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import path from "node:path";
import {strict as assert} from "node:assert";
import {inspectProjectContent} from "../apps/studio-server/project-inventory.mjs";
const root=await mkdtemp(path.join(tmpdir(),"khosan-inventory-"));
try {
 for(const p of ["assets/props","world","gameplay","ui","narrative","shaders","tests","builds"])await mkdir(path.join(root,p),{recursive:true});
 await writeFile(path.join(root,"project.json"),JSON.stringify({id:"fixture"}));
 await writeFile(path.join(root,"world","scene.json"),JSON.stringify({entities:[{id:"house-1"}]}));
 await writeFile(path.join(root,"gameplay","systems.json"),JSON.stringify({systems:["movement","dialogue"]}));
 await writeFile(path.join(root,"assets","props","house.obj"),"o house\n");
 await writeFile(path.join(root,"ui","hud.json"),"{}");
 const s=await inspectProjectContent(root);
 assert.equal(s.groups.assets.files,1);
 assert.equal(s.groups.world.files,1);
 assert.equal(s.groups.gameplay.files,1);
 assert.equal(s.groups.ui.files,1);
 assert.equal(s.file_count,4);
 assert.equal(s.documents["world/scene.json"].entities[0].id,"house-1");
 assert.equal(s.documents["gameplay/systems.json"].systems[0],"movement");
 console.log("[KHOSAN INVENTORY] PASS: real game folders indexed and JSON content previewed");
} finally {await rm(root,{recursive:true,force:true})}
