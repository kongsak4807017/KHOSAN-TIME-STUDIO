import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {deflateSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {verify3DAcceptance,advanceStage,validateTechnical} from '../tools/harness-3d/gate.mjs';
const dir=path.dirname(fileURLToPath(import.meta.url));
const digest=b=>createHash('sha256').update(b).digest('hex');
function glb(){
 const verts=Buffer.alloc(36),indices=Buffer.alloc(8);
 for(let i=0;i<9;i++)verts.writeFloatLE([0,0,0, 1,0,0, 0,1,0][i],i*4);
 indices.writeUInt16LE(0,0);indices.writeUInt16LE(1,2);indices.writeUInt16LE(2,4);
 const bin=Buffer.concat([verts,indices]);
 const doc={asset:{version:'2.0'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0}],meshes:[{primitives:[{attributes:{POSITION:0},indices:1}]}],buffers:[{byteLength:bin.length}],bufferViews:[{buffer:0,byteOffset:0,byteLength:verts.length},{buffer:0,byteOffset:verts.length,byteLength:6}],accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3',min:[0,0,0],max:[1,1,0]},{bufferView:1,componentType:5123,count:3,type:'SCALAR'}]};
 const json=Buffer.from(JSON.stringify(doc),'utf8');const padding=(4-json.length%4)%4;const data=Buffer.concat([json,Buffer.alloc(padding,32)]);
 const b=Buffer.alloc(12+8+data.length+8+bin.length);b.write('glTF',0);b.writeUInt32LE(2,4);b.writeUInt32LE(b.length,8);b.writeUInt32LE(data.length,12);b.write('JSON',16);data.copy(b,20);
 const offset=20+data.length;b.writeUInt32LE(bin.length,offset);b.write('BIN\0',offset+4);bin.copy(b,offset+8);return b;
}
function crc32(buffer){let crc=0xffffffff;for(const c of buffer){crc^=c;for(let j=0;j<8;j++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}return (crc^0xffffffff)>>>0}
function chunk(name,data){const type=Buffer.from(name),crcInput=Buffer.concat([type,data]),b=Buffer.alloc(12+data.length);b.writeUInt32BE(data.length,0);type.copy(b,4);data.copy(b,8);b.writeUInt32BE(crc32(crcInput),8+data.length);return b}
function png4x4(){
 const header=Buffer.alloc(13);header.writeUInt32BE(4,0);header.writeUInt32BE(4,4);header[8]=8;header[9]=6;
 const rows=Buffer.alloc(4*(1+4*4)); // 4 scanlines of 4 RGBA pixels, all black/transparent
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]);
}
async function fixture(){
 const root=await mkdtemp(path.join(tmpdir(),'khosan-3d-harness-'));
 await mkdir(path.join(root,'artifacts'));await mkdir(path.join(root,'evidence'));await mkdir(path.join(root,'references'));
 const objects={ugir_json:{path:'artifacts/house.ugir.json',buf:Buffer.from(JSON.stringify({ugir_version:'0.2.0',asset_id:'house-001',coordinate_system:{unit:'cm',up_axis:'+Z'},layout_nodes:[{instance_name:'Ground',placement_mode:'place_bounds_box',min_xyz_cm:[-500,-500,-20],max_xyz_cm:[500,500,0],is_ground:true},{instance_name:'Wall',placement_mode:'place_bounds_box',min_xyz_cm:[-50,-10,0],max_xyz_cm:[50,10,250]}],expected_adjacent_seams:[['Ground','Wall']]}))},glb:{path:'artifacts/house.glb',buf:glb()},contact_sheet_png:{path:'evidence/contact_sheet_4x4.png',buf:png4x4()},reference:{path:'references/reference.png',buf:png4x4()}};
 const artifacts={};for(const [role,entry] of Object.entries(objects)){await writeFile(path.join(root,entry.path),entry.buf);artifacts[role]={path:entry.path,sha256:digest(entry.buf)}}
 const evidence={schema:'khosan.3d.verification.v1',asset_id:'house-001',task_id:'TASK-3D-HOUSE-001',project_id:'game-001',source_revision:'sha-001',reference_mode:'reference',maker:{agent_id:'04-asset-synthesizer',session_id:'maker-01'},reviewer:{agent_id:'11-independent-reviewer',session_id:'critic-02',isolated_session:true,run_id:'critic-run-001',verdict:'ACCEPT',defects:[],reviewed_contact_sha256:artifacts.contact_sheet_png.sha256,reviewed_reference_sha256:artifacts.reference.sha256},technical:{source_revision:'sha-001',tool_id:'khosan-native-lint',run_id:'lint-run-002',compile_exit_code:0,floating_count:0,piercing_count:0,max_seam_gap_cm:0,max_camera_blocked_frac:0.05,vertex_count:3},artifacts,human_approval:{approved:true,approval_reference:'HG-04-owner-001',approved_by:'executive-producer',asset_id:'house-001',approved_glb_sha256:artifacts.glb.sha256}};
 return {root,evidence,objects};
}
async function withFixture(fn){const f=await fixture();try{await fn(f)}finally{await rm(f.root,{recursive:true,force:true})}}

