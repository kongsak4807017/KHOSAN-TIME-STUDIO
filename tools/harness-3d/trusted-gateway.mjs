/** KHOSAN 3D trusted command gateway, draft executable vertical slice.
 * No HTTP mutation endpoint. Run under a dedicated OS account with protected
 * trust/signing keys and authoritative project files inaccessible to Makers.
 * IMPORTANT: calling this from the same unrestricted DevSpace OS account does
 * not prevent DevSpace from bypassing it by writing the filesystem directly.
 */
import {createHash,createPublicKey,randomUUID,verify as verifyEd25519,sign as signEd25519} from 'node:crypto';
import {mkdir,readFile,writeFile,rename,open,unlink,lstat,realpath,stat} from 'node:fs/promises';
import path from 'node:path';
import {allowedTools,enforceTool,geometryDiagnostics,measuredRepairScope,applyDifferentialPatch,digest,stableJSON,HardLockError} from './repair-protocol.mjs';
import {rendererReceiptPayload,reviewerReceiptPayload,humanApprovalPayload,verify3DAcceptance,EVIDENCE_SCHEMA} from './gate.mjs';

const PROTOCOL='khosan.3d.command.v1';
const STATE='khosan.3d.trusted-state.v1';
const TRUST='khosan.3d.trust.v1';
const NAME=/^TASK-[A-Z0-9-]{1,76}$/;
const ID=/^[A-Za-z][A-Za-z0-9._-]{1,79}$/;
const NONCE=/^[A-Za-z0-9][A-Za-z0-9._-]{15,119}$/;
const SHA=/^[0-9a-f]{64}$/;
const ROLES=new Set(['controller','maker','checker','renderer','reviewer','human','observer']);
const fail=msg=>{throw new HardLockError(msg)};
const isObj=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const keys=(o,fields)=>isObj(o)&&Object.keys(o).every(k=>fields.includes(k));
const time=t=>typeof t==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(t)&&Number.isFinite(Date.parse(t));
const sha=x=>createHash('sha256').update(x).digest('hex');
function contained(root,child){const relative=path.relative(root,child);return relative!==''&&!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative)}

function checkPublicKey(pem){
 if(typeof pem!=='string'||!pem.includes('PUBLIC KEY'))fail('missing trusted public key');
 try{const key=createPublicKey(pem);if(key.asymmetricKeyType!=='ed25519')fail('only Ed25519 trust keys permitted');return key}
 catch{fail('invalid public trust key')}
}
export function validateTrust(trust){
 if(!isObj(trust)||trust.schema!==TRUST||!isObj(trust.server)||!isObj(trust.actors)||!isObj(trust.projects))fail('invalid trust registry');
 const serverKey=checkPublicKey(trust.server.public_key_pem);if(!Object.keys(trust.projects).every(k=>ID.test(k)&&typeof trust.projects[k]==='string'))fail('invalid configured project roots');const fingerprints=new Set([sha(serverKey.export({format:'der',type:'spki'}))]);
 for(const [role,actors] of Object.entries(trust.actors)){
  if(!ROLES.has(role)||!isObj(actors))fail('invalid trust role');
  for(const [id,pem] of Object.entries(actors)){
   if(!ID.test(id))fail('invalid trusted actor ID');
   const key=checkPublicKey(pem);const fp=sha(key.export({format:'der',type:'spki'}));
   if(fingerprints.has(fp))fail('same public key reused across actors/roles');
   fingerprints.add(fp);
  }
 }
 return true;
}
export function envelopeBody(envelope){
 if(!isObj(envelope))fail('command must be object');
 const {signature_base64,...rest}=envelope;return stableJSON(rest);
}
function checkedSignature(body,signature,pem){
 if(typeof signature!=='string'||!/^[A-Za-z0-9+/]+={0,2}$/.test(signature))return false;
 try{return verifyEd25519(null,Buffer.from(body),checkPublicKey(pem),Buffer.from(signature,'base64'))}catch{return false}
}
export function signGatewayResponse(response,serverPrivateKey){
 const body=stableJSON(response);
 return {...response,server_signature_base64:signEd25519(null,Buffer.from(body),serverPrivateKey).toString('base64')};
}
export function verifyGatewayResponse(response,serverPublicKeyPem){
 if(!isObj(response)||typeof response.server_signature_base64!=='string')return false;
 const {server_signature_base64,...body}=response;
 return checkedSignature(stableJSON(body),server_signature_base64,serverPublicKeyPem);
}
export function authorizeCommand(req,trust,now=Date.now()){
 validateTrust(trust);
 if(!keys(req,['schema','project_id','task_id','actor','action','expected_version','nonce','issued_at','expires_at','payload','signature_base64'])||Object.keys(req).length!==11||req.schema!==PROTOCOL)fail('invalid command schema');
 if(!ID.test(req.project_id??'')||!NAME.test(req.task_id??''))fail('unsafe project or task identity');
 if(!isObj(req.actor)||!keys(req.actor,['role','id'])||Object.keys(req.actor).length!==2||!ROLES.has(req.actor.role)||!ID.test(req.actor.id??''))fail('invalid caller identity');
 if(!isObj(req.payload)||typeof req.action!=='string'||!NONCE.test(req.nonce??'')||!time(req.issued_at)||!time(req.expires_at))fail('invalid command payload/time/nonce');
 const start=Date.parse(req.issued_at),end=Date.parse(req.expires_at);
 if(end<=start||end-start>300000||start-now>30000||end<now)fail('stale, expired or unbounded command');
 if(req.action==='open_task'){
  if(req.expected_version!==null||req.actor.role!=='controller')fail('only controller may open a task');
 }else if(!Number.isSafeInteger(req.expected_version)||req.expected_version<1)fail('expected version is required');
 const pem=trust.actors?.[req.actor.role]?.[req.actor.id];
 if(!checkedSignature(envelopeBody(req),req.signature_base64,pem))fail('untrusted actor signature');
 return true;
}
export function signCommandForTestOnly(req,privateKeyPem){return {...req,signature_base64:signEd25519(null,Buffer.from(envelopeBody(req)),privateKeyPem).toString('base64')};}

