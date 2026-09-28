# KHOSAN TIME STUDIO v0.1.0 — Deployable Source Baseline

## Purpose

This release turns the Master Repository from architecture-only foundation into a **runnable local Studio shell** while preserving the rule that unimplemented AI/tool capabilities are not represented as complete.

## What runs now

### Studio Web/API
Zero-dependency Node.js 20 server:
- Studio Home
- Idea / Concept Lab
- Projects
- Agent Workboard backed by `studio/tasks/*.json`
- Tool Registry/provenance
- health endpoint
- durable local project creation
- Blueprint persistence
- Creative Constitution persistence
- event log
- deterministic intent-to-role routing helper

### Project files

Creating a project initializes:

~~~text
projects/<id>/
  project.json
  blueprint.json
  creative-constitution.json
  concepts/
  experiments/
  tasks/
  events/
    events.jsonl
  artifacts/
~~~

These files are local project state and are not hidden in browser storage.

### Rigging tool adapter

KHOSAN now has a stable local adapter boundary:

~~~text
tools/adapters/rigging/
  doctor.py
  rig.py
  validate.py
~~~

External sources are pinned in:

~~~text
config/external-tools.lock.json
~~~

Pinned baseline:
- SkinTokens: 273b691d35989d71cd17ff2895fdc735097b92d1
- UniRig: 6793c6640ff01c8fb389f3993434124bb43d2933

Status remains EVALUATE until local GPU fixtures pass.

## Run directly

Prerequisites:
- Node.js 20+
- Python 3.11+ only when running Python harness/tool checks

Windows:

~~~powershell
git clone https://github.com/kongsak4807017/KHOSAN-TIME-STUDIO.git
cd KHOSAN-TIME-STUDIO
.\scripts\bootstrap.ps1
.\scripts\run-studio.ps1
~~~

Linux/macOS:

~~~bash
git clone https://github.com/kongsak4807017/KHOSAN-TIME-STUDIO.git
cd KHOSAN-TIME-STUDIO
chmod +x scripts/*.sh
./scripts/bootstrap.sh
./scripts/run-studio.sh
~~~

Open:

~~~text
http://127.0.0.1:8080
~~~

## Run with npm shorthand

No npm dependency installation is required for v0.1.0.

~~~bash
npm run verify:source
npm run studio
~~~

## Docker

~~~bash
docker compose up --build
~~~

The Compose mapping binds to localhost:

~~~text
127.0.0.1:8080
~~~

Do not expose the current Studio API directly to the public internet. Authentication/tenant security is a later production-hardening phase.

## Install rigging source pins

This checks out external sources only. It does not silently install CUDA/PyTorch/checkpoints.

Windows:

~~~powershell
.\scripts\setup-rigging.ps1
~~~

Linux/macOS:

~~~bash
./scripts/setup-rigging.sh
~~~

Then follow the dependency/setup requirements in `docs/16-3D-AUTO-RIGGING.md` and run:

~~~bash
python tools/adapters/rigging/doctor.py
~~~

A BLOCKED doctor result is expected on machines without an appropriate NVIDIA/CUDA environment.

## ChatGPT + DevSpace

The local Studio is not a substitute for ChatGPT. In v0.1:

- ChatGPT = reasoning/agent role execution
- DevSpace = local filesystem/build/tool execution
- KHOSAN Studio Web/API = durable project shell/state/routing surface
- GitHub = master source of truth
- DevSpace connectivity tunnel = optional transport layer when ChatGPT needs to reach the local MCP server

When remote MCP connectivity is needed:

~~~text
ChatGPT -> ngrok/Cloudflare -> DevSpace MCP 127.0.0.1:7676
~~~

Do not use that tunnel to expose the Studio Web/API on port 8080.

Connectivity verification:

~~~bash
python tools/devspace-connectivity/doctor.py --require-public
~~~

See `docs/18-DEVSPACE-CONNECTIVITY.md` and `docs/19-CHATGPT-DEVSPACE-PERSISTENT-WORKSPACE.md`.

Recommended DevSpace entry:

> Operate as KHOSAN Studio Orchestrator. Read AGENTS.md, studio/studio_state.json, studio/graph.md, progress.md and session-handoff.md. Run source/harness verification first. Work only from a bounded task and preserve unrelated changes.

## API baseline

~~~text
GET  /api/health
GET  /api/studio
GET  /api/projects
GET  /api/tasks
POST /api/projects
GET  /api/projects/:id
PUT  /api/projects/:id/blueprint
PUT  /api/projects/:id/creative-constitution
POST /api/projects/:id/events
POST /api/orchestrate
~~~

`POST /api/orchestrate` is intentionally **routing-only** in v0.1. It does not pretend a local web server is the ChatGPT LLM.

## Trust boundary

The current server deliberately has:
- no generic shell endpoint,
- no arbitrary command execution endpoint,
- no secret-management endpoint,
- no public-network default bind,
- bounded project IDs/paths,
- request body size limit.

Tool execution remains behind DevSpace/registered adapter boundaries.

## Next deployable milestones

1. Concept Lab artifact editor using the existing Creative Intelligence schemas.
2. Prototype Arena.
3. Agent task/workboard persistence from standard work-item schemas.
4. Tool worker process with allowlisted adapter calls.
5. Asset Registry.
6. UG-IR v0.1 fixture viewer/runtime bridge.
7. WebGPU live preview.
8. QA evidence UI.
9. Authentication before remote/team exposure.