test('passing fixture: identity separation, artifact hashes, technical thresholds, human approval',()=>withFixture(async ({root,evidence})=>{const out=await verify3DAcceptance(root,evidence);assert.equal(out.ok,true,out.errors.join(' | '));assert.equal(out.checked_artifacts.length,4)}));
test('maker cannot review own work',()=>withFixture(async ({root,evidence})=>{evidence.reviewer.agent_id=evidence.maker.agent_id;assert.equal((await verify3DAcceptance(root,evidence)).ok,false)}));
test('critic cannot silently pass with TODO/stub response',()=>withFixture(async ({root,evidence})=>{evidence.reviewer.run_id='';evidence.reviewer.isolated_session=false;assert.equal((await verify3DAcceptance(root,evidence)).ok,false)}));
test('must compare the exact current reference and contact sheet',()=>withFixture(async ({root,evidence})=>{evidence.reviewer.reviewed_contact_sha256='0'.repeat(64);assert.equal((await verify3DAcceptance(root,evidence)).ok,false)}));
test('machine check fails for physical defect and numeric budget',()=>withFixture(async ({root,evidence})=>{evidence.technical.max_seam_gap_cm=.11;evidence.technical.floating_count=1;assert.equal((await verify3DAcceptance(root,evidence)).ok,false)}));
test('missing human approval fails even if technical and independent checks pass',()=>withFixture(async ({root,evidence})=>{evidence.human_approval.approved=false;assert.equal((await verify3DAcceptance(root,evidence)).ok,false)}));
test('asset mutation after review fails artifact hash verification',()=>withFixture(async ({root,evidence})=>{await writeFile(path.join(root,evidence.artifacts.glb.path),'modified bytes');assert.equal((await verify3DAcceptance(root,evidence)).ok,false)}));
test('path traversal and absolute outside project are prohibited',()=>withFixture(async ({root,evidence})=>{evidence.artifacts.glb.path='../elsewhere.glb';assert.equal((await verify3DAcceptance(root,evidence)).ok,false)}));
test('locked technical thresholds reject NaN and negative values',()=>{assert.notEqual(validateTechnical({compile_exit_code:0,floating_count:0,piercing_count:0,max_seam_gap_cm:NaN,max_camera_blocked_frac:-1,vertex_count:1,tool_id:'lint',run_id:'run'}).length,0)});
test('no skipping stages or self-approving final state',()=>{const s={stage:'specified',history:[]};assert.throws(()=>advanceStage(s,'geometry_verified',{}));assert.throws(()=>advanceStage(s,'reference_locked',{}));const t=advanceStage(s,'reference_locked',{reference_sha256:'a'.repeat(64)});assert.equal(t.stage,'reference_locked');assert.throws(()=>advanceStage({stage:'independent_reviewed'},'human_accepted',{}))});
test('local CLI returns nonzero on rejected evidence',()=>withFixture(async ({root,evidence})=>{const file=path.join(root,'evidence','gate.json');evidence.human_approval.approved=false;await writeFile(file,JSON.stringify(evidence));const r=spawnSync(process.execPath,[path.resolve(dir,'../tools/harness-3d/cli.mjs'),'verify',root,file],{encoding:'utf8'});assert.equal(r.status,1);assert.match(r.stdout, /BLOCKED/)}));

test('cannot fake measured seam gap by writing zero in evidence',()=>withFixture(async ({root,evidence})=>{const file=path.join(root,'artifacts','house.ugir.json');const data=JSON.parse(await (await import('node:fs/promises')).readFile(file,'utf8'));data.layout_nodes[1].min_xyz_cm[2]=5;await writeFile(file,JSON.stringify(data));evidence.artifacts.ugir_json.sha256=digest(Buffer.from(JSON.stringify(data)));assert.equal((await verify3DAcceptance(root,evidence)).ok,false)}));
import {threeYUpMetersToKhosanZUpCm,khosanZUpCmToThreeYUpMeters,threeYUpSizeMetersToKhosanSizeCm} from '../tools/harness-3d/coordinates.mjs';
test('three.js Y-up meters ↔ KHOSAN +Z-up centimeters explicit roundtrip',()=>{
 const v=[2.5,1.75,-3.4];const c=threeYUpMetersToKhosanZUpCm(v);
 assert.deepEqual(c,[250,340,175]);const back=khosanZUpCmToThreeYUpMeters(c);v.forEach((n,i)=>assert.ok(Math.abs(n-back[i])<1e-10));
 assert.deepEqual(threeYUpSizeMetersToKhosanSizeCm([4,3,5]),[400,500,300]);
});
test('coordinate converter rejects undefined or NaN dimensions',()=>{assert.throws(()=>threeYUpMetersToKhosanZUpCm([1,NaN,0]));assert.throws(()=>threeYUpSizeMetersToKhosanSizeCm([1,0,2]))});