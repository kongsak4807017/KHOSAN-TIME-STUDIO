/**
 * Static, self-contained GLB -> KHOSAN Harness V4 world-provider boundary.
 * Does not render, approve art, execute scripts, animate, or simulate physics.
 * Each parse creates fresh Three resources; the caller owns one provider instance.
 */
const SCHEMA = 'khosan.harness-asset/1.0';
const SHA256 = /^[a-f0-9]{64}$/;
const DEFAULT_MAX_BYTES = 128 * 1024 * 1024;
const COORDINATES = Object.freeze({
  handedness: 'right', up_axis: '+Y', asset_forward: '+Z', unit: 'meter',
  conversion_already_applied: true,
});
const REVIEW_STATES = new Set(['NOT_REVIEWED', 'PASS', 'REWORK']);
const HUMAN_STATES = new Set(['NOT_REVIEWED', 'APPROVED', 'REJECTED']);
const OPTIONAL_EXTENSIONS = new Set([
  'KHR_lights_punctual', 'KHR_materials_unlit', 'KHR_materials_clearcoat',
  'KHR_materials_ior', 'KHR_materials_specular', 'KHR_materials_transmission',
  'KHR_materials_volume', 'KHR_materials_sheen', 'KHR_materials_iridescence',
  'KHR_materials_anisotropy', 'KHR_materials_emissive_strength',
  'KHR_materials_dispersion', 'KHR_texture_transform',
]);

