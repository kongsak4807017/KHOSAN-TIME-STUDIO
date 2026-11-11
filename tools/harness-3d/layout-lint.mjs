/** Strict deterministic lint for the supported subset of KHOSAN UG-IR.
 * This first implementation supports axis-aligned place_bounds_box only.
 * Unsupported procedural primitives or anchor placements are BLOCKED rather
 * than silently declared collision-free. Units are Z-up centimeters.
 */
const finite = n => typeof n === 'number' && Number.isFinite(n);
const separation=(a,b,axis)=>Math.max(0, a.min[axis]-b.max[axis], b.min[axis]-a.max[axis]);
const overlap=(a,b,axis)=>Math.min(a.max[axis],b.max[axis])-Math.max(a.min[axis],b.min[axis]);
export function lintUGIR(ugir,{contact_tolerance_cm=0.1,penetration_tolerance_cm=0.1,ground_z_cm=0}={}){
 const issues=[],nodes=[],names=new Set();
 if(ugir?.coordinate_system?.unit!=='cm'||ugir?.coordinate_system?.up_axis!=='+Z')issues.push('coordinate system must be centimeters with +Z up');
 if(!Array.isArray(ugir?.layout_nodes)||ugir.layout_nodes.length===0)issues.push('nonempty layout_nodes required for this bounded validator');
 if(!finite(contact_tolerance_cm)||contact_tolerance_cm<0||!finite(penetration_tolerance_cm)||penetration_tolerance_cm<0||!finite(ground_z_cm))issues.push('invalid linter tolerances');
 for(const part of ugir?.layout_nodes||[]){
  if(part?.placement_mode!=='place_bounds_box'){issues.push(`unsupported placement mode: ${part?.placement_mode||'missing'}`);continue}
  if(typeof part.instance_name!=='string'||!part.instance_name.trim()||names.has(part.instance_name)){issues.push('missing or duplicated instance_name');continue}
  names.add(part.instance_name);
  const min=part.min_xyz_cm,max=part.max_xyz_cm;
  if(!Array.isArray(min)||!Array.isArray(max)||min.length!==3||max.length!==3||!min.every(finite)||!max.every(finite)||min.some((v,i)=>v>=max[i])){issues.push(`invalid bounds: ${part.instance_name}`);continue}
  nodes.push({name:part.instance_name,min,max,ground:part.is_ground===true});
 }
 const byName=new Map(nodes.map(n=>[n.name,n]));
 let floating_count=0,piercing_count=0,max_seam_gap_cm=0;
 for(const a of nodes){
  if(a.ground)continue;
  if(a.min[2]<=ground_z_cm+contact_tolerance_cm)continue;
  const onSupport=nodes.some(b=>b!==a&&Math.abs(b.max[2]-a.min[2])<=contact_tolerance_cm && overlap(a,b,0)>0 && overlap(a,b,1)>0);
  if(!onSupport){floating_count++;issues.push(`unsupported floating or unanchored object ${a.name}`)}
 }
 const allow=new Set();
 for(const pair of ugir?.intentional_intersections||[]){
  if(!Array.isArray(pair)||pair.length!==2||!pair.every(x=>typeof x==='string'&&byName.has(x))){issues.push('malformed intentional_intersections pair');continue}
  allow.add([...pair].sort().join('|'));
 }
 for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){
  const a=nodes[i],b=nodes[j];
  if(allow.has([a.name,b.name].sort().join('|')))continue;
  if([0,1,2].every(k=>overlap(a,b,k)>penetration_tolerance_cm)){piercing_count++;issues.push(`unapproved solid overlap ${a.name} / ${b.name}`)}
 }
 if(ugir?.expected_adjacent_seams!==undefined&&!Array.isArray(ugir.expected_adjacent_seams))issues.push('expected_adjacent_seams must be an array');
 for(const pair of ugir?.expected_adjacent_seams||[]){
  if(!Array.isArray(pair)||pair.length!==2||pair[0]===pair[1]||!pair.every(x=>byName.has(x))){issues.push('invalid expected seam pair');continue}
  const a=byName.get(pair[0]),b=byName.get(pair[1]);
  const gap=Math.hypot(separation(a,b,0),separation(a,b,1),separation(a,b,2));
  max_seam_gap_cm=Math.max(max_seam_gap_cm,gap);
  if(gap>contact_tolerance_cm)issues.push(`seam gap ${pair[0]} / ${pair[1]} = ${gap.toFixed(3)} cm`);
 }
 return {schema:'khosan.3d.layout-lint.v1',supported_nodes:nodes.length,floating_count,piercing_count,max_seam_gap_cm,issues,ok:issues.length===0};
}