async function realProject(root,projectId,trust){
 const full=await realpath(root);
 const configured=trust?.projects?.[projectId];if(typeof configured!=='string'||await realpath(configured)!==full)fail('project root not registered in trusted configuration');
 const p=path.join(full,'project.json');const st=await lstat(p);
 if(!st.isFile()||st.isSymbolicLink())fail('project.json must be a local regular file');
 const data=JSON.parse(await readFile(p,'utf8'));
 if(data.project_id!==projectId&&data.id!==projectId)fail('registered project mismatch');
 return full;
}
async function getSafeFile(root,relative,{suffix,maxBytes=64*1024*1024}={}){
 if(typeof relative!=='string'||relative.length>300||!relative||relative.includes('\\')||relative.includes('\0')||path.isAbsolute(relative)||/^[a-z]:/i.test(relative)||relative.split('/').some(x=>x===''||x==='.'||x==='..'))fail('unsafe artifact path');
 if(suffix&&!relative.toLowerCase().endsWith(suffix))fail('unsupported artifact extension');
 let directory=root;const parts=relative.split('/');
 for(const [i,p] of parts.entries()){
  directory=path.join(directory,p);const st=await lstat(directory);
  if(st.isSymbolicLink()||(!st.isFile()&&i===parts.length-1)||(!st.isDirectory()&&i<parts.length-1))fail('symlinks or nonregular artifact path forbidden');
 }
 const resolved=await realpath(directory);
 if(!contained(root,resolved))fail('artifact outside registered project');
 const metadata=await stat(resolved);
 if(!metadata.isFile()||metadata.size<12||metadata.size>maxBytes)fail('invalid artifact size/type');
 return {file:resolved,relative,bytes:metadata.size};
}
async function fileHash(file){return sha(await readFile(file))}
async function pngInfo(file){
 const data=await readFile(file);if(data.length<33||!data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||data.toString('ascii',12,16)!=='IHDR')fail('invalid PNG image header');
 const width=data.readUInt32BE(16),height=data.readUInt32BE(20);if(width<16||height<16||width>32768||height>32768)fail('invalid PNG dimensions');
 return {width,height};
}
async function glbVertices(file){
 const bytes=await readFile(file);if(bytes.length<40||bytes.toString('ascii',0,4)!=='glTF'||bytes.readUInt32LE(4)!==2||bytes.readUInt32LE(8)!==bytes.length||bytes.toString('ascii',16,20)!=='JSON')fail('invalid GLB');
 const length=bytes.readUInt32LE(12);if(length<2||length>8*1024*1024||20+length>bytes.length)fail('invalid GLB JSON chunk');
 const doc=JSON.parse(bytes.subarray(20,20+length).toString('utf8'));let vertices=0;
 for(const m of doc.meshes??[])for(const prim of m.primitives??[]){const a=doc.accessors?.[prim.attributes?.POSITION];if(!a||!Number.isSafeInteger(a.count)||a.count<3)fail('invalid POSITION accessor');vertices+=a.count}
 if(!vertices||vertices>100000)fail('missing or overbudget GLB geometry');return vertices;
}
const statePath=(folder)=>path.join(folder,'state.json');
const sourcePath=(folder,version)=>path.join(folder,`source-v${String(version).padStart(6,'0')}.ugir.json`);
function signState(state,serverPrivateKey){
 const data={...state};delete data.signature_base64;
 return {...data,signature_base64:signEd25519(null,Buffer.from(stableJSON(data)),serverPrivateKey).toString('base64')};
}
async function readState(folder,trust){
 const raw=JSON.parse(await readFile(statePath(folder),'utf8'));
 if(!keys(raw,['schema','project_id','task_id','asset_id','version','stage','reference','source','scope','lint','render','review','approval','maker','used_nonces','history','signature_base64'])||raw.schema!==STATE)fail('invalid stored harness state');
 const {signature_base64,...body}=raw;
 if(!checkedSignature(stableJSON(body),signature_base64,trust.server.public_key_pem))fail('state signature invalid or tampered');
 if(!Number.isSafeInteger(raw.version)||raw.version<1)fail('invalid state version');
 if(raw.source){const f=await getSafeFile(folder,raw.source.filename,{suffix:'.json',maxBytes:8*1024*1024});const bytes=await readFile(f.file);const current=JSON.parse(bytes.toString('utf8'));if(digest(current)!==raw.source.sha256||sha(bytes)!==raw.source.file_sha256)fail('stored source was modified without authorization')}
 return raw;
}
async function commitState(folder,oldState,newState,serverPrivateKey,trust){
 const signed=signState(newState,serverPrivateKey);
 if(!checkedSignature(stableJSON(Object.fromEntries(Object.entries(signed).filter(([k])=>k!=='signature_base64'))),signed.signature_base64,trust.server.public_key_pem))fail('server private key does not match trusted server public key');
 const tmp=path.join(folder,`.state-${randomUUID()}.json`);
 await writeFile(tmp,JSON.stringify(signed,null,2)+'\n',{flag:'wx',mode:0o600});
 try{await rename(tmp,statePath(folder))}catch(e){await unlink(tmp).catch(()=>{});throw e}
 return signed;
}
function audit(s,req,result){
 const h=Array.isArray(s.history)?s.history:[];if(h.length>=10000)fail('history requires archival before continuing');
 return [...h,{version:s.version+1,actor:req.actor.id,role:req.actor.role,action:req.action,nonce:req.nonce,time:req.issued_at,outcome:result}];
}
function validatePayload(p,fields,required=fields){if(!keys(p,fields)||required.some(k=>!Object.hasOwn(p,k)))fail('unexpected or missing command payload fields')}
async function issueSource(folder,source,version){
 const filename=path.basename(sourcePath(folder,version));
 await writeFile(path.join(folder,filename),stableJSON(source)+'\n',{flag:'wx',mode:0o600});
 return {filename,sha256:digest(source)};
}
function createEvidence(state,payloadHuman=null){
 const s=state;
 if(!s.reference||!s.render||!s.lint||!s.review||!s.source||!s.maker)fail('incomplete evidence state');
 return {
  schema:EVIDENCE_SCHEMA,project_id:s.project_id,task_id:s.task_id,asset_id:s.asset_id,source_revision:s.source.file_sha256,reference_mode:'reference',maker:s.maker,
  renderer:s.render.renderer,reviewer:s.review,technical:{source_revision:s.source.file_sha256,tool_id:'khosan-3d-measured-layout',run_id:s.lint.run_id,compile_exit_code:0,floating_count:0,piercing_count:0,max_seam_gap_cm:s.lint.max_seam_gap_cm,max_camera_blocked_frac:s.render.camera_blocked_frac,vertex_count:s.render.vertices},
  artifacts:{ugir_json:{path:`.khosan/harness3d/tasks/${s.task_id}/${s.source.filename}`,sha256:s.source.file_sha256},glb:s.render.glb,contact_sheet_png:s.render.contact_sheet_png,reference:s.reference},
  human_approval:payloadHuman??{approved:false,approval_reference:'PENDING',approved_by:'PENDING',asset_id:s.asset_id,approved_glb_sha256:s.render.glb.sha256,signature_base64:''}
 };
}
function trustKey(trust,role,id){return trust.actors?.[role]?.[id]}

