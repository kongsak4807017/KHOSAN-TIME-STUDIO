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
| Character factory | KHOSAN Character Factory | BUILD-KHOSAN P0 | Asset/Architect | canonical reusable-character production path |
| Character skeleton | KHOSAN Canonical Humanoid Skeleton | BUILD-KHOSAN P0 | Architect/Asset | semantic bones, sockets and versioned skeleton profile |
| Character animation | KHOSAN Animation Library | BUILD-KHOSAN P0 | Asset/Adapter | reusable semantic motion library |
| Wearables | KHOSAN Wearable + Equipment IR | BUILD-KHOSAN P0 | Asset/Architect | modular clothing, gear, sockets and compatibility |
| Character QA | KHOSAN Character QA | BUILD-KHOSAN P0 | QA | deformation, animation, cloth/equipment collision and output parity |
| Physics | Rapier | EVALUATE P0 | Gameplay/Architect | rigid bodies, colliders, queries, joints |
| Navigation | Recast + Detour | EVALUATE P0 | Gameplay/Architect | navmesh, pathfinding, crowds |
| glTF processing | glTF Transform | EVALUATE P0 | Asset/Adapter | validate/process/dedup/simplify pipeline |
| Mesh optimization | meshoptimizer | EVALUATE P0 | Asset/Rendering | mesh simplification/optimization/compression |
| Texture compression | Basis Universal / KTX2 | EVALUATE P0 | Rendering | GPU texture delivery |
| PBR authoring | Material Maker | EVALUATE P0 | Asset/Rendering | procedural PBR materials |
| Generative workflows | ComfyUI | EVALUATE P0 | Asset | extensible image/material/media workflows |
| 3D rigging | SkinTokens / TokenRig | EVALUATE P0 preferred | Asset | unified mesh → skeleton + skin weights; requires local GPU fixture |
| 3D rigging | UniRig | EVALUATE P0 fallback | Asset | staged skeleton → inspect/refine → skin → merge |
| Animation retarget | production retarget tool | TO-FIND P0 | Asset/Adapter | map reusable motion through KHOSAN semantic skeleton contracts |
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

See `docs/16-3D-AUTO-RIGGING.md` for the pinned SkinTokens/UniRig integration path.

## Core asset pipeline target

~~~text
                         ASSET LAB
          +-----------------+-----------------+
          |                 |                 |
          v                 v                 v
       True 2D          Generic 3D        Character 3D
      sprite-gen        img2threejs      Character Factory
          |                 |                 |
          v                 v            Human DNA
      Sprite IR          Mesh IR              |
          |                 |          Canonical Skeleton
          |                 |                 |
          |                 |       Wearable / Equipment IR
          |                 |                 |
          |                 |        Animation Library
          |                 |                 |
          |                 |            Retargeting
          |                 |                 |
          |                 |          Character QA
          +-----------------+-----------------+
                            |
                            v
                     KHOSAN Asset IR
                            |
                 optimize / validate
                            |
                            v
                      Asset Registry
~~~

Auto-rigging tools sit on the imported/arbitrary-character branch. They do not define the native Character Factory skeleton.

See `docs/20-CHARACTER-FACTORY.md` for the canonical character path.

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
