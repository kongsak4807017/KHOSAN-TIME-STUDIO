# KHOSAN Studio Roadmap

## Phase 0 — Master Repository / Harness
**Status: active**

Deliver:
- master architecture,
- agent contracts,
- work-item/handoff/evidence contracts,
- tool registry,
- knowledge index,
- deployment plan,
- ChatGPT + DevSpace workflow.

Exit criteria:
- repository is restartable by a fresh agent,
- no critical decision depends only on chat history.

## Creative Intelligence Track — CI0 to CI3
**Status: foundation contracts added; product surfaces not yet implemented**

### CI0 — Creative Constitution & Concept artifacts
Deliver:
- Creative Constitution schema/editor,
- Concept Hypothesis artifacts,
- Creative Intelligence Council routing,
- human concept lock.

Exit:
A creator can persist a concept and its non-negotiable creative identity.

### CI1 — Idea / Taste Engine
Build:
- creative brief intake,
- bounded research context,
- concept-space generation,
- creative critique,
- audience/player-experience hypotheses,
- portfolio view without a universal winner score.

Exit:
A creator can explore meaningfully different concepts and understand trade-offs before production.

### CI2 — Prototype Arena
Build:
- one-click experiment project from concept hypothesis,
- micro-prototype scope generator,
- observation/telemetry plan,
- side-by-side experiment evidence,
- recombination/evolution history.

Exit:
High-risk creative assumptions can be tested cheaply before full production.

### CI3 — Community & Live Intelligence
Build:
- Community Pulse ingestion adapters,
- telemetry definitions/quality checks,
- insight synthesis,
- Experiment Board,
- Creative Constitution conflict detection.

Exit:
Player/community evidence produces governed experiments without automatic vision drift.

---

## Phase 1 — Studio Shell
**Status: v0.1 runnable baseline shipped; phase remains active**

Implemented baseline:
- local zero-dependency Node Web/API shell,
- Studio Home,
- Idea / Concept Lab project creation,
- durable project/Blueprint/Creative Constitution files,
- Agent Workboard reading durable work items,
- Tool Registry/provenance view,
- local Docker packaging.

Still build:
- Home/Projects,
- Idea / Concept Lab,
- Create New Game,
- Game Blueprint,
- Creative Constitution,
- Game Workspace,
- Agent Workboard,
- Prototype/Experiment surfaces,
- Human Gates,
- project/state persistence.

Exit:
A user can create a project and approve a blueprint without touching agent internals.

## Phase 2 — Asset Lab
Integrate:
- sprite-gen,
- img2threejs,
- Asset Registry,
- material pipeline,
- 3D optimizer/compression,
- asset inspector/curation.

Exit:
Reference → approved runtime 2D and 3D asset is reproducible.

## Phase 3 — Native Playable Runtime
Integrate:
- WebGPU renderer,
- input/game loop,
- physics,
- navigation,
- audio,
- gameplay system bridge,
- live preview.

Exit:
A small vertical slice runs locally from UG-IR.

## Phase 4 — World + Logic Authoring
Build:
- World Editor,
- gizmos/hierarchy,
- terrain/biome integration,
- logic graph,
- dialogue/quest,
- UI/HUD editor.

Exit:
A non-programmer can assemble a small playable scene.

## Phase 5 — Automated Verification
Integrate:
- headless/deterministic tests,
- Playwright play flows,
- screenshots/visual regression,
- performance telemetry,
- QA evidence UI.

Exit:
Studio can prove acceptance criteria instead of relying on agent confidence.

## Phase 6 — Export / Packaging
Deliver:
- Web/PWA,
- local package,
- Godot adapter,
- Unity adapter,
- benchmark matrix,
- reproducible build manifests.

## Phase 7 — Optional Online Stack
Plugin architecture for:
- accounts,
- cloud saves,
- matchmaking,
- authoritative multiplayer,
- telemetry/analytics.

## Phase 8 — Production hardening
- security model,
- plugin signing/trust,
- crash recovery,
- migrations,
- asset licensing/provenance,
- project backup,
- long-running task recovery,
- observability/cost controls.
