# Blender Character Asset Pipeline — Conversational, Editable, Engine-Neutral

**Status:** architecture adopted; local Blender fixture verification pending  
**Date:** 2026-09-29  
**Primary owner:** `04-asset-synthesizer`

## Executive summary

KHOSAN will use **ChatGPT as the conversational Studio Orchestrator, DevSpace as the execution workspace, GitHub as durable state, Blender as the core editable 3D DCC, and Asset IR / UG-IR as the engine-neutral contract**.

The target creator experience is intentionally simple:

```text
Creator
  |
  v
ChatGPT
"Make the shoulders a little broader, keep the face and outfit,
fix the glasses to the head, and make the hair/skirt ready for secondary motion."
  |
  v
bounded semantic asset edit
  |
  v
DevSpace
  |
  v
Blender headless / bpy
  |
  +--> editable .blend master
  |
  +--> runtime .glb
  |
  v
validation / visual QA / Asset Registry
  |
  v
UG-IR -> WebGPU / Godot / Unity
```

KHOSAN does **not** need to recreate Blender, nor does it need to embed a separate expensive LLM runtime in the Studio just to obtain conversational editing.

---

## Public Spawn benchmark: what is verified

Spawn is a useful product benchmark because it demonstrates a creator-facing loop in which a user talks to Savi while editing a live game. The following points are supported by Spawn's own public release notes:

1. **Blender 5 production tooling**  
   Spawn Engine v5.2.3 (2026-07-15) says Savi can build game assets in Blender 5, including scattering, fracturing, tree generators and UV cleanup, and can inspect her own renders before art lands in the game.  
   Source: https://www.spawn.co/about/release-5-2-3

2. **Shape-key facial behavior**  
   Spawn Engine v5.2.36 (2026-08-29) says models with shape keys can blink and smile.  
   Source: https://www.spawn.co/about

3. **Sockets / model-part attachment and secondary motion**  
   Spawn Engine v5.0.9 documents attachment sockets on model parts and `jiggle` behavior for objects / characters with suitable dangling bones such as tails and ears.  
   Source: https://www.spawn.co/about/release-5-0-9

4. **Head/gaze IK**  
   Spawn Engine v5.2.11 documents head IK targeting via authored angles without the creator doing bone math manually.  
   Source: https://www.spawn.co/about/release-5-2-11

5. **Motion authored as code + motion inspection**  
   Spawn Engine v5.1.11 says Savi can author motion code for new character motions and inspect short filmstrips to judge sliding, jump feel and attack timing.  
   Source: https://www.spawn.co/s/release-5-1-11

These facts show that a strong conversational game-creation UX can sit above a collection of specialist 3D/runtime tools.

### What is *not* verified

KHOSAN must not claim knowledge of Spawn's private implementation where Spawn has not published it. In particular, public evidence does not establish, for every asset/request:

- which image-to-3D model or vendor produced the starting mesh,
- the exact topology/remesh stack,
- the exact automatic rigging provider,
- whether Blender is used for every 3D edit,
- whether Spawn performs anatomical muscle simulation,
- which corrective deformation technique is used on a specific character,
- the full internal orchestration graph.

Therefore the KHOSAN design below is **our architecture inspired by observed product capabilities**, not a reverse-engineered claim about Spawn internals.

---

## Core KHOSAN principle: an asset is not just a mesh

A production character must be represented as an editable system:

```text
Character Asset
|
+-- provenance / reference images
+-- geometry
+-- materials / textures / PBR
+-- skeleton
|   +-- semantic bone aliases
|   +-- bind/rest transforms
|
+-- skin weights
+-- shape keys / morph targets
|   +-- face
|   +-- corrective deformation
|
+-- animation clips
+-- procedural motion metadata
+-- IK metadata
+-- sockets / attachments
+-- secondary-motion tags
+-- colliders
+-- LOD
+-- runtime/export profile
+-- validation / uncertainty metadata
```

A user request should edit the smallest appropriate semantic component instead of regenerating the full character whenever possible.

---

## Source-of-truth layers

KHOSAN uses three distinct layers.

### 1. Asset IR / UG-IR — canonical semantics

This records what the asset *means*: identity, components, skeleton semantics, sockets, animations, morph semantics, runtime requirements, provenance and validation.

It must remain engine-neutral.

### 2. `.blend` — editable DCC master

For 3D character production, Blender is the durable authoring representation used for:

- geometry and topology refinement,
- UV cleanup,
- materials,
- armatures,
- weight painting,
- shape keys,
- corrective shapes,
- constraints and drivers,
- animation/NLA,
- sockets and attachment helpers,
- Geometry Nodes,
- deterministic render/inspection,
- GLB export.

A `.blend` file is not the game-semantic schema; it is the editable professional production master.

### 3. `.glb` — runtime artifact

GLB is a derived artifact for validation, optimization and engine adapters. It should be reproducible from the approved master plus export profile.

---

## Tool routing

