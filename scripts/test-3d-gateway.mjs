import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomUUID,generateKeyPairSync,sign as signEd25519,createHash} from 'node:crypto';
import {deflateSync} from 'node:zlib';
import {executeTrustedCommand,readTrustedStatus,authorizeCommand,signCommandForTestOnly,reviewerReceiptPayload,validateTrust} from '../tools/harness-3d/trusted-gateway.mjs';
import {geometryDiagnostics,measuredRepairScope,applyDifferentialPatch,allowedTools,digest,HardLockError} from '../tools/harness-3d/repair-protocol.mjs';
const d=x=>createHash('sha256').update(x).digest('hex');
const makeKey=()=>{const {publicKey,privateKey}=generateKeyPairSync('ed25519');return {pub:publicKey.export({format:'pem',type:'spki'}),priv:privateKey.export({format:'pem',type:'pkcs8'})}};
const keys=Object.fromEntries(['server','controller','maker','checker','renderer','reviewer','human','observer'].map(k=>[k,makeKey()]));
const ids={controller:'project-owner',maker:'asset-builder',checker:'geometry-qa',renderer:'render-service',reviewer:'visual-critic',human:'executive-owner',observer:'read-only-agent'};
function crc32(b){let c=0xffffffff;for(const x of b){c^=x;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0)}return (c^0xffffffff)>>>0}
function chunk(type,bytes){const t=Buffer.from(type),out=Buffer.alloc(12+bytes.length);out.writeUInt32BE(bytes.length,0);t.copy(out,4);bytes.copy(out,8);out.writeUInt32BE(crc32(Buffer.concat([t,bytes])),8+bytes.length);return out}
function png(w=256,h=256){const header=Buffer.alloc(13);header.writeUInt32BE(w,0);header.writeUInt32BE(h,4);header[8]=8;header[9]=6;const rows=Buffer.alloc(h*(1+w*4));return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(rows)),chunk('IEND',Buffer.alloc(0))])}
function glb(){
 const verts=Buffer.alloc(36),idx=Buffer.alloc(8);[0,0,0,1,0,0,0,1,0].forEach((v,i)=>verts.writeFloatLE(v,i*4));idx.writeUInt16LE(0,0);idx.writeUInt16LE(1,2);idx.writeUInt16LE(2,4);const bin=Buffer.concat([verts,idx]);
 const json={asset:{version:'2.0'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0}],meshes:[{primitives:[{attributes:{POSITION:0},indices:1}]}],buffers:[{byteLength:bin.length}],bufferViews:[{buffer:0,byteOffset:0,byteLength:verts.length},{buffer:0,byteOffset:verts.length,byteLength:6}],accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3'},{bufferView:1,componentType:5123,count:3,type:'SCALAR'}]};
 const raw=Buffer.from(JSON.stringify(json)),pad=(4-raw.length%4)%4,body=Buffer.concat([raw,Buffer.alloc(pad,32)]),out=Buffer.alloc(12+8+body.length+8+bin.length);out.write('glTF',0);out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);out.writeUInt32LE(body.length,12);out.write('JSON',16);body.copy(out,20);const offset=20+body.length;out.writeUInt32LE(bin.length,offset);out.write('BIN\0',offset+4);bin.copy(out,offset+8);return out;
}
function scene(gap=true){return {asset_id:'house001',coordinate_system:{unit:'cm',up_axis:'+Z',forward_axis:'+Y'},layout_nodes:[
 {instance_name:'Ground',placement_mode:'place_bounds_box',min_xyz_cm:[-100,-100,-10],max_xyz_cm:[100,100,0],is_ground:true},
 {instance_name:'LeftWall',placement_mode:'place_bounds_box',min_xyz_cm:[-40,-5,0],max_xyz_cm:[0,5,100]},
 {instance_name:'RightWall',placement_mode:'place_bounds_box',min_xyz_cm:[gap?1:0,-5,0],max_xyz_cm:[40,5,100]}
 ],expected_adjacent_seams:[['LeftWall','RightWall']]}}
