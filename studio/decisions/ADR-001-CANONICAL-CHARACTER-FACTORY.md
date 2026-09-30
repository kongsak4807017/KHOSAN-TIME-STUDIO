# ADR-001 — Canonical Character Factory for reusable characters

- **Status:** Accepted
- **Date:** 2026-09-30
- **Owners:** 04 Asset Synthesizer, 06 Technical Architect
- **Decision scope:** Character asset production, rigging routing, animation reuse, wearable/equipment compatibility

## Context

The existing Asset Lab architecture had strong 2D and generic 3D paths, plus an auto-rigging path based on SkinTokens/TokenRig with UniRig as expert fallback.

That architecture did not clearly distinguish a reusable humanoid/game character from a generic animated mesh. If a KHOSAN-native character always begins as an arbitrary mesh and then depends on auto-rigging, character identity, bone semantics, animation reuse and wearable compatibility become downstream inference problems.

Reference-driven production also benefits from keeping deterministic structural truth separate from generative appearance work.

## Decision

KHOSAN will add a **Canonical Character Factory** as a first-class asset production path.

For KHOSAN-native humanoids:

1. character identity is stable,
2. a KHOSAN semantic skeleton is canonical,
3. Human DNA/appearance fitting modifies the character without silently changing skeleton semantics,
4. animation targets semantic bones/states,
5. wearables and equipment bind through KHOSAN-owned contracts,
6. physics and character QA are deterministic validation layers,
7. one approved master character can drive native 3D, 2.5D and sprite-baked outputs.

SkinTokens/TokenRig and UniRig remain P0 evaluation tools for **imported, arbitrary or otherwise untrusted meshes** that do not already have a reliable/mappable skeleton.

Animation retarget implementation remains externally selectable, but the semantic retarget contract belongs to KHOSAN.

## Consequences

Positive:

- character identity is more stable across animations and outputs,
- reusable animation libraries become practical,
- equipment/wearables have predictable attachment contracts,
- imported assets and native characters can use different appropriate routes,
- vendor rigging tools can be replaced without redefining gameplay semantics,
- 3D/2.5D/sprite outputs can share one master asset.

Costs:

- KHOSAN must define and version a semantic humanoid skeleton,
- Character IR/Human DNA/Wearable IR require owned schemas,
- deterministic deformation and collision QA must be built,
- a production retarget tool still needs evaluation/integration.

## Alternatives considered

### Treat every character as generic 3D + auto-rig

Rejected as the default native-character architecture. Auto-rig remains useful for imported/arbitrary meshes, but should not define KHOSAN's canonical character semantics.

### Generate animation frames/poses independently

Rejected as a structural source of truth because identity, handedness, anatomy and contact consistency are difficult to guarantee across independently generated poses.

### Lock KHOSAN to one avatar vendor format

Rejected. VRM/glTF or other formats may be supported as interchange/adapters, but KHOSAN Human DNA and Character IR remain engine/vendor-neutral.

## Implementation

Create/maintain:

- `docs/20-CHARACTER-FACTORY.md`,
- `CHARACTER-001` in `feature_list.json`,
- Character Factory capabilities in Tool Registry,
- semantic character responsibilities in Asset/Adapter/QA role contracts,
- Phase 2 roadmap work for skeleton, animation library, retargeting, Wearable IR and Character QA.

Runtime implementation is intentionally separate from this architecture decision.
