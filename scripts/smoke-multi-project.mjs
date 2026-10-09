import { mkdtemp, rm, access, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import net from "node:net";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SERVER = path.join(ROOT, "apps/studio-server/server.mjs");
const dataRoot = await mkdtemp(path.join(tmpdir(), "khosan-workspace-"));
const projectsRoot = path.join(dataRoot, "Projects");

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.once("error", reject);
    s.listen(0, "127.0.0.1", () => {
      const port = s.address().port;
      s.close(() => resolve(port));
    });
  });
}
function startServer(port) {
  return spawn(process.execPath, [SERVER], {
    cwd: ROOT,
    env: {...process.env, KHOSAN_HOST:"127.0.0.1", KHOSAN_PORT:String(port), KHOSAN_PROJECTS_DIR:projectsRoot},
    stdio:["ignore","pipe","pipe"]
  });
}
async function waitHealth(base) {
  let last;
  for (let i=0;i<50;i++) {
    try {
      const r=await fetch(base+"/api/health");
      if(r.ok)return r.json();
    } catch(e) { last=e; }
    await new Promise(r=>setTimeout(r,100));
  }
  throw last || new Error("Studio health timeout");
}
async function request(base, url, options={}) {
  const r=await fetch(base+url,{headers:{"content-type":"application/json"},...options});
  const body=await r.json();
  if(!r.ok)throw new Error(url+" -> "+r.status+" "+JSON.stringify(body));
  return body;
}
async function stop(child) {
  if(!child || child.killed)return;
  child.kill();
  await new Promise(resolve => {
    const timer=setTimeout(resolve,1500);
    child.once("exit",()=>{clearTimeout(timer);resolve()});
  });
}

let server;
try {
  const port=await freePort();
  const base="http://127.0.0.1:"+port;
  server=startServer(port);
  const health=await waitHealth(base);
  if(health.version!=="0.2.0" || !health.multi_project) throw new Error("unexpected health payload");

  const a=await request(base,"/api/projects",{method:"POST",body:JSON.stringify({name:"Smoke Game A",brief:"A",activate:true})});
  const b=await request(base,"/api/projects",{method:"POST",body:JSON.stringify({name:"Smoke Game B",brief:"B",activate:true})});
  if(a.project.id===b.project.id)throw new Error("project IDs collided");

  for(const p of [a.project.id,b.project.id]) {
    await access(path.join(projectsRoot,p,"khosan-project.json"));
    await access(path.join(projectsRoot,p,".khosan","project-state.json"));
    await access(path.join(projectsRoot,p,"assets","source"));
    await access(path.join(projectsRoot,p,"world"));
    await access(path.join(projectsRoot,p,"gameplay"));
    await access(path.join(projectsRoot,p,"ui"));
  }

  let library=await request(base,"/api/project-library");
  if(library.projects.length!==2)throw new Error("expected two projects");
  if(library.active_project_id!==b.project.id)throw new Error("newest project should be active");

  await request(base,"/api/projects/"+encodeURIComponent(a.project.id)+"/activate",{method:"POST",body:"{}"});
  let routed=await request(base,"/api/orchestrate",{method:"POST",body:JSON.stringify({text:"render the reference scene"})});
  if(routed.project_context?.project_id!==a.project.id)throw new Error("routing did not use Game A");
  if(routed.routing?.lane!=="reference-reconstruction")throw new Error("reference route mismatch");

  await writeFile(path.join(projectsRoot,b.project.id,"world","scene.json"),JSON.stringify({entities:[{id:"sample-house"}]}));
  await writeFile(path.join(projectsRoot,b.project.id,"gameplay","systems.json"),JSON.stringify({systems:["movement"]}));
  await writeFile(path.join(projectsRoot,b.project.id,"gameplay","movement.js"),"import {vec3} from \"./math.js\";\nexport function movePlayer() { return vec3(); }\n");
  await request(base,"/api/projects/"+encodeURIComponent(b.project.id)+"/activate",{method:"POST",body:"{}"});
  const index=await request(base,"/api/projects/"+encodeURIComponent(b.project.id)+"/source-index");
  if(!index.sources.some(s=>s.path==="gameplay/movement.js"&&s.symbols.some(x=>x.name==="movePlayer")))throw new Error("source index missing gameplay symbols");
  const inventory=await request(base,"/api/projects/"+encodeURIComponent(b.project.id)+"/inventory");
  if(inventory.groups.world.files!==1||inventory.groups.gameplay.files!==2)throw new Error("game folders not inventoried");
  if(inventory.documents["world/scene.json"].entities[0].id!=="sample-house")throw new Error("world content not read");
  routed=await request(base,"/api/orchestrate",{method:"POST",body:JSON.stringify({text:"build gameplay system"})});
  if(routed.project_context?.project_id!==b.project.id)throw new Error("routing did not use Game B");
  if(routed.inventory_summary?.groups.gameplay.files!==2)throw new Error("orchestrator did not read game folder");
  await mkdir(path.join(projectsRoot,"legacy-game"),{recursive:true});
  await writeFile(path.join(projectsRoot,"legacy-game","readme.txt"),"preserve");
  const candidates=await request(base,"/api/projects/import-candidates");
  if(!candidates.candidates.some(x=>x.folder==="legacy-game"))throw new Error("legacy folder not discovered");
  const registered=await request(base,"/api/projects/register-existing",{method:"POST",body:JSON.stringify({folder:"legacy-game",confirm:true})});
  if(!registered.game_content_preserved)throw new Error("registration did not preserve game");
  await access(path.join(projectsRoot,"legacy-game","readme.txt"));

  await stop(server); server=null;

  const port2=await freePort();
  const base2="http://127.0.0.1:"+port2;
  server=startServer(port2);
  await waitHealth(base2);
  library=await request(base2,"/api/project-library");
  if(library.active_project_id!==b.project.id)throw new Error("active project did not persist across restart");
  if(library.projects.length!==3)throw new Error("project library did not persist across restart");

  console.log("[KHOSAN WORKSPACE] PASS");
  console.log(" - two isolated projects created");
  console.log(" - manifests/state/directories verified");
  console.log(" - active project switching verified");
  console.log(" - project-aware orchestration verified");
  console.log(" - active project persisted across Studio restart");
} finally {
  await stop(server);
  await rm(dataRoot,{recursive:true,force:true});
}
