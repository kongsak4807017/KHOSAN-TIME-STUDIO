# Asset Pipeline

## Principle

A generated file is not automatically a game asset.

Every asset moves through:
**source → generation/reconstruction/fitting → curation → normalization → optimization → validation → registry → runtime adapter**

KHOSAN distinguishes three primary production classes because a reusable character has stronger invariants than a generic 3D mesh.

## Reference-driven reconstruction layer

When a scene, generic 3D asset or UI surface must match a visual reference, use the canonical **Reference Reconstruction Workflow** before final Asset IR registration.

Core loop:

~~~text
Reference Package
 → Reference Conditioning
 → Art-Direction Lock
 → Decomposition
 → Blockout
 → Reference Compare
 → Diagnose
 → Targeted Repair
 → Detail / Material / Lighting
 → Technical Normalization
 → QA + Independent Review
 → Human Approval / Freeze
 → Asset IR / UG-IR
~~~

Approved dimensions are locked against accidental regression. Hidden or occluded geometry must retain uncertainty metadata rather than being presented as reference-grounded truth. Open-ended “refine everything” prompting is not the default after the first pass.

See `docs/21-REFERENCE-RECONSTRUCTION-WORKFLOW.md`.

## 1. True 2D pipeline

~~~text
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
~~~

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

## 2. Generic 3D pipeline

Use for props, buildings, environment objects, vehicles and other assets that do not require the full reusable-character contract.

~~~text
Reference image(s) / imported model
 → img2threejs reconstruction or import
 → inspect inferred/uncertain surfaces
 → geometry/material normalization
 → pivots / sockets / colliders / LOD
 → glTF processing
 → mesh optimization
 → KTX2 texture compression
 → QA
 → Asset Registry
~~~

If a generic asset is animated, rig/skin/retarget may be added, but that does not automatically make it a KHOSAN canonical character.

Three.js is a useful source/runtime representation but is not the canonical KHOSAN asset model.

## 3. Character 3D pipeline

Reusable characters use the **KHOSAN Canonical Character Factory**.

~~~text
Reference / Concept
 → Visual DNA / Human DNA
 → Canonical Base Mesh
 → Canonical Semantic Skeleton
 → body / face / hair fitting
 → Wearable IR / Equipment IR
 → Animation Library
 → semantic retargeting
 → cloth/spring/character physics
 → deformation / animation / collision QA
 → Character Asset IR
 → Asset Registry
 → Native 3D / 2.5D / Sprite Bake
~~~

Core rule:

**AI may design or fit appearance; it does not silently redefine skeleton identity or animation semantics.**

For imported/arbitrary character meshes:

~~~text
Imported mesh
 → inspect existing skeleton
 → semantic mapping when trusted
 → otherwise SkinTokens / UniRig rigging path
 → semantic profile normalization
 → retarget
 → Character QA
 → Asset Registry
~~~

See `docs/20-CHARACTER-FACTORY.md` and `docs/16-3D-AUTO-RIGGING.md`.

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

For characters additionally record:
- character/master version,
- skeleton profile/version,
- semantic bone mapping,
- animation profile/library version,
- wearable/equipment compatibility,
- character physics profile,
- deformation/collision QA evidence,
- derived-output lineage.

## Curation

Subjective or generative defects must be reviewable without destructive regeneration.

The Studio Asset Inspector should support:
- compare reference/candidate,
- reject/regenerate one state or bounded component,
- frame selection,
- animation preview,
- scale/origin inspection,
- material preview,
- collider visualization,
- skeleton/socket visualization for characters,
- wearable/equipment compatibility preview,
- LOD preview,
- approval.

## QA

### 2D
- alpha correctness,
- frame count,
- identity drift,
- direction,
- loop,
- duplicate frames,
- anchor/centroid stability,
- foot contact where applicable.

### Generic 3D
- topology/format validation,
- coordinate/scale,
- material channel validity,
- missing textures,
- socket/pivot correctness,
- collider correctness,
- rig/skin integrity when animated,
- animation bounds when animated,
- LOD,
- draw/triangle/texture budgets,
- platform compatibility.

### Character
- canonical/semantic skeleton compatibility,
- bind/rest transform sanity,
- skin-weight integrity,
- representative joint deformation,
- required animation-state resolution,
- loop/root-motion/contact checks as applicable,
- body ↔ cloth penetration,
- cloth ↔ cloth penetration,
- weapon ↔ body/cloth collision,
- hand/foot ↔ garment collision,
- spring/cloth stability,
- socket orientation,
- handedness/asymmetric gear,
- output parity across 3D/2.5D/sprite-baked variants.
