# KHOSAN TIME STUDIO — Canonical Master Summary

## 1. Product identity

KHOSAN TIME STUDIO is an AI-native game-production environment.

The creator is the Executive Producer. The Studio handles decomposition, specialist routing, tool invocation, durable state, verification and export.

The creator-facing experience should be:

```text
Create New Game
 → describe intent in natural language
 → Game Blueprint
 → human concept approval
 → design + architecture
 → asset/gameplay/world/render/audio production
 → QA + independent review
 → playable preview
 → natural-language iteration
 → build/export/deploy
```

## 2. Operating architecture

```text
Human
  ↓
Studio Orchestrator
  ├─ Agents
  ├─ Tools
  └─ Knowledge
        ↓
  Shared durable state
        ↓
 Asset IR / UG-IR
        ↓
 Assets + Systems + World
        ↓
 Playable Runtime
```

Key principle:
**Agent = worker · Tool = production machine · IR = common language · Studio = factory/orchestrator**

## 3. Agent organization

1. Studio Orchestrator
2. Creative Director
3. Game Designer
4. Narrative Architect
5. Asset Synthesizer
6. Audio & Dynamic Soundscape
7. Technical Architect / UG-IR Owner
8. Gameplay Programmer
9. WebGPU Rendering Engineer
10. Engine Adapter & Cross-Platform Integrator
11. Automated QA & Playtester
12. Independent Reviewer
13. Release & Operations

The human remains above the graph as Executive Producer.

## 4. Harness rules

The harness follows five core subsystems:
- instructions,
- state,
- verification,
- scope,
- lifecycle.

At graph scale it additionally uses:
- explicit nodes/edges,
- shared state,
- routing rules,
- maker/checker separation,
- human approval nodes,
- rollback to defect origin,
- context isolation and progressive disclosure.

Non-negotiables:
- no evidence → no Done,
- maker cannot approve own output,
- one bounded work item per agent,
- parallel work requires isolated paths/worktrees,
- critical project state lives in repository files, not chat memory,
- destructive/external actions require human approval.

## 5. Core adopted production tools

### sprite-gen — Core 2D Production
Use for:
- still → animation states,
- sprite atlas,
- transparent extraction,
- runtime frame manifest,
- direction handling,
- curation,
- recolor,
- rig/layer composition,
- breathing,
- motion inspection,
- QA contact sheets/GIFs,
- scene-related sprite utilities.

Owner: Asset Synthesizer.

### img2threejs — Core 3D Reconstruction
Use for:
- reference image → structured/procedural 3D,
- editable code/structure,
- pivots/sockets/hierarchy where available,
- reconstruction-first 3D workflow.

Its output is normalized into KHOSAN Asset IR. Three.js is not the canonical project data model.

## 6. P0 capabilities to integrate

- Physics — Rapier
- Navigation — Recast + Detour
- glTF processing — glTF Transform
- Mesh optimization — meshoptimizer
- GPU texture compression — Basis Universal/KTX2
- PBR authoring — Material Maker
- Generative workflow backend — ComfyUI
- 3D auto rigging — evaluate UniRig + Blender fallback
- Animation retargeting — TO FIND
- Visual graph editor — Rete.js
- Dialogue/quest — Yarn Spinner
- Browser audio runtime — Web Audio/Tone.js
- Automated QA — Playwright
- Large binary versioning — Git LFS

P1/optional:
- AI audio/music,
- multiplayer (Nakama/Colyseus adapters),
- localization,
- voice/TTS,
- mocap/video-to-motion,
- cloud save.

## 7. Components KHOSAN should build itself

Do not outsource the Studio's canonical authoring surfaces:
- Studio Shell
- World Editor
- Asset Registry
- UI/HUD Editor
- UG-IR
- Asset IR
- Save IR
- Tool Registry adapters
- Project Graph / workboard
- Human Gate UX
- Build/export orchestration

External tools plug into these boundaries.

## 8. Asset architecture

### 2D
Reference → sprite-gen → curation → deterministic extraction/compose/QA → Sprite Adapter → Asset IR → Registry.

### 3D
Reference → img2threejs → inspect uncertainty → Asset IR → material → rig/retarget → glTF process → optimize → KTX2 → validate → Registry.

Generated assets must preserve provenance and uncertainty rather than hiding inferred content.

## 9. Runtime architecture

Native WebGPU remains a first-class target with research/implementation direction covering:
- PBR,
- clustered forward lighting,
- shadow maps/PCF,
- SSAO/contact shadows,
- compute/instancing,
- post-processing/textures,
- procedural terrain/biomes,
- skeletal skinning/animation,
- cross-platform packaging/benchmarking.

However, UG-IR must remain engine-neutral.

## 10. Local deployment philosophy

The Studio is local-first.

Current usable mode:
- Git repository,
- ChatGPT,
- DevSpace local workspace,
- specialist tools installed locally/isolated.

Target local app:
- Studio Web/Desktop UI,
- local Studio API/orchestrator,
- project workspace,
- tool workers,
- WebGPU preview,
- QA runner.

Docker becomes a reproducibility layer only after executable service entrypoints exist. Do not create pretend deployment stacks.

## 11. Knowledge policy

Research reports are evidence, not automatically current project truth.

Raw reports are mirrored verbatim to `knowledge/research/`.
Canonical decisions live in `docs/` and ADRs.
Old ZIP deliverables are artifacts; they require provenance/checksum/reproducibility checks before promotion.

See `knowledge/source-manifest.yaml` for the legacy source archive list.

## 12. Next product sequence

1. Finish Master Repository mirror of legacy research.
2. Build Studio Shell.
3. Build Asset Registry + Asset Lab integrations.
4. Define UG-IR v0.1 + canonical fixtures.
5. Produce a native WebGPU vertical slice.
6. Add World/Logic authoring.
7. Add automated QA.
8. Add export/package targets.
9. Add optional online services.
10. Production hardening.

This document is a navigation summary. Detailed contracts in `docs/`, `studio/` and ADRs take precedence when more specific.