const taskId='TASK-HOUSE-001',projectId='game001';
async function fixture(t){
 const root=await mkdtemp(path.join(tmpdir(),'khosan-gw-'));
 t.after(async()=>rm(root,{force:true,recursive:true}));
 await writeFile(path.join(root,'project.json'),JSON.stringify({project_id:projectId,id:projectId}));
 await mkdir(path.join(root,'references'));await mkdir(path.join(root,'artifacts'));
 const reference=png(256,256);await writeFile(path.join(root,'references','house.png'),reference);
 const trust={schema:'khosan.3d.trust.v1',server:{public_key_pem:keys.server.pub},projects:{[projectId]:root},actors:Object.fromEntries(Object.entries(ids).map(([role,id])=>[role,{[id]:keys[role].pub}]))};
 const env={projectRoot:root,trust,serverPrivateKey:keys.server.priv};
 function request(role,action,payload={},expected_version=null){const date=Date.now(),body={schema:'khosan.3d.command.v1',project_id:projectId,task_id:taskId,actor:{role,id:ids[role]},action,expected_version,nonce:'n-'+randomUUID(),issued_at:new Date(date).toISOString(),expires_at:new Date(date+60*1000).toISOString(),payload};return signCommandForTestOnly(body,keys[role].priv)}
 const dispatch=async req=>executeTrustedCommand({...env,request:req});
 const send=async(role,action,payload,expected)=>dispatch(request(role,action,payload,expected));
 const bootstrap=async (gap=true)=>{const a=await send('controller','open_task',{asset_id:'house001'},null);const b=await send('controller','lock_reference',{path:'references/house.png',sha256:d(reference)},a.version);const c=await send('maker','create_geometry',{ugir:scene(gap)},b.version);return c};
 return {...env,root,request,send,dispatch,bootstrap,reference};
}

