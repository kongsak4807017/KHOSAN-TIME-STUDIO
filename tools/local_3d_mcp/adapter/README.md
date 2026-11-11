# Local 3D static provider for Harness V4

This package loads an actual self-contained GLB into the existing V4 world-provider shape:

```js
{group, objects: [{id, role, depth}], update(sourceTimeSeconds), dispose(), evidence}
```

It is an isolated adapter. It does not alter `studio_harness_v4`, register a Remotion composition, render a film, or grant visual/human approval. Actual V4 composition rendering remains a separate verification step.

## Dependencies

Three.js is a peer dependency, supplied by the consuming Studio. There is no CDN, remote model request, code evaluation, Blender GUI requirement, or browser animation loop. The development lock installs `three@0.181.1` to test the actual `GLTFLoader.parse` implementation; the existing V4 source reports `three@0.187.0`, whose rendering integration must be checked separately.

```bash
npm ci --ignore-scripts
npm test
```

## Use

The caller obtains bytes and the matching build manifest from its authorized local artifact store. `parseLocal3dGlb` does not accept arbitrary filesystem or network URLs. Browser byte acquisition, if needed, belongs to the Studio's same-origin local artifact route.

```js
import {parseLocal3dGlb} from './local3d-provider.mjs';

const world = await parseLocal3dGlb(glbArrayBuffer, manifest, {
  requirements: {animation: false, rigging: false, physics: false},
});

// Separate opt-in V4 component, after async readiness is complete:
// <primitive object={world.group}/>
world.update(sourceFrame / fps); // Absolute time; static content has no moving state.
// On unmount or replacement:
world.dispose();
```

Load outside per-frame evaluation, keep one provider per component instance, and use Remotion's readiness mechanism when integrating asynchronous loading. Never advance it with RAF/useFrame deltas. Each default parse allocates a separate GLTFLoader and separate model resources, so disposing one instance does not dispose another instance's geometry/materials.

### Public API

- `validateLocal3dManifest(manifest, requirements?)`: validate declarations synchronously. It does not read the claimed source files.
- `verifyLocal3dAsset(bytes, manifest, options?)`: checksum/size/GLB contract checks without importing Three.
- `parseLocal3dGlb(bytes, manifest, options?)`: verify first, use the actual GLTFLoader, and return the V4-shaped provider.
- `Local3dContractError`: stable `code` plus an explanatory message.

`options.maxBytes` can reduce the default 128 MiB ceiling. `options.loaderFactory` is a test injection seam; production should use the default peer GLTFLoader.

## Manifest contract

```json
{
  "schema": "khosan.harness-asset/1.0",
  "scene_id": "local-proof",
  "spec_sha256": "64 lowercase hexadecimal characters",
  "implementation_sha256": "64 lowercase hexadecimal characters",
  "artifacts": {
    "scene.glb": {"sha256": "64 lowercase hexadecimal characters", "bytes": 12345}
  },
  "coordinates": {
    "handedness": "right",
    "up_axis": "+Y",
    "asset_forward": "+Z",
    "unit": "meter",
    "conversion_already_applied": true
  },
  "capabilities": {"animation": false, "rigging": false, "physics": false},
  "technical_build": "PASS",
  "export_reimport": "PASS",
  "visual_review": "NOT_REVIEWED",
  "human_acceptance": "NOT_REVIEWED"
}
```

The GLB checksum is independently verified against the bytes. Spec and implementation hashes are mandatory **declarations** here; their current files and the rest of the artifact set must be verified by the headless pipeline's evidence/status command. This loader does not cryptographically authenticate reviewer identity or verify a human approval claim.

Unreviewed and rejected/rework previews remain loadable for inspection. Returned evidence always reports `production_ready: false` and `v4_render_integration: NOT_TESTED`; importing a model is not a render or art acceptance test.

## Supported boundary

- GLB 2.0 with exactly one scene and one embedded BIN buffer.
- Static mesh nodes with `extras.semantic_id`. A repeated semantic ID is supported only when **every** matching part has a valid, unique `extras.part_id`; duplicate `[semantic_id, part_id]` pairs fail. The provider ledger has one entry per semantic object while the scene graph preserves every separate editable part. Multi-material glTF nodes may become parent Groups with child render meshes, so editable part count and render mesh count are recorded separately.
- Optional `role`, `depth`, and `recipe` extras survive normal loading. Parts of one semantic object must agree on role/depth. Missing role/depth use `prop`/`middle` for the provider ledger only. Original `semantic_id`/`part_id` are retained and camel-case aliases are added for V4 consumers.
- Right-handed Y-up meters with conversion already applied. No second rotation/scale correction is applied by this adapter.
- Standard glTF material/lighting extensions listed in the source. Compression/instancing and unfamiliar extensions fail closed until a dedicated adapter and tests exist.
- Embedded `bufferView` textures can be loaded in a browser with supported image decoding. The Node tests use untextured scalar PBR fixtures; a Node environment is not a substitute for browser texture/render testing.

Animations, skins, morph targets, sparse accessors, rig/physics requirements, external URIs (including data URIs), and multiple scenes are rejected. Declared geometry is limited to 32 million scalar accessor components, scene graphs to 20,000 nodes/128 levels, and JSON to 200,000 values/128 levels; cyclic or multiply-parented active scene graphs are refused before loading. These constraints make unsupported output explicit instead of silently dropping it. GLB validation here is a bounded import contract, not a complete replacement for the Khronos glTF Validator.

## Actual worker verification

The normal test suite exercises real Three parsing of an asymmetric embedded GLB, size/hash failures, offline resource restrictions, semantic IDs, static shuffled time and resource ownership. It also has an explicitly skipped actual-worker test until paths are supplied:

```bash
LOCAL3D_ACTUAL_GLB=/absolute/path/scene.glb \
LOCAL3D_ACTUAL_MANIFEST=/absolute/path/manifest.json \
npm test
```

On Windows PowerShell set those two environment variables before `npm test`. A passing Node import establishes loader compatibility and finite bounds, not final appearance, V4 renderer parity, or animation/physics support.

