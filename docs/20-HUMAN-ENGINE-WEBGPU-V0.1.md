# KHOSAN Human Engine v0.1 — WebGPU Parametric Character Foundation

Status: **implementation / verify**

Owner roles:
- `06-technical-architect` — canonical contracts and deformation architecture
- `08-rendering-engineer` — Native WebGPU renderer/compute
- `04-asset-synthesizer` — future canonical human/garment authoring integration
- `10-qa-playtester` + `11-independent-reviewer` — acceptance

## What v0.1 implements

The Studio now contains a **Human Lab** with a stable `khosan.human-dna` contract.

Current controls:
- body: height, shoulders, chest, waist, hips, muscle, leg ratio, arm ratio
- face: width, jaw, nose, lips, eye size, eye spacing, brow height, chin
- appearance: skin, eye and hair colors; hair style; brow thickness; mole; tattoo
- lighting/camera: key, rim, zoom and drag-to-orbit
- constrained random variation
- durable browser-local DNA state and JSON export

The live preview is rendered by **Native WebGPU** without Three.js, Babylon.js, Unity or Unreal.

## Runtime architecture

```text
Human Lab semantic controls
        |
        v
khosan.human-dna v1
        |
        +--------------------------+
        |                          |
        v                          v
Procedural WebGPU Preview     Canonical Mesh Backend
(SDF/reference backend)       (production path)
                                   |
                             morph basis bank
                                   |
                             corrective weights
                                   |
                         WebGPU compute morph+skin
                                   |
                           deformed vertex buffer
                                   |
                            PBR render passes
```

The procedural preview is intentionally separated from the canonical-mesh contract. It proves:
- the creator UX,
- semantic DNA persistence,
- Native WebGPU parameter binding,
- GPU lighting/material response,
- eyes/hair/brow/detail layers,
- deterministic rendering.

It is **not** claimed to be the final anatomical model.

## Character DNA contract

Implemented in:

`apps/studio-web/public/human-dna.js`

The DNA stores semantic parameters rather than arbitrary vertex offsets. A future statistical/scan-derived canonical human can map the same DNA to learned morph coefficients without changing saved creator data.

Example:

```json
{
  "schema": "khosan.human-dna",
  "version": 1,
  "body": {
    "height": 0.52,
    "shoulders": 0.52,
    "chest": 0.48,
    "waist": 0.45,
    "hips": 0.50,
    "muscle": 0.35,
    "legRatio": 0.54,
    "armRatio": 0.50
  },
  "face": {
    "width": 0.50,
    "jaw": 0.46,
    "nose": 0.50,
    "lips": 0.48,
    "eyeSize": 0.52,
    "eyeSpacing": 0.50,
    "browHeight": 0.50,
    "chin": 0.48
  }
}
```

## Canonical mesh compute kernel

Implemented in:

`apps/studio-web/public/human-morph-skin.wgsl`

The kernel performs:

```text
canonical position/normal
        +
dense morph bank * coefficients
        |
        v
morphed vertex
        |
        + 4 joint indices
        + normalized skin weights
        + joint skin matrices
        |
        v
WebGPU compute LBS
        |
        v
deformed position/normal buffer
```

The host can append corrective morph coefficients to the same morph bank. This lets the first implementation remain deterministic while later optimization can compact only active morphs.

### Buffer contract

- binding 0 — canonical vertices
- binding 1 — morph deltas
- binding 2 — morph weights
- binding 3 — joint skin matrices
- binding 4 — output deformed vertices
- binding 5 — dispatch parameters

The production character renderer should compute deformation once and reuse the resulting vertex buffer across depth, shadow and material passes where beneficial.

## Precision strategy

KHOSAN should not ask generative AI to invent final vertex positions every frame.

Production accuracy should come from:

1. canonical topology,
2. calibrated semantic parameter mapping,
3. statistical or authored morph bases,
4. anatomical constraints,
5. pose-dependent corrective morphs,
6. normalized skin weights,
7. deterministic WebGPU compute,
8. deformation QA.

AI is best used for:
- landmark detection,
- fitting DNA/morph coefficients from references,
- auto-rigging suggestions,
- garment correspondence,
- skin-weight prediction,
- texture/material estimation,
- visual QA.

The published runtime remains deterministic after asset approval.

## Garment integration contract — next implementation

A wearable should target the same canonical skeleton and deformation space.

Planned wearable metadata:

```yaml
type: wearable
skeleton: KHOSAN_HUMANOID_V1
body_space: KHOSAN_HUMAN_V1
fit:
  method: surface_wrap
body_mask:
  chest: true
physics:
  dynamic_regions:
    - hem
```

The intended pipeline is:

```text
garment mesh
 -> canonical-body correspondence
 -> weight transfer
 -> body-morph transfer
 -> collision/SDF correction
 -> pose test
 -> LOD/mesh optimization
 -> Asset Registry
```

## Current limitations

v0.1 does **not** claim:
- scan-accurate anatomy,
- production hair strands/cards,
- facial animation/FACS coverage,
- cloth simulation,
- garment auto-fitting,
- canonical production human mesh,
- motion retargeting,
- mobile performance acceptance.

Those require fixture-based implementation and QA.

## Run

From the repository root:

```bash
npm run studio
```

Open:

`http://127.0.0.1:8080`

Then select **Human Lab**.

A WebGPU-capable browser/device is required for the live viewport.

## Acceptance evidence required

Before `HUMAN-001` is accepted:

1. `node scripts/verify-source.mjs`
2. `node --check apps/studio-web/public/app.js`
3. `node --check apps/studio-web/public/human-dna.js`
4. `node --check apps/studio-web/public/human-webgpu.js`
5. `node --check apps/studio-web/public/human-lab.js`
6. browser load on a WebGPU-capable desktop GPU
7. shader compilation returns no WGSL errors
8. every slider updates preview without console errors
9. exported DNA re-loads to the same semantic state
10. independent review of compute-buffer contract

Until that evidence exists, status remains **verify**, not accepted.
