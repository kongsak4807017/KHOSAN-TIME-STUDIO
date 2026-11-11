/** KHOSAN bounded Z-up/cm differential-repair policy (pure, side-effect-free).
 * An LLM can request coordinates, not decide which nodes are authorized. A trusted
 * checker computes the scope from actual geometry and a trusted gateway enforces it.
 * This module is NOT a CAD/mesh/rig validator and must reject unsupported shapes.
 */
import {createHash} from 'node:crypto';

export class HardLockError extends Error {
  constructor(message){ super(message); this.name='HardLockError'; }
}
const err = msg => {throw new HardLockError(msg)};
const allowed = (o,fields) => Object.keys(o).every(k=>fields.includes(k));
const isObject=o=>o!==null&&typeof o==='object'&&!Array.isArray(o);
const num=n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=1e6;
const SHA=/^[0-9a-f]{64}$/;
const nameOK=s=>typeof s==='string'&&/^[A-Za-z][\w.-]{0,79}$/.test(s);

export function stableJSON(value){
  function sorted(v){
    if(Array.isArray(v))return v.map(sorted);
    if(isObject(v)){
      if(Object.keys(v).some(k=>['__proto__','constructor','prototype'].includes(k)))err('forbidden property');
      return Object.fromEntries(Object.keys(v).sort().map(k=>[k,sorted(v[k])]));
    }
    if(v===null||typeof v==='string'||typeof v==='boolean'||num(v))return v;
    err('non-JSON or nonfinite value');
  }
  return JSON.stringify(sorted(value));
}
export const digest=value=>createHash('sha256').update(stableJSON(value)).digest('hex');
const overlap=(a,b,k)=>Math.min(a.max[k],b.max[k])-Math.max(a.min[k],b.min[k]);
const separation=(a,b,k)=>Math.max(0,a.min[k]-b.max[k],b.min[k]-a.max[k]);

