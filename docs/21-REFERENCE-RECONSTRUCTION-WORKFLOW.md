# Reference Reconstruction Workflow

## Status

**Canonical KHOSAN Studio workflow**

This workflow governs reference-driven reconstruction for scenes, environments, generic 3D assets and UI surfaces. It converts an approved visual reference into a structured, inspectable and verifiable production artifact rather than relying on repeated open-ended prompting.

Primary rule:

> **Reference first. Compare explicitly. Repair only the failing dimensions. Preserve approved dimensions.**

The workflow is backend-neutral. Oriverse, img2threejs, image-generation systems, procedural tools, DCC software and future reconstruction workers may participate through adapters, but none of them becomes the canonical KHOSAN data model.

## Ownership and routing

- **00 Studio Orchestrator** — creates the bounded reconstruction work item and routes specialists.
- **01 Creative Director** — owns art-direction intent when visual identity is material.
- **04 Asset Synthesizer** — owns reference conditioning, decomposition, reconstruction requests, manifests and Asset IR handoff.
- **08 Rendering Engineer** — owns lighting, material/render parity and rendering-budget constraints.
- **09 Engine Adapter** — owns conversion into KHOSAN Asset IR / UG-IR/runtime representations.
- **10 QA & Playtester** — executes visual and technical acceptance checks.
- **11 Independent Reviewer** — checks that the result satisfies the locked reference contract without maker self-approval.
- **Human Executive Producer** — approves the master reference, material art-direction changes and final asset/scene acceptance.

If the requested change alters the locked Creative Constitution or art constitution materially, return to **HG-01**. If the workflow requires a breaking IR/runtime architecture change, use **HG-02**.

## When to use this workflow

Use for:
- environment and world-scene reconstruction,
- buildings,
- props,
- vehicles,
- set dressing,
- lighting/look-development matching,
- reference-driven UI reconstruction,
- reusable visual layouts,
- reconstruction of non-character generic 3D assets.

Do not use it as the only workflow for:
- canonical reusable humanoid characters,
- complex rigged creatures whose skeleton identity is part of the design,
- true-2D animation production,
- gameplay/system design.

Route those cases as follows:

~~~text
Reference request
  ├─ generic scene / prop / building / UI
  │    → Reference Reconstruction Workflow
  ├─ reusable character
  │    → KHOSAN Character Factory
  └─ true 2D animation / sprite
       → sprite-gen pipeline
~~~

A reusable character may still use this workflow for bounded appearance/reference fitting, but skeleton identity, animation semantics and character physics remain governed by the Character Factory.

---

## 1. Reference package

The workflow starts by creating a **Reference Package**, not by sending a raw image directly to a generator.

Required fields:
- master reference image or board,
- intended output type,
- target platform,
- target camera/view when relevant,
- locked visual invariants,
- flexible regions,
- known dimensions or scale cues when available,
- source/provenance,
- rights/license notes,
- optional secondary views,
- explicit unknown or hidden regions.

Recommended visual invariants:
- composition,
- camera angle,
- apparent focal length / field of view,
- silhouette,
- object proportions,
- object placement,
- major color/value relationships,
- key-light direction,
- shadow softness,
- material family,
- atmosphere/mood.

### Reference quality rule

Prefer references with:
- readable silhouettes,
- visible geometry boundaries,
- clear lighting direction,
- enough contrast to read form,
- limited destructive blur,
- minimal severe occlusion,
- useful ground/horizon cues,
- sufficient resolution.

A 16:9 reference is a useful default for game/cinematic framing, but it is **not a geometry-quality requirement**. Scene readability and perspective evidence are more important than aspect ratio.

---

## 2. Reference conditioning

If the source is concept art, sketch, low-quality imagery or visually ambiguous material, create a conditioned production reference before reconstruction.

Purpose:
- improve geometry readability,
- clarify materials,
- clarify light/shadow structure,
- expose foreground/midground/background separation,
- reduce accidental noise,
- preserve the intended visual identity.

Conditioning must not silently redesign the approved concept.

Record:
- original source,
- conditioned source,
- transformation notes,
- what changed,
- what must remain faithful to the original intent.

The conditioned reference becomes the **Master Reconstruction Reference** only after human/Creative Director approval when the changes are material.

---

## 3. Art-direction lock

Convert the master reference into an explicit **Art Direction Spec**.

Example dimensions:

~~~yaml
camera:
  framing: locked
  elevation: locked
  fov_impression: locked

composition:
  hero_object: shrine
  horizon: upper_third
  foreground_density: medium

lighting:
  key_direction: southwest
  contrast: medium_high
  shadow_softness: soft

materials:
  wood: aged_matte
  metal: weathered_low_gloss
  ground: dry_soil

atmosphere:
  haze: light
  mood: warm_dusk
