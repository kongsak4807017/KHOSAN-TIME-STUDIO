# KHOSAN TIME STUDIO Progress

## Research integration — 11 November 2026 (3D harness)
- Preserved the complete 100,175-character extracted text of the user Google Doc `AI 3D harness` as supplemental reference research.
- Found an actual QA defect in illustrative Python: `IsolatedVisualCritic` has TODO then returns `passed: True`; this must never be adopted as a passing independent critique.
- Added KHOSAN-native bounded Z-up/cm layout linter, evidence/sha256 gate, CLI, explicit Y-up meter conversion, separate maker/checker and human approval metadata checks.
- Ran 17 Node tests in isolated local container: PASS 17/17, including Ed25519 review/approval signature checks. Source file readback from GitHub matched all 9 generated files; browser/Blender/VLM/GPU acceptance is pending.
- Draft PR #22 holds the archival/harness foundation; not merged. Work item TASK-3D-HARNESS-V1-001 remains verify.


## Current phase
**DEPLOYABLE STUDIO BASELINE v0.2.0 — MULTI-PROJECT WORKSPACE**

## Source shipped on GitHub main

### Master / Harness
- English and Thai master README
- Canonical Studio architecture
- 21 specialized role contracts
- Creative Intelligence Discovery + Live loops
- typed Studio work-item / handoff / evidence contracts
- project-scoped work-item contract requiring `project_id`
- human gates and maker/checker model
- Tool Registry
- Asset IR / UG-IR direction
- Reference Reconstruction Workflow
- Multi-Project Workspace Architecture
- knowledge/source manifest

### Runnable Studio v0.2
- zero-dependency Node.js 20 Studio Web/API
- Studio Home
- Idea / Concept Lab project creation
- Project Library persisted under `KHOSAN_PROJECTS_DIR/.khosan-studio/library.json`
- one active interactive project
- active-project header switcher
- explicit project activation API
- project workspace/write-boundary API
- project-aware intent routing
- new-project `khosan-project.json`
- new-project `.khosan/project-state.json`
- isolated production directories for assets/world/gameplay/ui/narrative/tests/builds
- Blueprint persistence
- Creative Constitution persistence
- project event log carrying `project_id`
- Agent Workboard backed by `studio/tasks/*.json`
- Tool Registry/provenance/shared-root view
- localhost-first trust boundary
- Thai project IDs decoded safely in API routes

### Multi-project verification source
- `scripts/smoke-multi-project.mjs`
- `npm run verify:workspace`
- creates two temporary projects
- verifies separate manifests/state/directories
- verifies active-project switching
- verifies project-aware orchestration
- restarts Studio and verifies active-project persistence
- manual GitHub Actions workflow includes the workspace smoke test

### Deployment
- DevSpace MCP Connectivity Pack (ngrok/Cloudflare provider-neutral profile)
- persistent ChatGPT workspace contract
- `Dockerfile`
- `compose.yaml` v0.2 image tag
- Bash and PowerShell run scripts
- source verification script
- manual-only GitHub Actions verification workflow
- v0.2 deployment documentation

### 3D rigging integration source
- SkinTokens preferred EVALUATE P0 candidate
- UniRig expert/fallback EVALUATE P0 candidate
- pinned upstream fork commits in `config/external-tools.lock.json`
- bounded `doctor.py`, `rig.py`, `validate.py`
- rigging source setup scripts
- CUDA/VRAM/flash-attn/checkpoint readiness checks

## Verification status

### Verified in this implementation session
- server source syntax parses
- browser app source syntax parses
- workspace smoke-test source syntax parses
- source-verification script syntax parses
- feature/state/project schemas/task/evidence/package JSON parse successfully
- multi-project API/source markers verified on GitHub main
- Project Library / active-project / workspace / manifest integration is present in source

### Pending target-PC/runtime evidence
Run from a fresh local checkout/DevSpace:
- `node scripts/verify-source.mjs`
- `npm run verify:workspace`
- `python scripts/harness_check.py`
- browser Project Hub / switcher smoke test
- `docker compose config` and container health
- rigging doctor on the actual GPU machine
- DevSpace local/public MCP connectivity doctor
- ChatGPT project-root workspaceId reuse and bounded read/write/test smoke

`WORKSPACE-001` and `TASK-MULTI-PROJECT-WORKSPACE-001` remain **verify** until the target-PC runtime smoke passes.

## Correctly still open
- safe native/desktop picker for importing arbitrary external project roots
- explicit project schema migration/backup UX
- per-project Git initialization/remote management UI
- Shared Asset Library
- Asset Registry
- Asset Lab
- World Editor
- Concept Lab full artifact editor
- Prototype Arena
- UG-IR v0.1 executable fixtures
- WebGPU live preview/runtime bridge
- community/telemetry connectors
- remote/team auth/security hardening
- animation-retargeting tool selection
- legacy research mirror Issue #1

## Next execution order
1. Fresh target-PC checkout → `node scripts/verify-source.mjs` + `npm run verify:workspace`.
2. Browser smoke Project A ↔ Project B and verify active context visually.
3. Confirm one project root → one reusable DevSpace workspace behavior.
4. Promote `WORKSPACE-001` from `verify` to `accepted`.
5. Build Asset Registry / Asset Lab on top of the project workspace contract.
6. Build World Editor only after Asset Registry/project isolation is stable.

## Rule
Update this file from evidence, not optimism.
