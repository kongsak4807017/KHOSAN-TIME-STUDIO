# KHOSAN Canonical Character Factory

## Decision

Humanoid and character assets are a distinct production class in KHOSAN.

KHOSAN-native characters should be created around a **canonical semantic skeleton and stable character identity**. Generative systems may help interpret references, fit appearance, propose geometry, author textures or repair bounded defects, but they are not the authority for skeleton identity, animation semantics or physics truth.

The primary native-character path is:

~~~text
Reference / Concept / Imported lawful avatar
        |
        v
Visual DNA / Character Intent
        |
        v
KHOSAN Human DNA
        |
        v
Canonical Base Mesh
        |
        v
Canonical Semantic Skeleton
        |
        +-----------------------------+
        |              |              |
        v              v              v
      Body            Face           Hair
        |              |              |
        +--------------+--------------+
                       |
                       v
                   Character
                       |
             +---------+---------+
             |                   |
             v                   v
         Wearable IR         Equipment IR
             |                   |
       cloth / spring        semantic sockets
             +---------+---------+
                       |
                       v
               Animation Library
                       |
                  Retargeting
                       |
              Physics + Animation QA
                       |
                       v
                Character Asset IR
                       |
          +------------+-------------+
          |            |             |
          v            v             v
      Native 3D      2.5D        Sprite Bake
~~~

## Why this exists

A generic 3D asset pipeline is suitable for props, buildings, terrain pieces and many static/limited-animation objects. A reusable game character has additional invariants:

- stable identity across poses and output formats,
- a known semantic skeleton,
- deterministic attachment points,
- reusable animation semantics,
- deformation and skinning constraints,
- clothing/equipment compatibility,
- physics constraints,
- cross-output consistency.

Treating a humanoid as only “mesh → auto-rig → animate” makes identity and compatibility depend too heavily on reconstruction quality and downstream repair.

## Core rule

**AI is a designer/fitter, not the skeleton or animation source of truth.**

For KHOSAN-native characters:

- semantic bones are owned by the Character Factory contract,
- animation states target semantics, not vendor-specific joint names,
- appearance fitting must not silently replace skeleton identity,
- wearables target semantic body regions/bones,
- equipment attaches to semantic sockets,
- physics are validated independently from appearance generation.

## Three asset production classes

### 1. True 2D

Use the 2D pipeline for authored/generated sprites that remain sprite-native.

~~~text
Reference
 -> sprite-gen
 -> curation
 -> deterministic extraction/alignment
 -> Sprite IR
 -> QA
 -> Asset Registry
~~~

### 2. Generic 3D

Use for props, buildings, environment objects, vehicles and other non-character assets.

~~~text
Reference
 -> img2threejs / import
 -> geometry/material normalization
 -> pivots / sockets / colliders / LOD
 -> optimize
 -> QA
 -> Asset Registry
~~~

### 3. Character 3D

Use the Canonical Character Factory for reusable characters.

A single approved master character may produce:

- native WebGPU 3D,
- orthographic/2.5D presentation,
- 8-direction or project-specific sprite bakes,
- inventory previews,
- portraits/cinematic renders,
- VRM/GLB interchange where supported.

Derived outputs must remain traceable to the same master-character version.

## KHOSAN Human DNA

Human DNA is engine-independent semantic data. It is not a copy of a vendor editing format.

Initial contract areas:

~~~yaml
identity:
  character_id: stable-id
  character_version: 1

human_dna:
  body:
    height: normalized
    shoulder_width: normalized
    torso_length: normalized
    hip_width: normalized
  face:
    face_width: normalized
    jaw_width: normalized
    eye_spacing: normalized
    nose_width: normalized
  appearance:
    skin: asset/material reference
    eyes: asset/material reference
    hair: asset reference

skeleton:
  profile: khosan-humanoid
  version: 1
  semantic_bones: []

wearables: []
equipment: []

animation:
  profile: khosan-humanoid
  library_version: 1

validation:
  status: proposed
  evidence: []
~~~

Exact schema belongs in a future typed Character IR contract; this document defines the architectural boundary.

## Canonical semantic skeleton

The canonical skeleton should expose semantic aliases such as:

~~~text
root
hips
spine
chest
upperChest
neck
head
leftUpperArm
leftLowerArm
leftHand
rightUpperArm
rightLowerArm
rightHand
leftUpperLeg
leftLowerLeg
leftFoot
rightUpperLeg
rightLowerLeg
rightFoot
~~~

Projects may extend the profile with:

- fingers,
- face/jaw,
- hair,
- cape,
- tail,
- wing,
- weapon,
- prop,
- effect or project-specific bones.

