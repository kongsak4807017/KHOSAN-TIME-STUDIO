# UG-IR — Universal Game Intermediate Representation

## Purpose

UG-IR is the engine-neutral contract that lets Studio agents and tools create a game without hard-wiring the project to one runtime.

It is not a generic dump of engine objects. It expresses **game meaning**.

## Candidate top-level domains

```text
Project
├── Metadata
├── Platforms / capability profile
├── Asset Registry references
├── Scenes / Worlds
├── Entities
│   └── Components
├── Systems
├── Physics
├── Navigation
├── Animation
├── Audio
├── UI
├── Input
├── Quest / Dialogue
├── Save / Persistence
├── Networking (optional)
├── Build profiles
└── Verification contracts
```

## Example semantic entity

```yaml
entity: village_house_01
components:
  transform: ...
  renderable:
    asset: asset://building/village_house_01
  collider:
    type: compound
  interactable:
    actions: [open_door]
  door:
    hinge_socket: door_hinge
    closed_angle: 0
    open_angle: 92
  nav_obstacle:
    dynamic_parts: [door]
```

A backend adapter may implement this differently in WebGPU, Godot or Unity, but the game meaning remains stable.

## Capability negotiation

Adapters must report supported capabilities. Unsupported UG-IR features should:
1. fail explicitly, or
2. use a documented fallback.

They must not silently drop semantics.

## Schema evolution

UG-IR must be versioned. Breaking changes require:
- migration path,
- compatibility policy,
- fixture tests,
- architecture approval.

## Test fixtures

Maintain small canonical fixture projects:
- sprite character,
- animated 3D character,
- physics object,
- navmesh NPC,
- dialogue/quest,
- UI/HUD,
- audio event,
- save/load,
- representative scene.

Every adapter should prove these fixtures.