```text
Reference / Imported Asset
        |
        +----------------------+
        |                      |
        v                      v
   sprite-gen             img2threejs / other approved 3D source
    (2D lane)                    |
                                 v
                         Blender Master Asset
                                 |
              +------------------+------------------+
              |                  |                  |
              v                  v                  v
        Rig generation       Face/morphs       Animation / sockets
        SkinTokens/UniRig    shape keys        constraints / drivers
              |                  |                  |
              +------------------+------------------+
                                 |
                                 v
                         Blender QA render
                                 |
                                 v
                              GLB
                                 |
                  optimize / validate / compress
                                 |
                                 v
                         KHOSAN Asset IR
                                 |
                                 v
                           Asset Registry
                                 |
                         UG-IR target adapters
```

SkinTokens/UniRig and Blender are not competitors in this architecture. Auto-riggers may generate a starting skeleton/weights; Blender remains the DCC where the result is inspected, refined and maintained.

---

## Conversation-to-edit compilation

ChatGPT should translate creator language into a bounded work item and, where the edit is representable safely, into a versioned JSON job.

Example creator request:

> Keep Ploy's face and clothes. Make the smile subtler. Keep the glasses attached to the head. Mark hair and skirt bones for secondary-motion work.

Possible semantic operations:

```json
{
  "schema_version": 1,
  "asset_id": "character.ploy",
  "operations": [
    {
      "type": "set_shape_key_value",
      "object": "Body",
      "key": "Smile",
      "value": 0.15
    },
    {
      "type": "parent_object_to_bone",
      "object": "Glasses",
      "armature": "Armature",
      "bone": "Head",
      "keep_world": true
    },
    {
      "type": "set_custom_property",
      "target_type": "bone",
      "target": "Hair_01",
      "armature": "Armature",
      "property": "khosan.secondary_motion",
      "value": "hair"
    }
  ]
}
```

The adapter intentionally supports only allowlisted operations. It does **not** execute arbitrary Python supplied by a job.

### Unsupported requests must route, not fake

A request such as:

> Increase the deltoid volume by 12% while preserving clothes and shoulder deformation.

is only directly editable when the master asset has an appropriate semantic shape key, Geometry Nodes control, rig driver or other validated mechanism.

If no such control exists, KHOSAN must create a modeling/sculpt/corrective-shape work item. It must not silently reinterpret a percentage as uniform scale or claim that ordinary skinning is muscle simulation.

---

## Rigging, face and deformation

### Skeleton / skinning

Auto-rig generation remains governed by `docs/16-3D-AUTO-RIGGING.md`.

Expected path:

```text
mesh
 -> auto-rig candidate
 -> skeleton inspection
 -> skinning validation
 -> Blender master
 -> deformation QA
```

### Face

Preferred interoperable character representation:

```text
body pose         -> skeleton / skinning
facial expression -> shape keys / morph targets
look direction    -> IK / bone controls
```

The exact set of facial controls is asset-specific. The pipeline must inspect and record available morph names rather than assume a universal list.

### Corrective / muscle-like deformation

KHOSAN distinguishes:

1. ordinary skinning,
2. pose-space corrective shape keys,
3. driver-controlled morphs,
4. dedicated soft-tissue/muscle simulation.

Only evidence-backed capabilities should be recorded in Asset IR.

### Secondary motion

Hair, skirt, tail, ear and accessory motion should be expressed as semantic tags/contracts that a runtime backend can map to its implementation. Blender may author/preview these relationships, but runtime physics behavior remains backend-specific.

---

## Blender headless adapter

Initial adapter path:

```text
tools/adapters/blender/
  doctor.py
  job.py
  run_job.py
  blender_worker.py
  examples/
  tests/
```

Blender officially supports background Python execution:

```bash
blender --background --python script.py
```

The KHOSAN runner wraps that mechanism behind a stable job contract.

### Security rule

The conversational layer may generate **data**, not arbitrary executable Blender Python.

Allowed jobs are parsed and validated first. The Blender worker maps each operation type to a hard-coded implementation. New powerful operations require code review and versioned contract changes.

---

## Cost architecture

KHOSAN intentionally keeps the expensive intelligence layer thin:

```text
ChatGPT
  = conversation, reasoning, task/intent compilation

DevSpace
  = file/code/tool execution, tests, Blender invocation

GitHub
  = durable architecture, tasks, code, evidence, version history

Blender + deterministic tools
  = production work

KHOSAN runtime
  = preview/play/engine behavior
```

Do not call an LLM for deterministic tasks such as export, file conversion, validation, packing, optimization, hashing or test execution.

---

## Production acceptance gate

A character is not accepted merely because a GLB exists.

Minimum evidence for the Blender lane:

1. input/master provenance recorded,
2. `.blend` opens successfully,
3. skeleton hierarchy is valid when present,
4. skin weights and deformation are visually inspected,
5. required morphs exist and are named,
6. sockets/attachments resolve,
7. materials/textures survive export,
8. GLB validates,
9. representative animations play,
10. runtime backend renders it,
11. asset size/performance budget is recorded,
12. changes are traceable to a task/job,
13. QA and Independent Reviewer sign off.

## Current limitation

The adapter committed with `TASK-ASSET-BLENDER-001` is an initial safe automation scaffold. It is **not** a complete conversational sculpting, autorigging, facial-rig or muscle-simulation system. Those capabilities are composed from specialized tools and asset-specific controls and require their own evidence.
