import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {Box3, Vector3} from 'three';
import {parseLocal3dGlb, verifyLocal3dAsset, validateLocal3dManifest, Local3dContractError} from '../local3d-provider.mjs';
import {glbFixture, manifestFor} from './fixtures.mjs';

const rejectsCode = (work, code) => assert.rejects(work, error => error instanceof Local3dContractError && error.code === code);

test('real Three GLTFLoader preserves asymmetric coordinates and semantic object identity', async () => {
  const bytes = glbFixture(), manifest = manifestFor(bytes);
  const provider = await parseLocal3dGlb(bytes, manifest);
  assert.equal(provider.group.isObject3D, true);
  assert.deepEqual(provider.objects, [{id: 'proof.triangle', role: 'hero', depth: 'middle'}]);
  const size = new Box3().setFromObject(provider.group).getSize(new Vector3());
  assert.deepEqual(size.toArray(), [2, 3, 1]);
  let mesh;
  provider.group.traverse(node => {if (node.isMesh) mesh = node;});
  assert.equal(mesh.userData.semantic_id, 'proof.triangle');
  assert.equal(mesh.userData.semanticId, 'proof.triangle');
  assert.equal(mesh.userData.recipe, 'fixture');
  assert.equal(mesh.geometry.getAttribute('position').count, 3);
  assert.equal(provider.evidence.artifact_verified, true);
  assert.equal(provider.evidence.v4_render_integration, 'NOT_TESTED');
  assert.equal(provider.evidence.production_ready, false);
  provider.dispose();
});

test('each real parse owns distinct resources; disposal is idempotent and isolated', async () => {
  const bytes = glbFixture(), manifest = manifestFor(bytes);
  const [first, second] = await Promise.all([parseLocal3dGlb(bytes, manifest), parseLocal3dGlb(bytes, manifest)]);
  const a = first.group.children[0], b = second.group.children[0];
  assert.notEqual(a.geometry, b.geometry); assert.notEqual(a.material, b.material);
  let firstGeometry = 0, firstMaterial = 0, secondGeometry = 0;
  a.geometry.addEventListener('dispose', () => firstGeometry++);
  a.material.addEventListener('dispose', () => firstMaterial++);
  b.geometry.addEventListener('dispose', () => secondGeometry++);
  first.dispose(); first.dispose();
  assert.equal(firstGeometry, 1); assert.equal(firstMaterial, 1); assert.equal(secondGeometry, 0);
  assert.throws(() => first.update(0), error => error.code === 'DISPOSED');
  second.update(9); second.dispose(); assert.equal(secondGeometry, 1);
});

test('multipart semantic objects keep editable parts and one provider ledger entry', async () => {
  const bytes = glbFixture(json => {
    json.nodes[0].extras.part_id = 'body';
    const other = structuredClone(json.nodes[0]);
    other.name = 'Second editable part'; other.extras.part_id = 'handle'; other.translation = [3, 0, 0];
    json.nodes.push(other); json.scenes[0].nodes.push(1);
  });
  const manifest = manifestFor(bytes), verified = await verifyLocal3dAsset(bytes, manifest);
  assert.deepEqual(verified.semanticIds, ['proof.triangle']); assert.equal(verified.partCount, 2);
  const provider = await parseLocal3dGlb(bytes, manifest);
  assert.deepEqual(provider.objects, [{id: 'proof.triangle', role: 'hero', depth: 'middle'}]);
  assert.equal(provider.group.children.length, 2);
  assert.deepEqual(provider.group.children.map(n => n.userData.part_id), ['body', 'handle']);
  assert.deepEqual(provider.group.children.map(n => n.userData.semantic_id), ['proof.triangle', 'proof.triangle']);
  assert.deepEqual(provider.group.children.map(n => n.userData.partId), ['body', 'handle']);
  assert.equal(provider.evidence.semantic_objects, 1); assert.equal(provider.evidence.editable_parts, 2);
  assert.equal(provider.evidence.render_meshes, 2);
  provider.dispose();
});

test('repeated semantic IDs require unique valid part IDs and consistent object roles', async () => {
  for (const [code, change] of [
    ['DUPLICATE_PART_ID', json => {
      json.nodes[0].extras.part_id = 'body';
      json.nodes.push(structuredClone(json.nodes[0])); json.scenes[0].nodes.push(1);
    }],
    ['MISSING_PART_ID', json => {
      const other = structuredClone(json.nodes[0]); other.extras.part_id = 'handle';
      json.nodes.push(other); json.scenes[0].nodes.push(1);
    }],
    ['INVALID_MANIFEST', json => {json.nodes[0].extras.part_id = '';}],
    ['SEMANTIC_MISMATCH', json => {
      json.nodes[0].extras.part_id = 'body';
      const other = structuredClone(json.nodes[0]); other.extras.part_id = 'handle'; other.extras.role = 'different';
      json.nodes.push(other); json.scenes[0].nodes.push(1);
    }],
  ]) {
    const bytes = glbFixture(change);
    await rejectsCode(parseLocal3dGlb(bytes, manifestFor(bytes)), code);
  }
});