test('six locks: allowed tool visibility contains no finish and is role+stage restricted',()=>{
 assert.deepEqual(allowedTools('geometry_built','maker'),['patch_failing_layout_nodes']);
 assert.deepEqual(allowedTools('geometry_built','checker'),['lint_geometry']);
 assert.deepEqual(allowedTools('rendered','maker'),[]);
 assert.deepEqual(allowedTools('human_accepted','human'),[]);
 assert.throws(()=>allowedTools('not-a-stage','maker'),HardLockError);
});
test('server/protocol trust blocks reuse of actor public key across roles',()=>{
 const trust={schema:'khosan.3d.trust.v1',server:{public_key_pem:keys.server.pub},projects:{[projectId]:'/tmp/x'},actors:{maker:{maker01:keys.maker.pub},human:{human01:keys.maker.pub}}};
 assert.throws(()=>validateTrust(trust),HardLockError);
});
test('geometry measurements bind the frozen set to real source state',()=>{
 const value=scene(),scope=measuredRepairScope(value);
 assert.equal(scope.findings.length,1);assert.deepEqual(scope.editable_axes.LeftWall,[0]);assert.ok(scope.frozen_hashes.Ground);
 const fixed=applyDifferentialPatch(value,scope,{base_sha256:scope.base_sha256,patches:[{instance_name:'LeftWall',field:'max_xyz_cm',axis:0,value:1}]});
 assert.ok(fixed.complete);assert.equal(geometryDiagnostics(fixed.state).length,0);
 assert.equal(value.layout_nodes[1].max_xyz_cm[0],0);
});
test('patch cannot edit frozen or unknown nodes, wrong axes, or introduce new defects',()=>{
 const v=scene(),scope=measuredRepairScope(v);
 const create=(name,field,axis,value)=>({base_sha256:scope.base_sha256,patches:[{instance_name:name,field,axis,value}]});
 for(const bad of [create('Ground','max_xyz_cm',0,2),create('missing','max_xyz_cm',0,2),create('LeftWall','max_xyz_cm',2,1),create('LeftWall','max_xyz_cm',0,4),create('LeftWall','min_xyz_cm',0,2),create('LeftWall','max_xyz_cm',0,Number.NaN)])assert.throws(()=>applyDifferentialPatch(v,scope,bad),HardLockError);
 assert.throws(()=>applyDifferentialPatch(v,{...scope,base_sha256:'0'.repeat(64)},create('LeftWall','max_xyz_cm',0,1)),HardLockError);
});
test('signed controller creates durable state and signed read-only status',async t=>{
 const f=await fixture(t);const a=await f.send('controller','open_task',{asset_id:'house001'},null);
 assert.equal(a.stage,'specified');assert.equal(a.version,1);
 const read=await readTrustedStatus({projectRoot:f.root,trust:f.trust,projectId,taskId});
 assert.equal(read.stage,'specified');assert.deepEqual(read.allowed_actions.controller,['lock_reference']);
});
test('a missing signer signature is never accepted',async t=>{
 const f=await fixture(t);const req=f.request('controller','open_task',{asset_id:'house001'},null);req.signature_base64='AAA=';
 await assert.rejects(()=>f.dispatch(req),HardLockError);
});
test('even valid maker key cannot use controller open_task',async t=>{
 const f=await fixture(t);
 await assert.rejects(()=>f.dispatch(f.request('maker','open_task',{asset_id:'house001'},null)),HardLockError);
});
test('malformed extra command fields are prohibited',async t=>{
 const f=await fixture(t);const req=f.request('controller','open_task',{asset_id:'house001'},null);req.force_accept=true;
 await assert.rejects(()=>f.dispatch(req),HardLockError);
});
test('expired commands and future-dated commands are blocked',async t=>{
 const f=await fixture(t);const a=f.request('controller','open_task',{asset_id:'house001'},null),at=Date.now();
 a.issued_at=new Date(at-2*60*1000).toISOString();a.expires_at=new Date(at-60*1000).toISOString();
 assert.throws(()=>authorizeCommand(a,f.trust,Date.now()),HardLockError);
 const b=f.request('controller','open_task',{asset_id:'house001'},null);b.issued_at=new Date(at+5*60*1000).toISOString();b.expires_at=new Date(at+6*60*1000).toISOString();
 assert.throws(()=>authorizeCommand(b,f.trust,Date.now()),HardLockError);
});
test('fresh signed requests fail for a different configured project root',async t=>{
 const f=await fixture(t);const other=await mkdtemp(path.join(tmpdir(),'khosan-other-'));t.after(()=>rm(other,{force:true,recursive:true}));
 await writeFile(path.join(other,'project.json'),JSON.stringify({project_id:projectId}));
 await assert.rejects(()=>executeTrustedCommand({...f,projectRoot:other,request:f.request('controller','open_task',{asset_id:'house001'},null)}),HardLockError);
});
test('signed reference lock requires the actual current image hash',async t=>{
 const f=await fixture(t);const a=await f.send('controller','open_task',{asset_id:'house001'},null);
 await assert.rejects(()=>f.send('controller','lock_reference',{path:'references/house.png',sha256:'0'.repeat(64)},a.version),HardLockError);
 const b=await f.send('controller','lock_reference',{path:'references/house.png',sha256:d(f.reference)},a.version);
 assert.equal(b.stage,'reference_locked');
});
test('path traversal in image references is rejected',async t=>{
 const f=await fixture(t);const a=await f.send('controller','open_task',{asset_id:'house001'},null);
 await assert.rejects(()=>f.send('controller','lock_reference',{path:'../evil.png',sha256:d(f.reference)},a.version),HardLockError);
});
test('reference symlinks are blocked',async t=>{
 const f=await fixture(t);const a=await f.send('controller','open_task',{asset_id:'house001'},null);
 await symlink(path.join(f.root,'references','house.png'),path.join(f.root,'references','link.png'));
 await assert.rejects(()=>f.send('controller','lock_reference',{path:'references/link.png',sha256:d(f.reference)},a.version),HardLockError);
});
test('geometry creation cannot use unsupported anchor placement',async t=>{
 const f=await fixture(t);const a=await f.send('controller','open_task',{asset_id:'house001'},null);
 const b=await f.send('controller','lock_reference',{path:'references/house.png',sha256:d(f.reference)},a.version);
 const s=scene();s.layout_nodes[1].placement_mode='attach_to_anchor';
 await assert.rejects(()=>f.send('maker','create_geometry',{ugir:s},b.version),HardLockError);
});
test('checker measures actual geometry; Maker cannot lint or finish',async t=>{
 const f=await fixture(t);const c=await f.bootstrap();
 await assert.rejects(()=>f.send('maker','lint_geometry',{},c.version),HardLockError);
 await assert.rejects(()=>f.send('maker','finish_task',{},c.version),HardLockError);
 const lint=await f.send('checker','lint_geometry',{},c.version);
 assert.equal(lint.verdict,'REWORK');assert.equal(lint.scope.findings[0].code,'SEAM_GAP');
});
test('valid signed patch progresses but cannot advance to verified without independent lint',async t=>{
 const f=await fixture(t);const c=await f.bootstrap(),lint=await f.send('checker','lint_geometry',{},c.version);
 const patched=await f.send('maker','patch_failing_layout_nodes',{base_sha256:lint.scope.base_sha256,patches:[{instance_name:'LeftWall',field:'max_xyz_cm',axis:0,value:1}]},lint.version);
 assert.equal(patched.stage,'geometry_built');assert.equal(patched.verdict,'READY_FOR_RECHECK');
 const verified=await f.send('checker','lint_geometry',{},patched.version);assert.equal(verified.stage,'geometry_verified');
});
test('stale expected version prevents replay and concurrent stale patch',async t=>{
 const f=await fixture(t),c=await f.bootstrap();const lint=await f.send('checker','lint_geometry',{},c.version);
 const payload={base_sha256:lint.scope.base_sha256,patches:[{instance_name:'LeftWall',field:'max_xyz_cm',axis:0,value:1}]};
 const first=await f.send('maker','patch_failing_layout_nodes',payload,lint.version);
 await assert.rejects(()=>f.send('maker','patch_failing_layout_nodes',payload,lint.version),HardLockError);
 assert.equal(first.version,lint.version+1);
});
test('state tamper is detected cryptographically',async t=>{
 const f=await fixture(t),a=await f.send('controller','open_task',{asset_id:'house001'},null);
 const file=path.join(f.root,'.khosan','harness3d','tasks',taskId,'state.json');const state=JSON.parse(await readFile(file,'utf8'));
 state.stage='human_accepted';await writeFile(file,JSON.stringify(state));
 await assert.rejects(()=>readTrustedStatus({projectRoot:f.root,trust:f.trust,projectId,taskId}),HardLockError);
 await assert.rejects(()=>f.send('controller','lock_reference',{path:'references/house.png',sha256:d(f.reference)},a.version),HardLockError);
});
test('source artifact tamper blocks all later tools',async t=>{
 const f=await fixture(t),c=await f.bootstrap();
 const folder=path.join(f.root,'.khosan','harness3d','tasks',taskId);const state=JSON.parse(await readFile(path.join(folder,'state.json'),'utf8'));
 await writeFile(path.join(folder,state.source.filename),JSON.stringify(scene(false)));
 await assert.rejects(()=>f.send('checker','lint_geometry',{},c.version),HardLockError);
});
test('signed state cannot be forged by a mismatched server private key',async t=>{
 const f=await fixture(t);
 await assert.rejects(()=>executeTrustedCommand({...f,serverPrivateKey:keys.maker.priv,request:f.request('controller','open_task',{asset_id:'house001'},null)}),HardLockError);
});
test('same-version concurrent lints cannot both mutate task state',async t=>{
 const f=await fixture(t),c=await f.bootstrap();
 const r=await Promise.allSettled([f.send('checker','lint_geometry',{},c.version),f.send('checker','lint_geometry',{},c.version)]);
 assert.equal(r.filter(x=>x.status==='fulfilled').length,1);
});
test('task state survives gateway process restart and blocked stage cannot be bypassed',async t=>{
 const f=await fixture(t),c=await f.bootstrap();
 const state=await readTrustedStatus({projectRoot:f.root,trust:f.trust,projectId,taskId});
 assert.equal(state.stage,'geometry_built');assert.equal(state.version,c.version);
 await assert.rejects(()=>f.send('human','approve',{approval_reference:'approval001',approved_glb_sha256:'0'.repeat(64),receipt_signature_base64:'AA=='},c.version),HardLockError);
});
test('render is blocked until the independent geometry checker verifies it',async t=>{
 const f=await fixture(t),c=await f.bootstrap();
 await assert.rejects(()=>f.send('renderer','submit_render',{},c.version),HardLockError);
});
test('render event requires real GLB/contact artifacts, hashes and allowable camera measurement',async t=>{
 const f=await fixture(t),c=await f.bootstrap(false);const v=await f.send('checker','lint_geometry',{},c.version);assert.equal(v.stage,'geometry_verified');
 const glbBytes=glb(),pngBytes=png(256,256);await writeFile(path.join(f.root,'artifacts','house.glb'),glbBytes);await writeFile(path.join(f.root,'artifacts','contact.png'),pngBytes);
 const valid={source_sha256:v.source_sha256,glb:{path:'artifacts/house.glb',sha256:d(glbBytes)},contact_sheet_png:{path:'artifacts/contact.png',sha256:d(pngBytes)},camera_blocked_frac:0.05};
 await assert.rejects(()=>f.send('renderer','submit_render',{...valid,camera_blocked_frac:NaN},v.version),HardLockError);
 await assert.rejects(()=>f.send('renderer','submit_render',{...valid,glb:{...valid.glb,sha256:'0'.repeat(64)}},v.version),HardLockError);
 const rendered=await f.send('renderer','submit_render',valid,v.version);assert.equal(rendered.stage,'rendered');assert.equal(rendered.vertices,3);
});
test('reviewer signature must bind exact artifact hash and be signed separately',async t=>{
 const f=await fixture(t),c=await f.bootstrap(false),v=await f.send('checker','lint_geometry',{},c.version);
 const glbBytes=glb(),pngBytes=png(256,256);await writeFile(path.join(f.root,'artifacts','house.glb'),glbBytes);await writeFile(path.join(f.root,'artifacts','contact.png'),pngBytes);
 const r=await f.send('renderer','submit_render',{source_sha256:v.source_sha256,glb:{path:'artifacts/house.glb',sha256:d(glbBytes)},contact_sheet_png:{path:'artifacts/contact.png',sha256:d(pngBytes)},camera_blocked_frac:0.05},v.version);
 const attempt=f.request('reviewer','submit_review',{run_id:'reviewrun001',verdict:'ACCEPT',defects:[],reviewed_contact_sha256:d(pngBytes),reviewed_reference_sha256:d(f.reference),receipt_signature_base64:'AAAA'},r.version);
 await assert.rejects(()=>f.dispatch(attempt),HardLockError);
 const candidate={schema:'khosan.3d.verification.v1',project_id:projectId,task_id:taskId,asset_id:'house001',source_revision:v.source_sha256,reference_mode:'reference',reviewer:{agent_id:ids.reviewer,session_id:attempt.nonce,run_id:'reviewrun001',isolated_session:true,verdict:'ACCEPT',defects:[],reviewed_contact_sha256:d(pngBytes),reviewed_reference_sha256:d(f.reference)}};
 attempt.payload.receipt_signature_base64=signEd25519(null,Buffer.from(reviewerReceiptPayload(candidate)),keys.reviewer.priv).toString('base64');
 const signed=signCommandForTestOnly(attempt,keys.reviewer.priv);const reviewed=await f.dispatch(signed);assert.equal(reviewed.stage,'independent_reviewed');
});