Extensions must not silently change required base semantics.

## Animation Library

P0 should prioritize a curated, reusable animation library and semantic retargeting before project-specific AI motion generation.

Minimum semantic states for character-capable RPG projects may include:

- idle,
- walk,
- run,
- attack,
- hit,
- death,
- skill,
- sit,
- jump/land when required.

The gameplay layer should request semantics such as `play("walk")`, not raw clip filenames.

## Imported / arbitrary character path

Imported assets are different from native KHOSAN characters.

~~~text
Imported GLB / FBX / VRM / generated mesh
        |
        v
Inspect existing skeleton
        |
        +--------------------------+
        |                          |
   trusted/mappable          missing/untrusted
        |                          |
        v                          v
Semantic bone mapping        Rigging Router
        |                    SkinTokens
        |                         |
        |                    fail/uncertain
        |                         v
        |                    UniRig Expert
        |                          |
        +------------+-------------+
                     v
          KHOSAN semantic profile
                     |
                 Retarget
                     |
                    QA
~~~

SkinTokens and UniRig therefore remain valuable, but are **not the default first step for a KHOSAN-native humanoid**.

## Wearable IR

A wearable is not merely a mesh attached to a character.

It should record:

- compatible character/skeleton profile,
- target body regions,
- bind/skin information,
- material references,
- hide/trim masks for underlying body geometry,
- cloth/spring settings,
- collision proxies,
- LOD/platform variants,
- provenance/license,
- validation evidence.

## Equipment IR

Equipment should use semantic sockets such as:

- rightHand,
- leftHand,
- head,
- back,
- waist,
- projectileOrigin,
- project-specific effect sockets.

A backend adapter maps these semantic sockets to actual target-engine nodes.

## Character QA

A character is not approved only because it has a skeleton.

Required QA evidence should cover applicable checks:

### Rig/deformation
- hierarchy valid and acyclic,
- scale/orientation correct,
- skin weights normalized,
- no catastrophic weight bleeding,
- shoulder/elbow/knee/hip deformation,
- head/hand/foot orientation.

### Animation
- required semantic states resolve,
- loop quality for looped states,
- root-motion policy respected,
- foot contact/slide checks where applicable,
- bounds remain sane,
- animation does not change character identity.

### Wearables/equipment
- body ↔ cloth penetration,
- cloth ↔ cloth penetration,
- weapon ↔ body collision,
- weapon ↔ cloth collision,
- hand ↔ sleeve,
- foot/leg ↔ skirt,
- spring/cloth stability,
- socket orientation.

### Output parity
- native 3D, 2.5D and sprite-baked outputs derive from the same approved master version,
- handedness and asymmetric gear remain correct,
- materials/textures remain traceable.

## Agent routing

Default ownership:

1. **00 Studio Orchestrator** creates the bounded work item.
2. **04 Asset Synthesizer** owns Character Factory generation/fitting and asset manifests.
3. **06 Technical Architect** owns semantic Character/Asset IR contracts.
4. **09 Engine Adapter** maps semantic skeleton/animation/socket data to targets.
5. **10 QA** validates deformation, animation, wearables and output parity.
6. **11 Independent Reviewer** checks evidence before production acceptance.

## P0 implementation sequence

1. Define Character IR / Human DNA schema.
2. Define canonical humanoid skeleton v1 and semantic sockets.
3. Add a minimal reusable animation library contract.
4. Select/evaluate a production retarget implementation behind a KHOSAN adapter.
5. Define Wearable IR + Equipment IR.
6. Build deterministic character QA fixtures.
7. Integrate Character Factory surface into Asset Lab.
8. Add 3D → 2.5D / sprite-bake outputs.
9. Add optional AI motion generation only after semantic retargeting is stable.

## Relationship to existing tools

- `sprite-gen` remains the core true-2D production path.
- `img2threejs` remains the core generic reference→3D path.
- SkinTokens/TokenRig and UniRig remain imported/arbitrary-mesh rigging tools.
- Character Factory, semantic skeleton, Wearable IR, Equipment IR and Character QA are KHOSAN-owned contracts/capabilities.
- Animation retarget implementation remains a tool-selection problem; the semantic retarget contract belongs to KHOSAN.

See also:
- `docs/04-ASSET-PIPELINE.md`
- `docs/16-3D-AUTO-RIGGING.md`
- `docs/03-TOOL-REGISTRY.md`
- `studio/tool-registry.yaml`
- `studio/decisions/ADR-001-CANONICAL-CHARACTER-FACTORY.md`
