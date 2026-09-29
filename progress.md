# KHOSAN TIME STUDIO Progress

## Current phase
**DEPLOYABLE STUDIO BASELINE v0.1.0**

## Source shipped on GitHub main

### Master / Harness
- English and Thai master README
- Canonical Studio architecture
- 21 specialized role contracts
- Creative Intelligence Discovery + Live loops
- typed work-item / handoff / evidence contracts
- human gates and maker/checker model
- Tool Registry
- Asset IR / UG-IR direction
- knowledge/source manifest

### Runnable Studio v0.1
- zero-dependency Node.js 20 Studio Web/API
- Studio Home
- Idea / Concept Lab project creation
- durable local project state
- Blueprint persistence
- Creative Constitution persistence
- project event log
- Agent Workboard backed by `studio/tasks/*.json`
- Tool Registry/provenance view
- deterministic intent-to-role routing helper
- localhost-first trust boundary

### Human Engine v0.1
- Human Lab integrated into the Studio navigation
- stable `khosan.human-dna` v1 semantic contract
- body, face, appearance and lighting controls
- Native WebGPU procedural live preview with eye/hair/brow/detail material layers
- JSON DNA export and constrained random variations
- canonical-mesh WGSL compute kernel for morph evaluation + 4-joint LBS
- browser/GPU runtime acceptance intentionally remains pending until real WebGPU smoke evidence exists

### Deployment
- DevSpace MCP Connectivity Pack (ngrok/Cloudflare provider-neutral profile)
- persistent ChatGPT workspace contract
- `Dockerfile`
- `compose.yaml`
- Bash and PowerShell run scripts
- source verification script
- manual-only GitHub Actions verification workflow
- deployment documentation

### 3D rigging integration source
- SkinTokens preferred EVALUATE P0 candidate
- UniRig expert/fallback EVALUATE P0 candidate
- pinned upstream fork commits in `config/external-tools.lock.json`
- bounded `doctor.py`, `rig.py`, `validate.py`
- rigging source setup scripts
- CUDA/VRAM/flash-attn/checkpoint readiness checks

## Verification status

### Verified at GitHub/source level
- source files created on `main`
- core JSON files remain parseable through GitHub inspection
- Creative Intelligence role/graph structure previously verified
- deployment/source state is persisted and traceable

### Pending local environment evidence
The following must be executed from a fresh local checkout/DevSpace before `DEPLOY-001` becomes accepted:
- `node scripts/verify-source.mjs`
- `python scripts/harness_check.py`
- `node --check apps/studio-server/server.mjs`
- Python adapter compile check
- Studio browser smoke test
- `docker compose config` and container health
- rigging doctor on the actual GPU machine
- DevSpace local/public MCP connectivity doctor on the actual development PC
- ChatGPT workspaceId reuse and bounded DevSpace read/write/test smoke

## Correctly still open
- Issue #1: mirror legacy research archive verbatim
- Concept Lab full artifact editor
- Prototype Arena
- Asset Registry
- UG-IR v0.1 executable fixtures
- WebGPU live preview/runtime bridge
- community/telemetry connectors
- remote/team auth/security hardening
- animation-retargeting tool selection

## Next execution order
1. Fresh DevSpace checkout → run full v0.1 acceptance matrix.
2. Fix any environment/runtime defects found.
3. Promote `DEPLOY-001` from `verify` to `accepted`.
4. Continue Issue #8 Concept Lab and #9 Prototype Arena.
5. Build Asset Registry + UG-IR fixtures/live preview.

## Rule
Update this file from evidence, not optimism.
