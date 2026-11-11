import http from "node:http";
import { readFile, writeFile, mkdir, readdir, stat, appendFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import {readTrustedStatus} from "../../tools/harness-3d/trusted-gateway.mjs";

const STUDIO_VERSION = "0.2.0";
const PROJECT_SCHEMA_VERSION = 1;
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const PUBLIC = path.join(ROOT, "apps/studio-web/public");
const PROJECTS = path.resolve(process.env.KHOSAN_PROJECTS_DIR || path.join(ROOT, "projects"));
const LIBRARY_DIR = path.join(PROJECTS, ".khosan-studio");
const LIBRARY_FILE = path.join(LIBRARY_DIR, "library.json");
const DATA_ROOT = path.dirname(PROJECTS);
const SHARED_ROOTS = {
  shared_assets: path.resolve(process.env.KHOSAN_SHARED_ASSETS_DIR || path.join(DATA_ROOT, "SharedAssets")),
  models: path.resolve(process.env.KHOSAN_MODELS_DIR || path.join(DATA_ROOT, "Models")),
  tool_data: path.resolve(process.env.KHOSAN_TOOL_DATA_DIR || path.join(DATA_ROOT, "ToolData")),
  cache: path.resolve(process.env.KHOSAN_CACHE_DIR || path.join(DATA_ROOT, "Cache")),
  logs: path.resolve(process.env.KHOSAN_LOGS_DIR || path.join(DATA_ROOT, "Logs"))
};
const HOST = process.env.KHOSAN_HOST || "127.0.0.1";
const PORT = Number(process.env.KHOSAN_PORT || "8080");
const MAX_BODY = 1024 * 1024;

await mkdir(PROJECTS, { recursive: true });
await mkdir(LIBRARY_DIR, { recursive: true });

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
function routeId(value) {
  try { return safeId(decodeURIComponent(value || "")); } catch { return null; }
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

function emptyLibrary() {
  return {schema_version:1, active_project_id:null, projects:[], updated_at:now()};
}
async function readLibrary() {
  const library = await jsonFile(LIBRARY_FILE, null);
  return library && Array.isArray(library.projects) ? library : emptyLibrary();
}
async function writeLibrary(library) {
  library.updated_at = now();
  await writeFile(LIBRARY_FILE, JSON.stringify(library, null, 2) + "\n");
  return library;
}
async function discoverProjects() {
  const entries = await readdir(PROJECTS, { withFileTypes:true });
  const out = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    const project = await jsonFile(path.join(PROJECTS, entry.name, "project.json"));
    if (!project) continue;
    const id = safeId(project.project_id || project.id || entry.name);
    if (!id || id !== entry.name) continue;
    out.push({...project, id, project_id:id});
  }
  return out.sort((a,b) => String(b.updated_at || b.created_at || "").localeCompare(String(a.updated_at || a.created_at || "")));
}
async function syncLibrary() {
  const library = await readLibrary();
  const projects = await discoverProjects();
  const known = new Map((library.projects || []).map(x => [x.project_id, x]));
  for (const project of projects) {
    const prior = known.get(project.id) || {};
    known.set(project.id, {
      project_id: project.id,
      relative_path: project.id,
      name: project.name || prior.name || project.id,
      status: project.status || prior.status || "active",
      target: project.target || prior.target || "webgpu",
      last_opened_at: prior.last_opened_at || project.last_opened_at || null
    });
  }
  library.projects = [...known.values()].filter(x => projects.some(p => p.id === x.project_id));
  if (library.active_project_id && !library.projects.some(x => x.project_id === library.active_project_id)) library.active_project_id = null;
  await writeLibrary(library);
  return {library, projects};
}
async function activateProject(id) {
  const dir = projectDir(id);
  const project = await jsonFile(path.join(dir, "project.json"));
  if (!project) return null;
  const {library} = await syncLibrary();
  library.active_project_id = id;
  const entry = library.projects.find(x => x.project_id === id);
  if (entry) entry.last_opened_at = now();
  await writeLibrary(library);
  project.last_opened_at = entry?.last_opened_at || now();
  project.updated_at = now();
  project.project_id = id;
  project.id = id;
  await writeFile(path.join(dir, "project.json"), JSON.stringify(project, null, 2) + "\n");
  return project;
}
async function activeProject() {
  const {library, projects} = await syncLibrary();
  const project = projects.find(p => p.id === library.active_project_id) || null;
  return {library, project};
}

async function initializeProject(dir, id, input) {
  const directories = [
    ".khosan/tasks",".khosan/evidence",".khosan/handoffs",".khosan/decisions",".khosan/reconstructions",".khosan/cache",
    "assets/source","assets/characters","assets/props","assets/environment","assets/textures","assets/audio",
    "world","gameplay","ui","narrative","shaders","tests","builds",
    "concepts","experiments","tasks","events","artifacts"
  ];
  for (const child of directories) await mkdir(path.join(dir, child), { recursive:true });
  const timestamp = now();
  const project = {
    schema_version:1, id, project_id:id, name:input.name || "Untitled Game", brief:input.brief || "",
    target:input.target || "webgpu", phase:"creative-discovery", status:"active",
    created_at:timestamp, updated_at:timestamp, last_opened_at:timestamp
  };
  const manifest = {
    schema_version:PROJECT_SCHEMA_VERSION, project_id:id, name:project.name,
    created_with_studio:STUDIO_VERSION, last_opened_with_studio:STUDIO_VERSION, target:project.target,
    ir:{ug_ir:"0.1-draft",asset_ir:"0.1-draft",character_ir:"0.1-draft"},
    paths:{project_state:".khosan/project-state.json",assets:"assets",world:"world",gameplay:"gameplay",ui:"ui",builds:"builds"},
    git:{repository_mode:"unconfigured",lfs_recommended:true}
  };
  const state = {
    schema_version:1, project_id:id, phase:"creative-discovery", active_feature_id:null,
    active_work_item_id:null, active_roles:[], pending_human_gate:null, last_verification:null,
    last_updated:timestamp
  };
  const blueprint = {
    schema_version:1, project_id:id, status:"draft", hook:"", player_fantasy:"", core_loop:[],
    core_verbs:[], world:"", camera:"", art_direction:"", systems:[], first_playable_scope:[], unknowns:[]
  };
  const constitution = {
    constitution_id:"constitution-"+id, project_id:id, version:1, status:"draft", player_fantasy:"",
    emotional_promise:[], core_verbs:[], world_point_of_view:"",
    art_constitution:{shape_language:"",proportion:"",color_grammar:"",material_vocabulary:"",architecture_vocabulary:"",camera_language:"",lighting_identity:"",animation_personality:"",ui_personality:""},
    mechanical_identity:[], sacred_constraints:[], flexible_implementation:[], audience_hypothesis:[],
    falsification:[], approved_by_human:false, approval_reference:null
  };
  await writeFile(path.join(dir, "project.json"), JSON.stringify(project,null,2)+"\n");
  await writeFile(path.join(dir, "khosan-project.json"), JSON.stringify(manifest,null,2)+"\n");
  await writeFile(path.join(dir, ".khosan/project-state.json"), JSON.stringify(state,null,2)+"\n");
  await writeFile(path.join(dir, "blueprint.json"), JSON.stringify(blueprint,null,2)+"\n");
  await writeFile(path.join(dir, "creative-constitution.json"), JSON.stringify(constitution,null,2)+"\n");
  return {project, manifest, state};
}

function routeIntent(text = "") {
  const q = text.toLowerCase();
  if (/idea|concept|ไอเดีย|แนวเกม|แหวก/.test(q)) return { lane:"creative-intelligence", roles:["15-concept-inventor","16-creative-critic","14-player-experience-researcher"] };
  if (/community|review|discord|reddit|ผู้เล่น|คอมมูนิตี้/.test(q)) return { lane:"live-intelligence", roles:["18-community-intelligence","19-telemetry-analyst","20-live-game-designer"] };
  if (/reference|reconstruct|match|ภาพอ้างอิง|ภาพ ref|อ้างอิง/.test(q)) return { lane:"reference-reconstruction", roles:["04-asset-synthesizer","08-rendering-engineer","09-engine-adapter","10-qa-playtester","11-independent-reviewer"] };
  if (/rig|skeleton|skin|bone|กระดูก/.test(q)) return { lane:"asset-rigging", roles:["04-asset-synthesizer","10-qa-playtester","11-independent-reviewer"] };
  if (/render|shader|webgpu|fps|lighting|แสง/.test(q)) return { lane:"rendering", roles:["08-rendering-engineer","10-qa-playtester"] };
  if (/quest|dialog|story|เนื้อเรื่อง/.test(q)) return { lane:"narrative", roles:["03-narrative-architect","02-game-designer"] };
  return { lane:"orchestration", roles:["00-studio-orchestrator"] };
}

async function api(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/health") {
    send(res, 200, {ok:true, service:"khosan-studio", version:STUDIO_VERSION, time:now(), host:HOST, port:PORT, creative_intelligence:true, project_persistence:true, multi_project:true}); return true;
  }
  if (req.method === "GET" && url.pathname === "/api/studio") {
    const {library} = await syncLibrary();
    send(res, 200, {
      state: await jsonFile(path.join(ROOT, "studio/studio_state.json"), {}),
      features: await jsonFile(path.join(ROOT, "feature_list.json"), {}),
      external_tools: await jsonFile(path.join(ROOT, "config/external-tools.lock.json"), {}),
      project_library:{projects_root:PROJECTS,active_project_id:library.active_project_id},
      shared_roots:SHARED_ROOTS
    }); return true;
  }
  if (req.method === "GET" && url.pathname === "/api/project-library") {
    const {library, projects} = await syncLibrary();
    send(res, 200, {schema_version:1,projects_root:PROJECTS,active_project_id:library.active_project_id,projects:projects.map(p => ({...p,is_active:p.id===library.active_project_id})),shared_roots:SHARED_ROOTS}); return true;
  }
  if (req.method === "GET" && url.pathname === "/api/projects") {
    const {library, projects} = await syncLibrary();
    send(res, 200, {active_project_id:library.active_project_id, projects:projects.map(p => ({...p,is_active:p.id===library.active_project_id}))}); return true;
  }
  if (req.method === "GET" && url.pathname === "/api/tasks") {
    const tasks = await listJsonFiles(path.join(ROOT, "studio/tasks"));
    send(res, 200, { tasks: tasks.sort((a,b) => String(a.task_id||"").localeCompare(String(b.task_id||""))) });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/projects") {
    const input = await bodyJson(req);
    const id = slug(input.name || input.brief || "game") + "-" + crypto.randomBytes(3).toString("hex");
    const dir = projectDir(id);
    const initialized = await initializeProject(dir, id, input);
    await syncLibrary();
    if (input.activate !== false) await activateProject(id);
    send(res, 201, {...initialized, project_root:dir}); return true;
  }

  const activateMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/activate$/);
  if (req.method === "POST" && activateMatch) {
    const id = routeId(activateMatch[1]);
    if (!id) { send(res,400,{error:"invalid project id"}); return true; }
    const project = await activateProject(id);
    if (!project) { send(res,404,{error:"project not found"}); return true; }
    send(res,200,{ok:true,active_project_id:id,project}); return true;
  }

  const workspaceMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/workspace$/);
  if (req.method === "GET" && workspaceMatch) {
    const id = routeId(workspaceMatch[1]);
    if (!id) { send(res,400,{error:"invalid project id"}); return true; }
    const dir = projectDir(id);
    const project = await jsonFile(path.join(dir,"project.json"));
    if (!project) { send(res,404,{error:"project not found"}); return true; }
    send(res,200,{
      project_id:id,
      project_root:dir,
      write_boundary:dir,
      sibling_projects_implicit:false,
      devspace:{root:dir,workspace_policy:"one project root -> one reusable workspaceId per continuous session"},
      shared_roots:SHARED_ROOTS
    }); return true;
  }

  // Read-only signed harness status. No privileged mutation API is exposed via Studio HTTP.
  const harnessMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/harness\/([^/]+)\/status$/);
  if (req.method === 'GET' && harnessMatch) {
    if (!['127.0.0.1','::1'].includes(HOST) || process.env.KHOSAN_ALLOW_LOCAL_HARNESS_STATUS !== '1') {
      send(res,403,{error:'local signed harness status endpoint disabled'}); return true;
    }
    const id=routeId(harnessMatch[1]);
    let taskId; try {taskId=decodeURIComponent(harnessMatch[2]);} catch {taskId=null;}
    if (!id || !/^TASK-[A-Z0-9-]{1,76}$/.test(taskId||'')) {send(res,400,{error:'invalid project or task ID'});return true;}
    const dir=projectDir(id), project=await jsonFile(path.join(dir,'project.json'));
    if (!project) {send(res,404,{error:'project not found'});return true;}
    if (!process.env.KHOSAN_3D_TRUST_FILE) {send(res,503,{error:'trusted harness has not been configured'});return true;}
    try {
      const registry=JSON.parse(await readFile(path.resolve(process.env.KHOSAN_3D_TRUST_FILE),'utf8'));
      const state=await readTrustedStatus({projectRoot:dir,trust:registry,projectId:id,taskId});
      send(res,200,state);
    } catch (_) {send(res,409,{error:'trusted harness state unavailable or failed signature verification'});}
    return true;
  }
  const pm = url.pathname.match(/^\/api\/projects\/([^/]+)$/);
  if (req.method === "GET" && pm) {
    const id=routeId(pm[1]); if(!id){send(res,400,{error:"invalid project id"});return true;} const dir=projectDir(id); const project=await jsonFile(path.join(dir,"project.json"));
    if (!project) { send(res,404,{error:"project not found"}); return true; }
    const {library}=await syncLibrary();
    send(res,200,{
      project:{...project,is_active:library.active_project_id===project.id},
      manifest:await jsonFile(path.join(dir,"khosan-project.json"),{}),
      project_state:await jsonFile(path.join(dir,".khosan/project-state.json"),{}),
      blueprint:await jsonFile(path.join(dir,"blueprint.json"),{}),
      creative_constitution:await jsonFile(path.join(dir,"creative-constitution.json"),{}),
      workspace:{project_root:dir,write_boundary:dir}
    }); return true;
  }

  const updateMatch=url.pathname.match(/^\/api\/projects\/([^/]+)\/(blueprint|creative-constitution)$/);
  if (req.method==="PUT" && updateMatch) {
    const id=routeId(updateMatch[1]); if(!id){send(res,400,{error:"invalid project id"});return true;} const dir=projectDir(id); const p=await jsonFile(path.join(dir,"project.json"));
    if (!p) { send(res,404,{error:"project not found"}); return true; }
    const data=await bodyJson(req);
    if (data.project_id && data.project_id !== p.id) { send(res,409,{error:"project_id mismatch"}); return true; }
    data.project_id = p.id;
    const filename=updateMatch[2]==="blueprint"?"blueprint.json":"creative-constitution.json";
    await writeFile(path.join(dir,filename),JSON.stringify(data,null,2)+"\n"); p.updated_at=now();
    await writeFile(path.join(dir,"project.json"),JSON.stringify(p,null,2)+"\n"); send(res,200,{ok:true,project_id:p.id,updated:filename}); return true;
  }

  const eventMatch=url.pathname.match(/^\/api\/projects\/([^/]+)\/events$/);
  if (req.method==="POST" && eventMatch) {
    const id=routeId(eventMatch[1]); if(!id){send(res,400,{error:"invalid project id"});return true;} const dir=projectDir(id); const p=await jsonFile(path.join(dir,"project.json"));
    if (!p) { send(res,404,{error:"project not found"}); return true; }
    const data=await bodyJson(req);
    const event={id:crypto.randomUUID(),project_id:p.id,time:now(),type:data.type||"note",payload:data.payload||data};
    await appendFile(path.join(dir,"events","events.jsonl"),JSON.stringify(event)+"\n"); send(res,201,{event}); return true;
  }

  if (req.method==="POST" && url.pathname==="/api/orchestrate") {
    const input=await bodyJson(req);
    const current=await activeProject();
    const requested = input.project_id ? safeId(input.project_id) : current.library.active_project_id;
    let project = null;
    let projectRoot = null;
    if (requested) {
      projectRoot = projectDir(requested);
      project = await jsonFile(path.join(projectRoot,"project.json"));
      if (!project) { send(res,404,{error:"project not found"}); return true; }
    }
    const routing=routeIntent(String(input.text||""));
    send(res,200,{
      mode:"routing-only",
      note:"Local Studio v0.2 routes work inside the selected project; ChatGPT/DevSpace executes the selected role contracts.",
      project_context: project ? {project_id:project.id,project_name:project.name,project_root:projectRoot,write_boundary:projectRoot} : null,
      routing
    }); return true;
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

await syncLibrary();

const server=http.createServer(async(req,res)=>{
  try {
    const url=new URL(req.url||"/","http://"+(req.headers.host||"localhost"));
    if(url.pathname.startsWith("/api/")) { if(!(await api(req,res,url))) send(res,404,{error:"not found"}); return; }
    await staticFile(res,url.pathname);
  } catch(error) {
    console.error(error); send(res,500,{error:"internal error",detail:process.env.KHOSAN_DEBUG==="1"?String(error.message||error):undefined});
  }
});
server.listen(PORT,HOST,()=>{
  console.log("[KHOSAN] Studio v"+STUDIO_VERSION);
  console.log("[KHOSAN] http://"+HOST+":"+PORT);
  console.log("[KHOSAN] projects: "+PROJECTS);
});