/** Execute one signed command. A non-owner caller must not be able to read
 * serverPrivateKey or modify projectRoot/.khosan/harness3d directly at OS level.
 */
export async function executeTrustedCommand({projectRoot,trust,serverPrivateKey,request,now=Date.now()}){
 authorizeCommand(request,trust,now);
 if(!serverPrivateKey||typeof serverPrivateKey!=='string')fail('server signer key unavailable');
 const root=await realProject(projectRoot,request.project_id,trust);
 const tasksRoot=path.join(root,'.khosan','harness3d','tasks');
 const folder=path.join(tasksRoot,request.task_id);
 if(!contained(tasksRoot,folder))fail('task escape');
 let cur=root;for(const part of ['.khosan','harness3d','tasks',request.task_id]){
   cur=path.join(cur,part);
   try{await mkdir(cur,{mode:0o700})}catch(e){if(e.code!=='EEXIST')throw e}
   const st=await lstat(cur);if(!st.isDirectory()||st.isSymbolicLink()||!(contained(root,await realpath(cur))))fail('unsafe gateway task directory or symlink');
 }
 const lock=path.join(folder,'.gateway.lock');let fd;
 try{fd=await open(lock,'wx',0o600)}catch{fail('task currently locked; intervention needed if stale')}
 try{
  let current=null;
  try{current=await readState(folder,trust)}catch(e){if(e?.code!=='ENOENT')throw e}
  if(request.action==='status'){
   if(!current)fail('task not initialized');
   if(request.expected_version!==current.version)fail('stale expected state version');
   return {ok:true,version:current.version,stage:current.stage,source_sha256:current.source?.sha256??null,source_file_sha256:current.source?.file_sha256??null,tools:allowedTools(current.stage,request.actor.role),has_reference:!!current.reference,has_review:!!current.review,has_approval:!!current.approval};
  }
  if(current){
   if(request.expected_version!==current.version)fail('stale task version or replay attempt');
   if(current.used_nonces?.includes(request.nonce))fail('replayed command nonce');
  }
  if(request.action==='open_task'){
   if(current)fail('task already initialized');
   validatePayload(request.payload,['asset_id'],['asset_id']);
   const asset=request.payload.asset_id;if(!ID.test(asset??''))fail('invalid asset id');
   const init={schema:STATE,project_id:request.project_id,task_id:request.task_id,asset_id:asset,version:1,stage:'specified',reference:null,source:null,scope:null,lint:null,render:null,review:null,approval:null,maker:null,used_nonces:[request.nonce],history:[{version:1,action:'open_task',actor:request.actor.id,nonce:request.nonce,time:request.issued_at}]};
   await commitState(folder,null,init,serverPrivateKey,trust);
   return {ok:true,version:1,stage:'specified',source_sha256:null};
  }
  if(!current)fail('unknown task');
  enforceTool(current.stage,request.actor.role,request.action);
  let next=structuredClone(current),response={};delete next.signature_base64;
  switch(request.action){
   case 'lock_reference':{
    validatePayload(request.payload,['path','sha256']);
    const p=await getSafeFile(root,request.payload.path,{suffix:'.png',maxBytes:20*1024*1024});
    await pngInfo(p.file);const h=await fileHash(p.file);
    if(h!==request.payload.sha256)fail('reference changed or sha mismatch');
    next.reference={path:request.payload.path,sha256:h};next.stage='reference_locked';response={reference_sha256:h};break;
   }
   case 'create_geometry':{
    validatePayload(request.payload,['ugir']);
    const ugir=request.payload.ugir;if(!isObj(ugir)||ugir.asset_id!==next.asset_id)fail('wrong asset in UG-IR');
    geometryDiagnostics(ugir);const v=next.version+1;
    const source=await issueSource(folder,ugir,v);source.file_sha256=await fileHash(path.join(folder,source.filename));
    next.source=source;next.maker={agent_id:request.actor.id,session_id:request.nonce};next.stage='geometry_built';response={source_sha256:source.sha256};break;
   }
   case 'lint_geometry':{
    validatePayload(request.payload,[]);
    const p=await getSafeFile(folder,next.source.filename,{suffix:'.json',maxBytes:8*1024*1024});const source=JSON.parse(await readFile(p.file,'utf8'));
    const findings=geometryDiagnostics(source);
    if(findings.length){next.scope=measuredRepairScope(source);next.lint=null;response={verdict:'REWORK',scope:next.scope};}
    else {next.scope=null;next.lint={run_id:request.nonce,source_sha256:next.source.file_sha256,max_seam_gap_cm:0,issues:[]};next.stage='geometry_verified';response={verdict:'PASS',source_sha256:next.source.file_sha256};}
    break;
   }
   case 'patch_failing_layout_nodes':{
    validatePayload(request.payload,['base_sha256','patches']);
    if(request.actor.id!==next.maker?.agent_id)fail('only the authorized maker can patch this asset');
    if(!next.scope)fail('no measured failing scope');
    const p=await getSafeFile(folder,next.source.filename,{suffix:'.json',maxBytes:8*1024*1024});
    const source=JSON.parse(await readFile(p.file,'utf8'));
    const patch=applyDifferentialPatch(source,next.scope,request.payload);
    const issued=await issueSource(folder,patch.state,next.version+1);issued.file_sha256=await fileHash(path.join(folder,issued.filename));
    next.source=issued;next.scope=null;next.lint=null;response={verdict:patch.complete?'READY_FOR_RECHECK':'REWORK',source_sha256:issued.sha256,source_file_sha256:issued.file_sha256,issues_after:patch.after};break;
   }
   case 'submit_render':{
    validatePayload(request.payload,['glb','contact_sheet_png','camera_blocked_frac','source_sha256','camera_ids','renderer_receipt_signature_base64']);
    if(request.actor.id===next.maker?.agent_id)fail('renderer must be a separate principal from maker');
    if(request.payload.source_sha256!==next.source.file_sha256||next.lint.source_sha256!==next.source.file_sha256)fail('render references stale geometry');
    if(!Array.isArray(request.payload.camera_ids)||request.payload.camera_ids.length!==16||new Set(request.payload.camera_ids).size!==16||request.payload.camera_ids.some(x=>typeof x!=='string'||!x))fail('renderer must attest exactly 16 unique camera IDs');
    const out={};for(const [name,extension] of [['glb','.glb'],['contact_sheet_png','.png']]){
      const item=request.payload[name];if(!keys(item,['path','sha256'])||Object.keys(item).length!==2)fail('invalid render artifact object');
      const f=await getSafeFile(root,item.path,{suffix:extension,maxBytes:256*1024*1024});const h=await fileHash(f.file);
      if(item.sha256!==h)fail('render artifact hash mismatch');
      if(name==='glb')out.vertices=await glbVertices(f.file);
      if(name==='contact_sheet_png'){const size=await pngInfo(f.file);if(size.width<256||size.height<256||size.width%4||size.height%4)fail('contact sheet must be large enough for 4x4 grid')}
      out[name]={path:item.path,sha256:h};
    }
    const frac=request.payload.camera_blocked_frac;if(typeof frac!=='number'||!Number.isFinite(frac)||frac<0||frac>0.2)fail('measured camera occlusion exceeds budget or is invalid');
    const renderer={renderer_id:request.actor.id,run_id:request.nonce,source_revision:next.source.file_sha256,rendered_glb_sha256:out.glb.sha256,contact_sheet_sha256:out.contact_sheet_png.sha256,reference_sha256:next.reference.sha256,views_rendered:16,camera_ids:request.payload.camera_ids,signature_base64:request.payload.renderer_receipt_signature_base64};
    const candidate={schema:EVIDENCE_SCHEMA,project_id:next.project_id,task_id:next.task_id,asset_id:next.asset_id,source_revision:next.source.file_sha256,reference_mode:'reference',renderer};
    if(!checkedSignature(rendererReceiptPayload(candidate),renderer.signature_base64,trustKey(trust,'renderer',request.actor.id)))fail('renderer receipt signature invalid or untrusted');
    next.render={glb:out.glb,contact_sheet_png:out.contact_sheet_png,vertices:out.vertices,camera_blocked_frac:frac,run_id:request.nonce,actor_id:request.actor.id,renderer};next.stage='rendered';response={verdict:'RENDER_RECEIPT_RECORDED',vertices:out.vertices};break;
   }
   case 'submit_review':{
    validatePayload(request.payload,['run_id','verdict','defects','reviewed_contact_sha256','reviewed_reference_sha256','receipt_signature_base64']);
    if(!ID.test(request.payload.run_id??'')||request.payload.verdict!=='ACCEPT'||!Array.isArray(request.payload.defects)||request.payload.defects.length)fail('reviewer has defects or invalid verdict');
    if(request.actor.id===next.maker?.agent_id||request.actor.id===next.render.actor_id||request.payload.reviewed_contact_sha256!==next.render.contact_sheet_png.sha256||request.payload.reviewed_reference_sha256!==next.reference.sha256)fail('review not independent or hash-bound');
    const reviewer={agent_id:request.actor.id,session_id:request.nonce,run_id:request.payload.run_id,isolated_session:true,verdict:'ACCEPT',defects:[],reviewed_contact_sha256:request.payload.reviewed_contact_sha256,reviewed_reference_sha256:request.payload.reviewed_reference_sha256,signature_base64:request.payload.receipt_signature_base64};
    const candidate=createEvidence({...next,review:reviewer});
    if(!checkedSignature(reviewerReceiptPayload(candidate),reviewer.signature_base64,trustKey(trust,'reviewer',request.actor.id)))fail('reviewer receipt not signed by independent key');
    next.review=reviewer;next.stage='independent_reviewed';response={verdict:'SIGNED_REVIEW_RECORDED',review_run_id:reviewer.run_id};break;
   }
   case 'approve':{
    validatePayload(request.payload,['approval_reference','approved_glb_sha256','receipt_signature_base64']);
    if(!ID.test(request.payload.approval_reference??'')||request.payload.approved_glb_sha256!==next.render.glb.sha256||request.actor.id===next.maker?.agent_id||request.actor.id===next.review?.agent_id||request.actor.id===next.render.actor_id)fail('invalid approval identity/binding');
    const human={approved:true,approval_reference:request.payload.approval_reference,approved_by:request.actor.id,asset_id:next.asset_id,approved_glb_sha256:next.render.glb.sha256,signature_base64:request.payload.receipt_signature_base64};
    const evidence=createEvidence({...next,human_approval:human},human);
    const result=await verify3DAcceptance(root,evidence,{renderer_public_key_pem:trustKey(trust,'renderer',next.render.actor_id),reviewer_public_key_pem:trustKey(trust,'reviewer',next.review.agent_id),human_public_key_pem:trustKey(trust,'human',request.actor.id)});
    if(!result.ok)fail('final independent evidence gate BLOCKED: '+result.errors.join(' | '));
    const filename=`acceptance-v${String(next.version+1).padStart(6,'0')}.json`;
    await writeFile(path.join(folder,filename),stableJSON(evidence)+'\n',{flag:'wx',mode:0o600});
    next.approval={file:filename,sha256:await fileHash(path.join(folder,filename)),actor_id:request.actor.id};next.stage='human_accepted';response={verdict:'HUMAN_ACCEPTED_WITH_SIGNED_EVIDENCE',acceptance_path:`.khosan/harness3d/tasks/${next.task_id}/${filename}`};break;
   }
   default: fail('unsupported signed action');
  }
  next.version=current.version+1;
  next.used_nonces=[...(current.used_nonces??[]),request.nonce].slice(-10000);
  next.history=audit(current,request,response.verdict??'OK');
  await commitState(folder,current,next,serverPrivateKey,trust);
  return {ok:true,version:next.version,stage:next.stage,...response};
 }finally{await fd.close().catch(()=>{});await unlink(lock).catch(()=>{})}
}

/** Read-only status for Studio UI. Never reads signing keys; trust must come
 * from a privileged operator config, NOT arbitrary browser-supplied JSON.
 */
export async function readTrustedStatus({projectRoot,trust,projectId,taskId}){
 validateTrust(trust);const root=await realProject(projectRoot,projectId,trust);
 if(!NAME.test(taskId))fail('invalid task id');const folder=path.join(root,'.khosan','harness3d','tasks',taskId);
 const state=await readState(folder,trust);
 return {project_id:state.project_id,task_id:state.task_id,asset_id:state.asset_id,version:state.version,stage:state.stage,source_sha256:state.source?.sha256??null,source_file_sha256:state.source?.file_sha256??null,verification:'state Ed25519 signature validated',allowed_actions:Object.fromEntries([...ROLES].map(role=>[role,allowedTools(state.stage,role)])),read_only:true};
}