~~~

This spec prevents later iterations from "improving" already-approved dimensions.

---

## 4. Candidate sampling

For ambiguous or generative stages, produce a small bounded candidate set rather than over-refining a single stochastic result.

Default:
- 2–4 candidates,
- same locked constraints,
- intentionally varied only on declared flexible dimensions.

Human/agent curation selects one **Working Master**.

Do not select candidates using one universal quality score. Compare the dimensions relevant to the task.

---

## 5. Scene / asset decomposition

Before detailed reconstruction, decompose the reference into independently repairable components.

Typical scene decomposition:

~~~text
Scene
  ├─ Camera
  ├─ Terrain / ground
  ├─ Architecture
  │    ├─ Building A
  │    └─ Building B
  ├─ Hero props
  ├─ Secondary props
  ├─ Vegetation
  ├─ Background
  ├─ Atmosphere
  └─ Lighting
~~~

For UI:

~~~text
UI Reference
  ├─ Layout grid
  ├─ Navigation
  ├─ Typography
  ├─ Components
  ├─ Spacing
  ├─ Color tokens
  ├─ States
  └─ Interaction behavior
~~~

Decomposition exists so one repair does not unnecessarily regenerate unrelated approved regions.

---

## 6. Blockout / first reconstruction pass

The first reconstruction pass optimizes for:
- camera,
- major masses,
- silhouette,
- scale relationships,
- object placement,
- spatial readability.

Do **not** spend detail budget before the blockout matches.

Generic 3D path may use img2threejs or another structured reconstruction worker.

World-scene path may use Oriverse or another scene-building worker through a KHOSAN adapter.

UI path should produce editable components/tokens rather than a flattened screenshot.

Output state:

**BLOCKOUT**

---

## 7. Reference comparison

Every iteration after blockout must compare **Reference vs Current** explicitly.

Minimum comparison vector:

~~~text
Camera / framing
Composition
Silhouette
Proportions
Object placement
Lighting direction
Exposure / value structure
Shadow character
Material family
Roughness / reflectance
Atmosphere
Detail density
Technical budget
~~~

Optional machine-assisted evidence may include:
- image overlay,
- edge/silhouette difference,
- perceptual similarity,
- depth difference when reference depth exists,
- histogram/value comparison,
- object-bounding-box alignment,
- camera transform comparison.

Machine similarity is evidence, not final creative authority.

### No fake "100% exact" rule

Do not claim 100% geometric fidelity from a single image.

Hidden surfaces, occluded structures and unobserved depth must be marked as:
- reference-grounded,
- inferred,
- unresolved,
- user-specified.

Example:

~~~text
Front facade: reference-grounded
Left side: partially inferred
Rear geometry: inferred
Interior: unresolved
~~~

---

## 8. Diagnose before repair

Classify every meaningful mismatch before changing the scene.

Mismatch classes:
- CAMERA
- COMPOSITION
- GEOMETRY
- SCALE
- MATERIAL
- LIGHTING
- ATMOSPHERE
- DETAIL
- UI_LAYOUT
- UI_STYLE
- TECHNICAL
- UNKNOWN

A repair request must name:
1. what is wrong,
2. where it is wrong,
3. what must change,
4. what must remain locked.

Example:

~~~text
Problem: roof silhouette is 18–25% too tall relative to facade.
Repair: reduce roof height and preserve facade width.
Locked: camera, window placement, lighting and materials.
~~~

This is preferred over:

> Keep refining until it is exactly like the reference.

---

## 9. Targeted repair loop

Canonical loop:

~~~text
BUILD
  ↓
COMPARE
  ↓
DIAGNOSE
  ↓
PATCH ONLY FAILING DIMENSIONS
  ↓
VERIFY LOCKED DIMENSIONS DID NOT REGRESS
  ↓
PASS / REWORK
~~~

The loop continues until all required acceptance dimensions pass or the task is escalated because:
- reference evidence is insufficient,
- constraints conflict,
- the tool cannot reproduce the required feature,
- the remaining mismatch requires human art-direction judgment,
- a requested change would break a locked invariant.

### Spatial annotation

The Studio should support region-based correction:

~~~text
[1] roof: too tall
[2] tree cluster: remove
[3] foreground grass: denser
[4] shadow: wrong direction
~~~

A selected annotation should become a bounded repair instruction.

---

## 10. Detail, materials and lighting pass

After camera/composition/geometry are accepted:

### Geometry detail
- bevels,
- trim,
- construction logic,
- surface breakup,
- occlusion detail,
- non-destructive secondary geometry.

### Material pass
- base color/albedo,
- roughness,
- metallic,
- normal,
- AO where appropriate,
- texture scale,
- wear/noise,
- reflection behavior.

