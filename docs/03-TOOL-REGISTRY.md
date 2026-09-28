# KHOSAN Studio Tool Registry

## Decision categories

- **ADOPT** — part of the intended core production path.
- **EVALUATE** — strong candidate; must pass technical/license/integration evaluation.
- **TO-FIND** — missing capability; find candidates.
- **OPTIONAL** — plugin for specific project types.
- **BUILD-KHOSAN** — Studio-specific component should be authored in-house.
- **REJECT/DUPLICATE** — do not add unless it materially beats an adopted tool.

## Current registry

| Domain | Tool/capability | Status | Studio owner | Purpose |
|---|---|---:|---|---|
| Harness | KHOSAN agent harness | ADOPT | Orchestrator | state, routing, verification, human gates |
| Harness reference | learn-harness-engineering | ADOPT/reference | Orchestrator | harness/loop/graph engineering patterns |
| 2D assets | sprite-gen | ADOPT | Asset Synthesizer | sprite atlas, animation loops, manifests, curation, QA |
| 3D assets | img2threejs | ADOPT | Asset Synthesizer | reference → structured/procedural 3D |
| 3D DCC / editable master | Blender | ADOPT CORE | Asset Synthesizer | modeling, UV, rig refinement, shape keys, animation, constraints, QA render, GLB export |
| Physics | Rapier | EVALUATE P0 | Gameplay/Architect | rigid bodies, colliders, queries, joints |
| Navigation | Recast + Detour | EVALUATE P0 | Gameplay/Architect | navmesh, pathfinding, crowds |
| glTF processing | glTF Transform | EVALUATE P0 | Asset/Adapter | validate/process/dedup/simplify pipeline |
| Mesh optimization | meshoptimizer | EVALUATE P0 | Asset/Rendering | mesh simplification/optimization/compression |
| Texture compression | Basis Universal / KTX2 | EVALUATE P0 | Rendering | GPU texture delivery |
| PBR authoring | Material Maker | EVALUATE P0 | Asset/Rendering | procedural PBR materials |
| Generative workflows | ComfyUI | EVALUATE P0 | Asset | extensible image/material/media workflows |
| 3D auto-rigging | SkinTokens / UniRig | EVALUATE P0 | Asset | generated skeleton/skin; Blender is the core DCC for inspection/refinement |
| Animation retarget | production retarget tool | TO-FIND P0 | Asset/Adapter | reuse motion across skeletons |
| Node editor | Rete.js | EVALUATE P0 | Studio Shell | logic/quest/audio/shader graph UI foundation |
| Dialogue | Yarn Spinner | EVALUATE P0 | Narrative | dialogue and command runtime |
| Audio runtime | Web Audio + Tone.js | EVALUATE P0 | Audio | playback, timing, mixing, adaptive layers |
| Audio generation | license-safe SFX/music tool | TO-FIND P1 | Audio | generative SFX/music/ambience |
| Browser QA | Playwright | EVALUATE P0 | QA | E2E, screenshots, automated play flow |
| Asset storage | Git LFS | EVALUATE P0 | Release/Ops | large binary versioning |
| World Editor | KHOSAN World Editor | BUILD-KHOSAN P0 | Studio Shell | author UG-IR world directly |
| Asset Registry | KHOSAN Asset Registry | BUILD-KHOSAN P0 | Studio Shell | canonical asset identity/provenance |
| UI/HUD Editor | KHOSAN UI IR + editor | BUILD-KHOSAN P0 | Studio Shell | HUD/inventory/dialogue UI |
| Save system | KHOSAN Save IR | BUILD-KHOSAN P1 | Gameplay | versioned save semantics |
| Multiplayer | Nakama / Colyseus adapters | OPTIONAL P1 | Network | online authoritative services |
| Localization | Weblate or equivalent | OPTIONAL P1 | Narrative/Release | translation workflow |
| Voice/TTS | project-specific | TO-FIND P1 | Audio/Narrative | voices and localization |
| Mocap/video→motion | project-specific | TO-FIND P1 | Asset | motion acquisition |

## Core asset pipeline target

```text
                         ASSET LAB
             +---------------+---------------+
             |                               |
             v                               v
       2D Production                   3D Production
         sprite-gen                       sources
             |                  img2threejs / import / generate
             |                               |
             |                               v
             |                        Blender Master Asset
             |                     (.blend editable source)
             |                               |
             |                 rig / skin / morph / animation
             |                    SkinTokens / UniRig + DCC
             |                               |
             +---------------+---------------+
                             v
                      KHOSAN Asset IR
                             |
                 optimize / compress / validate
                             |
                             v
                       Asset Registry
                             |
                             v
                           UG-IR
```

For 3D character assets, `.blend` is the editable DCC master and `.glb` is a derived runtime artifact. Asset IR / UG-IR remain canonical above Blender-specific representation.

## Acquisition rule

Do not collect repositories merely because they look impressive.

A candidate must answer:
1. Which missing capability does it own?
2. Does it duplicate an adopted tool?
3. Is output machine-readable and automatable?
4. Can it run locally/headless?
5. Is the license compatible?
6. Can results be deterministically validated?
7. Can it be wrapped behind a KHOSAN adapter?
8. What is the fallback if it disappears?

Record every final choice in `studio/tool-registry.yaml` and an ADR when architectural.
