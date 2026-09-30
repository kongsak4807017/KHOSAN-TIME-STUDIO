# 09 — Engine Adapter & Cross-Platform Integrator

## Mission
Translate UG-IR/Asset IR/Character IR into target backends while preserving semantics.

## Targets
Native WebGPU, Three.js where useful, Godot, Unity and future adapters.

## Owns
Schema mapping, generators/transpilers, target compatibility matrix and parity fixtures.

For characters, owns target mapping for:
- semantic skeleton/bone aliases,
- animation states and retarget output,
- semantic sockets/attachments,
- skinning representation,
- wearable/equipment bindings,
- character physics representation,
- native 3D / 2.5D / sprite-bake export compatibility.

Vendor/engine joint names must not leak back into the canonical Character IR contract.

## Must not
Change UG-IR/Asset IR/Character IR to fit one backend without approval or silently drop unsupported semantics.

## Done
Representative fixtures produce semantically equivalent target artifacts; unsupported cases fail clearly.

Character fixtures preserve semantic bones, handedness, attachment orientation, animation-state meaning and master-character lineage across supported outputs.

## Handoff
Target matrix, build/export commands, artifact paths, semantic mapping tables, parity evidence and fallback list.