export class Local3dContractError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'Local3dContractError';
    this.code = code;
  }
}
function fail(code, message) { throw new Local3dContractError(code, message); }
function object(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function identifier(value, where) {
  if (typeof value !== 'string' || !value.trim() || value.length > 256 || /[\u0000-\u001f]/.test(value)) {
    fail('INVALID_MANIFEST', `${where} must be a nonempty, bounded identifier`);
  }
}

/** Validate declarations only. Source files are checked by the build/evidence layer. */
export function validateLocal3dManifest(manifest, requirements = {}) {
  if (!object(manifest) || manifest.schema !== SCHEMA) fail('INVALID_MANIFEST', `Expected ${SCHEMA}`);
  identifier(manifest.scene_id, 'scene_id');
  for (const key of ['spec_sha256', 'implementation_sha256']) {
    if (!SHA256.test(manifest[key] || '')) fail('INVALID_MANIFEST', `${key} must be lowercase SHA-256`);
  }
  if (!object(manifest.coordinates)) fail('COORDINATE_MISMATCH', 'Explicit coordinates required');
  for (const [key, value] of Object.entries(COORDINATES)) {
    if (manifest.coordinates[key] !== value) fail('COORDINATE_MISMATCH', `coordinates.${key} must equal ${String(value)}`);
  }
  if (!object(requirements)) fail('UNSUPPORTED_REQUIREMENT', 'requirements must be an object');
  for (const [key, value] of Object.entries(requirements)) {
    if (!['animation', 'rigging', 'physics'].includes(key) || value !== false) {
      fail('UNSUPPORTED_REQUIREMENT', `Static provider cannot satisfy requirement ${key}=${String(value)}`);
    }
  }
  if (!object(manifest.capabilities)) fail('UNSUPPORTED_CAPABILITY', 'Explicit static capabilities required');
  for (const key of ['animation', 'rigging', 'physics']) {
    if (manifest.capabilities[key] !== false) fail('UNSUPPORTED_CAPABILITY', `capabilities.${key} must be false`);
  }
  for (const key of ['technical_build', 'export_reimport']) {
    if (manifest[key] !== 'PASS') fail('UNVERIFIED_BUILD', `${key} must report PASS before preview loading`);
  }
  if (!REVIEW_STATES.has(manifest.visual_review) || !HUMAN_STATES.has(manifest.human_acceptance)) {
    fail('INVALID_MANIFEST', 'Explicit visual_review and human_acceptance states required');
  }
  const artifact = manifest.artifacts?.['scene.glb'];
  if (!object(artifact) || !SHA256.test(artifact.sha256 || '') || !Number.isSafeInteger(artifact.bytes) || artifact.bytes < 28) {
    fail('INVALID_MANIFEST', 'artifacts["scene.glb"] requires SHA-256 and positive byte size');
  }
  return manifest;
}

function copyBytes(input, limit) {
  let source;
  if (input instanceof ArrayBuffer) source = new Uint8Array(input);
  else if (ArrayBuffer.isView(input)) source = new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  else fail('INVALID_BYTES', 'GLB input must be ArrayBuffer or a byte view');
  if (!Number.isSafeInteger(limit) || limit < 28 || limit > DEFAULT_MAX_BYTES) {
    fail('INVALID_LIMIT', `maxBytes must be between 28 and ${DEFAULT_MAX_BYTES}`);
  }
  if (source.byteLength > limit) fail('ASSET_TOO_LARGE', `GLB exceeds ${limit} bytes`);
  return new Uint8Array(source); // Snapshot prevents mutation during async hashing/loading.
}

function noExternalResources(value, path = '$', depth = 0, budget = {remaining: 200_000}) {
  if (depth > 128 || --budget.remaining < 0) fail('GLB_COMPLEXITY_LIMIT', 'GLB JSON nesting/node budget exceeded');
  if (Array.isArray(value)) {
    value.forEach((v, i) => noExternalResources(v, `${path}[${i}]`, depth + 1, budget));
  } else if (object(value)) {
    for (const [key, child] of Object.entries(value)) {
      if (key === 'uri') fail('EXTERNAL_RESOURCE', `URI resources are unsupported (${path}.uri); use embedded bufferViews`);
      noExternalResources(child, `${path}.${key}`, depth + 1, budget);
    }
  }
}

function boundedGeometry(json) {
  const components = {SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16};
  let total = 0;
  if (!Array.isArray(json.accessors) || !json.accessors.length) fail('INVALID_GLB', 'Geometry accessors required');
  for (const accessor of json.accessors) {
    const width = components[accessor?.type];
    if (!width || !Number.isSafeInteger(accessor.count) || accessor.count <= 0) fail('INVALID_GLB', 'Invalid geometry accessor type/count');
    total += width * accessor.count;
    if (total > 32_000_000) fail('GLB_COMPLEXITY_LIMIT', 'Declared geometry exceeds 32 million scalar components');
    // Blender's current worker exports dense static geometry. Sparse allocation is
    // not needed here and must not be accepted without its own measured budget.
    if (accessor.sparse !== undefined) fail('UNSUPPORTED_SPARSE', 'Sparse accessors need a separate bounded adapter');
  }
  if (json.nodes.length > 20_000) fail('GLB_COMPLEXITY_LIMIT', 'Scene node budget exceeded');
  const state = new Map();
  function visit(index, depth) {
    if (!Number.isInteger(index) || index < 0 || index >= json.nodes.length) fail('INVALID_SCENE_GRAPH', 'Invalid node index');
    if (depth > 128) fail('GLB_COMPLEXITY_LIMIT', 'Scene graph depth exceeds 128');
    if (state.has(index)) fail('INVALID_SCENE_GRAPH', 'Cyclic or multiply-parented scene node');
    state.set(index, true);
    const node = json.nodes[index];
    for (const [key, count] of [['translation', 3], ['rotation', 4], ['scale', 3], ['matrix', 16]]) {
      if (node[key] !== undefined && (!Array.isArray(node[key]) || node[key].length !== count || node[key].some(x => typeof x !== 'number' || !Number.isFinite(x)))) {
        fail('INVALID_SCENE_GRAPH', `Invalid finite ${key} transform`);
      }
    }
    if (node.children !== undefined && !Array.isArray(node.children)) fail('INVALID_SCENE_GRAPH', 'Node children must be an array');
    for (const child of node.children || []) visit(child, depth + 1);
  }
  if (!Array.isArray(json.scenes[0].nodes) || !json.scenes[0].nodes.length) fail('EMPTY_SCENE', 'Default scene nodes required');
  for (const root of json.scenes[0].nodes) visit(root, 0);
}

function inspectGlb(bytes) {
  if (bytes.byteLength < 28) fail('INVALID_GLB', 'GLB header/chunks truncated');
  const view = new DataView(bytes.buffer);
  if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2) fail('INVALID_GLB', 'Expected GLB 2.0');
  if (view.getUint32(8, true) !== bytes.byteLength) fail('INVALID_GLB', 'GLB declared length differs from actual bytes');
  let json, binaryLength = 0, offset = 12, chunks = 0, seenBinary = false;
  while (offset < bytes.byteLength) {
    if (offset + 8 > bytes.byteLength) fail('INVALID_GLB', 'Truncated chunk header');
    const length = view.getUint32(offset, true), type = view.getUint32(offset + 4, true);
    offset += 8;
    if (length % 4 || offset + length > bytes.byteLength) fail('INVALID_GLB', 'Invalid chunk alignment/length');
    if (type === 0x4e4f534a) {
      if (chunks !== 0 || json !== undefined) fail('INVALID_GLB', 'Exactly one leading JSON chunk required');
      try { json = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes.subarray(offset, offset + length))); }
      catch { fail('INVALID_GLB', 'Invalid UTF-8/JSON chunk'); }
    } else if (type === 0x004e4942) {
      if (json === undefined || seenBinary) fail('INVALID_GLB', 'Expected one BIN chunk after JSON');
      binaryLength = length; seenBinary = true;
    } else fail('UNSUPPORTED_GLB_CHUNK', `Unsupported GLB chunk ${type}`);
    offset += length; chunks++;
  }
  if (!object(json) || json.asset?.version !== '2.0') fail('INVALID_GLB', 'glTF asset.version must be 2.0');
  noExternalResources(json);
  if (json.animations?.length || json.skins?.length) fail('UNSUPPORTED_ANIMATION', 'Static adapter rejects animations and skins');
  if (!Array.isArray(json.scenes) || json.scenes.length !== 1 || (json.scene ?? 0) !== 0) {
    fail('UNSUPPORTED_SCENES', 'Exactly one default scene is supported');
  }
  if (!Array.isArray(json.buffers) || json.buffers.length !== 1 || !seenBinary) fail('INVALID_GLB', 'One embedded BIN buffer required');
  const bufferLength = json.buffers[0]?.byteLength;
  if (!Number.isSafeInteger(bufferLength) || bufferLength <= 0 || bufferLength > binaryLength || binaryLength - bufferLength > 3) {
    fail('INVALID_GLB', 'Embedded buffer length is inconsistent');
  }
  for (const key of ['extensionsUsed', 'extensionsRequired']) {
    if (json[key] !== undefined && (!Array.isArray(json[key]) || json[key].some(x => !OPTIONAL_EXTENSIONS.has(x)))) {
      fail('UNSUPPORTED_EXTENSION', `${key} contains an unsupported extension; compression/instancing need separate adapters`);
    }
  }
  if (!Array.isArray(json.nodes) || !Array.isArray(json.meshes) || !json.meshes.length) fail('EMPTY_SCENE', 'Static mesh nodes required');
  const ids = new Set(), parts = new Set(), entriesById = new Map(); let meshNodes = 0;
  for (const [index, node] of json.nodes.entries()) {
    if (!object(node)) fail('INVALID_GLB', `Invalid node ${index}`);
    if (node.skin !== undefined || node.weights !== undefined) fail('UNSUPPORTED_ANIMATION', 'Skins/morph weights are unsupported');
    if (node.extras?.semantic_id !== undefined) {
      identifier(node.extras.semantic_id, `nodes[${index}].extras.semantic_id`);
      const id = node.extras.semantic_id, part = node.extras.part_id ?? null;
      if (node.extras.part_id !== undefined) identifier(node.extras.part_id, `nodes[${index}].extras.part_id`);
      const key = JSON.stringify([id, part]);
      if (parts.has(key)) fail(part === null ? 'DUPLICATE_SEMANTIC_ID' : 'DUPLICATE_PART_ID', `Duplicate semantic/part identity ${key}`);
      parts.add(key); ids.add(id);
      const entries = entriesById.get(id) || [];
      entries.push(part); entriesById.set(id, entries);
    }
    if (node.mesh !== undefined) {
      meshNodes++;
      if (!Number.isInteger(node.mesh) || !json.meshes[node.mesh]) fail('INVALID_GLB', 'Invalid node mesh reference');
      if (node.extras?.semantic_id === undefined) fail('MISSING_SEMANTIC_ID', `Mesh node ${index} needs extras.semantic_id`);
    }
  }
  for (const [id, entries] of entriesById) {
    if (entries.length > 1 && entries.includes(null)) fail('MISSING_PART_ID', `Repeated semantic_id ${id} requires part_id on every part`);
  }
  if (!meshNodes) fail('EMPTY_SCENE', 'No mesh nodes in asset');
  for (const mesh of json.meshes) {
    if (mesh.weights !== undefined || mesh.primitives?.some(p => p.targets?.length)) fail('UNSUPPORTED_ANIMATION', 'Morph-target assets need a separate adapter');
    if (mesh.primitives?.some(p => Object.keys(p.attributes || {}).some(key => /^(JOINTS|WEIGHTS)_/.test(key)))) {
      fail('UNSUPPORTED_ANIMATION', 'Rig attributes require a separate rigged provider');
    }
  }
  boundedGeometry(json);
  return {json, ids, parts, meshNodes};
}

