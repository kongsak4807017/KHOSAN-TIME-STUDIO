# Asset Pipeline

## Principle

A generated file is not automatically a game asset.

Every asset moves through:
**source → generation/reconstruction → curation → normalization → optimization → validation → registry → runtime adapter**

## 2D pipeline

```text
Reference still
 → sprite-gen prepare/generate
 → transparent extraction
 → frame alignment
 → motion inspection
 → human curation when needed
 → atlas composition
 → manifest/frame layout
 → KHOSAN Sprite Adapter
 → Asset IR
 → QA
 → Asset Registry
```

The gameplay layer consumes semantic animation states such as:
- idle,
- walk,
- run,
- attack,
- hit,
- death,
- skill,

not raw sheet coordinates.

Direction handling must preserve handedness/asymmetry. Mirroring is not automatically safe for weapons, shields, eye patches or asymmetric armor.

## 3D pipeline

```text
Reference image(s)
 → img2threejs reconstruction
 → structured/procedural model
 → inspect inferred/uncertain surfaces
 → Asset IR normalization
 → PBR/material authoring
 → rig/skin if animated
 → animation retarget if needed
 → glTF processing
 → mesh optimization
 → KTX2 texture compression
 → collider/socket/LOD validation
 → QA
 → Asset Registry
```

Three.js is a useful source/runtime representation but is not the canonical KHOSAN asset model.

## Required Asset IR metadata

At minimum:
- stable asset ID,
- asset type,
- source/provenance,
- license/rights metadata,
- geometry/sprite reference,
- materials,
- hierarchy,
- pivot/origin,
- sockets/attachment points,
- colliders if applicable,
- animations,
- LOD,
- platform variants,
- dimensions/scale convention,
- uncertainty/confidence metadata for generated/inferred content,
- validation status,
- hashes/version.

## Curation

Subjective or generative defects must be reviewable without destructive regeneration.

The Studio Asset Inspector should support:
- compare reference/candidate,
- reject/regenerate one state,
- frame selection,
- animation preview,
- scale/origin inspection,
- material preview,
- collider visualization,
- LOD preview,
- approval.

## QA

2D:
- alpha correctness,
- frame count,
- identity drift,
- direction,
- loop,
- duplicate frames,
- anchor/centroid stability,
- foot contact where applicable.

3D:
- topology/format validation,
- coordinate/scale,
- material channel validity,
- missing textures,
- socket/pivot correctness,
- collider correctness,
- rig/skin integrity,
- animation bounds,
- LOD,
- draw/triangle/texture budgets,
- platform compatibility.
