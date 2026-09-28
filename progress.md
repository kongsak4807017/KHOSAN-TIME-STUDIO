# KHOSAN TIME STUDIO Progress

## Current phase
FOUNDATION / MASTER REPOSITORY

## Master repository completed
- English and Thai master README
- Canonical Studio vision and architecture
- Create Game workflow
- 21 specialized agent role contracts (13 production/governance + 8 Creative Intelligence Council)
- Explicit execution graph and human gates
- Machine-readable tool registry
- Asset Pipeline and UG-IR direction
- Work-item / handoff / evidence schemas and templates
- ChatGPT + DevSpace local-workspace workflow
- Local/self-host deployment strategy
- Bootstrap scripts for Bash and PowerShell
- Structural harness checker
- Knowledge-management policy and source manifest
- Canonical master summary
- GitHub backlog issues #1–#11
- Creative Intelligence architecture, Creative Constitution, Prototype Arena and Community Intelligence specifications
- Creative Intelligence artifact schemas/templates
- Foundation task, evidence and handoff

## Creative Intelligence foundation
**Specified in repository, not yet a product UI.**

Completed:
- Council roles 13–20
- Discovery + Live Intelligence execution graph
- Creative Constitution contract
- Concept Hypothesis contract
- Prototype Experiment contract
- Community Insight and Telemetry Finding contracts
- Idea/Taste/Prototype/Community capabilities registered in Tool Registry

Still open:
- Idea/Concept Lab UI
- Prototype Arena runtime/workspace generation
- community source connectors
- telemetry/event infrastructure
- Experiment Board / creative evolution UI
- Fresh local execution of scripts/harness_check.py for TASK-CREATIVE-FOUNDATION-001

## Correctly still open
- Issue #1: mirror all legacy research source documents verbatim into knowledge/research/
- Run scripts/bootstrap from a fresh local checkout and record execution evidence
- Phase 1 Studio Shell
- P0 tool evaluation/adoption
- UG-IR v0.1 executable schema/fixtures

## Foundation verification status
**BLOCKED, not falsely marked Done.**

Reason: the master operating structure exists, but raw legacy research documents are indexed rather than mirrored verbatim, and local bootstrap has not yet been executed from a fresh checkout.

See:
- `studio/evidence/TASK-FOUNDATION-001.json`
- `studio/handoffs/TASK-FOUNDATION-001-to-next.json`
- `knowledge/source-manifest.yaml`

## Next implementation decision
After local mirror/bootstrap, begin:
1. Studio Shell + Idea/Concept Lab,
2. Prototype Arena,
3. Issue #4 — UG-IR v0.1 canonical fixtures.

## Rule
Update this file from evidence, not optimism.

## Asset Lab — Blender character master pipeline

**Implementation scaffold is in GitHub; verification is still open.**

Added under `TASK-ASSET-BLENDER-001`:
- Blender promoted to Core editable 3D DCC/master-asset stage.
- `.blend` defined as editable DCC master; `.glb` as derived runtime artifact.
- Spawn-inspired architecture note with verified-vs-inferred boundary.
- Versioned Blender character edit job schema.
- Safe headless adapter: doctor, validator, runner and Blender worker.
- Allowlisted operations for shape keys, visibility, transforms, bone parenting, custom properties and data-block rename.
- Example Ploy character edit job and pure-Python contract tests.
- ADR-0001 records the decision that ChatGPT + DevSpace remain the economical conversational/execution surface.

Still required before acceptance:
- fresh DevSpace harness check,
- adapter unit tests from the repository checkout,
- Blender doctor on the selected machine,
- one real GLB/BLEND → `.blend` master → GLB round-trip,
- deformation/material/export QA,
- Independent Reviewer acceptance.

The task must remain VERIFY/BLOCKED until those evidence items exist.