async function prepareVerified(input, manifest, options) {
  let snapshot;
  try { snapshot = structuredClone(manifest); }
  catch { fail('INVALID_MANIFEST', 'Manifest must be plain serializable data'); }
  validateLocal3dManifest(snapshot, options.requirements);
  const bytes = copyBytes(input, options.maxBytes ?? DEFAULT_MAX_BYTES);
  const artifact = snapshot.artifacts['scene.glb'];
  if (bytes.byteLength !== artifact.bytes) fail('SIZE_MISMATCH', 'GLB size differs from manifest');
  if (!globalThis.crypto?.subtle) fail('HASH_UNAVAILABLE', 'Web Crypto is required; use localhost/HTTPS or a modern Node runtime');
  const hash = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', bytes));
  const sha = Array.from(hash, n => n.toString(16).padStart(2, '0')).join('');
  if (sha !== artifact.sha256) fail('CHECKSUM_MISMATCH', 'GLB SHA-256 differs from manifest');
  const inspected = inspectGlb(bytes);
  return {bytes, manifest: snapshot, sha256: sha, ...inspected};
}

/** Checks GLB bytes and declarations without importing Three or rendering. */
export async function verifyLocal3dAsset(input, manifest, options = {}) {
  const verified = await prepareVerified(input, manifest, options);
  return Object.freeze({
    scene_id: verified.manifest.scene_id, sha256: verified.sha256,
    bytes: verified.bytes.byteLength, meshNodes: verified.meshNodes,
    semanticIds: Object.freeze([...verified.ids]), coordinates: COORDINATES,
    partCount: verified.parts.size,
    scope: 'STATIC_SELF_CONTAINED_GLB_BYTES',
    v4_render_integration: 'NOT_TESTED', production_ready: false,
  });
}

