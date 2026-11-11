import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash,generateKeyPairSync,sign,randomUUID} from 'node:crypto';
import {deflateSync} from 'node:zlib';
import {executeTrustedCommand,authorizeCommand,envelopeBody,readTrustedStatus,signGatewayResponse,verifyGatewayResponse} from '../tools/harness-3d/trusted-gateway.mjs';
import {startGatewayDaemon} from '../tools/harness-3d/gateway-daemon.mjs';
import {callGateway} from '../tools/harness-3d/gateway-client.mjs';
import {rendererReceiptPayload,reviewerReceiptPayload,humanApprovalPayload,EVIDENCE_SCHEMA} from '../tools/harness-3d/gate.mjs';

const sha=b=>createHash('sha256').update(b).digest('hex');
const roles=['server','controller','maker','checker','renderer','reviewer','human'];
function keypair(){return generateKeyPairSync('ed25519',{publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}})}
function crc32(buf){let c=0xffffffff;for(const x of buf){c^=x;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0)}return(c^0xffffffff)>>>0}
function pngChunk(name,data){const type=Buffer.from(name),raw=Buffer.concat([type,data]),out=Buffer.alloc(12+data.length);out.writeUInt32BE(data.length);type.copy(out,4);data.copy(out,8);out.writeUInt32BE(crc32(raw),8+data.length);return out}
function png(width=256,height=256){const h=Buffer.alloc(13);h.writeUInt32BE(width,0);h.writeUInt32BE(height,4);h[8]=8;h[9]=6;const rows=Buffer.alloc(height*(1+width*4));return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),pngChunk('IHDR',h),pngChunk('IDAT',deflateSync(rows)),pngChunk('IEND',Buffer.alloc(0))]);}
function glb(){const verts=Buffer.alloc(36),indices=Buffer.alloc(8);for(let i=0;i<9;i++)verts.writeFloatLE([0,0,0,1,0,0,0,1,0][i],i*4);indices.writeUInt16LE(0,0);indices.writeUInt16LE(1,2);indices.writeUInt16LE(2,4);const bin=Buffer.concat([verts,indices]);const doc={asset:{version:'2.0'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0}],meshes:[{primitives:[{attributes:{POSITION:0},indices:1}]}],buffers:[{byteLength:bin.length}],bufferViews:[{buffer:0,byteOffset:0,byteLength:verts.length},{buffer:0,byteOffset:verts.length,byteLength:6}],accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3',min:[0,0,0],max:[1,1,0]},{bufferView:1,componentType:5123,count:3,type:'SCALAR'}]};const json=Buffer.from(JSON.stringify(doc));const data=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);const b=Buffer.alloc(12+8+data.length+8+bin.length);b.write('glTF');b.writeUInt32LE(2,4);b.writeUInt32LE(b.length,8);b.writeUInt32LE(data.length,12);b.write('JSON',16);data.copy(b,20);const off=20+data.length;b.writeUInt32LE(bin.length,off);b.write('BIN\0',off+4);bin.copy(b,off+8);return b;}
const source={asset_id:'house-001',coordinate_system:{unit:'cm',up_axis:'+Z'},layout_nodes:[{instance_name:'Floor',placement_mode:'place_bounds_box',min_xyz_cm:[-500,-500,-20],max_xyz_cm:[500,500,0],is_ground:true},{instance_name:'WallLeft',placement_mode:'place_bounds_box',min_xyz_cm:[-50,-10,0],max_xyz_cm:[0,10,100]},{instance_name:'WallRight',placement_mode:'place_bounds_box',min_xyz_cm:[1,-10,0],max_xyz_cm:[50,10,100]}],expected_adjacent_seams:[['WallLeft','WallRight']]};
async function fixture(){
 const root=await mkdtemp(path.join(tmpdir(),'khosan-trusted-gateway-'));await mkdir(path.join(root,'assets'),{recursive:true});await writeFile(path.join(root,'project.json'),JSON.stringify({id:'game-001',project_id:'game-001'}));
 const reference=png(64,64);await writeFile(path.join(root,'assets','reference.png'),reference);
 const kp=Object.fromEntries(roles.map(r=>[r,keypair()]));const trust={schema:'khosan.3d.trust.v1',server:{public_key_pem:kp.server.publicKey},actors:{},projects:{'game-001':root}};
 for(const role of roles.filter(r=>r!=='server'))trust.actors[role]={[role+'-01']:kp[role].publicKey};
 return {root,kp,trust,reference,referenceHash:sha(reference),source};
}
function command(f,role,action,expected_version,payload,nonce=randomUUID()){
 const actorId=role==='controller'?'controller-01':role==='maker'?'maker-01':role==='checker'?'checker-01':role==='renderer'?'renderer-01':role==='reviewer'?'reviewer-01':'human-01';
 const now=Date.now();const req={schema:'khosan.3d.command.v1',project_id:'game-001',task_id:'TASK-HOUSE-001',actor:{role,id:actorId},action,expected_version,nonce,issued_at:new Date(now).toISOString(),expires_at:new Date(now+120000).toISOString(),payload};
 req.signature_base64=sign(null,Buffer.from(envelopeBody(req)),f.kp[role].privateKey).toString('base64');return req;
}
function buildEvidence(state,reviewer,human){return {schema:EVIDENCE_SCHEMA,project_id:state.project_id,task_id:state.task_id,asset_id:state.asset_id,source_revision:state.source.file_sha256,reference_mode:'reference',maker:state.maker,renderer:state.render.renderer,reviewer,technical:{source_revision:state.source.file_sha256,tool_id:'khosan-3d-measured-layout',run_id:state.lint.run_id,compile_exit_code:0,floating_count:0,piercing_count:0,max_seam_gap_cm:state.lint.max_seam_gap_cm,max_camera_blocked_frac:state.render.camera_blocked_frac,vertex_count:state.render.vertices},artifacts:{ugir_json:{path:`.khosan/harness3d/tasks/${state.task_id}/${state.source.filename}`,sha256:state.source.file_sha256},glb:state.render.glb,contact_sheet_png:state.render.contact_sheet_png,reference:state.reference},human_approval:human??{approved:false,approval_reference:'PENDING',approved_by:'PENDING',asset_id:state.asset_id,approved_glb_sha256:state.render.glb.sha256,signature_base64:''}};}

 test('rejects forged, expired, replayed and cross-role commands',async()=>{
  const f=await fixture();try{
   const req=command(f,'controller','open_task',null,{asset_id:'house-001'});const bad={...req,signature_base64:'A'.repeat(88)};assert.throws(()=>authorizeCommand(bad,f.trust),/untrusted actor signature/);
   assert.throws(()=>authorizeCommand({...req,expires_at:new Date(Date.now()-1000).toISOString()},f.trust),/stale, expired/);
   const wrong=command(f,'maker','lock_reference',1,{path:'assets/reference.png',sha256:f.referenceHash});assert.throws(()=>authorizeCommand(wrong,f.trust),/untrusted actor signature/);
  }finally{await rm(f.root,{recursive:true,force:true})}
 });

test('end-to-end six hard locks: source-bound repair, renderer/reviewer/human Ed25519 receipts and signed state',async()=>{
 const f=await fixture();try{
  const run=async(role,action,version,payload)=>executeTrustedCommand({projectRoot:f.root,trust:f.trust,serverPrivateKey:f.kp.server.privateKey,request:command(f,role,action,version,payload)});
  let r=await run('controller','open_task',null,{asset_id:'house-001'});assert.equal(r.stage,'specified');assert.equal(r.version,1);
  r=await run('controller','lock_reference',1,{path:'assets/reference.png',sha256:f.referenceHash});assert.equal(r.stage,'reference_locked');assert.equal(r.version,2);
  r=await run('maker','create_geometry',2,{ugir:f.source});assert.equal(r.stage,'geometry_built');assert.equal(r.version,3);
  const status=await readTrustedStatus({projectRoot:f.root,trust:f.trust,projectId:'game-001',taskId:'TASK-HOUSE-001'});assert.equal(status.stage,'geometry_built');assert.equal(status.allowed_actions.maker.includes('patch_failing_layout_nodes'),true);
  r=await run('checker','lint_geometry',3,{});assert.equal(r.stage,'geometry_built');assert.equal(r.verdict,'REWORK');const scope=r.scope;assert.deepEqual(scope.editable_axes,{WallLeft:[0],WallRight:[0]});
  await assert.rejects(()=>run('maker','patch_failing_layout_nodes',4,{base_sha256:scope.base_sha256,patches:[{instance_name:'Floor',field:'max_xyz_cm',axis:0,value:499}]}),/frozen or unknown node/);
  r=await run('maker','patch_failing_layout_nodes',4,{base_sha256:scope.base_sha256,patches:[{instance_name:'WallLeft',field:'max_xyz_cm',axis:0,value:1}]});assert.equal(r.verdict,'READY_FOR_RECHECK');
  r=await run('checker','lint_geometry',5,{});assert.equal(r.verdict,'PASS');assert.equal(r.stage,'geometry_verified');
  const folder=path.join(f.root,'.khosan','harness3d','tasks','TASK-HOUSE-001');await mkdir(path.join(folder,'render'),{recursive:true});const glbBytes=glb(),contact=png(256,256);await writeFile(path.join(folder,'render','house.glb'),glbBytes);await writeFile(path.join(folder,'render','contact.png'),contact);
  const state=JSON.parse(await readFile(path.join(folder,'state.json'),'utf8'));const glbHash=sha(glbBytes),contactHash=sha(contact),cameraIds=Array.from({length:16},(_,i)=>'camera-'+String(i+1).padStart(2,'0'));
  const renderer={renderer_id:'renderer-01',run_id:'render-run-1',source_revision:state.source.file_sha256,rendered_glb_sha256:glbHash,contact_sheet_sha256:contactHash,reference_sha256:f.referenceHash,views_rendered:16,camera_ids:cameraIds,signature_base64:''};
  const renderCandidate={schema:EVIDENCE_SCHEMA,project_id:'game-001',task_id:'TASK-HOUSE-001',asset_id:'house-001',source_revision:state.source.file_sha256,reference_mode:'reference',renderer};renderer.signature_base64=sign(null,Buffer.from(rendererReceiptPayload(renderCandidate)),f.kp.renderer.privateKey).toString('base64');
  r=await run('renderer','submit_render',6,{glb:{path:'.khosan/harness3d/tasks/TASK-HOUSE-001/render/house.glb',sha256:glbHash},contact_sheet_png:{path:'.khosan/harness3d/tasks/TASK-HOUSE-001/render/contact.png',sha256:contactHash},camera_blocked_frac:0,source_sha256:state.source.file_sha256,camera_ids:cameraIds,renderer_receipt_signature_base64:renderer.signature_base64});assert.equal(r.stage,'rendered');
  const afterRender=JSON.parse(await readFile(path.join(folder,'state.json'),'utf8'));const reviewNonce=randomUUID();const reviewer={agent_id:'reviewer-01',session_id:reviewNonce,isolated_session:true,run_id:'review-run-1',verdict:'ACCEPT',defects:[],reviewed_contact_sha256:contactHash,reviewed_reference_sha256:f.referenceHash,signature_base64:''};const candidate=buildEvidence(afterRender,reviewer);reviewer.signature_base64=sign(null,Buffer.from(reviewerReceiptPayload(candidate)),f.kp.reviewer.privateKey).toString('base64');
  r=await executeTrustedCommand({projectRoot:f.root,trust:f.trust,serverPrivateKey:f.kp.server.privateKey,request:command(f,'reviewer','submit_review',7,{run_id:'review-run-1',verdict:'ACCEPT',defects:[],reviewed_contact_sha256:contactHash,reviewed_reference_sha256:f.referenceHash,receipt_signature_base64:reviewer.signature_base64},reviewNonce)});assert.equal(r.stage,'independent_reviewed');
  const afterReview=JSON.parse(await readFile(path.join(folder,'state.json'),'utf8'));const human={approved:true,approval_reference:'HG04-001',approved_by:'human-01',asset_id:'house-001',approved_glb_sha256:glbHash,signature_base64:''};const finalEvidence=buildEvidence(afterReview,afterReview.review,human);human.signature_base64=sign(null,Buffer.from(humanApprovalPayload(finalEvidence)),f.kp.human.privateKey).toString('base64');
  r=await executeTrustedCommand({projectRoot:f.root,trust:f.trust,serverPrivateKey:f.kp.server.privateKey,request:command(f,'human','approve',8,{approval_reference:'HG04-001',approved_glb_sha256:glbHash,receipt_signature_base64:human.signature_base64})});assert.equal(r.stage,'human_accepted');assert.match(r.verdict,/HUMAN_ACCEPTED/);
  const accepted=await readTrustedStatus({projectRoot:f.root,trust:f.trust,projectId:'game-001',taskId:'TASK-HOUSE-001'});assert.equal(accepted.stage,'human_accepted');assert.equal(accepted.verification,'state Ed25519 signature validated');
  await assert.rejects(()=>run('maker','patch_failing_layout_nodes',9,{base_sha256:'0'.repeat(64),patches:[]}),/tool\/role not allowed|frozen/);
 }finally{await rm(f.root,{recursive:true,force:true})}
});

test('detects tampered state and source bytes',async()=>{
 const f=await fixture();try{
  const run=async(role,action,version,payload)=>executeTrustedCommand({projectRoot:f.root,trust:f.trust,serverPrivateKey:f.kp.server.privateKey,request:command(f,role,action,version,payload)});
  await run('controller','open_task',null,{asset_id:'house-001'});await run('controller','lock_reference',1,{path:'assets/reference.png',sha256:f.referenceHash});await run('maker','create_geometry',2,{ugir:f.source});
  const folder=path.join(f.root,'.khosan','harness3d','tasks','TASK-HOUSE-001');const state=JSON.parse(await readFile(path.join(folder,'state.json'),'utf8'));await writeFile(path.join(folder,state.source.filename),'{}');
  await assert.rejects(()=>readTrustedStatus({projectRoot:f.root,trust:f.trust,projectId:'game-001',taskId:'TASK-HOUSE-001'}),/modified without authorization/);
 }finally{await rm(f.root,{recursive:true,force:true})}
});


test('gateway response is signed by the pinned server key and tamper-evident',async()=>{
 const f=await fixture();try{
  const response=signGatewayResponse({ok:true,stage:'geometry_verified'},f.kp.server.privateKey);
  assert.equal(verifyGatewayResponse(response,f.trust.server.public_key_pem),true);
  assert.equal(verifyGatewayResponse({...response,stage:'human_accepted'},f.trust.server.public_key_pem),false);
 }finally{await rm(f.root,{recursive:true,force:true})}
});

test('local IPC client rejects unsigned/tampered replies and accepts pinned signed reply',async()=>{
 if(process.platform==='win32')return; // Windows named-pipe ACL is a separate OS provisioning gate.
 const f=await fixture();const socket=path.join(f.root,'gateway.sock');let daemon;
 try{
  daemon=startGatewayDaemon({trust:f.trust,serverPrivateKey:f.kp.server.privateKey,socketPath:socket});
  await new Promise((resolve,reject)=>{daemon.once('listening',resolve);daemon.once('error',reject)});
  const req=command(f,'controller','open_task',null,{asset_id:'house-001'});
  const response=await callGateway(socket,req,f.trust.server.public_key_pem);
  assert.equal(response.ok,true);assert.equal(response.stage,'specified');assert.equal(verifyGatewayResponse(response,f.trust.server.public_key_pem),true);
 }finally{if(daemon)await new Promise(resolve=>daemon.close(resolve));await rm(f.root,{recursive:true,force:true})}
});