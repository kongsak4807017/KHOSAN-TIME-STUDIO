# KHOSAN Studio Architecture

## Architecture thesis

KHOSAN is not only a game generator. It is a **Creative Intelligence + Production System**.

The system has two distinct optimization loops:
1. discover what may be worth building,
2. build and evolve it reliably.

## Layers

### 0. Creative Intelligence
Advisory layer for:
- cultural/trend research,
- player experience hypotheses,
- concept-space generation,
- creative critique,
- audience hypotheses,
- Prototype Arena,
- community synthesis,
- telemetry analysis,
- live experiment design.

Outputs are typed evidence/hypotheses. This layer cannot bypass human vision authority.

### 1. Studio Shell
Creator-facing application:
- project browser,
- Idea / Concept Lab,
- Create Game wizard,
- Creative Constitution,
- Prototype Arena,
- workbench,
- world editor,
- asset inspector,
- live preview,
- Community Pulse,
- Experiment Board,
- build/export.

### 2. Orchestration / Harness
Responsible for:
- request intake,
- work-item/artifact decomposition,
- specialist routing,
- shared state,
- human gates,
- maker/checker separation,
- recovery and rollback edges.

### 3. Specialist Agents
Roles under studio/agents/.

00–12: production/governance.
13–20: Creative Intelligence Council.

### 4. Tool Registry
External/internal production and research capabilities invoked through stable adapters.

### 5. Intermediate Representation

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
UG-IR / Asset IR → target-specific artifacts:
- KHOSAN native WebGPU,
- Three.js adapter where useful,
- Godot,
- Unity,
- future targets.

## Creative boundary

The Creative Constitution is above implementation.

Production can optimize usability, balance, performance and content while preserving locked:
- player fantasy,
- emotional promise,
- core verbs,
- point of view,
- art grammar,
- sacred constraints.

A change to those boundaries returns to HG-01.

## Discovery graph

~~~text
research / experience hypotheses / audience hypotheses
                 ↓
            concept space
                 ↓
           creative critique
                 ↓
          concept portfolio
                 ↓
          Prototype Arena
                 ↓
          player evidence
             ↙       ↘
       iterate       human concept gate
                         ↓
                Creative Constitution
                         ↓
                    Production
~~~

## Live intelligence graph

~~~text
released game
   ├─ community evidence
   └─ telemetry
          ↓
      synthesis
          ↓
    experiment proposal
       ↙          ↘
 implementation   vision-level
      ↓               ↓
 normal work        HG-01
~~~

## Boundary rule

Never reshape UG-IR merely to satisfy one backend. Backend divergence belongs in adapters or capability negotiation.

Never reshape the Creative Constitution merely to satisfy short-term metrics. Vision change belongs at HG-01.

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

These capabilities are technical foundations, not a reason to hard-code gameplay/content authoring to WebGPU.

## Context model

Context is budgeted:
- Tier 1: state/metadata,
- Tier 2: role/task instructions,
- Tier 3: technical/research/player evidence on demand.

Do not preload all renderer reports into creative research agents. Do not preload all community data into production agents.

## Repository-first state

Critical decisions, acceptance criteria, concept hypotheses, Constitutions, experiment evidence and technical evidence must be written to the repository. Chat history is not the project database.