test('signed reviewer then human approval cannot skip independent local acceptance gate', {skip: !(await import('node:fs')).existsSync(new URL('../tools/harness-3d/gate.mjs',import.meta.url))}, async t=>{
 const f=await fixture(t),c=await f.bootstrap(false),v=await f.send('checker','lint_geometry',{},c.version);
 const glbBytes=glb(),pngBytes=png(256,256);
 await writeFile(path.join(f.root,'artifacts','house.glb'),glbBytes);await writeFile(path.join(f.root,'artifacts','contact.png'),pngBytes);
 const r=await f.send('renderer','submit_render',{source_sha256:v.source_sha256,glb:{path:'artifacts/house.glb',sha256:d(glbBytes)},contact_sheet_png:{path:'artifacts/contact.png',sha256:d(pngBytes)},camera_blocked_frac:0.05},v.version);
 const req=f.request('reviewer','submit_review',{run_id:'reviewrun002',verdict:'ACCEPT',defects:[],reviewed_contact_sha256:d(pngBytes),reviewed_reference_sha256:d(f.reference),receipt_signature_base64:'UNSIGNED'},r.version);
 const reviewer={agent_id:ids.reviewer,session_id:req.nonce,run_id:'reviewrun002',isolated_session:true,verdict:'ACCEPT',defects:[],reviewed_contact_sha256:d(pngBytes),reviewed_reference_sha256:d(f.reference)};
 const e={schema:'khosan.3d.verification.v1',project_id:projectId,task_id:taskId,asset_id:'house001',source_revision:v.source_sha256,reference_mode:'reference',reviewer};
 req.payload.receipt_signature_base64=signEd25519(null,Buffer.from(reviewerReceiptPayload(e)),keys.reviewer.priv).toString('base64');
 const reviewed=await f.dispatch(signCommandForTestOnly(req,keys.reviewer.priv));
 const cmd=f.request('human','approve',{approval_reference:'ownerapproval002',approved_glb_sha256:d(glbBytes),receipt_signature_base64:'UNSIGNED'},reviewed.version);
 const human={approved:true,approval_reference:'ownerapproval002',approved_by:ids.human,asset_id:'house001',approved_glb_sha256:d(glbBytes)};
 const payload={...e,human_approval:human};
 const {humanApprovalPayload}=await import('../tools/harness-3d/trusted-gateway.mjs');
 cmd.payload.receipt_signature_base64=signEd25519(null,Buffer.from(humanApprovalPayload(payload)),keys.human.priv).toString('base64');
 const accepted=await f.dispatch(signCommandForTestOnly(cmd,keys.human.priv));
 assert.equal(accepted.stage,'human_accepted');
 assert.equal(accepted.verdict,'HUMAN_ACCEPTED_WITH_SIGNED_EVIDENCE');
});

