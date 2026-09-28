# ADR-0001: Blender as the core editable 3D DCC for KHOSAN Asset Lab

**Status:** Human-approved direction; implementation verification pending  
**Date:** 2026-09-29  
**Owner:** 04 Asset Synthesizer with 06 Technical Architect

## Context

KHOSAN already treats `sprite-gen` as Core 2D Production and `img2threejs` as Core 3D Reconstruction. Auto-rigging candidates are evaluated separately through SkinTokens/TokenRig and UniRig.

A missing layer remained between generated/imported geometry and a production-ready character: a durable editable master in which an agent can refine geometry, UVs, materials, armatures, weights, shape keys, animation, constraints, sockets, corrective deformation and export settings without regenerating the whole character.

Public Spawn release notes provide a useful product benchmark: Savi can use Blender 5 for professional 3D asset work and inspect its own renders; Spawn also exposes runtime behaviors around shape keys, sockets/jiggle, IK and motion authoring. These observations motivate the workflow but do not establish Spawn's private implementation.

## Decision

1. **Blender becomes an ADOPT / CORE production tool for 3D Asset Lab.**
2. For editable 3D characters, the **`.blend` file is the DCC authoring master**. A `.glb` is a derived runtime/export artifact, not the only source of truth.
3. **Asset IR / UG-IR remain canonical above Blender.** Blender is a production representation and tool backend, not KHOSAN's game-semantic language.
4. ChatGPT remains the creator-facing conversational layer. DevSpace runs bounded, auditable Blender jobs locally/headlessly. KHOSAN does not need to build a replacement DCC or a second chat runtime.
5. The adapter contract is **allowlisted and data-driven**. It must not expose arbitrary Python execution from a job payload.
6. Auto-rig generation remains a separate capability:
   - SkinTokens/TokenRig: preferred evaluation candidate,
   - UniRig: staged/expert fallback,
   - Blender: core DCC for inspection, correction, authoring and deterministic export.
7. Conversational edits compile to semantic operations when possible. If the requested change requires unsupported sculpting/topology/model-generation work, the task must route to an explicit modeling step rather than pretending a generic mesh can satisfy it.
8. Muscle-like deformation is represented only when the asset actually contains the required rig, weights, corrective shape keys/drivers or another validated deformation system. KHOSAN must not label ordinary skinning as anatomical muscle simulation.

## Alternatives considered

### Generate-and-forget GLB
Rejected as the primary workflow. It makes small iterative changes expensive and can destroy identity, rigging, materials or animation continuity between generations.

### Build a KHOSAN-native modeling package
Rejected for the current product phase. It duplicates a mature DCC, dramatically increases engineering cost and delays the differentiated parts of KHOSAN.

### Make Blender the canonical game representation
Rejected. This would leak one backend's scene model into game semantics and weaken WebGPU/Godot/Unity portability.

### Embed an independent LLM/agent runtime in KHOSAN Studio immediately
Rejected for now. ChatGPT + DevSpace already provide the economical conversational and execution surface. KHOSAN should spend engineering effort on production contracts, tools, IR, live preview and QA.

## Consequences

### Positive
- Iterative edits can preserve identity and production state.
- Source/master and runtime artifacts have explicit roles.
- Agents can automate Blender through a stable adapter while humans may still open Blender for expert correction.
- Rigging, facial morphs, attachments, animation and export can share one professional DCC master.
- KHOSAN avoids reimplementing a full 3D editor.

### Costs / risks
- Blender Python APIs vary by version and require compatibility testing.
- Large `.blend` assets require an eventual binary/LFS storage policy.
- Some edits cannot be safely reduced to simple semantic operations.
- Auto-rigging quality, corrective deformation and secondary motion still require separate QA.
- Headless execution must be sandboxed and constrained because Blender scripting is powerful.

## Verification

Before this ADR is treated as operationally complete:

1. `python scripts/harness_check.py`
2. `python -m unittest discover -s tools/adapters/blender/tests -p "test_*.py"`
3. `python tools/adapters/blender/doctor.py --json`
4. Validate a dry-run job.
5. Run at least one real GLB/BLEND fixture through Blender background mode.
6. Confirm the `.blend` master reopens and the GLB contains expected skins/morphs/animations.
7. QA inspects deformation and material preservation.
8. Independent Reviewer checks evidence.

## Human approval

The human owner explicitly approved this direction and requested that the architecture and code be persisted to the KHOSAN project GitHub on 2026-09-29.
