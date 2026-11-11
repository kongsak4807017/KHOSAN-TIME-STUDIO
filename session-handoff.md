# Session Handoff

## 11 Nov 2026 — Trusted six-hard-lock implementation handoff
- Source of truth: private GitHub `kongsak4807017/KHOSAN-TIME-STUDIO`, draft PR #22, branch `docs/oriverse-weave-archive-20261111`. **Do not merge without independent QA and Executive Producer acceptance.**
- Follow `docs/29-TRUSTED-6-HARD-LOCKS-GATEWAY.md`; signed tool protocol is at `tools/harness-3d/trusted-gateway.mjs` and bounded differential patch core at `repair-protocol.mjs`.
- `npm run verify:gateway`: GitHub Actions signed-protocol tests PASS 29/29. `npm run verify:3d-harness`: PASS 17/17; `npm run verify:part7`: PASS 20/20 (run 43003471960). Later doc commits require up-to-date CI status checks.
- DevSpace Maker communicates through local named pipe and Maker key only. Gateway service and Reviewer/Human keys must be provisioned under separate Windows identities and ACLs. Studio HTTP exposes **only opt-in verified task state**, not mutation.
- **Not deployed or verified on target PC:** `C:\KHOSAN\KHOSAN-TIME-STUDIO` existed but was an empty non-Git directory. User must authenticate a real checkout before deployment; do not overwrite other game folders.
- Next priority: dedicate Windows service account/NTFS ACL, real renderer+camera measurements, isolated VLM reviewer with protected Ed25519 key, authenticated Human Approval backend, protection of main with required GitHub Actions check, real scene acceptance on GPU. Keep incomplete items BLOCKED, never fake PASS.


## Continuation: Part 7 six hard locks and Python review (11 Nov 2026)
- Current new source: Google Doc `AI 3D harness`, 114,348 characters including Part 7. Exact archive readback verified on `docs/oriverse-weave-archive-20261111`.
- Priority vulnerabilities in original Part 7 Python: hardcoded default HMAC secret, arbitrary/self-declared checker PASS, unknown patch targets silently ignored, arbitrary node field merge, no revision binding or real post-patch geometry regression check, no trusted gateway, no actual installed Git/CI enforcement.
- New bounded Python differential policy: `tools/ugir-geometry-linter/hard_lock_enforcer.py`; tests `scripts/test_part7_hard_locks.py` (**20/20 PASS** on local isolated Python environment); security audit `docs/28-PART7-HARD-LOCKS-SECURITY-REVIEW.md`.
- Existing separate Ed25519 signed 3D acceptance gate remains in `tools/harness-3d/gate.mjs`. These modules are not yet orchestrated as a mandatory Studio API workflow.
- Next: build trusted tool gateway/locked project-root writes, authentic critic and human signers, real GLB 16-view verification and protected required CI gate. Do not claim 100% LLM compliance from prompt or sample code.


## 2026-11-11 — AI 3D harness archival and verification foundation
- Active documentation branch for current work: `docs/oriverse-weave-archive-20261111`, draft PR #22 to main; `main` not changed.
- Read the connected `AI 3D harness` Google Doc and archived its complete extracted text, with source review distinguishing sample claims from verifiable implementation.
- New executable scripts: `tools/harness-3d/gate.mjs`, `layout-lint.mjs`, `coordinates.mjs`, `cli.mjs`; tests: `scripts/test-3d-harness.mjs` (17/17 isolated Node fixture tests PASS, including signed trust receipts).
- No actual independent vision provider, signed checker/human approval, complete mesh validation, Blender worker, Studio API wiring or real target Windows GPU acceptance exists yet.
- On next session: checkout the GitHub branch in a **real repo**, run `npm run verify:3d-harness` and `node scripts/verify-oriverse-archive.mjs`, then wire real adapters and run a reference-to-asset vertical slice; never accept a visual critic stub returning PASS.


