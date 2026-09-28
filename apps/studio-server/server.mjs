import http from "node:http";
import { readFile, writeFile, mkdir, readdir, stat, appendFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const PUBLIC = path.join(ROOT, "apps/studio-web/public");
const PROJECTS = path.resolve(process.env.KHOSAN_PROJECTS_DIR || path.join(ROOT, "projects"));
const HOST = process.env.KHOSAN_HOST || "127.0.0.1";
const PORT = Number(process.env.KHOSAN_PORT || "8080");
const MAX_BODY = 1024 * 1024;

await mkdir(PROJECTS, { recursive: true });

function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, {"content-type": type, "cache-control": "no-store", "x-content-type-options": "nosniff"});
  if (Buffer.isBuffer(body) || body instanceof Uint8Array) res.end(body);
  else res.end(typeof body === "string" ? body : JSON.stringify(body, null, 2));
}
async function jsonFile(file, fallback = null) {
  try { return JSON.parse(await readFile(file, "utf8")); } catch { return fallback; }
}
async function bodyJson(req) {
  let size = 0; const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new Error("request body too large");
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
function slug(value) {
  const s = String(value || "").trim().toLowerCase()
    .replace(/[^a-z0-9\u0E00-\u0E7F]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64);
  return s || "game";
}
function safeId(value) {
  if (!/^[a-z0-9\u0E00-\u0E7F][a-z0-9\u0E00-\u0E7F._-]{0,79}$/i.test(value || "")) return null;
  return value;
}
function projectDir(id) {
  const valid = safeId(id);
  if (!valid) throw new Error("invalid project id");
  const dir = path.resolve(PROJECTS, valid);
  if (!dir.startsWith(PROJECTS + path.sep)) throw new Error("unsafe project path");
  return dir;
}
function now() { return new Date().toISOString(); }

async function listJsonFiles(directory) {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    const out = [];
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
      const item = await jsonFile(path.join(directory, entry.name));
      if (item) out.push(item);
    }
    return out;
  } catch { return []; }
}

async function listProjects() {
  const entries = await readdir(PROJECTS, { withFileTypes: true }); const out = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const p = await jsonFile(path.join(PROJECTS, entry.name, "project.json"));
    if (p) out.push(p);
  }
  return out.sort((a,b) => String(b.updated_at).localeCompare(String(a.updated_at)));
}
function routeIntent(text = "") {
  const q = text.toLowerCase();
  if (/idea|concept|ไอเดีย|แนวเกม|แหวก/.test(q)) return { lane:"creative-intelligence", roles:["15-concept-inventor","16-creative-critic","14-player-experience-researcher"] };
  if (/community|review|discord|reddit|ผู้เล่น|คอมมูนิตี้/.test(q)) return { lane:"live-intelligence", roles:["18-community-intelligence","19-telemetry-analyst","20-live-game-designer"] };
  if (/rig|skeleton|skin|bone|กระดูก/.test(q)) return { lane:"asset-rigging", roles:["04-asset-synthesizer","10-qa-playtester","11-independent-reviewer"] };
  if (/render|shader|webgpu|fps|lighting|แสง/.test(q)) return { lane:"rendering", roles:["08-rendering-engineer","10-qa-playtester"] };
  if (/quest|dialog|story|เนื้อเรื่อง/.test(q)) return { lane:"narrative", roles:["03-narrative-architect","02-game-designer"] };
  return { lane:"orchestration", roles:["00-studio-orchestrator"] };
}

