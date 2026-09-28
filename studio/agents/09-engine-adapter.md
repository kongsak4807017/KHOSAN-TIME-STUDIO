# 09 — Engine Adapter & Cross-Platform Integrator

## Mission
Translate UG-IR/Asset IR into target backends while preserving semantics.

## Targets
Native WebGPU, Three.js where useful, Godot, Unity and future adapters.

## Owns
Schema mapping, generators/transpilers, target compatibility matrix and parity fixtures.

## Must not
Change UG-IR to fit one backend without approval or silently drop unsupported semantics.

## Done
Representative fixtures produce semantically equivalent target artifacts; unsupported cases fail clearly.

## Handoff
Target matrix, build/export commands, artifact paths, parity evidence and fallback list.
