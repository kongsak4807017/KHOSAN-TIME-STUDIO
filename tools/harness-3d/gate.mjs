/**
 * KHOSAN native 3D artifact acceptance gate.
 * Fail-closed: never marks an asset accepted from a prompt, an arbitrary
 * "passed": true, or a model-generated assertion without local artifacts.
 * This verifies evidence and file integrity; it does not authenticate people
 * or prove render aesthetics, which require an independent process and human.
 */
import { createReadStream } from 'node:fs';
import { lstat, readFile, realpath, open } from 'node:fs/promises';
import {lintUGIR} from './layout-lint.mjs';
import { createHash, verify as verifySignature } from 'node:crypto';
import path from 'node:path';

export const STAGES = Object.freeze([
  'specified', 'reference_locked', 'geometry_built', 'geometry_verified',
  'rendered', 'independent_reviewed', 'human_accepted'
]);
export const EVIDENCE_SCHEMA = 'khosan.3d.verification.v1';
const SHA256 = /^[a-f\d]{64}$/i;
const REQUIRED = new Map([
  ['ugir_json', '.json'], ['glb', '.glb'], ['contact_sheet_png', '.png']
]);
const isText = value => typeof value === 'string' && value.trim().length > 0;
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const inRange = (value, min, max) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const fail = (errors, field) => errors.push(field);

export function validateTechnical(metrics, budgets = {}) {
  const errors = [];
  if (!isObject(metrics)) return ['technical metrics missing'];
  const seam = budgets.max_seam_gap_cm ?? 0.1;
  const blocked = budgets.max_camera_blocked_frac ?? 0.20;
  const vertices = budgets.max_vertices ?? 100000;
  if (!inRange(seam, 0, 0.1) || !inRange(blocked, 0, 0.20) || !Number.isSafeInteger(vertices) || vertices <= 0 || vertices > 100000) return ['invalid/relaxed locked budgets'];
  if (metrics.compile_exit_code !== 0) fail(errors, 'technical.compile_exit_code != 0');
  for (const name of ['floating_count', 'piercing_count']) {
    if (!Number.isSafeInteger(metrics[name]) || metrics[name] !== 0) fail(errors, `technical.${name} != 0`);
  }
  if (!inRange(metrics.max_seam_gap_cm, 0, seam)) fail(errors, 'technical.max_seam_gap_cm exceeds locked budget');
  if (!inRange(metrics.max_camera_blocked_frac, 0, blocked)) fail(errors, 'technical.max_camera_blocked_frac exceeds locked budget');
  if (!Number.isSafeInteger(metrics.vertex_count) || !inRange(metrics.vertex_count, 1, vertices)) fail(errors, 'technical.vertex_count exceeds locked budget');
  if (!isText(metrics.tool_id) || !isText(metrics.run_id)) fail(errors, 'technical tool/run receipt missing');
  return errors;
}

/** Stable, complete payloads: every issuer signs the exact current artifacts and upstream receipts. */
const signatureDigest = value => createHash('sha256').update(String(value || '')).digest('hex');
export function rendererReceiptPayload(e) {
  return JSON.stringify({schema:e.schema,project_id:e.project_id,task_id:e.task_id,asset_id:e.asset_id,source_revision:e.source_revision,renderer_id:e.renderer?.renderer_id,run_id:e.renderer?.run_id,rendered_glb_sha256:e.renderer?.rendered_glb_sha256,contact_sheet_sha256:e.renderer?.contact_sheet_sha256,reference_sha256:e.reference_mode==='reference'?e.renderer?.reference_sha256:null,views_rendered:e.renderer?.views_rendered,camera_ids:e.renderer?.camera_ids});
}
export function reviewerReceiptPayload(e) {
  return JSON.stringify({schema:e.schema,project_id:e.project_id,task_id:e.task_id,asset_id:e.asset_id,source_revision:e.source_revision,agent_id:e.reviewer?.agent_id,session_id:e.reviewer?.session_id,run_id:e.reviewer?.run_id,isolated_session:e.reviewer?.isolated_session,verdict:e.reviewer?.verdict,defects:e.reviewer?.defects,contact_sha256:e.reviewer?.reviewed_contact_sha256,reference_sha256:e.reference_mode==='reference'?e.reviewer?.reviewed_reference_sha256:null,renderer_signature_sha256:signatureDigest(e.renderer?.signature_base64),artifacts:{ugir:e.artifacts?.ugir_json?.sha256,glb:e.artifacts?.glb?.sha256,contact:e.artifacts?.contact_sheet_png?.sha256,reference:e.artifacts?.reference?.sha256||null},technical:e.technical,budgets:e.budgets||null});
}
export function humanApprovalPayload(e) {
  return JSON.stringify({schema:e.schema,project_id:e.project_id,task_id:e.task_id,asset_id:e.asset_id,source_revision:e.source_revision,approval_reference:e.human_approval?.approval_reference,approved_by:e.human_approval?.approved_by,approved:e.human_approval?.approved,glb_sha256:e.human_approval?.approved_glb_sha256,review_run_id:e.reviewer?.run_id,renderer_signature_sha256:signatureDigest(e.renderer?.signature_base64),reviewer_signature_sha256:signatureDigest(e.reviewer?.signature_base64),artifacts:{ugir:e.artifacts?.ugir_json?.sha256,glb:e.artifacts?.glb?.sha256,contact:e.artifacts?.contact_sheet_png?.sha256,reference:e.artifacts?.reference?.sha256||null},technical:e.technical,budgets:e.budgets||null});
}
function verifyEd25519(payload, signature, publicKey) {
  if(!isText(publicKey)||!isText(signature)||!/^[A-Za-z0-9+/]+={0,2}$/.test(signature))return false;
  try{return verifySignature(null,Buffer.from(payload,'utf8'),publicKey,Buffer.from(signature,'base64'))}catch{return false}
}

