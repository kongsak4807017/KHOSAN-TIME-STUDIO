# KHOSAN TIME STUDIO — Canonical Master Summary

## 1. Product identity

KHOSAN TIME STUDIO is an AI-native **creative-intelligence and game-production environment**.

The creator is the Executive Producer. The Studio handles decomposition, specialist routing, tool invocation, durable state, verification and export.

The creator-facing experience can begin before a game concept exists:

```text
creative brief / emotion / culture / fantasy / mechanic
 → Creative Intelligence Council
 → concept portfolio
 → micro-prototypes
 → player evidence
 → Creative Constitution
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

Creative Intelligence Council:
14. Cultural & Trend Researcher
15. Player Experience Researcher
16. Concept Inventor
17. Creative Critic
18. Audience Researcher
19. Community Intelligence
20. Telemetry Analyst
21. Live Game Designer

File role IDs remain 00–20. Total: **21 roles**.

The human remains above the graph as Executive Producer. Creative Intelligence roles are advisory.

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

## 5. Creative Intelligence

KHOSAN treats game generation as a production subsystem, not the final source of creative advantage.

The Creative Intelligence layer supports:
- concept-space exploration,
- player fantasy / emotional promise hypotheses,
- qualitative taste diagnosis without one universal score,
- Creative Constitution,
- Prototype Arena,
- community evidence synthesis,
- telemetry findings,
- governed live experiments.

Two loops:
1. **Discovery:** research → concepts → critique → micro-prototypes → evidence → human concept lock.
2. **Live:** community + telemetry → experiment proposal → normal production work or HG-01 if vision-level.

The system protects human taste and point of view rather than optimizing blindly toward popularity.

## 6. Core adopted production tools

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

## 7. P0 capabilities to integrate

- Physics — Rapier
- Navigation — Recast + Detour
- glTF processing — glTF Transform
- Mesh optimization — meshoptimizer
- GPU texture compression — Basis Universal/KTX2
- PBR authoring — Material Maker
- Generative workflow backend — ComfyUI
- 3D auto rigging for imported/arbitrary meshes — evaluate SkinTokens/TokenRig + UniRig fallback
- Animation retargeting implementation — TO FIND; KHOSAN owns the semantic retarget contract
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

## 8. Components KHOSAN should build itself

Do not outsource the Studio's canonical authoring surfaces:
- Studio Shell
- Canonical Character Factory
- Canonical semantic character skeleton
- Human DNA / Character IR
- Animation Library contract
- Wearable + Equipment IR
- Character QA contracts
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

## 9. Asset architecture

KHOSAN uses three asset-production classes:

### True 2D
Reference → sprite-gen → curation → deterministic extraction/compose/QA → Sprite Adapter → Asset IR → Registry.

### Generic 3D
Reference/import → img2threejs or other import → inspect uncertainty → geometry/material/pivot/socket/collider/LOD normalization → optimize/compress → QA → Asset IR → Registry.

### Character 3D
Reference/concept → Human DNA → canonical base mesh → canonical semantic skeleton → appearance fit → Wearable/Equipment IR → Animation Library → semantic retarget → physics/character QA → Character Asset IR → Registry → native 3D / 2.5D / sprite bake.

Native KHOSAN characters do not depend on auto-rigging as their default skeleton source. SkinTokens/TokenRig and UniRig remain the imported/arbitrary-mesh rigging path.

Reference-driven scenes, generic assets and UI surfaces use the canonical **Reference Reconstruction Workflow**:

```text
Reference Package
 → Reference Conditioning
 → Art-Direction Lock
 → Decomposition
 → Blockout
 → Compare
 → Diagnose
 → Targeted Repair
 → Detail / Material / Lighting
 → Technical QA
 → Independent Review
 → Human Approval / Freeze
```

The workflow locks approved dimensions against regression, rejects open-ended “refine everything” loops as the default after first pass, and records inferred/hidden geometry explicitly. Backend tools remain replaceable; KHOSAN Asset IR / UG-IR remain canonical.

Generated assets must preserve provenance and uncertainty rather than hiding inferred content. Derived character outputs must preserve master-character lineage.

See `docs/20-CHARACTER-FACTORY.md`, `docs/21-REFERENCE-RECONSTRUCTION-WORKFLOW.md` and ADR-001.

## Multi-project workspace architecture

KHOSAN Studio is installed once while game projects remain independent workspaces.

~~~text
Studio
  ↓
Project Library
  ├─ Game A
  ├─ Game B
  └─ Game C
       ↓
one active project
       ↓
project-scoped Agent / DevSpace workspace
~~~

New projects receive a portable `khosan-project.json`, `.khosan/project-state.json` and isolated production directories. Project-scoped work items require `project_id`. Shared tools/models may be reused across projects, but authoritative project data and writes remain isolated.

The Studio Shell v0.2 implements Project Library discovery, active-project switching, workspace-boundary API and project-aware routing. Arbitrary filesystem-path import is intentionally deferred to a trusted native/desktop picker so the local HTTP API does not become a filesystem escape surface.

See `docs/22-MULTI-PROJECT-WORKSPACE-ARCHITECTURE.md` and `docs/23-DEPLOYABLE-STUDIO-V0.2.md`.

## 10. Runtime architecture

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

## 11. DevSpace connectivity

For ChatGPT-controlled local production, KHOSAN treats DevSpace MCP connectivity as a deploy profile:

~~~text
ChatGPT -> HTTPS tunnel -> DevSpace MCP 127.0.0.1:7676
~~~

Supported provider strategy: ngrok or Cloudflare Tunnel.

The tunnel is not the Studio application. The Studio Web/API remains separate on `127.0.0.1:8080` in v0.1 and is not publicly exposed by default.

Secrets, owner credentials, tunnel credentials, logs and machine-specific state remain outside Git. Persistent ChatGPT sessions should reuse one valid DevSpace workspaceId per project root.

## 12. Local deployment philosophy

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

## 13. Knowledge policy

Research reports are evidence, not automatically current project truth.

Raw reports are mirrored verbatim to `knowledge/research/`.
Canonical decisions live in `docs/` and ADRs.
Old ZIP deliverables are artifacts; they require provenance/checksum/reproducibility checks before promotion.

See `knowledge/source-manifest.yaml` for the legacy source archive list.

## 14. Next product sequence

1. Finish Master Repository mirror of legacy research.
2. Build Studio Shell with Idea/Concept Lab + Creative Constitution.
3. Implement Creative Intelligence CI1 and Prototype Arena CI2.
4. Build Asset Registry + Asset Lab integrations, including CHARACTER-001 Canonical Character Factory.
5. Define Character IR/Human DNA + canonical skeleton/animation fixtures and UG-IR v0.1.
6. Produce a native WebGPU vertical slice.
7. Add World/Logic authoring.
8. Add automated QA.
9. Add Community/Telemetry live loop.
10. Add export/package targets.
11. Add optional online services.
12. Production hardening.

This document is a navigation summary. Detailed contracts in `docs/`, `studio/` and ADRs take precedence when more specific.
