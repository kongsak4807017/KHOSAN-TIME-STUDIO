import {test} from 'node:test';import assert from 'node:assert/strict';import {generateAsset,toOBJ,validateSpec} from './geometry.mjs';
for(const kind of ['house','tree','crate'])test(kind+' produces stable indexed mesh',()=>{const a=generateAsset({kind});assert.deepEqual(a,generateAsset({kind}));assert.ok(a.stats.triangles>0);assert.equal(a.mesh.positions.length,a.mesh.normals.length);assert.equal(a.mesh.indices.length,a.stats.triangles*3);assert.match(toOBJ(a),/^# KHOSAN generated asset/);assert.equal(toOBJ(a).split('\n').filter(x=>x.startsWith('f ')).length,a.stats.triangles)});
test('rejects unsupported kind',()=>assert.throws(()=>validateSpec({kind:'unknown'}),/unsupported/));
test('rejects negative and nonfinite dimensions',()=>{for(const v of [-1,NaN,Infinity,0])assert.throws(()=>generateAsset({kind:'house',params:{width:v}}))});
test('rejects invalid specification',()=>assert.throws(()=>generateAsset(null)));
test('parameter changes alter output without randomness',()=>{const a=generateAsset({kind:'house'}),b=generateAsset({kind:'house',params:{roofRise:2.5}});assert.notDeepEqual(a.mesh.positions,b.mesh.positions)});