export function validateEvidenceShape(evidence) {
  const errors = [];
  if (!isObject(evidence)) return ['evidence object required'];
  if (evidence.schema !== EVIDENCE_SCHEMA) fail(errors, 'unknown evidence schema');
  for (const k of ['asset_id','task_id','project_id','source_revision']) {
    if (!isText(evidence[k])) fail(errors, `missing ${k}`);
  }
  const maker = evidence.maker, reviewer = evidence.reviewer, renderer = evidence.renderer;
  if (!isObject(maker) || !isObject(reviewer) || !isObject(renderer)) fail(errors, 'maker, renderer and reviewer required');
  if (isObject(maker) && isObject(reviewer)) {
    for (const k of ['agent_id','session_id']) if (!isText(maker[k]) || !isText(reviewer[k])) fail(errors, `${k} missing for maker/reviewer`);
    if (maker.agent_id === reviewer.agent_id) fail(errors, 'maker and reviewer agent must differ');
    if (maker.session_id === reviewer.session_id) fail(errors, 'maker and reviewer session must differ');
    if (reviewer.isolated_session !== true || !isText(reviewer.run_id) || !isText(reviewer.signature_base64)) fail(errors, 'independent reviewer signed receipt missing');
    if (reviewer.verdict !== 'ACCEPT' || !Array.isArray(reviewer.defects) || reviewer.defects.length !== 0) fail(errors, 'independent reviewer did not accept defect-free output');
  }
  if (isObject(renderer)) {
    for (const k of ['renderer_id','run_id','source_revision','rendered_glb_sha256','contact_sheet_sha256','signature_base64']) if (!isText(renderer[k])) fail(errors, `renderer.${k} missing`);
    if (renderer.source_revision !== evidence.source_revision) fail(errors, 'renderer source revision mismatch');
    if (isObject(maker) && renderer.renderer_id === maker.agent_id) fail(errors, 'renderer must be a separate principal from maker');
    if (isObject(reviewer) && renderer.renderer_id === reviewer.agent_id) fail(errors, 'renderer must be a separate principal from reviewer');
    if (!Number.isSafeInteger(renderer.views_rendered) || renderer.views_rendered !== 16 || !Array.isArray(renderer.camera_ids) || renderer.camera_ids.length !== 16 || new Set(renderer.camera_ids).size !== 16 || renderer.camera_ids.some(x => !isText(x))) fail(errors, 'renderer must attest 16 unique camera views');
    if (evidence.reference_mode === 'reference' && !SHA256.test(renderer.reference_sha256 || '')) fail(errors, 'renderer reference hash missing');
    if (evidence.reference_mode === 'original' && renderer.reference_sha256 !== null) fail(errors, 'renderer reference hash must be null in original mode');
  }
  errors.push(...validateTechnical(evidence.technical, evidence.budgets));
  if (evidence.technical?.source_revision !== evidence.source_revision) fail(errors, 'technical receipt must bind source revision');
  const artifacts = evidence.artifacts;
  if (!isObject(artifacts)) fail(errors, 'artifacts manifest missing');
  else {
    for (const [role,extension] of REQUIRED) {
      const item = artifacts[role];
      if (!isObject(item) || !isText(item.path) || !item.path.endsWith(extension) || !SHA256.test(item.sha256 || '')) fail(errors, `invalid artifact ${role}`);
    }
    if (evidence.reference_mode === 'reference' && (!isObject(artifacts.reference) || !isText(artifacts.reference.path) || !SHA256.test(artifacts.reference.sha256 || ''))) fail(errors,'reference artifact missing');
  }
  if (evidence.reference_mode !== 'reference' && evidence.reference_mode !== 'original') fail(errors, 'reference_mode must be reference or original');
  if (renderer && artifacts) {
    if (renderer.rendered_glb_sha256 !== artifacts.glb?.sha256) fail(errors, 'renderer did not bind the exact GLB');
    if (renderer.contact_sheet_sha256 !== artifacts.contact_sheet_png?.sha256) fail(errors, 'renderer did not bind the exact contact sheet');
    if (evidence.reference_mode === 'reference' && renderer.reference_sha256 !== artifacts.reference?.sha256) fail(errors, 'renderer did not bind the exact reference');
    if (evidence.reference_mode === 'original' && renderer.reference_sha256 !== null) fail(errors, 'original mode must not claim a reference image');
  }
  if (reviewer && artifacts?.contact_sheet_png && reviewer.reviewed_contact_sha256 !== artifacts.contact_sheet_png.sha256) fail(errors, 'reviewer did not inspect current contact sheet hash');
  if (evidence.reference_mode === 'reference' && reviewer?.reviewed_reference_sha256 !== artifacts?.reference?.sha256) fail(errors,'reviewer did not inspect current reference hash');
  const human = evidence.human_approval;
  if (!isObject(human) || human.approved !== true || !isText(human.approval_reference) || !isText(human.approved_by) || !isText(human.signature_base64) || human.asset_id !== evidence.asset_id || human.approved_glb_sha256 !== artifacts?.glb?.sha256) fail(errors, 'human approval missing or not bound to asset/glb');
  return errors;
}

