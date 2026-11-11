# AI 3D harness — source review, executable-template boundary

## Source (user-provided Google Doc, read 11 Nov 2026)

- **Title:** AI 3D harness
- **Source:** https://docs.google.com/document/d/1Cm8CkZoRbtwB5U71IJY5B9R2_sI9zfR7dr77wv9SG5I/edit
- **Drive modified:** 11 November 2026 (per connected Drive metadata)
- **Archived full extracted text:** [AI-3D-HARNESS-SOURCE.txt](AI-3D-HARNESS-SOURCE.txt), **100,175 characters** in the connected text extraction. GitHub readback matched the source text exactly.
- **Scope:** Research/blueprint and sample code, **not a validated deployment of the Oriverse engine or a ready-made KHOSAN executor**. Styling and embedded media from the native Google Doc are not preserved by a plain-text archive.

## What the document actually specifies

The source is a long-form Thai architectural proposal and partial code reference. Its main ideas are:

1. **High-level procedural DSL** (not letting an LLM guess thousands of raw mesh vertices): declarative primitives, parametric CAD, named anchors and asset references.
2. **Coordinates / data contracts:** Z-up and centimeters for the proposed target IR, while the existing KHOSAN procedural generator is Y-up and meters. Transform explicitly; do not silently change stored models.
3. **Five-step reference-to-3D:** clay orthographic views, silhouette/vector extraction, reference-camera fit, reference color statistics, multi-view mesh preview.
4. **Four verification layers:** compile / mesh warnings; geometric seam, floating and overlap checks; contact-sheet/camera validation; *independent* visual critique plus performance profiling.
5. **Incremental repair:** classify failures, patch only failing components, preserve locked invariants and generate new evidence.
6. **Own-engine option:** Blender headless, Three.js/WebGPU preview, explicit UG-IR, and a proposed compact set of 15 geometry/material/layout/lighting/export commands.
7. **Governance:** maker and checker separation, phase-specific skill loading, deterministic evidence, and human approval before Freeze/Release.

## Crucial gaps found during code review

**DO NOT COPY THE SAMPLE AS A PRODUCTION HARNESS WITHOUT REPAIR:**

- The Python example `IsolatedVisualCritic.evaluate_contact_sheet` contains a `TODO` for the actual vision-model call and then **returns `{ "passed": True }` without examining the image**. Therefore that sample cannot prove independent visual QA.
- The example `HardEnforcementHarness` prints success using fixed demonstration geometry; it is not a general task executor, does not demonstrate a real VLM session, and should not be used as evidence of a successful automated production cycle.
- Assertions such as **100% geometry fit, zero gaps, AAA visual quality, all-player determinism, fixed CLI availability, 1,184 functions, 94 tools / 102 JSONL commands, build timings and modules** are claims made by this *source document* about a particular Oriverse build. This archive **does not independently validate** those numbers, native files or proprietary runtime internals.
- The source's AABB overlap check is an approximation and may incorrectly flag nested or intentionally joined components. Reusable geometry validation must define collision intent, permitted intersections, coordinate system and measurement tolerances.
- A bare `isolated_session: true` or two different agent labels cannot prove a genuinely independent model execution. The native gate now verifies two separate Ed25519 signatures, but **trusted issuance and protected keys remain prerequisites**; the signature only verifies which key signed the data, not that a real VLM or human performed the review.
- A user-specified `approved: true` is not an authenticated human signature. A signed approval bound to the exact asset/glb is required by the native gate; a trusted Studio approval UI/backend must issue it.
- The source illustrates proprietary `oriverse.exe` command lines; KHOSAN must not depend on that executable or assume those CLI flags exist. Prefer the independently developed native engine/Blender adapters and tests.
- The illustrative Blender and Three.js code does **not prove** those two backends offer visual parity. All adapter behavior needs bounded fixtures and version-pinned tests.

## What is implemented natively in this archive update

- A **dependency-free Node.js acceptance gate**: `tools/harness-3d/gate.mjs` and local CLI.
- A deterministic **AABB/seam/floating validator** for an explicit supported subset of Z-up/cm UG-IR layout boxes; unsupported placements fail closed.
- Checks that a nonempty UG-IR, glTF v2 GLB, and PNG contact sheet exist **inside one project root**, have expected signatures and **SHA-256 digests matching evidence**.
- Reads the GLB mesh POSITION accessor count and recomputes geometric metrics from UG-IR layout. Refuses inconsistent 'passed' metrics.
- Enforces distinct maker/reviewer agent and session identifiers, review receipt, exact contact/reference hashes, and human-approval binding to the final GLB hash. **Ed25519 reviewer and human approval signatures** must verify against two separately provisioned trusted public keys; without both, output is BLOCKED.
- Explicit Three.js Y-up/meters to canonical Z-up/centimeters converter, with round-trip tests.
- **17 passing local test cases in an isolated Node.js validation fixture**, including refusal of a fake visual PASS, missing approval, mismatched geometry, tampered files, path traversal and phase skipping.

## What is **not** implemented yet

- A working Visual Language Model/independent critique provider, isolated session attestation or trusted human-signature backend.
- Production Blender/headless mesh generation, full 16-view rendering and camera raycast measurements.
- Actual physics/rig/skinning/collider validation, non-AABB meshes, anchor placement or CSG geometry; these are currently **unsupported** by the bounded native linter and must not be marked PASS.
- End-to-end ChatGPT/DevSpace orchestration and authenticated tool authority enforced inside the Studio UI. The existing Studio endpoint is routing-only.
- Verification on the user's target Windows GPU/runtime or publication/merge acceptance.

This document is a **template and evidence boundary**, not authorization to claim the entire AI 3D Studio is complete.