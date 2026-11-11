/**
 * KHOSAN trusted 3D harness dispatcher.
 *
 * Maker requests are restricted to deterministic linter/coordinate-patch tools.
 * Renderer, reviewer and human approvals require separate bearer credentials
 * AND separate Ed25519 signatures from keys held outside the maker workspace.
 * This gateway only protects calls routed through it. OS/process isolation is
 * still required to prevent a maker with direct filesystem access bypassing it.
 */
import { createHash, createPublicKey, randomUUID, timingSafeEqual, verify as verifySignature } from 'node:crypto';
import { lstat, mkdir, open, readFile, realpath, rename, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import {
  EVIDENCE_SCHEMA, reviewerReceiptPayload, humanApprovalPayload,
  rendererReceiptPayload, verify3DAcceptance
} from '../../tools/harness-3d/gate.mjs';

const TASK_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/;
const NODE_RE = /^[A-Za-z][A-Za-z0-9._-]{0,79}$/;
const SHA_RE = /^[a-f0-9]{64}$/i;
const MAX_SOURCE_BYTES = 8 * 1024 * 1024;
const MAX_BODY_BYTES = 2 * 1024 * 1024;
const MAX_NODES = 500;
const MAX_PATCHES = 64;
const MAX_COORD_CM = 1_000_000;
const TOL = 0.1;
const ROLES = ['maker', 'renderer', 'reviewer', 'human'];
const ALLOWED = Object.freeze({
  geometry_built: new Set(['run_geometry_linter', 'patch_failing_layout_nodes']),
  geometry_verified: new Set(['render_contact_sheet']),
  rendered: new Set([]),
  independent_reviewed: new Set([]),
  human_accepted: new Set([])
});

export class GatewayError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
const fail = (status, code, message) => { throw new GatewayError(status, code, message); };
const isObject = v => !!v && typeof v === 'object' && !Array.isArray(v);
const isText = v => typeof v === 'string' && v.trim().length > 0;
const finite = v => typeof v === 'number' && Number.isFinite(v);
const digest = b => createHash('sha256').update(b).digest('hex');
const clone = v => JSON.parse(JSON.stringify(v));

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
function safeRelative(rel) {
  return typeof rel === 'string' && rel.length > 0 && !path.isAbsolute(rel) && !/^[A-Za-z]:/.test(rel)
    && !rel.includes('\\') && !rel.includes('\0') && rel.split('/').every(p => p && p !== '.' && p !== '..');
}
function pairList(value, name, nodes) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) fail(422, 'INVALID_UGIR', `${name} must be an array`);
  const seen = new Set();
  return value.map(pair => {
    if (!Array.isArray(pair) || pair.length !== 2 || pair[0] === pair[1] || !pair.every(x => typeof x === 'string' && nodes.has(x))) fail(422, 'INVALID_UGIR', `invalid ${name} pair`);
    const key = [...pair].sort().join('|');
    if (seen.has(key)) fail(422, 'INVALID_UGIR', `duplicate ${name} pair`);
    seen.add(key); return key;
  });
}
function validateUGIR(doc) {
  if (!isObject(doc)) fail(422, 'INVALID_UGIR', 'UG-IR must be a JSON object');
  const c = doc.coordinate_system;
  if (!isObject(c) || c.unit !== 'cm' || c.up_axis !== '+Z' || (c.forward_axis !== undefined && c.forward_axis !== '+Y') || Object.keys(c).some(k => !['unit','up_axis','forward_axis'].includes(k))) fail(422, 'UNSUPPORTED_COORDINATES', 'Only +Z-up, +Y-forward, centimeters are supported');
  if (Array.isArray(doc.primitives) && doc.primitives.length) fail(422, 'UNSUPPORTED_GEOMETRY', 'CSG/procedural primitives are not supported by this AABB lock');
  if (Array.isArray(doc.anchors) && doc.anchors.length) fail(422, 'UNSUPPORTED_GEOMETRY', 'Anchor placement is not supported by this AABB lock');
  if (!Array.isArray(doc.layout_nodes) || doc.layout_nodes.length < 1 || doc.layout_nodes.length > MAX_NODES) fail(422, 'INVALID_UGIR', `layout_nodes must contain 1..${MAX_NODES} nodes`);
  const nodes = new Map();
  for (const n of doc.layout_nodes) {
    if (!isObject(n) || n.placement_mode !== 'place_bounds_box' || typeof n.instance_name !== 'string' || !NODE_RE.test(n.instance_name) || nodes.has(n.instance_name)) fail(422, 'UNSUPPORTED_GEOMETRY', 'Each node must have a unique safe name and place_bounds_box mode');
    if (typeof n.is_ground !== 'undefined' && typeof n.is_ground !== 'boolean') fail(422, 'INVALID_UGIR', `is_ground must be boolean for ${n.instance_name}`);
    const lo = n.min_xyz_cm, hi = n.max_xyz_cm;
    if (![lo,hi].every(a => Array.isArray(a) && a.length === 3 && a.every(v => finite(v) && Math.abs(v) <= MAX_COORD_CM)) || lo.some((v,i) => v >= hi[i])) fail(422, 'INVALID_BOUNDS', `invalid bounds for ${n.instance_name}`);
    nodes.set(n.instance_name, {min:lo, max:hi, ground:n.is_ground === true});
  }
  const intentional = new Set(pairList(doc.intentional_intersections, 'intentional_intersections', nodes));
  const seams = pairList(doc.expected_adjacent_seams, 'expected_adjacent_seams', nodes);
  return {nodes, intentional, seams};
}
function overlap(a,b,axis) { return Math.min(a.max[axis],b.max[axis]) - Math.max(a.min[axis],b.min[axis]); }
function separation(a,b,axis) { return Math.max(0,a.min[axis]-b.max[axis],b.min[axis]-a.max[axis]); }
function diagnostics(doc) {
  const {nodes,intentional,seams} = validateUGIR(doc), out=[];
  for (const [name,a] of nodes) {
    if (a.ground || a.min[2] <= TOL) continue;
    const supported = [...nodes].some(([other,b]) => other !== name && Math.abs(b.max[2]-a.min[2]) <= TOL && overlap(a,b,0)>0 && overlap(a,b,1)>0);
    if (!supported) out.push({code:'FLOATING',involved_nodes:[name],axes:[2],severity_cm:a.min[2]});
  }
  const names=[...nodes.keys()];
  for(let i=0;i<names.length;i++) for(let j=i+1;j<names.length;j++) {
    const pair=[names[i],names[j]].sort(); if(intentional.has(pair.join('|'))) continue;
    const a=nodes.get(names[i]),b=nodes.get(names[j]),o=[0,1,2].map(k=>overlap(a,b,k));
    if(o.every(v=>v>TOL)){const axis=o.indexOf(Math.min(...o));out.push({code:'PIERCING',involved_nodes:pair,axes:[axis],severity_cm:o[axis]});}
  }
  for(const pairKey of seams){
    const [aName,bName]=pairKey.split('|'),a=nodes.get(aName),b=nodes.get(bName),g=[0,1,2].map(k=>separation(a,b,k)),d=Math.hypot(...g);
    if(d>TOL)out.push({code:'SEAM_GAP',involved_nodes:[aName,bName],axes:g.map((v,i)=>v>0?i:-1).filter(i=>i>=0),severity_cm:d});
  }
  return out.sort((a,b)=>`${a.code}:${a.involved_nodes.join(':')}:${a.axes.join(':')}`.localeCompare(`${b.code}:${b.involved_nodes.join(':')}:${b.axes.join(':')}`));
}
const diagKey = d => `${d.code}|${d.involved_nodes.join('|')}|${d.axes.join(',')}`;
function buildRepairWindow(doc, sourceSha) {
  const defects=diagnostics(doc); if (!defects.length) fail(409,'NO_REPAIR_REQUIRED','No measurable AABB defects; no patch window issued');
  const allowed={};
  for(const d of defects) for(const n of d.involved_nodes) allowed[n]=[...new Set([...(allowed[n]||[]),...d.axes])].sort((a,b)=>a-b);
  const frozen={};
  for(const n of doc.layout_nodes) if(!allowed[n.instance_name]) frozen[n.instance_name]=digest(Buffer.from(canonical(n)));
  return {schema:'khosan.repair-window.v1',source_sha256:sourceSha,editable_axes:allowed,frozen_sha256:frozen,diagnostics:defects};
}
function verifySignedPayload(payload, signature, pem) {
  if (!isText(pem) || !isText(signature) || !/^[A-Za-z0-9+/]+={0,2}$/.test(signature)) return false;
  try { const key=createPublicKey(pem); return key.asymmetricKeyType==='ed25519' && verifySignature(null,Buffer.from(payload,'utf8'),key,Buffer.from(signature,'base64')); }
  catch { return false; }
}
function bearer(req) { const h=req.headers?.authorization||''; return h.startsWith('Bearer ')?h.slice(7):''; }
function safeEqual(a,b) { if(typeof a!=='string'||typeof b!=='string')return false;const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&x.length>0&&timingSafeEqual(x,y); }
function send(res,status,body) { res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(body)); }
async function readBody(req) { let size=0;const chunks=[];for await(const c of req){size+=c.length;if(size>MAX_BODY_BYTES)fail(413,'BODY_TOO_LARGE','Request body too large');chunks.push(c);}try{return chunks.length?JSON.parse(Buffer.concat(chunks).toString('utf8')):{}}catch{fail(400,'INVALID_JSON','Request body must be valid JSON');} }
async function atomicWrite(file, bytes) {
  const tmp=`${file}.${process.pid}.${Date.now()}.tmp`;const h=await open(tmp,'wx',0o600);
  try{await h.writeFile(bytes);await h.sync();}finally{await h.close();}
  try{await rename(tmp,file);}catch(e){await rm(tmp,{force:true});throw e;}
}
async function projectRootFor(id, resolver) {
  if(!/^[A-Za-z0-9\u0E00-\u0E7F][A-Za-z0-9\u0E00-\u0E7F._-]{0,79}$/.test(id))fail(400,'INVALID_PROJECT_ID','Invalid project id');
  const candidate=resolver(id);const meta=await lstat(candidate).catch(()=>null);
  if(!meta?.isDirectory()||meta.isSymbolicLink())fail(404,'PROJECT_NOT_FOUND','Registered project directory unavailable');
  const root=await realpath(candidate);const project=JSON.parse(await readFile(path.join(root,'project.json'),'utf8').catch(()=> 'null'));
  if(!project||String(project.id||project.project_id)!==id)fail(404,'PROJECT_NOT_REGISTERED','Project manifest does not match directory');
  return root;
}
async function safeFile(root,rel,{maxBytes=MAX_SOURCE_BYTES,extensions=null}={}) {
  if(!safeRelative(rel))fail(400,'UNSAFE_PATH','Only project-relative paths are accepted');
  const abs=path.resolve(root,...rel.split('/'));if(!abs.startsWith(root+path.sep))fail(400,'UNSAFE_PATH','Path escapes root');
  const meta=await lstat(abs).catch(()=>null);if(!meta?.isFile()||meta.isSymbolicLink())fail(404,'FILE_NOT_FOUND','Regular file required; symlinks are forbidden');
  if(meta.size<=0||meta.size>maxBytes)fail(413,'FILE_SIZE','File is empty or exceeds size limit');
  const real=await realpath(abs);if(!real.startsWith(root+path.sep))fail(400,'UNSAFE_PATH','Resolved path escapes root');
  if(extensions&&!extensions.includes(path.extname(rel).toLowerCase()))fail(415,'FILE_TYPE','Unsupported file type');
  return {abs:real,bytes:await readFile(real),size:meta.size};
}
async function taskPaths(root,taskId) {
  if(!TASK_RE.test(taskId))fail(400,'INVALID_TASK_ID','Invalid task id');
  const dir=path.resolve(root,'.khosan','harness',taskId);if(!dir.startsWith(path.resolve(root)+path.sep))fail(400,'UNSAFE_PATH','Task path escapes project');
  const rel=path.relative(root,dir).split(path.sep).join('/');
  const parts=rel.split('/');let current=root;
  for(const part of parts){current=path.join(current,part);const meta=await lstat(current).catch(()=>null);if(meta?.isSymbolicLink())fail(400,'UNSAFE_PATH','Symlink in harness directory is forbidden');}
  return {dir,stateFile:path.join(dir,'state.json'),sourceFile:path.join(dir,'staging','scene.ugir.json'),lockFile:path.join(dir,'.lock')};
}
async function withTaskLock(paths,fn) {
  let h;try{h=await open(paths.lockFile,'wx',0o600);}catch(e){if(e.code==='EEXIST')fail(409,'TASK_LOCKED','Another operation is running or a stale lock requires manual review');throw e;}
  try{await h.writeFile(JSON.stringify({pid:process.pid,at:new Date().toISOString()}));await h.sync();return await fn();}
  finally{await h.close();await rm(paths.lockFile,{force:true});}
}
async function readState(paths) { try{return JSON.parse(await readFile(paths.stateFile,'utf8'));}catch{fail(404,'TASK_NOT_FOUND','Harness task not found');} }
async function saveState(paths,state) { await atomicWrite(paths.stateFile,Buffer.from(JSON.stringify(state,null,2)+'\n')); }
async function readPublicKey(config,role) {
  const pem=config.publicKeys?.[role];if(typeof pem==='string'&&pem.includes('BEGIN PUBLIC KEY'))return pem;
  const file=config.publicKeyFiles?.[role];if(!file)fail(503,'TRUST_KEY_MISSING',`Trusted ${role} public key is not configured`);
  const meta=await lstat(file).catch(()=>null);if(!meta?.isFile()||meta.isSymbolicLink())fail(503,'TRUST_KEY_UNAVAILABLE',`Trusted ${role} public key file unavailable`);
  const text=await readFile(await realpath(file),'utf8');try{if(createPublicKey(text).asymmetricKeyType!=='ed25519')fail(503,'TRUST_KEY_TYPE',`Trusted ${role} key must be Ed25519`);}catch{fail(503,'TRUST_KEY_INVALID',`Trusted ${role} public key is invalid`);}return text;
}
function auth(req,config,role) {
  const expected=config.tokens?.[role];if(typeof expected!=='string'||Buffer.byteLength(expected)<32)fail(503,'ROLE_CREDENTIAL_MISSING',`${role} credential is not provisioned; gateway fails closed`);
  if(!safeEqual(bearer(req),expected))fail(401,'UNAUTHORIZED',`Valid ${role} bearer token required`);
  const principal=config.principals?.[role];if(!isText(principal))fail(503,'ROLE_PRINCIPAL_MISSING',`${role} principal id is not provisioned`);
  return principal;
}
function authAny(req,config) { for(const role of ROLES){const token=config.tokens?.[role];if(typeof token==='string'&&Buffer.byteLength(token)>=32&&safeEqual(bearer(req),token)){const principal=config.principals?.[role];if(!isText(principal))fail(503,'ROLE_PRINCIPAL_MISSING',`${role} principal id is not provisioned`);return role;}}fail(401,'UNAUTHORIZED','A valid role bearer token is required'); }
function pngDimensions(buf) {
  if(buf.length<33||!buf.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||buf.toString('ascii',12,16)!=='IHDR')fail(422,'INVALID_PNG','Contact sheet is not a valid PNG header');
  const w=buf.readUInt32BE(16),h=buf.readUInt32BE(20);if(w<64||h<64)fail(422,'INVALID_PNG','Contact sheet must be at least 64×64');return {width:w,height:h};
}
function makeRenderPayload(s,body,contactSha,glbSha) {
  return rendererReceiptPayload({schema:'khosan.3d.verification.v1',project_id:s.project_id,task_id:s.task_id,asset_id:s.asset_id,source_revision:s.source_revision,reference_mode:s.reference_mode,renderer:{renderer_id:body.renderer_id,run_id:body.run_id,rendered_glb_sha256:glbSha,contact_sheet_sha256:contactSha,reference_sha256:s.reference_sha256||null,views_rendered:body.views_rendered,camera_ids:body.camera_ids,signature_base64:body.signature_base64}});
}

