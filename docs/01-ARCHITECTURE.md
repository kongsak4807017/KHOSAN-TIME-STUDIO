# KHOSAN Studio Architecture

## Layers

### 1. Studio Shell
Creator-facing application:
- project browser,
- create-game wizard,
- workbench,
- world editor,
- asset inspector,
- live preview,
- build/export.

### 2. Orchestration / Harness
Responsible for:
- request intake,
- work-item decomposition,
- specialist routing,
- shared state,
- human gates,
- maker/checker separation,
- recovery and rollback edges.

### 3. Specialist Agents
Production roles under `studio/agents/`.

### 4. Tool Registry
External/internal production capabilities invoked by specialists through stable adapters.

### 5. Intermediate Representation
Two related contracts:

**Asset IR**
- geometry / sprite data,
- materials,
- hierarchy,
- pivots,
- sockets,
- colliders,
- animation hooks,
- LOD,
- provenance,
- uncertainty/confidence.

**UG-IR**
Engine-neutral game/project representation:
- entities/components/systems,
- scenes/world references,
- animation/audio/physics/nav contracts,
- quests/dialogue,
- UI,
- resources,
- platform constraints.

### 6. Engine/Target Adapters
UG-IR / Asset IR → target-specific runtime artifacts:
- KHOSAN native WebGPU,
- Three.js adapter where useful,
- Godot,
- Unity,
- future targets.

## Boundary rule

Never reshape UG-IR merely to satisfy one backend. Backend divergence belongs in adapters or capability negotiation.

## Native WebGPU direction

KHOSAN's native renderer research includes:
- 3D PBR,
- clustered forward lighting,
- shadow maps / PCF,
- SSAO/contact shadows,
- advanced compute / instancing,
- post-processing / texture pipeline,
- procedural terrain / biomes,
- skeletal skinning / animation,
- cross-platform packaging / benchmarking.

These capabilities are technical foundations, not a reason to hard-code gameplay or content authoring to WebGPU.

## Shared-state graph

A production task moves through explicit nodes/edges rather than implicit “agent memory.”

Common path:

```text
INTAKE
 → SPECIFY
 → HUMAN CONCEPT GATE if material
 → ARCHITECT
 → IMPLEMENT / ASSET / WORLD fan-out
 → QA + INDEPENDENT REVIEW fan-out
 → rollback to defect owner if failed
 → HUMAN RELEASE GATE
 → PACKAGE / RELEASE
```

## Rollback rule

Failure returns to the layer that introduced it:
- misunderstood product behavior → design/spec owner,
- architecture violation → Technical Architect,
- gameplay defect → Gameplay Programmer,
- render/performance defect → Rendering Engineer,
- adapter/export defect → Engine Adapter,
- packaging/deployment defect → Release/Ops.

## Context model

Context is budgeted:
- Tier 1: state/metadata,
- Tier 2: role/task instructions,
- Tier 3: technical reports/source on demand.

Do not preload all WebGPU reports into Narrative or Design agents.

## Repository-first state

Critical decisions, acceptance criteria and evidence must be written to the repository. Chat history is not the project database.