test('static absolute-time updates are stable for shuffled seeks and reject invalid time', async () => {
  const bytes = glbFixture(), provider = await parseLocal3dGlb(bytes, manifestFor(bytes));
  const before = provider.group.children[0].matrixWorld.toArray();
  for (const t of [0, 1.5, 10, 0.25, 1.5]) provider.update(t);
  assert.deepEqual(provider.group.children[0].matrixWorld.toArray(), before);
  for (const t of [-1, NaN, Infinity, '1', null]) assert.throws(() => provider.update(t), error => error.code === 'INVALID_TIME');
  provider.dispose();
});

test('unreviewed/rejected art remains inspectable without granting production approval', async () => {
  const bytes = glbFixture(), manifest = manifestFor(bytes, {visual_review: 'REWORK', human_acceptance: 'REJECTED', production_ready: true, v4_render_integration: 'PASS'});
  const provider = await parseLocal3dGlb(bytes, manifest);
  assert.deepEqual(provider.evidence.declared_reviews, {visual_review: 'REWORK', human_acceptance: 'REJECTED'});
  assert.equal(provider.evidence.production_ready, false);
  assert.equal(provider.evidence.v4_render_integration, 'NOT_TESTED');
  provider.dispose();
});

test('bytes are snapshotted with their view offset and manifest before asynchronous loading', async () => {
  const bytes = glbFixture(), padded = Buffer.concat([Buffer.from([1, 2, 3]), bytes, Buffer.from([4, 5])]);
  const view = padded.subarray(3, 3 + bytes.length), manifest = manifestFor(view);
  const pending = parseLocal3dGlb(view, manifest);
  view.fill(0); manifest.artifacts['scene.glb'].sha256 = '9'.repeat(64);
  const provider = await pending;
  assert.equal(provider.objects[0].id, 'proof.triangle'); provider.dispose();
});

test('byte size, checksum, header and truncation fail before loader invocation', async () => {
  const original = glbFixture(), manifest = manifestFor(original); let called = 0;
  const options = {loaderFactory() {called++; throw Error('must not run');}};
  await rejectsCode(parseLocal3dGlb(original.subarray(0, -1), manifest, options), 'SIZE_MISMATCH');
  const changed = Buffer.from(original); changed[changed.length - 1] ^= 1;
  await rejectsCode(parseLocal3dGlb(changed, manifest, options), 'CHECKSUM_MISMATCH');
  const badHeader = Buffer.from(original); badHeader.writeUInt32LE(1, 4);
  await rejectsCode(parseLocal3dGlb(badHeader, manifestFor(badHeader), options), 'INVALID_GLB');
  const badLength = Buffer.from(original); badLength.writeUInt32LE(badLength.length + 4, 8);
  await rejectsCode(parseLocal3dGlb(badLength, manifestFor(badLength), options), 'INVALID_GLB');
  await rejectsCode(parseLocal3dGlb(original, manifest, {...options, maxBytes: 28}), 'ASSET_TOO_LARGE');
  assert.equal(called, 0);
});

test('unsupported coordinates and stale/absent build evidence are rejected', async () => {
  const bytes = glbFixture();
  for (const [key, value] of [['up_axis', '+Z'], ['unit', 'cm'], ['handedness', 'left'], ['conversion_already_applied', false]]) {
    const manifest = manifestFor(bytes); manifest.coordinates[key] = value;
    await rejectsCode(verifyLocal3dAsset(bytes, manifest), 'COORDINATE_MISMATCH');
  }
  for (const key of ['technical_build', 'export_reimport']) {
    const manifest = manifestFor(bytes); manifest[key] = 'NOT_TESTED';
    await rejectsCode(verifyLocal3dAsset(bytes, manifest), 'UNVERIFIED_BUILD');
  }
  const manifest = manifestFor(bytes); delete manifest.implementation_sha256;
  assert.throws(() => validateLocal3dManifest(manifest), error => error.code === 'INVALID_MANIFEST');
});

test('advertised or requested animation, rigging and physics are never silently discarded', async () => {
  const bytes = glbFixture();
  for (const key of ['animation', 'rigging', 'physics']) {
    const manifest = manifestFor(bytes); manifest.capabilities[key] = true;
    await rejectsCode(verifyLocal3dAsset(bytes, manifest), 'UNSUPPORTED_CAPABILITY');
    await rejectsCode(verifyLocal3dAsset(bytes, manifestFor(bytes), {requirements: {[key]: true}}), 'UNSUPPORTED_REQUIREMENT');
  }
  await rejectsCode(verifyLocal3dAsset(bytes, manifestFor(bytes), {requirements: {cloth: false}}), 'UNSUPPORTED_REQUIREMENT');
});