test('server and maker public keys must not be identical',()=>{
 const trust={schema:'khosan.3d.trust.v1',server:{public_key_pem:keys.maker.pub},projects:{[projectId]:'/tmp/x'},actors:{maker:{maker01:keys.maker.pub}}};
 assert.throws(()=>validateTrust(trust),HardLockError);
});

test('DevSpace-style local IPC can submit only authorized signed commands',async t=>{
 const {startGatewayDaemon}=await import('../tools/harness-3d/gateway-daemon.mjs');
 const {callGateway}=await import('../tools/harness-3d/gateway-client.mjs');
 const {once}=await import('node:events');
 const f=await fixture(t),socketPath=path.join(f.root,'trusted-gateway.sock');
 const server=startGatewayDaemon({trust:f.trust,serverPrivateKey:f.serverPrivateKey,socketPath});
 t.after(async()=>new Promise(resolve=>server.close(resolve)));
 await once(server,'listening');
 const req=f.request('controller','open_task',{asset_id:'house001'},null);
 const applied=await callGateway(socketPath,req);
 assert.equal(applied.stage,'specified');
 const replay=await callGateway(socketPath,req);
 assert.equal(replay.ok,false);
 const forged={...f.request('human','approve',{},applied.version),signature_base64:'AA=='};
 const blocked=await callGateway(socketPath,forged);
 assert.equal(blocked.ok,false);
 const phaseSkip=await callGateway(socketPath,f.request('human','approve',{},applied.version));
 assert.equal(phaseSkip.ok,false);
});

