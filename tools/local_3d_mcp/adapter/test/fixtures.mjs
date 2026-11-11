import {createHash} from 'node:crypto';

export function glbFixture(change = () => {}) {
  const positions = new Float32Array([0, 0, 0, 2, 0, 0, 0, 3, 1]);
  const binary = Buffer.from(positions.buffer);
  const json = {
    asset: {version: '2.0', generator: 'KHOSAN adapter test fixture'},
    scene: 0,
    scenes: [{nodes: [0]}],
    nodes: [{name: 'Asymmetric proof', mesh: 0, extras: {semantic_id: 'proof.triangle', role: 'hero', depth: 'middle', recipe: 'fixture'}}],
    meshes: [{primitives: [{attributes: {POSITION: 0}, material: 0}]}],
    materials: [{pbrMetallicRoughness: {baseColorFactor: [0.6, 0.3, 0.1, 1], metallicFactor: 0, roughnessFactor: 0.8}}],
    buffers: [{byteLength: binary.length}],
    bufferViews: [{buffer: 0, byteOffset: 0, byteLength: binary.length}],
    accessors: [{bufferView: 0, componentType: 5126, count: 3, type: 'VEC3', min: [0, 0, 0], max: [2, 3, 1]}],
  };
  change(json);
  const source = Buffer.from(JSON.stringify(json));
  const text = Buffer.alloc(Math.ceil(source.length / 4) * 4, 0x20); source.copy(text);
  const bin = Buffer.alloc(Math.ceil(binary.length / 4) * 4); binary.copy(bin);
  const glb = Buffer.alloc(12 + 8 + text.length + 8 + bin.length);
  glb.writeUInt32LE(0x46546c67, 0); glb.writeUInt32LE(2, 4); glb.writeUInt32LE(glb.length, 8);
  glb.writeUInt32LE(text.length, 12); glb.writeUInt32LE(0x4e4f534a, 16); text.copy(glb, 20);
  const offset = 20 + text.length;
  glb.writeUInt32LE(bin.length, offset); glb.writeUInt32LE(0x004e4942, offset + 4); bin.copy(glb, offset + 8);
  return glb;
}

export function manifestFor(bytes, patch = {}) {
  return {
    schema: 'khosan.harness-asset/1.0', scene_id: 'adapter-proof',
    spec_sha256: '1'.repeat(64), implementation_sha256: '2'.repeat(64),
    artifacts: {'scene.glb': {sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.byteLength}},
    coordinates: {handedness: 'right', up_axis: '+Y', asset_forward: '+Z', unit: 'meter', conversion_already_applied: true},
    capabilities: {animation: false, rigging: false, physics: false},
    technical_build: 'PASS', export_reimport: 'PASS', visual_review: 'NOT_REVIEWED', human_acceptance: 'NOT_REVIEWED',
    ...patch,
  };
}