export function createHardLockGateway(config) {
  const enabled=config.enabled!==false;
  async function createTask(projectId,body,humanPrincipal) {
    const root=await projectRootFor(projectId,config.projectRootForId);
    if(!isObject(body)||!isText(body.task_id)||!TASK_RE.test(body.task_id))fail(400,'INVALID_TASK','task_id required');
    const src=await safeFile(root,body.source_path,{extensions:['.json']});
    let ugir;try{ugir=JSON.parse(src.bytes.toString('utf8'));}catch{fail(422,'INVALID_UGIR','Source must be valid JSON');}
    validateUGIR(ugir);const task=await taskPaths(root,body.task_id);
    await mkdir(path.dirname(task.dir),{recursive:true});
    try{await mkdir(task.dir,{recursive:false});}catch(e){if(e.code==='EEXIST')fail(409,'TASK_EXISTS','Task already exists; revisions are immutable');throw e;}
    try{
      await mkdir(path.join(task.dir,'staging'),{recursive:true});await mkdir(path.join(task.dir,'renders'),{recursive:true});await mkdir(path.join(task.dir,'references'),{recursive:true});await mkdir(path.join(task.dir,'evidence'),{recursive:true});
      const sourceBytes=src.bytes;await atomicWrite(task.sourceFile,sourceBytes);
      let reference=null;if(body.reference_path){reference=await safeFile(root,body.reference_path,{maxBytes:20*1024*1024,extensions:['.png','.jpg','.jpeg','.webp']});const ext=path.extname(body.reference_path).toLowerCase();await atomicWrite(path.join(task.dir,'references','reference'+ext),reference.bytes);}
      const now=new Date().toISOString();const state={schema:'khosan.harness.task.v1',project_id:projectId,task_id:body.task_id,asset_id:isText(ugir.asset_id)?ugir.asset_id:body.task_id,stage:'geometry_built',status:'active',reference_mode:reference?'reference':'original',reference_sha256:reference?digest(reference.bytes):null,maker:{agent_id:config.principals.maker,session_id:cryptoRandomId()},created_by:humanPrincipal,maker_started_at:now,source_revision:digest(sourceBytes),source_path:'staging/scene.ugir.json',repair_window:null,last_lint:null,render_receipt:null,review_receipt:null,human_approval:null,history:[{event:'task_created',at:now,source_revision:digest(sourceBytes)}]};
      await saveState(task,state);return {task:state,staging_path:task.sourceFile,original_source_unchanged:true};
    }catch(e){await rm(task.dir,{recursive:true,force:true});throw e;}
  }
  function cryptoRandomId(){return randomUUID();}
  async function dispatch(projectId,taskId,body,makerPrincipal) {
    const root=await projectRootFor(projectId,config.projectRootForId),p=await taskPaths(root,taskId);
    return withTaskLock(p,async()=>{
      const s=await readState(p);if(s.stage==='human_accepted')fail(409,'TASK_FINAL','Accepted tasks are immutable');
      if(!isObject(body)||!isText(body.tool))fail(400,'INVALID_TOOL_CALL','tool name required');
      const allowed=ALLOWED[s.stage]||new Set();if(!allowed.has(body.tool))fail(403,'TOOL_MASKED',`Tool ${body.tool} is not allowed at stage ${s.stage}`);
      if(makerPrincipal!==s.maker.agent_id)fail(403,'WRONG_MAKER','Maker principal does not own this task');
      if(body.tool==='render_contact_sheet')fail(503,'RENDERER_ADAPTER_NOT_CONFIGURED','No trusted Blender/renderer worker is installed; no render stage transition occurred');
      const raw=await readFile(p.sourceFile);const sha=digest(raw);if(sha!==s.source_revision)fail(409,'STALE_SOURCE','Staged UG-IR changed outside the trusted gateway');
      let doc;try{doc=JSON.parse(raw.toString('utf8'));}catch{fail(422,'INVALID_UGIR','Staged UG-IR JSON is invalid');}validateUGIR(doc);
      if(body.tool==='run_geometry_linter'){
        if(Object.keys(body).some(k=>k!=='tool'))fail(422,'TOOL_SCHEMA','run_geometry_linter accepts only the tool field');
        const defects=diagnostics(doc);s.last_lint={source_sha256:sha,diagnostics:defects,run_id:cryptoRandomId(),at:new Date().toISOString()};
        s.repair_window=defects.length?buildRepairWindow(doc,sha):null;
        if(!defects.length)s.stage='geometry_verified';
        s.history.push({event:'geometry_linted',at:new Date().toISOString(),source_revision:sha,defects:defects.length});await saveState(p,s);
        return {verdict:defects.length?'REPAIR_REQUIRED':'PASS',stage:s.stage,source_revision:sha,diagnostics:defects,repair_window:s.repair_window};
      }
      if(body.tool==='patch_failing_layout_nodes'){
        const window=s.repair_window;if(s.stage!=='geometry_built'||!window)fail(409,'NO_REPAIR_WINDOW','Run the deterministic linter before patching');
        if(Object.keys(body).some(k=>!['tool','base_sha256','patches'].includes(k))||body.base_sha256!==sha||window.source_sha256!==sha)fail(409,'STALE_OR_INVALID_PATCH','Patch must bind the exact current source SHA-256');
        if(!Array.isArray(body.patches)||body.patches.length<1||body.patches.length>MAX_PATCHES)fail(422,'INVALID_PATCH','Patch must contain 1..64 atomic edits');
        const old=diagnostics(doc);if(canonical(old)!==canonical(window.diagnostics))fail(409,'REPAIR_WINDOW_INVALIDATED','Geometry diagnostics changed after scope creation');
        const nodes=new Map(doc.layout_nodes.map(n=>[n.instance_name,n]));const seen=new Set();
        for(const patch of body.patches){
          if(!isObject(patch)||Object.keys(patch).sort().join(',')!=='axis,field,instance_name,value')fail(422,'PATCH_SCHEMA','Only instance_name, field, axis, value are accepted');
          const {instance_name:name,field,axis,value}=patch;if(!Object.hasOwn(window.editable_axes,name))fail(403,'NODE_FROZEN_OR_UNKNOWN',`Node ${name} is not repairable`);
          if(!['min_xyz_cm','max_xyz_cm'].includes(field)||!Number.isInteger(axis)||!window.editable_axes[name].includes(axis)||!finite(value)||Math.abs(value)>MAX_COORD_CM)fail(403,'AXIS_LOCKED','Field/axis/value is outside the authorized repair window');
          const key=`${name}|${field}|${axis}`;if(seen.has(key))fail(422,'DUPLICATE_PATCH','Duplicate coordinate edit');seen.add(key);
          if(nodes.get(name)[field][axis]===value)fail(422,'NO_OP_PATCH','No-op coordinate edit');nodes.get(name)[field][axis]=value;
        }
        validateUGIR(doc);
        for(const [name,hash] of Object.entries(window.frozen_sha256)){const node=nodes.get(name);if(!node||digest(Buffer.from(canonical(node)))!==hash)fail(403,'FROZEN_NODE_CHANGED',`Frozen node ${name} changed`);}
        const next=diagnostics(doc),before=new Map(old.map(d=>[`${diagKey(d)}`,d]));
        for(const d of next){const prior=before.get(diagKey(d));if(!prior)fail(422,'NEW_GEOMETRY_DEFECT',`Patch created new defect ${diagKey(d)}`);if(d.severity_cm>prior.severity_cm+1e-9)fail(422,'WORSENED_GEOMETRY_DEFECT',`Patch worsened ${diagKey(d)}`);}
        const oldSeverity=old.reduce((a,d)=>a+d.severity_cm,0),newSeverity=next.reduce((a,d)=>a+d.severity_cm,0);if(newSeverity>=oldSeverity-1e-9)fail(422,'NO_REPAIR_PROGRESS','Patch did not reduce measured defect severity');
        const newBytes=Buffer.from(JSON.stringify(doc,null,2)+'\n');await atomicWrite(p.sourceFile,newBytes);s.source_revision=digest(newBytes);s.repair_window=null;s.last_lint=null;s.status='active';s.history.push({event:'differential_patch_applied',at:new Date().toISOString(),previous_revision:sha,new_revision:s.source_revision,patch_count:body.patches.length,defects_before:old.length,defects_after:next.length});await saveState(p,s);
        return {verdict:'PATCH_APPLIED_REQUIRES_RECHECK',stage:s.stage,previous_revision:sha,source_revision:s.source_revision,diagnostics_after:next,patch_count:body.patches.length};
      }
      fail(501,'TOOL_NOT_IMPLEMENTED',`Tool ${body.tool} has no trusted executor`);
    });
  }
  async function submitRender(projectId,taskId,body,rendererPrincipal){
    const root=await projectRootFor(projectId,config.projectRootForId),p=await taskPaths(root,taskId);
    return withTaskLock(p,async()=>{
      const s=await readState(p);if(s.stage!=='geometry_verified')fail(409,'WRONG_STAGE','Rendering receipt requires geometry_verified');
      if(body.renderer_id!==rendererPrincipal||!isText(body.run_id)||body.source_revision!==s.source_revision||body.reference_sha256!==(s.reference_sha256||null))fail(409,'RENDER_RECEIPT_BINDING','Renderer identity, source revision or reference hash mismatch');
      if(body.views_rendered!==16||!Array.isArray(body.camera_ids)||body.camera_ids.length!==16||new Set(body.camera_ids).size!==16||body.camera_ids.some(x=>!isText(x)))fail(422,'RENDER_VIEWS','Exactly 16 unique signed camera IDs are required');
      if(!isText(body.glb_path)||!isText(body.contact_sheet_path))fail(400,'RENDER_PATHS_REQUIRED','Renderer must provide GLB and contact-sheet paths');
      const file=await safeFile(p.dir,body.contact_sheet_path,{maxBytes:50*1024*1024,extensions:['.png']});const dimensions=pngDimensions(file.bytes);const contactSha=digest(file.bytes);
      const glb=await safeFile(p.dir,body.glb_path,{maxBytes:100*1024*1024,extensions:['.glb']});if(glb.bytes.length<20||glb.bytes.toString('utf8',0,4)!=='glTF'||glb.bytes.readUInt32LE(4)!==2||glb.bytes.readUInt32LE(8)!==glb.bytes.length)fail(422,'INVALID_GLB','Renderer GLB must be a structurally valid glTF 2.0 container');const glbSha=digest(glb.bytes);
      const payload=makeRenderPayload(s,body,contactSha,glbSha),pem=await readPublicKey(config,'renderer');if(!verifySignedPayload(payload,body.signature_base64,pem))fail(403,'BAD_RENDER_SIGNATURE','Renderer signature invalid or untrusted');
      const receipt={schema:'khosan.render.receipt.v1',project_id:projectId,task_id:taskId,asset_id:s.asset_id,source_revision:s.source_revision,renderer_id:rendererPrincipal,run_id:body.run_id,glb_path:body.glb_path,glb_sha256:glbSha,contact_sheet_path:body.contact_sheet_path,contact_sheet_sha256:contactSha,reference_sha256:s.reference_sha256||null,views_rendered:16,camera_ids:body.camera_ids,dimensions,signature_base64:body.signature_base64,at:new Date().toISOString()};
      await atomicWrite(path.join(p.dir,'evidence','render-receipt.json'),Buffer.from(JSON.stringify(receipt,null,2)+'\n'));s.render_receipt=receipt;s.stage='rendered';s.history.push({event:'render_receipt_verified',at:receipt.at,contact_sheet_sha256:contactSha});await saveState(p,s);return {verdict:'RENDER_RECEIPT_VERIFIED',stage:s.stage,receipt};
    });
  }
  async function submitReviewer(projectId,taskId,body,reviewerPrincipal){
    const root=await projectRootFor(projectId,config.projectRootForId),p=await taskPaths(root,taskId);
    return withTaskLock(p,async()=>{
      const s=await readState(p);if(s.stage!=='rendered'||!s.render_receipt)fail(409,'WRONG_STAGE','Reviewer receipt requires a verified render receipt');
      const e=body.evidence;if(!isObject(e)||e.schema!==EVIDENCE_SCHEMA||e.project_id!==projectId||e.task_id!==taskId||e.asset_id!==s.asset_id||e.source_revision!==s.source_revision)fail(409,'REVIEW_BINDING','Reviewer evidence does not bind current task/source');
      if(e.maker?.agent_id!==s.maker.agent_id||e.maker?.session_id!==s.maker.session_id)fail(403,'MAKER_IDENTITY','Maker identity/session differs from task record');
      if(e.reviewer?.agent_id!==reviewerPrincipal||e.reviewer.agent_id===e.maker.agent_id||e.reviewer.session_id===e.maker.session_id||e.reviewer.isolated_session!==true||!isText(e.reviewer.run_id)||!['ACCEPT','REJECT'].includes(e.reviewer.verdict)||!Array.isArray(e.reviewer.defects))fail(403,'REVIEWER_IDENTITY','Reviewer must be a separate trusted principal/session with a signed verdict');
      if(e.reviewer.verdict==='ACCEPT'&&e.reviewer.defects.length!==0)fail(422,'REVIEWER_VERDICT','ACCEPT requires zero defects');
      if(e.reviewer.verdict==='REJECT'&&e.reviewer.defects.length===0)fail(422,'REVIEWER_VERDICT','REJECT requires at least one defect');
      if(e.reviewer.reviewed_contact_sha256!==s.render_receipt.contact_sheet_sha256||e.reviewer.reviewed_reference_sha256!==(s.reference_sha256||undefined))fail(409,'REVIEW_ARTIFACT_BINDING','Reviewer did not inspect the exact current contact sheet/reference');
      if(e.artifacts?.ugir_json?.sha256!==s.source_revision||e.artifacts?.contact_sheet_png?.sha256!==s.render_receipt.contact_sheet_sha256||e.artifacts?.glb?.sha256!==s.render_receipt.glb_sha256||(s.reference_sha256&&e.artifacts?.reference?.sha256!==s.reference_sha256))fail(409,'REVIEW_HASH_BINDING','Evidence artifact hashes do not match current source/render receipt');
      const pem=await readPublicKey(config,'reviewer');if(!verifySignedPayload(reviewerReceiptPayload(e),e.reviewer.signature_base64,pem))fail(403,'BAD_REVIEW_SIGNATURE','Independent reviewer signature invalid or untrusted');
      await atomicWrite(path.join(p.dir,'evidence','reviewer-evidence.json'),Buffer.from(JSON.stringify(e,null,2)+'\n'));
      s.review_receipt={agent_id:e.reviewer.agent_id,session_id:e.reviewer.session_id,run_id:e.reviewer.run_id,verdict:e.reviewer.verdict,defects:e.reviewer.defects,signature_base64:e.reviewer.signature_base64,at:new Date().toISOString()};
      if(e.reviewer.verdict==='ACCEPT'&&Array.isArray(e.reviewer.defects)&&e.reviewer.defects.length===0){s.stage='independent_reviewed';s.status='review_passed';}
      else{s.status='rework_required';s.review_rejection=e.reviewer.defects||[];}
      s.history.push({event:'review_receipt_verified',at:s.review_receipt.at,verdict:e.reviewer.verdict});await saveState(p,s);return {verdict:s.status==='review_passed'?'REVIEW_ACCEPTED':'REVIEW_REJECTED_REWORK_REQUIRED',stage:s.stage,status:s.status};
    });
  }
  async function approve(projectId,taskId,body,humanPrincipal){
    const root=await projectRootFor(projectId,config.projectRootForId),p=await taskPaths(root,taskId);
    return withTaskLock(p,async()=>{
      const s=await readState(p);if(s.stage!=='independent_reviewed'||s.status!=='review_passed')fail(409,'WRONG_STAGE','Human approval requires an accepted independent review');
      const e=body.evidence;if(!isObject(e)||e.project_id!==projectId||e.task_id!==taskId||e.asset_id!==s.asset_id||e.source_revision!==s.source_revision)fail(409,'APPROVAL_BINDING','Approval does not bind current task/source');
      if(e.human_approval?.approved_by!==humanPrincipal||e.human_approval?.approved!==true)fail(403,'HUMAN_IDENTITY','Approval principal does not match authenticated human role');
      if(e.maker?.agent_id!==s.maker.agent_id||e.maker?.session_id!==s.maker.session_id)fail(403,'MAKER_IDENTITY','Maker identity/session mismatch');
      if(e.reviewer?.run_id!==s.review_receipt.run_id||e.reviewer?.signature_base64!==s.review_receipt.signature_base64)fail(409,'REVIEW_RECEIPT_MISMATCH','Final evidence differs from accepted reviewer receipt');
      if(e.renderer?.run_id!==s.render_receipt.run_id||e.renderer?.signature_base64!==s.render_receipt.signature_base64||e.renderer?.rendered_glb_sha256!==s.render_receipt.glb_sha256||e.renderer?.contact_sheet_sha256!==s.render_receipt.contact_sheet_sha256)fail(409,'RENDER_RECEIPT_MISMATCH','Final evidence differs from accepted renderer receipt');
      if(e.artifacts?.ugir_json?.sha256!==s.source_revision||e.artifacts?.contact_sheet_png?.sha256!==s.render_receipt.contact_sheet_sha256||e.artifacts?.glb?.sha256!==s.render_receipt.glb_sha256)fail(409,'FINAL_ARTIFACT_MISMATCH','Final artifacts differ from verified task artifacts');
      const rendererKey=await readPublicKey(config,'renderer'),reviewerKey=await readPublicKey(config,'reviewer'),humanKey=await readPublicKey(config,'human');
      const result=await verify3DAcceptance(p.dir,e,{renderer_public_key_pem:rendererKey,reviewer_public_key_pem:reviewerKey,human_public_key_pem:humanKey});
      if(!result.ok)fail(422,'EVIDENCE_GATE_BLOCKED',result.errors.join(' | '));
      await atomicWrite(path.join(p.dir,'evidence','final-evidence.json'),Buffer.from(JSON.stringify(e,null,2)+'\n'));
      s.stage='human_accepted';s.status='human_accepted';s.human_approval={approved_by:humanPrincipal,approval_reference:e.human_approval.approval_reference,approved_glb_sha256:e.human_approval.approved_glb_sha256,signature_base64:e.human_approval.signature_base64,at:new Date().toISOString()};s.final_gate={verdict:result.verdict,checked_artifacts:result.checked_artifacts};s.history.push({event:'human_approval_verified',at:s.human_approval.at,glb_sha256:s.human_approval.approved_glb_sha256});await saveState(p,s);return {verdict:'HUMAN_ACCEPTED',stage:s.stage,gate:result};
    });
  }
  async function handle(req,res,url){
    const m=url.pathname.match(/^\/api\/harness\/([^/]+)\/tasks(?:\/([^/]+)(?:\/(dispatch|render-receipt|reviewer-receipt|human-approval))?)?$/);
    if(!m)return false;
    try{
      if(!enabled)fail(503,'GATEWAY_DISABLED','Harness gateway disabled: server must bind to loopback');
      const projectId=decodeURIComponent(m[1]),taskId=m[2]?decodeURIComponent(m[2]):null,action=m[3]||null;
      if(req.method==='POST'&&!taskId&&!action){const principal=auth(req,config,'human');const body=await readBody(req);send(res,201,await createTask(projectId,body,principal));return true;}
      if(req.method==='GET'&&taskId&&!action){authAny(req,config);const root=await projectRootFor(projectId,config.projectRootForId),p=await taskPaths(root,taskId),s=await readState(p);send(res,200,{task:s});return true;}
      if(req.method==='POST'&&taskId&&action){const body=await readBody(req);let out;
        if(action==='dispatch'){const principal=auth(req,config,'maker');out=await dispatch(projectId,taskId,body,principal);}
        else if(action==='render-receipt'){const principal=auth(req,config,'renderer');out=await submitRender(projectId,taskId,body,principal);}
        else if(action==='reviewer-receipt'){const principal=auth(req,config,'reviewer');out=await submitReviewer(projectId,taskId,body,principal);}
        else if(action==='human-approval'){const principal=auth(req,config,'human');out=await approve(projectId,taskId,body,principal);}
        else fail(404,'ROUTE_NOT_FOUND','Unknown harness action');
        send(res,200,out);return true;
      }
      fail(405,'METHOD_NOT_ALLOWED','Method not allowed for this harness route');
    }catch(error){const status=error instanceof GatewayError?error.status:500;send(res,status,{verdict:'BLOCKED',error:error.code||'INTERNAL_ERROR',message:error.message});return true;}
  }
  return {handle};
}

export function renderReceiptPayload(state, body, contactSheetSha256, glbSha256) { return makeRenderPayload(state,body,contactSheetSha256,glbSha256); }