### Lighting pass
- key direction,
- fill/bounce,
- shadow softness,
- exposure,
- contrast,
- environment light,
- fog/haze,
- reflection probes/environment contribution where applicable.

Rendering changes must preserve the target performance budget.

---

## 11. Technical normalization

A visually matched scene is not yet a production asset.

Normalize:
- coordinate system,
- scale,
- origins/pivots,
- hierarchy,
- stable IDs,
- materials,
- texture references,
- colliders,
- sockets,
- LOD,
- mesh/texture budgets,
- platform variants,
- provenance,
- uncertainty metadata.

Then convert into:
- KHOSAN Asset IR,
- UG-IR entities/components where applicable,
- runtime adapter representation.

---

## 12. QA and independent review

### Visual QA

QA checks each required dimension independently.

Example:

~~~yaml
visual_qa:
  camera: pass
  composition: pass
  silhouette: pass
  proportions: pass
  lighting: pass
  material_family: pass
  atmosphere: pass
  detail_density: warning
~~~

### Technical QA

Check:
- missing assets/textures,
- invalid transforms,
- scale/origin,
- material validity,
- collider/socket requirements,
- LOD behavior,
- draw-call/triangle/texture budget,
- target-platform compatibility,
- deterministic re-open/rebuild where required.

### Independent review

The maker does not approve its own result.

Reviewer checks:
- reference contract,
- regression of locked dimensions,
- hidden/inferred geometry disclosure,
- provenance,
- evidence completeness.

---

## 13. Human approval and freeze

When the reconstruction passes verification, present:

- master reference,
- current result,
- unresolved/inferred regions,
- QA evidence,
- performance evidence,
- known deviations.

Human actions:
- **Approve**
- **Approve with known deviation**
- **Request bounded repair**
- **Reject / return to reference selection**

Approved dimensions become frozen unless a new change work item explicitly reopens them.

Final state:

**APPROVED / FROZEN**

---

## 14. Canonical state machine

~~~text
DRAFT
  ↓
REFERENCE_SELECTED
  ↓
REFERENCE_CONDITIONED
  ↓
REFERENCE_LOCKED
  ↓
DECOMPOSED
  ↓
BLOCKOUT
  ↓
GEOMETRY_MATCH
  ↓
MATERIAL_MATCH
  ↓
LIGHTING_MATCH
  ↓
DETAIL_PASS
  ↓
TECHNICAL_QA
  ↓
INDEPENDENT_REVIEW
  ↓
HUMAN_APPROVED
  ↓
FROZEN
~~~

Rework returns to the defect-origin state, not automatically to DRAFT.

---

## 15. Reconstruction manifest

Each accepted reconstruction should persist a manifest similar to:

~~~yaml
reconstruction:
  id: RR-001
  source_reference: refs/village-master.png
  conditioned_reference: refs/village-master-conditioned.png
  output_type: scene

locked:
  camera: true
  composition: true
  lighting_direction: true

components:
  - id: house_01
    evidence: reference_grounded
  - id: rear_wall
    evidence: inferred

validation:
  visual: pass
  technical: pass
  independent_review: pass

known_deviations:
  - rear facade is inferred from a single-view reference

lineage:
  source_hash: ...
  candidate_id: candidate-b
  asset_ir_version: ...
~~~

This manifest travels with the Asset Registry entry.

---

## 16. UI requirement for KHOSAN Studio

The eventual Studio UI should expose this workflow through a **Reference Reconstruction workspace**:

~~~text
Reference | Current | Difference / Annotations
-----------------------------------------------
[ master ] [ scene ] [ numbered problems ]

State: GEOMETRY_MATCH

Camera       PASS
Composition  PASS
Geometry     FAIL
Lighting     LOCKED
Materials    LOCKED

Selected issue:
#03 Roof silhouette too tall

[ Repair selected ]
[ Compare again ]
[ Submit to QA ]
~~~

The creator should not need to manually issue the underlying tool commands.

---

## 17. Core invariants

1. Reference and provenance are always preserved.
2. Approved dimensions are locked against accidental regression.
3. Open-ended "refine everything" loops are not the default after first pass.
4. One mismatch class should produce one bounded repair when practical.
5. Generative stages are followed by deterministic normalization/verification.
6. Hidden geometry uncertainty is recorded, never disguised as reference truth.
7. Generic scene reconstruction does not replace the Character Factory.
8. Backend tools are replaceable; KHOSAN Asset IR / UG-IR remain canonical.
9. Maker/checker separation is mandatory before Done.
10. **No evidence → No Done.**

## Related documents

- `docs/02-CREATE-GAME-WORKFLOW.md`
- `docs/04-ASSET-PIPELINE.md`
- `docs/20-CHARACTER-FACTORY.md`
- `studio/graph.md`
- `studio/human-gates.md`
- `studio/tool-registry.yaml`