function ownedResources(root) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  root.traverse(node => {
    if (node.geometry?.dispose) geometries.add(node.geometry);
    const nodeMaterials = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of nodeMaterials) {
      if (!material) continue;
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
      for (const uniform of Object.values(material.uniforms || {})) if (uniform?.value?.isTexture) textures.add(uniform.value);
    }
  });
  return () => {
    const images = new Set();
    for (const texture of textures) {
      texture.dispose();
      if (texture.image?.close) images.add(texture.image);
    }
    for (const image of images) image.close();
    for (const material of materials) material.dispose?.();
    for (const geometry of geometries) geometry.dispose();
  };
}

async function defaultLoaderFactory() {
  const {GLTFLoader} = await import('three/addons/loaders/GLTFLoader.js');
  return new GLTFLoader();
}

/**
 * Return {group, objects, update, dispose, evidence} for an isolated V4 scene.
 * loaderFactory is an injection seam for tests; production should use the default.
 * Neither spec/implementation source bytes nor declared reviews are verified here.
 */
export async function parseLocal3dGlb(input, manifest, options = {}) {
  const verified = await prepareVerified(input, manifest, options);
  const loader = await (options.loaderFactory || defaultLoaderFactory)();
  if (!loader || typeof loader.parse !== 'function') fail('INVALID_LOADER', 'GLTFLoader.parse required');
  const gltf = await new Promise((resolve, reject) => {
    try { loader.parse(verified.bytes.buffer, '', resolve, reject); }
    catch (error) { reject(error); }
  });
  const group = gltf?.scene;
  if (!group || typeof group.traverse !== 'function') fail('INVALID_SCENE', 'GLTFLoader did not return a scene graph');
  const release = ownedResources(group);
  try {
    if (gltf.animations?.length) fail('UNSUPPORTED_ANIMATION', 'Loaded GLB contains animations');
    const objects = [], loadedIds = new Map(), loadedParts = new Set(); let meshes = 0;
    group.traverse(node => {
      if (node.isSkinnedMesh || node.skeleton || node.morphTargetInfluences?.length) fail('UNSUPPORTED_ANIMATION', 'Loaded scene contains unsupported deforming geometry');
      if (node.isMesh) { meshes++; node.castShadow = true; node.receiveShadow = true; }
      const id = node.userData?.semantic_id;
      if (id === undefined) return;
      const part = node.userData.part_id ?? null, key = JSON.stringify([id, part]);
      if (!verified.parts.has(key) || loadedParts.has(key)) fail('SEMANTIC_MISMATCH', `Unrecognized or duplicated loaded semantic/part identity ${key}`);
      loadedParts.add(key);
      node.userData.semanticId = id;
      if (part !== null) node.userData.partId = part;
      const entry = Object.freeze({
        id,
        role: typeof node.userData.role === 'string' ? node.userData.role : 'prop',
        depth: typeof node.userData.depth === 'string' ? node.userData.depth : 'middle',
      });
      const existing = loadedIds.get(id);
      if (existing && (existing.role !== entry.role || existing.depth !== entry.depth)) {
        fail('SEMANTIC_MISMATCH', `Parts of ${id} disagree on role/depth`);
      }
      if (!existing) { loadedIds.set(id, entry); objects.push(entry); }
    });
    if (!meshes || loadedIds.size !== verified.ids.size || loadedParts.size !== verified.parts.size) fail('SEMANTIC_MISMATCH', 'Scene import lost mesh nodes or semantic/part identities');
    group.updateMatrixWorld?.(true);
    let disposed = false;
    const evidence = Object.freeze({
      scope: 'STATIC_GLB_PROVIDER',
      scene_id: verified.manifest.scene_id,
      artifact_sha256: verified.sha256,
      declared_spec_sha256: verified.manifest.spec_sha256,
      declared_implementation_sha256: verified.manifest.implementation_sha256,
      artifact_verified: true,
      semantic_objects: loadedIds.size, editable_parts: loadedParts.size, render_meshes: meshes,
      declared_reviews: Object.freeze({visual_review: verified.manifest.visual_review, human_acceptance: verified.manifest.human_acceptance}),
      coordinates: COORDINATES,
      capabilities: Object.freeze({animation: false, rigging: false, physics: false}),
      v4_render_integration: 'NOT_TESTED', production_ready: false,
    });
    return {
      group, objects: Object.freeze(objects), evidence,
      update(sourceTimeSeconds) {
        if (disposed) fail('DISPOSED', 'Provider has been disposed');
        if (typeof sourceTimeSeconds !== 'number' || !Number.isFinite(sourceTimeSeconds) || sourceTimeSeconds < 0) {
          fail('INVALID_TIME', 'Absolute source time must be finite and nonnegative');
        }
        // Static assets intentionally have no incremental animation/physics state.
      },
      dispose() {
        if (disposed) return;
        disposed = true;
        release();
        group.removeFromParent?.();
      },
    };
  } catch (error) { release(); throw error; }
}