export function advanceStage(state, requested, receipts = {}) {
  if (!isObject(state) || !STAGES.includes(state.stage) || !STAGES.includes(requested)) throw Error('unknown 3D harness stage');
  if (STAGES.indexOf(requested) !== STAGES.indexOf(state.stage)+1) throw Error('cannot skip or reverse stages');
  if (requested === 'human_accepted') throw Error('human_accepted requires verify3DAcceptance, not manual stage advancement');
  const needed = {
    reference_locked: 'reference_sha256', geometry_built: 'geometry_sha256',
    geometry_verified: 'lint_report_sha256', rendered: 'contact_sheet_sha256',
    independent_reviewed: 'review_receipt_sha256'
  }[requested];
  if (needed && !SHA256.test(receipts[needed] || '')) throw Error(`missing ${needed} receipt`);
  return { ...state, stage:requested, history:[...(Array.isArray(state.history)?state.history:[]), {from:state.stage,to:requested,receipt_key:needed,receipt_sha256:needed?receipts[needed]:null}] };
}

function safeRelative(relative) {
  return isText(relative) && !path.isAbsolute(relative) && !/^[A-Za-z]:/.test(relative) && !relative.includes('\\') && !relative.includes('\0') && relative.split('/').every(part=>part!=='' && part!=='.' && part!=='..');
}
async function sha256File(file) {
  const h=createHash('sha256');
  for await (const chunk of createReadStream(file)) h.update(chunk);
  return h.digest('hex');
}
async function ensureUnderRoot(root, relative) {
  if (!safeRelative(relative)) throw Error('invalid relative artifact path');
  const absolute=path.resolve(root,...relative.split('/'));
  if (!absolute.startsWith(root+path.sep)) throw Error('artifact escapes project root');
  const metadata=await lstat(absolute);
  if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.size===0) throw Error('artifact is not a nonempty regular file');
  const resolved=await realpath(absolute);
  if (!resolved.startsWith(root+path.sep)) throw Error('artifact resolves outside project root');
  return {file:resolved,size:metadata.size};
}
async function readHead(file, length) {
  const fd=await open(file,'r');
  try {const data=Buffer.alloc(length);const {bytesRead}=await fd.read(data,0,length,0);if(bytesRead<length)throw Error('file too short for expected header');return data}
  finally {await fd.close()}
}
async function checkFormat(role, file, size, assetId) {
  if (role === 'ugir_json') {
    if (size > 8*1024*1024) throw Error('UG-IR JSON exceeds 8 MiB');
    const j=JSON.parse(await readFile(file,'utf8'));
    if (!isObject(j) || j.asset_id !== assetId || j.coordinate_system?.unit !== 'cm' || j.coordinate_system?.up_axis !== '+Z') throw Error('UG-IR missing matching asset_id or Z-up centimeters coordinate contract');
    const report=lintUGIR(j);
    if (!report.ok) throw Error('UG-IR layout lint BLOCKED: '+report.issues.join(' | '));
    return report;
  }
  if (role === 'glb') {
    if (size < 40) throw Error('GLB too short');
    const header=await readHead(file,20);
    if (header.toString('utf8',0,4)!=='glTF' || header.readUInt32LE(4)!==2 || header.readUInt32LE(8)!==size || header.readUInt32LE(16)!==0x4E4F534A) throw Error('GLB v2 header/JSON chunk invalid');
    const jsonLength=header.readUInt32LE(12);
    if (jsonLength<=0 || jsonLength>8*1024*1024 || 20+jsonLength>size) throw Error('GLB JSON chunk length invalid');
    const fd=await open(file,'r'); let doc;
    try {const b=Buffer.alloc(jsonLength);const {bytesRead}=await fd.read(b,0,jsonLength,20);if(bytesRead!==jsonLength)throw Error('truncated GLB JSON chunk');doc=JSON.parse(b.toString('utf8'))}
    finally {await fd.close()}
    if (doc?.asset?.version!=='2.0' || !Array.isArray(doc.meshes) || !doc.meshes.length || !Array.isArray(doc.accessors)) throw Error('GLB must contain a glTF 2.0 mesh with accessors');
    let vertices=0;
    for(const mesh of doc.meshes)for(const prim of mesh?.primitives||[]){
      const id=prim?.attributes?.POSITION;
      const accessor=doc.accessors[id];
      if(!Number.isSafeInteger(id)||!accessor||!Number.isSafeInteger(accessor.count)||accessor.count<3) throw Error('GLB mesh is missing valid POSITION accessor');
      vertices+=accessor.count;
    }
    if(vertices<=0)throw Error('GLB has no vertices');
    return {vertex_count:vertices};
  }
  if (role === 'contact_sheet_png' || role === 'reference') {
    if (role === 'contact_sheet_png' || file.toLowerCase().endsWith('.png')) {
      if (size < 33) throw Error('PNG too short');
      const buf=await readHead(file,24);
      if (!buf.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) || buf.toString('ascii',12,16)!=='IHDR') throw Error('PNG signature/IHDR missing');
      if (role === 'contact_sheet_png' && (buf.readUInt32BE(16)<4 || buf.readUInt32BE(20)<4)) throw Error('contact sheet PNG smaller than 4x4');
    }
  }
  return null;
}