**Repository:** `kongsak4807017/KHOSAN-TIME-STUDIO`
**Branch:** `main`
**Studio source version:** `0.2.0`
**Status:** MULTI-PROJECT SOURCE IMPLEMENTED / TARGET-PC RUNTIME ACCEPTANCE PENDING

## Authoritative additions on main

- `docs/22-MULTI-PROJECT-WORKSPACE-ARCHITECTURE.md`
- `docs/23-DEPLOYABLE-STUDIO-V0.2.md`
- `studio/contracts/game-project.schema.json`
- `studio/contracts/project-work-item.schema.json`
- Project Library + active-project APIs
- Studio header Project Switcher
- full new-project workspace initialization
- `khosan-project.json` portable manifest
- `.khosan/project-state.json`
- explicit project workspace/write boundary
- project-aware `/api/orchestrate`
- `scripts/smoke-multi-project.mjs`
- `npm run verify:workspace`
- manual GitHub Actions workspace runtime smoke
- Reference Reconstruction Workflow remains canonical for reference-driven scene/asset/UI work

## Multi-project operating model

~~~text
KHOSAN Studio (install once)
        ↓
Project Library
  ├─ Game A
  ├─ Game B
  └─ Game C
        ↓
one active project
        ↓
one project root / write boundary
        ↓
one reusable DevSpace workspace per continuous project session
~~~

Shared tools/models may be reused. Game source/state/assets are isolated.

Project-scoped work items require `project_id`. Studio-product tasks continue to use the root Studio task schema.

## Runtime baseline

Direct:
```bash
node scripts/verify-source.mjs
npm run verify:workspace
node apps/studio-server/server.mjs
```

Windows:
```powershell
.\scripts\bootstrap.ps1
.\scripts\run-studio.ps1
```

Docker:
```bash
docker compose up --build
```

Open:
`http://127.0.0.1:8080`

## Important trust boundary

The v0.2 web server is **not the ChatGPT LLM** and is not an arbitrary local-file manager.

- ChatGPT = role reasoning / agent behavior
- DevSpace = bounded local execution rooted at the selected game project
- Studio Web/API = Project Library, active project, durable project state and routing
- GitHub = master Studio source of truth
- external GPU tools = registered/pinned workers through adapters

No generic shell execution is exposed over HTTP.
No arbitrary external filesystem project path is accepted through the browser in v0.2.

## Project root configuration

Development fallback:
```text
<KHOSAN-TIME-STUDIO>/projects
```

Installed target:
```text
KHOSAN_PROJECTS_DIR=D:\KHOSAN\Projects
```

Additional separation contracts:
```text
KHOSAN_SHARED_ASSETS_DIR
KHOSAN_MODELS_DIR
KHOSAN_TOOL_DATA_DIR
KHOSAN_CACHE_DIR
KHOSAN_LOGS_DIR
```

Only project persistence is active today; other roots establish the boundary for later Asset/Tool work.

## Verification completed this session

Source-level verification:
- server syntax PASS
- app syntax PASS
- workspace smoke script syntax PASS
- verify-source syntax PASS
- feature/state/schema/task/evidence/package JSON PASS
- required Project Library / activate / workspace / manifest / project_context markers PASS

## Runtime acceptance still required

On the target PC:
1. `node scripts/verify-source.mjs`
2. `npm run verify:workspace`
3. launch Studio and open the browser
4. create/activate two real test projects and inspect the Project Switcher
5. verify routing follows the active project
6. verify Project Library survives restart
7. verify one project root → one reused DevSpace workspaceId
8. `python scripts/harness_check.py`
9. Docker config/health if Docker mode is needed

Therefore `WORKSPACE-001` remains `verify`, not `accepted`.

## Exact next product action after acceptance

Build **Asset Registry / Asset Lab** against this project-root contract. Do not let Asset Lab or World Editor create a second independent storage-root model.

## Startup instruction

> Operate as KHOSAN Studio Orchestrator. Read AGENTS.md, studio/studio_state.json, feature_list.json, progress.md and this handoff. Resolve the active game project before any project-scoped production work. Run v0.2 source/workspace verification first. Preserve unrelated changes and record exact evidence.
