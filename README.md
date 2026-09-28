# KHOSAN TIME STUDIO

**Master repository for the KHOSAN AI-native Game Studio**

KHOSAN TIME STUDIO is designed as a game-creation environment where a human creator works with an AI Studio Orchestrator, specialized production agents, deterministic tools, a shared intermediate representation (UG-IR), verification gates, and export adapters.

> **Human = Executive Producer · Agents = specialists · Tools = production machines · UG-IR = common language · Studio = orchestrator**

## Current status

**Phase: FOUNDATION / MASTER REPOSITORY**

This repository is the source of truth for:
- studio architecture and product vision,
- multi-agent harness and role contracts,
- tool registry and integration decisions,
- KHOSAN Asset IR / UG-IR direction,
- game-creation workflow,
- local development with ChatGPT + DevSpace,
- verification and human approval gates,
- deployment/packaging documentation,
- research/knowledge index and roadmap.

The interactive Studio application itself is **not yet production-complete**. Deployment documents distinguish between what exists now and what must be implemented next.

## How a creator should use the Studio

The creator should not manually choose 13 agents.

```text
Create New Game
      ↓
Describe the game in natural language
      ↓
Studio Orchestrator
      ↓
Game Blueprint
      ↓
Human Concept Approval
      ↓
Design + Architecture
      ↓
Asset / Gameplay / Rendering / World production
      ↓
QA + Independent Review
      ↓
Playable Preview
      ↓
Natural-language change requests
      ↓
Build / Export / Deploy
```

Example:

> Create a 3D fantasy Isan RPG. The player is a spirit doctor exploring villages, fighting spirits, with day/night cycles. Browser/WebGPU first.

KHOSAN converts that intent into bounded work items, routes only the required specialists, executes production tools, validates outputs, and presents human approval gates.

## Repository map

| Path | Purpose |
|---|---|
| `AGENTS.md` | root harness rules and routing |
| `docs/` | product, architecture, workflow, deployment and roadmap |
| `studio/agents/` | specialized AI role contracts |
| `studio/contracts/` | work-item / handoff / evidence contracts |
| `studio/templates/` | reusable task and approval templates |
| `studio/graph.md` | explicit production graph and rollback routing |
| `studio/tool-registry.yaml` | canonical production-tool registry |
| `studio/studio_state.json` | durable Studio execution state |
| `knowledge/` | research/source registry |
| `scripts/` | bootstrap and verification helpers |
| `deploy/` | local/self-host deployment guidance |

## Core tools already adopted

### 2D production
**sprite-gen** — one still image to game-ready sprite atlases and transparent motion loops, including frame manifests, curation, deterministic post-processing and QA.

Source: https://github.com/kongsak4807017/sprite-gen

### 3D production
**img2threejs** — reference-image to procedural/structured 3D reconstruction. KHOSAN will adapt its output into Asset IR rather than making Three.js the Studio's core data model.

Source: https://github.com/kongsak4807017/img2threejs

### Harness engineering
**learn-harness-engineering** — basis for instructions, state, verification, scope, lifecycle, maker/checker separation, context isolation and graph engineering.

Source: https://github.com/kongsak4807017/learn-harness-engineering

## P0 tool acquisition / integration backlog

1. Physics — Rapier
2. Navigation — Recast + Detour
3. glTF processing — glTF Transform
4. Mesh optimization — meshoptimizer
5. GPU texture compression — Basis Universal / KTX2
6. PBR/material authoring — Material Maker
7. AI workflow backend — ComfyUI
8. 3D auto-rigging — evaluate UniRig + deterministic Blender fallback
9. Animation retargeting — select and validate a production tool
10. Visual node editor — Rete.js
11. Dialogue/quest runtime — Yarn Spinner
12. Browser audio runtime — Web Audio / Tone.js
13. AI audio/music generation — evaluate license-safe production option
14. Automated browser/game QA — Playwright
15. Large binary asset management — Git LFS

See [docs/03-TOOL-REGISTRY.md](docs/03-TOOL-REGISTRY.md).

## Start locally

### 1. Clone
```bash
git clone https://github.com/kongsak4807017/KHOSAN-TIME-STUDIO.git
cd KHOSAN-TIME-STUDIO
```

### 2. Bootstrap
Linux/macOS:
```bash
chmod +x scripts/bootstrap.sh
./scripts/bootstrap.sh
```

Windows PowerShell:
```powershell
.\scripts\bootstrap.ps1
```

### 3. Open with ChatGPT + DevSpace

Use:

> Open this local workspace. Operate as KHOSAN Studio Orchestrator. Read AGENTS.md first, then studio/studio_state.json, studio/graph.md and the active work item. Do not implement until scope, allowed paths, acceptance criteria and verification are explicit.

See [docs/07-CHATGPT-DEVSPACE-WORKFLOW.md](docs/07-CHATGPT-DEVSPACE-WORKFLOW.md).

## Self-host / deployment

Start with [docs/06-LOCAL-DEPLOYMENT.md](docs/06-LOCAL-DEPLOYMENT.md) and [deploy/README.md](deploy/README.md).

Deployment is intentionally staged:
1. **Repository/harness mode** — usable now with ChatGPT + DevSpace.
2. **Local Studio shell** — implement the UI/orchestrator service.
3. **Tool services** — sprite-gen, 3D, material, physics/nav compiler, QA.
4. **Packaged local stack** — Docker/desktop packaging after executable services exist.

## Non-negotiable engineering rules

- No evidence → no Done.
- Maker cannot approve its own output.
- Preserve unrelated user changes.
- Do not silently widen task scope.
- Destructive git/filesystem actions require human approval.
- Push/merge/deploy/publish and paid external side effects require human approval.
- Engine/backend-specific assumptions must not leak into UG-IR core.
- Generated asset uncertainty must be recorded, not hidden.
- Use deterministic stages after generative stages wherever possible.

## License

A project license has not yet been selected. Do not assume third-party tool licenses transfer to KHOSAN. Every adopted dependency must be recorded with its own license and redistribution constraints.