export async function verify3DAcceptance(projectRoot, evidence, trust = {}) {
  const errors=validateEvidenceShape(evidence),checked=[];
  if (!verifyEd25519(rendererReceiptPayload(evidence),evidence?.renderer?.signature_base64,trust.renderer_public_key_pem)) errors.push('renderer receipt signature missing, wrong, or untrusted');
  if (!verifyEd25519(reviewerReceiptPayload(evidence),evidence?.reviewer?.signature_base64,trust.reviewer_public_key_pem)) errors.push('reviewer receipt signature missing, wrong, or untrusted');
  if (!verifyEd25519(humanApprovalPayload(evidence),evidence?.human_approval?.signature_base64,trust.human_public_key_pem)) errors.push('human approval signature missing, wrong, or untrusted');
  let root;
  try {root=await realpath(projectRoot)} catch {errors.push('project root unavailable')}
  if (root && isObject(evidence?.artifacts)) {
    const roles=[...REQUIRED.keys(),...(evidence.reference_mode==='reference'?['reference']:[])];
    const seenPaths=new Set();
    for (const role of roles) {
      const a=evidence.artifacts[role];
      if (!isObject(a) || !isText(a.path) || !SHA256.test(a.sha256 || '')) continue;
      if(seenPaths.has(a.path)){errors.push(`${role}: duplicate artifact path`);continue}
      seenPaths.add(a.path);
      try {
        const info=await ensureUnderRoot(root,a.path);
        const structural=await checkFormat(role,info.file,info.size,evidence.asset_id);
        if(role==='ugir_json')for(const field of ['floating_count','piercing_count','max_seam_gap_cm']){
          if(Math.abs((evidence.technical?.[field]??NaN)-structural[field])>1e-6 || !Number.isFinite(evidence.technical?.[field])) throw Error('technical.'+field+' differs from independently recomputed UG-IR bounds lint');
        }
        if(role==='glb' && evidence.technical?.vertex_count!==structural.vertex_count) throw Error('technical.vertex_count differs from GLB POSITION accessor count');
        const digest=await sha256File(info.file);
        if(role==='ugir_json' && digest.toLowerCase()!==evidence.source_revision.toLowerCase()) throw Error('source_revision must equal the exact UG-IR artifact SHA-256');
        if(digest.toLowerCase()!==a.sha256.toLowerCase()) throw Error('SHA-256 mismatch');
        checked.push({role,path:a.path,bytes:info.size,sha256:digest});
      }catch(error){errors.push(`${role}: ${error.message}`)}
    }
  }
  return {schema:'khosan.3d.gate-result.v1',verdict:errors.length?'BLOCKED':'PASS',ok:errors.length===0,errors,checked_artifacts:checked};
}