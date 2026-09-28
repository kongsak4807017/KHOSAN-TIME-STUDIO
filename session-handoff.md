# Session Handoff

**Repository:** `kongsak4807017/KHOSAN-TIME-STUDIO`
**Branch:** `main`
**Studio source version:** `0.1.0`
**Status:** RUNNABLE SOURCE SHIPPED / LOCAL ACCEPTANCE PENDING

## What is now authoritative on GitHub

- Product vision and Creative Intelligence architecture
- 21-role Harness
- execution graph / human gates
- Tool Registry
- Asset/UG-IR direction
- local/self-host deployment guidance
- runnable Studio Web/API source
- Docker/Compose deployment source
- durable project-state API
- Agent Workboard API/UI
- pinned SkinTokens/UniRig provenance
- bounded rigging adapters and setup/doctor scripts
- source verification scripts
- DevSpace MCP Connectivity Pack (ngrok/Cloudflare provider options)
- persistent ChatGPT workspace contract

## Runtime baseline

Direct:
```bash
node scripts/verify-source.mjs
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

## Important architecture boundary

The v0.1 web server is **not the ChatGPT LLM**.

- ChatGPT = role reasoning / agent behavior
- DevSpace = bounded local execution
- Studio Web/API = creator UI, project persistence, routing/state surface
- GitHub = master Studio source of truth
- external GPU tools = registered/pinned workers through adapters

No generic shell execution is exposed over HTTP.

## Rigging decision

- SkinTokens / TokenRig: preferred EVALUATE P0 candidate.
- UniRig: expert/fallback staged path.
- External fork commits are pinned in `config/external-tools.lock.json`.
- Do not promote to ADOPT until humanoid + non-humanoid + runtime deformation fixtures pass.

## DevSpace connectivity profile

For ChatGPT-to-local workspace access:
```text
ChatGPT -> HTTPS tunnel -> DevSpace MCP 127.0.0.1:7676
```

The Studio Web/API remains `127.0.0.1:8080` and must not be exposed by the DevSpace tunnel in v0.1.

Verify with:
```bash
python tools/devspace-connectivity/doctor.py --require-public
```

Reuse the same DevSpace `workspaceId` while valid; do not restart tunnel/OAuth solely for a ChatGPT host-capability error.

## What remains unverified

A fresh local DevSpace checkout still needs to run:
1. `node scripts/verify-source.mjs`
2. `python scripts/harness_check.py`
3. `node --check apps/studio-server/server.mjs`
4. Python adapter syntax check
5. browser/API project-create smoke test
6. Docker Compose config/health test
7. GPU rigging doctor on the actual target PC
8. DevSpace local MCP doctor
9. public MCP tunnel doctor
10. ChatGPT workspaceId reuse + bounded write/test smoke task

Therefore `DEPLOY-001` remains `verify`, not `accepted`.

## Legacy blocker

The research reports in `knowledge/source-manifest.yaml` are still indexed rather than mirrored verbatim. Issue #1 remains open.

## Exact next action in DevSpace

Open/clone this repository, preserve the tree, run the acceptance matrix above, persist evidence, and patch only defects found. After acceptance, proceed with Concept Lab / Prototype Arena / UG-IR work.

## Startup instruction

> Operate as KHOSAN Studio Orchestrator. Read AGENTS.md, studio/studio_state.json, feature_list.json, progress.md and this handoff. Run v0.1 source/runtime verification before feature work. Preserve unrelated changes and record exact evidence.