export function geometryDiagnostics(state){
  if(!isObject(state)||!isObject(state.coordinate_system)||state.coordinate_system.unit!=='cm'||state.coordinate_system.up_axis!=='+Z'||(state.coordinate_system.forward_axis!==undefined&&state.coordinate_system.forward_axis!=='+Y'))err('unsupported coordinate contract');
  if(!allowed(state.coordinate_system,['unit','up_axis','forward_axis']))err('unsupported coordinate field');
  for(const key of ['primitives','anchors'])if(state[key]!==undefined&&(!Array.isArray(state[key])||state[key].length>0))err('unsupported primitives/anchors');
  if(!Array.isArray(state.layout_nodes)||state.layout_nodes.length<1||state.layout_nodes.length>500)err('expected 1..500 AABB layout nodes');
  const nodes=new Map();
  for(const n of state.layout_nodes){
    if(!isObject(n)||!nameOK(n.instance_name)||nodes.has(n.instance_name)||n.placement_mode!=='place_bounds_box')err('invalid, duplicate or unsupported layout node');
    if(!allowed(n,['instance_name','placement_mode','min_xyz_cm','max_xyz_cm','is_ground','material']))err('unsupported node property');
    const a=n.min_xyz_cm,b=n.max_xyz_cm;
    if(!Array.isArray(a)||!Array.isArray(b)||a.length!==3||b.length!==3||!a.every(num)||!b.every(num)||a.some((v,i)=>v>=b[i]))err('invalid/nonfinite bounds');
    if(n.is_ground!==undefined&&typeof n.is_ground!=='boolean')err('is_ground must be boolean');
    if(n.material!==undefined&&typeof n.material!=='string')err('material must be string');
    nodes.set(n.instance_name,{min:a,max:b,ground:n.is_ground===true});
  }
  function pairs(key){
    const raw=state[key]??[];
    if(!Array.isArray(raw))err('invalid '+key);
    const set=new Set();
    for(const p of raw){
      if(!Array.isArray(p)||p.length!==2||p[0]===p[1]||!p.every(x=>nodes.has(x)))err('invalid '+key+' pair');
      const k=[...p].sort().join('\u0000');if(set.has(k))err('duplicate '+key+' pair');set.add(k);
    }
    return set;
  }
  const intentional=pairs('intentional_intersections'), seams=pairs('expected_adjacent_seams');
  const defects=[];
  for(const [id,n] of nodes){
    if(n.ground||n.min[2]<=0.1)continue;
    const supported=[...nodes].some(([otherId,o])=>otherId!==id && Math.abs(o.max[2]-n.min[2])<=0.1 && overlap(n,o,0)>0 && overlap(n,o,1)>0);
    if(!supported)defects.push({code:'FLOATING',involved_nodes:[id],axes:[2],severity_cm:n.min[2]});
  }
  const names=[...nodes.keys()];
  for(let i=0;i<names.length;i++)for(let j=i+1;j<names.length;j++){
    const pair=[names[i],names[j]].sort(),key=pair.join('\u0000');if(intentional.has(key))continue;
    const a=nodes.get(pair[0]),b=nodes.get(pair[1]);const amounts=[0,1,2].map(k=>overlap(a,b,k));
    if(amounts.every(x=>x>0.1)){
      const axis=amounts.indexOf(Math.min(...amounts));defects.push({code:'PIERCING',involved_nodes:pair,axes:[axis],severity_cm:amounts[axis]});
    }
  }
  for(const key of seams){const pair=key.split('\u0000');const a=nodes.get(pair[0]),b=nodes.get(pair[1]);const gaps=[0,1,2].map(k=>separation(a,b,k)),severity=Math.hypot(...gaps);
    if(severity>0.1)defects.push({code:'SEAM_GAP',involved_nodes:pair,axes:gaps.map((g,i)=>g>0?i:null).filter(i=>i!==null),severity_cm:severity});
  }
  defects.sort((a,b)=>stableJSON([a.code,a.involved_nodes,a.axes]).localeCompare(stableJSON([b.code,b.involved_nodes,b.axes])));
  return defects;
}
export function measuredRepairScope(state){
  const findings=geometryDiagnostics(state);
  if(!findings.length)err('no failing geometry; cannot create repair scope');
  const editable=new Map();for(const x of findings)for(const name of x.involved_nodes){if(!editable.has(name))editable.set(name,new Set());for(const axis of x.axes)editable.get(name).add(axis)}
  const frozen=Object.fromEntries(state.layout_nodes.filter(n=>!editable.has(n.instance_name)).map(n=>[n.instance_name,digest(n)]));
  return {schema:'khosan.3d.repair-scope.v1',base_sha256:digest(state),findings,editable_axes:Object.fromEntries([...editable].map(([k,v])=>[k,[...v].sort()])),frozen_hashes:frozen};
}
function diagnosticKey(d){return stableJSON([d.code,d.involved_nodes,d.axes])}
export function applyDifferentialPatch(state,scope,payload){
  if(!isObject(scope)||scope.schema!=='khosan.3d.repair-scope.v1'||!SHA.test(scope.base_sha256??''))err('missing trusted repair scope');
  // Never trust a user-supplied scope without independently remeasuring it.
  const independently=measuredRepairScope(state);
  if(stableJSON(scope)!==stableJSON(independently))err('repair scope stale, forged or inconsistent with geometry');
  if(!isObject(payload)||!allowed(payload,['base_sha256','patches'])||Object.keys(payload).length!==2||payload.base_sha256!==scope.base_sha256)err('patch must reference current source hash');
  if(!Array.isArray(payload.patches)||payload.patches.length<1||payload.patches.length>64)err('patches must contain 1..64 edits');
  const edited=structuredClone(state),nodes=new Map(edited.layout_nodes.map(n=>[n.instance_name,n])),seen=new Set();
  for(const p of payload.patches){
    if(!isObject(p)||Object.keys(p).length!==4||!allowed(p,['instance_name','field','axis','value']))err('unexpected patch parameters');
    if(!Object.hasOwn(scope.editable_axes,p.instance_name)||!nodes.has(p.instance_name))err('frozen or unknown node');
    if(!['min_xyz_cm','max_xyz_cm'].includes(p.field)||!Number.isInteger(p.axis)||!scope.editable_axes[p.instance_name].includes(p.axis)||!num(p.value))err('unauthorized axis, field or value');
    const key=[p.instance_name,p.field,p.axis].join('\u0000');if(seen.has(key))err('duplicate edit');seen.add(key);
    const n=nodes.get(p.instance_name);if(n[p.field][p.axis]===p.value)err('no-op repair');n[p.field][p.axis]=p.value;
  }
  const after=geometryDiagnostics(edited),before=scope.findings;
  for(const n of edited.layout_nodes)if(Object.hasOwn(scope.frozen_hashes,n.instance_name)&&digest(n)!==scope.frozen_hashes[n.instance_name])err('frozen node changed');
  const old=new Map(before.map(d=>[diagnosticKey(d),d.severity_cm]));
  for(const d of after){const k=diagnosticKey(d);if(!old.has(k))err('new geometry regression '+d.code);if(d.severity_cm>old.get(k)+1e-9)err('worsened geometry defect '+d.code)}
  if(after.reduce((n,d)=>n+d.severity_cm,0)>=before.reduce((n,d)=>n+d.severity_cm,0)-1e-9)err('no measurable repair progress');
  return {state:edited,base_sha256:scope.base_sha256,next_sha256:digest(edited),before:before.length,after:after.length,complete:after.length===0};
}

export const STAGES=Object.freeze(['specified','reference_locked','geometry_built','geometry_verified','rendered','independent_reviewed','human_accepted']);
export const TOOLS=Object.freeze({
 specified:['lock_reference'], reference_locked:['create_geometry'],geometry_built:['lint_geometry','patch_failing_layout_nodes'],geometry_verified:['submit_render'],rendered:['submit_review'],independent_reviewed:['approve'],human_accepted:[]
});
export function allowedTools(stage,role){
 if(!STAGES.includes(stage))err('unknown stage');
 const byRole={controller:['lock_reference'],maker:['create_geometry','patch_failing_layout_nodes'],checker:['lint_geometry'],renderer:['submit_render'],reviewer:['submit_review'],human:['approve'],observer:[]};
 if(!Object.hasOwn(byRole,role))err('unknown role');
 return TOOLS[stage].filter(t=>byRole[role].includes(t));
}
export function enforceTool(stage,role,action){if(!allowedTools(stage,role).includes(action))err('tool/role not allowed in current stage')}