test('actual animations, skinning and morph targets are rejected even when manifest claims static', async () => {
  for (const change of [
    json => {json.animations = [{samplers: [], channels: []}];},
    json => {json.skins = [{joints: [0]}];},
    json => {json.nodes[0].skin = 0;},
    json => {json.meshes[0].primitives[0].targets = [{POSITION: 0}];},
  ]) {
    const bytes = glbFixture(change);
    await rejectsCode(verifyLocal3dAsset(bytes, manifestFor(bytes)), 'UNSUPPORTED_ANIMATION');
  }
});

test('external images, buffers and data URIs are rejected without fetching', async () => {
  let called = 0;
  for (const change of [
    json => {json.buffers[0].uri = 'https://example.invalid/mesh.bin';},
    json => {json.images = [{uri: 'file:///private/image.png'}];},
    json => {json.images = [{uri: 'data:image/png;base64,AAAA'}];},
  ]) {
    const bytes = glbFixture(change);
    await rejectsCode(parseLocal3dGlb(bytes, manifestFor(bytes), {loaderFactory() {called++;}}), 'EXTERNAL_RESOURCE');
  }
  assert.equal(called, 0);
});

test('unsupported extensions, multiple scenes, and lost semantic IDs fail closed', async () => {
  for (const [code, change] of [
    ['UNSUPPORTED_EXTENSION', json => {json.extensionsRequired = ['KHR_draco_mesh_compression'];}],
    ['UNSUPPORTED_SCENES', json => {json.scenes.push({nodes: []});}],
    ['MISSING_SEMANTIC_ID', json => {delete json.nodes[0].extras.semantic_id;}],
    ['DUPLICATE_SEMANTIC_ID', json => {json.nodes.push(structuredClone(json.nodes[0])); json.scenes[0].nodes.push(1);}],
  ]) {
    const bytes = glbFixture(change);
    await rejectsCode(verifyLocal3dAsset(bytes, manifestFor(bytes)), code);
  }
});

test('pure byte verification is explicitly scoped and does not certify V4 render or art', async () => {
  const bytes = glbFixture(), result = await verifyLocal3dAsset(bytes, manifestFor(bytes));
  assert.equal(result.meshNodes, 1); assert.deepEqual(result.semanticIds, ['proof.triangle']);
  assert.equal(result.scope, 'STATIC_SELF_CONTAINED_GLB_BYTES');
  assert.equal(result.production_ready, false); assert.equal(result.v4_render_integration, 'NOT_TESTED');
});

test('oversized accessor declarations and cyclic scene graphs fail before resource allocation', async () => {
  let called = 0;
  for (const [code, change] of [
    ['GLB_COMPLEXITY_LIMIT', json => {json.accessors[0].count = 100_000_000;}],
    ['UNSUPPORTED_SPARSE', json => {json.accessors[0].sparse = {count: 1};}],
    ['INVALID_SCENE_GRAPH', json => {json.nodes[0].children = [0];}],
    ['INVALID_SCENE_GRAPH', json => {json.nodes[0].translation = [1, 2];}],
  ]) {
    const bytes = glbFixture(change);
    await rejectsCode(parseLocal3dGlb(bytes, manifestFor(bytes), {loaderFactory() {called++;}}), code);
  }
  assert.equal(called, 0);
});

test('actual worker GLB parses with the installed Three loader', {
  skip: !process.env.LOCAL3D_ACTUAL_GLB || !process.env.LOCAL3D_ACTUAL_MANIFEST,
}, async () => {
  const [bytes, text] = await Promise.all([fs.readFile(process.env.LOCAL3D_ACTUAL_GLB), fs.readFile(process.env.LOCAL3D_ACTUAL_MANIFEST, 'utf8')]);
  const manifest = JSON.parse(text), provider = await parseLocal3dGlb(bytes, manifest);
  assert.equal(provider.evidence.artifact_sha256, manifest.artifacts['scene.glb'].sha256);
  assert.ok(provider.objects.length > 0);
  assert.equal(new Set(provider.objects.map(o => o.id)).size, provider.objects.length);
  const partKeys = [];
  provider.group.traverse(node => {
    if (node.userData?.semantic_id !== undefined) partKeys.push(JSON.stringify([node.userData.semantic_id, node.userData.part_id ?? null]));
  });
  assert.equal(new Set(partKeys).size, partKeys.length);
  assert.equal(provider.evidence.editable_parts, partKeys.length);
  assert.ok(provider.evidence.render_meshes >= provider.evidence.editable_parts);
  const bounds = new Box3().setFromObject(provider.group);
  assert.ok(!bounds.isEmpty());
  assert.ok([...bounds.min.toArray(), ...bounds.max.toArray()].every(Number.isFinite));
  provider.update(0); provider.update(2.5); provider.update(0);
  provider.dispose();
});

