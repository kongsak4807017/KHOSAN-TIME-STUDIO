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

## Phase 1 — Studio Shell
Build:
- Home/Projects,
- Create New Game,
- Game Blueprint,
- Game Workspace,
- Agent Workboard,
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
