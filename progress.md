# KHOSAN TIME STUDIO Progress

## Current phase
**PORTABLE LOCAL 3D SOURCE RELEASE PUBLISHED AND READ BACK — NO ACTIVE WORK ITEM; STUDIO BROWSER ACCEPTANCE REMAINS OPEN**

## Released — `TASK-LOCAL3D-PORTABLE-001`

- Prepared the portable publication candidate separately from the accepted owner-PC r6 runtime. The original runtime, source snapshots and reviewed artifacts remain untouched. This task does not replace episode sources or the Studio browser-acceptance backlog.
- Added checkout-relative `scripts/local3d.py` setup/doctor/proof/serve/config commands, Windows and Bash wrappers, locked Python dependencies, explicit Blender forwarding, and generated UTF-8 machine/MCP configuration. Machine-specific settings, environments and caches remain local.
- Portable implementation SHA-256: `59038921d1a2e6de25dbb9c35bbef58e0778681b2685309c234daa659554e821`.
- Fresh Windows checkout containing spaces and Thai characters: new virtual environment and locked dependencies installed; official MCP SDK standard proof **PASS** using Python 3.12.10, Blender 5.2.2 LTS and MCP SDK 1.29.0. Job `job-d51740b6569f4a17` contains 428,900 triangles and 41 editable mesh parts. Cold build 30.094 s; verified warm-cache request 0.047 s.
- Fresh optional standalone runtime: `npm ci` and managed Chrome Headless Shell setup reached READY. Actual Windows rendering returned `PASS_STANDALONE_STATIC_GLB_LTC_STILLS`: six native 960×540 captures/control checks, 39 unchanged source/runtime/input fingerprints, zero browser errors and identical repeated frame-45 PNG. This is separate from private Harness V4 source verification.
- Linux Python 3.12.14 / Blender 4.3.2: full official MCP **draft** proof PASS on CPU, recorded at 108.1264 s. Standard CPU rendering was interrupted and is not a completed standard proof. Standalone dependency installation and contained bundling passed, but the test environment blocked the browser's local socket operation; no Linux V4 stills were produced. macOS rendering is untested.
- Final local Python suite: Linux **39 tests, OK, 3.518 s**; Windows **39 cases, 38 PASS plus one expected symlink-privilege skip, 3.402 s**. The new `.github/workflows/local3d-verify.yml` is manual-only and has not been run on GitHub; local results do not imply hosted CI execution.
- Documented explicit `--quality draft` previews at 640×360 / 8 samples with unchanged model geometry; `standard` preserves the original fixture settings and remains the default. New draft/standard jobs receive their own source/artifact identity and review status.
- Added the bilingual portable runbook, current-root quick starts and historical r6 image gallery. Technical installation/build/renderer results are separate from fresh visual review and human acceptance; no old artistic PASS is copied onto a new artifact set.
- Canonical portable evidence: `studio/evidence/TASK-LOCAL3D-PORTABLE-001.json`; public reproduction summary: `docs/examples/local3d/portable-proof.json`. Read the historical r6 and prop artifacts through their respective task evidence/handoff records below.
- **Publication complete:** the main source release was updated and read back at `2026-11-11T18:36:49Z`. Source release commit: [`73f468e3ea0b883bf47271b8f48b2efd93f81069`](https://github.com/kongsak4807017/KHOSAN-TIME-STUDIO/commit/73f468e3ea0b883bf47271b8f48b2efd93f81069); tree `c77249169402b69cb117847cd1a92899af35d79b`. The non-force update used expected base `38ae23cb08829e1867dfac05293e4f3e5683aff2`. All 91 changed blob SHAs and modes matched readback; 147 unrelated base blobs remained unchanged.
- Historical r6 source commit [`f0be220249df92f81d249058dfeec5d4f425d13e`](https://github.com/kongsak4807017/KHOSAN-TIME-STUDIO/commit/f0be220249df92f81d249058dfeec5d4f425d13e) is an ancestor of the source release. The owner-PC accepted runtime and artifacts remain separate and untouched.
- Independent overall publication review returned **ACCEPT** bound to this release. Read the [publication receipt](docs/examples/local3d/publication-receipt.json) and [independent publication review](docs/examples/local3d/independent-publication-review.json) for the recorded identities and scope. Publication acceptance does not remove the stated platform, reference-detail or human-art limits.
- This status/evidence update belongs to the following **metadata-only closure commit**. Its Git identity is separate from source release commit `73f468e3ea0b883bf47271b8f48b2efd93f81069` and from the reproduced implementation digest `59038921d1a2e6de25dbb9c35bbef58e0778681b2685309c234daa659554e821`. The source-release readback counts above apply to the source release, not to later metadata changes. The task is **released**; no work item remains active.

## Historical: 12 November 2026 (Asia/Bangkok) — reference-guided elephant trial

- Created an editable static elephant from the owner's supplied reference using local procedural Blender modeling. Trellis2 was not used. The original PNG is preserved and hashed.
- Final Windows job `job-bd3b994f2785413c`: 428,900 triangles, 41 editable parts, overall height 3.0 m, self-contained GLB and native BLEND, four 1280×720 previews. GLB reimport preserves topology, semantic identity and bounds.
- Actual official MCP proof: 11 tools, image delivery, cold build 26.328 s, verified warm-cache request 0.047 s. The cache reuses verified artifacts.
- Schema/core extension tests: Linux 30 PASS; Windows 29 PASS plus one expected symlink-privilege skip. A real headless Blender budget probe on Linux rejected an excessive first mesh before constructing the subsequent elephant.
- Independent review retained r4/r5 REWORK, then accepted r6 after the ear-center and skin-pattern repairs. Recorded through actual MCP as `review-7f2be586e1a6.json`; current integrity, technical, export and visual review PASS.
- Actual separate V4 rendering passed on installed Three 0.187.0 / Remotion 4.0.542: linked LTC GPU program, three rectangular lights, LTC-off and separate shadow-off controls, repeat-frame equality, zero browser errors and 41 unchanged fingerprints.
- Appearance limits remain: fine face/skin/ear detail is simplified; V4 is darker/browner, with a heavier shadow and faint shadow-proxy edge. This is acceptance of a static modeling and lighting trial. Human art acceptance remains NOT_REVIEWED and production_ready remains false.
- Added `OPEN_LOCAL3D_ELEPHANT.bat`, `docs/26-LOCAL-3D-ELEPHANT.md`, Thai runbook updates, task evidence/handoff and preserved source snapshots. Existing episodes and the Studio browser-acceptance backlog remain unchanged.

## Historical: 11 November 2026 — local headless 3D implementation

- Installed the verified 155-file GitHub baseline on the owner's Windows PC; all original Git blob hashes matched commit `38ae23cb08829e1867dfac05293e4f3e5683aff2` before additive work. At that historical stage it was a source snapshot without `.git`, and the new local 3D additions had not been published.
- Added `tools/local_3d_mcp`, isolated SDK environment, Windows launchers, MCP client example, Thai runbook and separate V4 provider/verifier.
- Actual Windows MCP-to-Blender proof: 11 tools, image delivery, editable BLEND/GLB, four views, 9 semantic objects / 66 editable parts / 39,304 triangles, matching GLB readback. Cold build 11.578 s; verified warm cache request 0.031 s.
- Contract tests: Linux 28 PASS; Windows 27 PASS plus one expected symlink-privilege skip. Real-GLB Three provider tests: 16 PASS.
- Separate V4 render on installed Remotion 4.0.542 / Three 0.187.0: native frames 0 and 45, repeated frame hash identical, hidden-asset control and 33 unchanged source fingerprints. No original episode source changed; no video was produced.
- Independent code and Windows image review: ACCEPT for static v0.1. Recorded through real MCP as `review-23e41bbb2d8c.json`; current integrity, technical, export and visual checks PASS. Human art remains NOT_REVIEWED; production_ready remains false.
- `TASK-LOCAL-3D-MCP-001` is accepted. Evidence and handoff are under `studio/evidence/` and `studio/handoffs/` with that task ID. See `docs/25-LOCAL-3D-MCP.md` for scope and exact paths.
- Existing Studio source/API/workspace checks also PASS on Windows. Studio browser acceptance, Docker and external rigging checks remain separate pending work.


## Previously shipped Studio baseline on GitHub main

This section describes the pre-existing Studio baseline. The completed portable local 3D source release is tracked separately by `TASK-LOCAL3D-PORTABLE-001` and its publication receipt above.

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

### Baseline source verification
- server source syntax parses
- browser app source syntax parses
- workspace smoke-test source syntax parses
- source-verification script syntax parses
- feature/state/project schemas/task/evidence/package JSON parse successfully
- multi-project API/source markers verified on GitHub main
- Project Library / active-project / workspace / manifest integration is present in source

### Remaining target-PC/runtime acceptance
Source, harness and multi-project API/restart smoke tests passed on Windows on 11 November 2026. Remaining:
- browser Project Hub / switcher smoke test
- `docker compose config` and container health
- rigging doctor on the actual GPU machine
- DevSpace local/public MCP connectivity doctor
- complete Studio DevSpace connectivity-pack acceptance if that deployment mode is needed; current task reused the same bounded Studio workspace successfully

`WORKSPACE-001` and `TASK-MULTI-PROJECT-WORKSPACE-001` remain **verify** while visual browser acceptance is pending; their API/workspace smoke is now verified.

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

## Future bounded work — no active item

1. Select a new bounded work item when continuing production. Portable source publication and its source-commit readback are complete.
2. Keep the accepted owner-PC r6 runtime and historical task artifacts separate and untouched. Use `python scripts/local3d.py` from the current checkout for new installations/proofs; see `docs/27-LOCAL3D-PORTABLE-INSTALL.md`.
3. Read fresh image-review records before calling new artifacts artistically accepted. Any finished-episode pass should separately address finer reference detail, V4 tone and the known shadow-proxy edge; further recipes need their own fixture and review.
4. Browser smoke Project A ↔ Project B and verify active context visually. Preserve one project root → one reusable DevSpace workspace.
5. Promote `WORKSPACE-001` from `verify` to `accepted` only after its own remaining checks.
6. Build Asset Registry / Asset Lab on top of the project workspace contract, then World Editor after isolation is stable.

## Rule
Update this file from evidence, not optimism.