async function api(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/health") {
    send(res, 200, {ok:true, service:"khosan-studio", version:"0.1.0", time:now(), host:HOST, port:PORT, creative_intelligence:true, project_persistence:true}); return true;
  }
  if (req.method === "GET" && url.pathname === "/api/studio") {
    send(res, 200, {
      state: await jsonFile(path.join(ROOT, "studio/studio_state.json"), {}),
      features: await jsonFile(path.join(ROOT, "feature_list.json"), {}),
      external_tools: await jsonFile(path.join(ROOT, "config/external-tools.lock.json"), {})
    }); return true;
  }
  if (req.method === "GET" && url.pathname === "/api/projects") { send(res, 200, { projects: await listProjects() }); return true; }
  if (req.method === "GET" && url.pathname === "/api/tasks") {
    const tasks = await listJsonFiles(path.join(ROOT, "studio/tasks"));
    send(res, 200, { tasks: tasks.sort((a,b) => String(a.task_id||"").localeCompare(String(b.task_id||""))) });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/projects") {
    const input = await bodyJson(req);
    const id = slug(input.name || input.brief || "game") + "-" + crypto.randomBytes(3).toString("hex");
    const dir = projectDir(id);
    for (const child of ["events","artifacts","concepts","experiments","tasks"]) await mkdir(path.join(dir, child), { recursive:true });
    const project = {schema_version:1,id,name:input.name||"Untitled Game",brief:input.brief||"",target:input.target||"webgpu",phase:"creative-discovery",status:"active",created_at:now(),updated_at:now()};
    const blueprint = {schema_version:1,project_id:id,status:"draft",hook:"",player_fantasy:"",core_loop:[],core_verbs:[],world:"",camera:"",art_direction:"",systems:[],first_playable_scope:[],unknowns:[]};
    const constitution = {
      constitution_id:"constitution-"+id,project_id:id,version:1,status:"draft",player_fantasy:"",emotional_promise:[],core_verbs:[],world_point_of_view:"",
      art_constitution:{shape_language:"",proportion:"",color_grammar:"",material_vocabulary:"",architecture_vocabulary:"",camera_language:"",lighting_identity:"",animation_personality:"",ui_personality:""},
      mechanical_identity:[],sacred_constraints:[],flexible_implementation:[],audience_hypothesis:[],falsification:[],approved_by_human:false,approval_reference:null
    };
    await writeFile(path.join(dir, "project.json"), JSON.stringify(project,null,2)+"\n");
    await writeFile(path.join(dir, "blueprint.json"), JSON.stringify(blueprint,null,2)+"\n");
    await writeFile(path.join(dir, "creative-constitution.json"), JSON.stringify(constitution,null,2)+"\n");
    send(res, 201, { project }); return true;
  }

  const pm = url.pathname.match(/^\/api\/projects\/([^/]+)$/);
  if (req.method === "GET" && pm) {
    const dir=projectDir(pm[1]); const project=await jsonFile(path.join(dir,"project.json"));
    if (!project) { send(res,404,{error:"project not found"}); return true; }
    send(res,200,{project,blueprint:await jsonFile(path.join(dir,"blueprint.json"),{}),creative_constitution:await jsonFile(path.join(dir,"creative-constitution.json"),{})}); return true;
  }

  const updateMatch=url.pathname.match(/^\/api\/projects\/([^/]+)\/(blueprint|creative-constitution)$/);
  if (req.method==="PUT" && updateMatch) {
    const dir=projectDir(updateMatch[1]); const p=await jsonFile(path.join(dir,"project.json"));
    if (!p) { send(res,404,{error:"project not found"}); return true; }
    const data=await bodyJson(req); const filename=updateMatch[2]==="blueprint"?"blueprint.json":"creative-constitution.json";
    await writeFile(path.join(dir,filename),JSON.stringify(data,null,2)+"\n"); p.updated_at=now();
    await writeFile(path.join(dir,"project.json"),JSON.stringify(p,null,2)+"\n"); send(res,200,{ok:true,updated:filename}); return true;
  }

  const eventMatch=url.pathname.match(/^\/api\/projects\/([^/]+)\/events$/);
  if (req.method==="POST" && eventMatch) {
    const dir=projectDir(eventMatch[1]); const p=await jsonFile(path.join(dir,"project.json"));
    if (!p) { send(res,404,{error:"project not found"}); return true; }
    const data=await bodyJson(req); const event={id:crypto.randomUUID(),time:now(),type:data.type||"note",payload:data.payload||data};
    await appendFile(path.join(dir,"events","events.jsonl"),JSON.stringify(event)+"\n"); send(res,201,{event}); return true;
  }

  if (req.method==="POST" && url.pathname==="/api/orchestrate") {
    const input=await bodyJson(req); const routing=routeIntent(String(input.text||""));
    send(res,200,{mode:"routing-only",note:"Local Studio v0.1 routes work; ChatGPT/DevSpace executes the selected role contracts.",routing}); return true;
  }
  return false;
}

const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".svg":"image/svg+xml"};
async function staticFile(res, pathname) {
  const requested=pathname==="/"?"index.html":pathname.replace(/^\//,""); let file=path.resolve(PUBLIC,requested);
  if (!file.startsWith(PUBLIC+path.sep) && file!==path.join(PUBLIC,"index.html")) { send(res,403,"forbidden","text/plain"); return; }
  try { const s=await stat(file); if(!s.isFile()) throw new Error(); } catch { file=path.join(PUBLIC,"index.html"); }
  const data=await readFile(file); send(res,200,data,mime[path.extname(file)]||"application/octet-stream");
}

const server=http.createServer(async(req,res)=>{
  try {
    const url=new URL(req.url||"/","http://"+(req.headers.host||"localhost"));
    if(url.pathname.startsWith("/api/")) { if(!(await api(req,res,url))) send(res,404,{error:"not found"}); return; }
    await staticFile(res,url.pathname);
  } catch(error) {
    console.error(error); send(res,500,{error:"internal error",detail:process.env.KHOSAN_DEBUG==="1"?String(error.message||error):undefined});
  }
});
server.listen(PORT,HOST,()=>{console.log("[KHOSAN] Studio v0.1.0");console.log("[KHOSAN] http://"+HOST+":"+PORT);console.log("[KHOSAN] projects: "+PROJECTS);});