test('Maker signer CLI can sign permitted DevSpace work but cannot elevate role',async t=>{
 const {spawnSync}=await import('node:child_process');
 const f=await fixture(t),a=await f.send('controller','open_task',{asset_id:'house001'},null);
 const b=await f.send('controller','lock_reference',{path:'references/house.png',sha256:d(f.reference)},a.version);
 const req=f.request('maker','create_geometry',{ugir:scene(false)},b.version);delete req.signature_base64;
 await writeFile(path.join(f.root,'maker-key.pem'),keys.maker.priv);
 await writeFile(path.join(f.root,'unsigned.json'),JSON.stringify(req));
 const result=spawnSync(process.execPath,[path.resolve(path.dirname(new URL(import.meta.url).pathname),'../tools/harness-3d/gateway-sign.mjs'),'sign',path.join(f.root,'maker-key.pem'),path.join(f.root,'unsigned.json'),path.join(f.root,'signed.json')],{encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
 const signed=JSON.parse(await readFile(path.join(f.root,'signed.json'),'utf8'));
 const built=await f.dispatch(signed);assert.equal(built.stage,'geometry_built');
 const elevated={...f.request('controller','open_task',{asset_id:'other'},null),actor:{role:'controller',id:ids.controller}};
 delete elevated.signature_base64;
 await writeFile(path.join(f.root,'controller-unsigned.json'),JSON.stringify(elevated));
 const next=spawnSync(process.execPath,[path.resolve(path.dirname(new URL(import.meta.url).pathname),'../tools/harness-3d/gateway-sign.mjs'),'sign',path.join(f.root,'maker-key.pem'),path.join(f.root,'controller-unsigned.json'),path.join(f.root,'controller-signed.json')],{encoding:'utf8'});
 assert.equal(next.status,0);
 const forged=JSON.parse(await readFile(path.join(f.root,'controller-signed.json'),'utf8'));
 await assert.rejects(()=>f.dispatch(forged),HardLockError);
});