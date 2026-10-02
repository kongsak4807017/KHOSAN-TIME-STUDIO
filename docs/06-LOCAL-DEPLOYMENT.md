# Local Installation and Deployment

## Important status

The repository now provides both the master architecture/harness **and a runnable local Studio Web/API baseline (v0.2.0)**.

Usable modes today:
1. Git repository + ChatGPT + DevSpace local workspace.
2. Local Studio Web/API via Node.js 20.
3. Trusted-local Docker deployment of the Studio Web/API.
4. Registered local tool adapters such as the SkinTokens/UniRig rigging boundary.

This is not yet a production remote/team service. Authentication, full tool-worker isolation, Asset Registry, UG-IR live runtime and WebGPU preview remain roadmap work.

## Stage 0 — Prerequisites

Recommended:
- Git
- Git LFS (once binary assets are enabled)
- Python 3.11+ for sprite tooling
- Node.js LTS for Studio/web tooling
- Docker Desktop or Docker Engine + Compose for packaged services
- modern browser with WebGPU support for native preview
- optional Blender for deterministic 3D/rigging fallback
- platform-specific GPU drivers

Do not install every tool globally. Prefer:
- project-local Node package manager state,
- Python virtual environments,
- Docker services where isolation is useful,
- explicit versions/pins.

## Stage 1 — Clone Master Repository

```bash
git clone https://github.com/kongsak4807017/KHOSAN-TIME-STUDIO.git
cd KHOSAN-TIME-STUDIO
```

## Stage 2 — Bootstrap harness

Linux/macOS:
```bash
chmod +x scripts/bootstrap.sh
./scripts/bootstrap.sh
```

Windows PowerShell:
```powershell
.\scripts\bootstrap.ps1
```

The bootstrap must remain non-destructive and should:
- inspect required files,
- report missing tool dependencies,
- show git status,
- never install paid/external services without consent.

## Stage 3 — Connect ChatGPT + DevSpace

Open the repository as a DevSpace local workspace.

Start with:

> Operate as KHOSAN Studio Orchestrator. Read AGENTS.md first. Inspect studio/studio_state.json and studio/graph.md. Select or create exactly one bounded work item. Do not modify production files outside allowed_paths.

Specialists can run in separate worktrees for independent tasks.

## Stage 4 — Install production tools

Tool installation is modular. Adopted tools should eventually expose:
- `tool doctor`,
- version output,
- deterministic input/output contract,
- local service/CLI adapter.

### sprite-gen
Keep it in its own Python virtual environment. Do not silently fall back to arbitrary system Python.

### img2threejs
Wrap via the KHOSAN 3D asset adapter; normalize outputs into Asset IR.

### P0 candidates
Physics/nav/material/optimization/QA tools are not “installed by assumption.” Each must receive an integration ADR and pinned version.

## Stage 5 — Local Studio shell (available baseline)

Current v0.2 topology:

The Studio installation is independent from game projects. One interactive session resolves one active project from the Project Library.

~~~text
Installed Studio / source checkout
        │
        ▼
Project Library
        │
   ┌────┼────┐
   ▼    ▼    ▼
Game A Game B Game C
   │
active project
   │
DevSpace workspace / project-scoped agents
~~~

Runtime topology:

```text
Browser / Desktop shell
        │
        ▼
KHOSAN Studio API / Orchestrator
        │
 ┌──────┼─────────┬──────────┐
 ▼      ▼         ▼          ▼
Asset  World   Preview    QA services
tools  tools   runtime    / Playwright
        │
        ▼
   Local project workspace
```

The Studio service exposes no generic shell endpoint. Tool execution remains behind DevSpace/registered adapters.

Run directly:
```bash
node apps/studio-server/server.mjs
```

or use `scripts/run-studio.*`.

## Stage 6 — Docker/self-host baseline

A local-only Compose stack now exists:
```bash
docker compose up --build
```

It binds to `127.0.0.1:8080` and persists projects through `./projects`.

The current container intentionally excludes CUDA/Blender/model checkpoints. GPU tools remain host workers until a dedicated GPU-worker image is validated.

Future service classes still planned:
- dedicated tool worker,
- WebGPU preview runtime,
- QA runner,
- authenticated team/remote gateway.

See `docs/23-DEPLOYABLE-STUDIO-V0.2.md`, `docs/22-MULTI-PROJECT-WORKSPACE-ARCHITECTURE.md` and `deploy/docker/README.md`.

## Configuration

Target convention:

```text
.env.example          # names only; no secrets
config/
  studio.local.yaml
  tools.local.yaml
  build-profiles.yaml
```

Secrets must remain outside git.

## Data and multi-project separation

Recommended installed layout:

```text
C:\Program Files\KHOSAN Studio\
  application/runtime

D:\KHOSAN\
  Projects\
  SharedAssets\
  Models\
  ToolData\
  Cache\
  Logs\
```

The project root is configured with `KHOSAN_PROJECTS_DIR`. Development mode may continue to use the repository-local `projects/` fallback.

Each game is an independent workspace with its own `khosan-project.json` and `.khosan/` operational state. Shared tools/models are not authoritative project data.

Large binaries should use Git LFS or an explicit asset store rather than normal Git history.

See `docs/22-MULTI-PROJECT-WORKSPACE-ARCHITECTURE.md`.

## Backup

Back up:
- project source/state,
- Asset Registry metadata,
- human-approved source assets,
- decision records,
- build profiles.

Regenerable caches should not be treated as authoritative backups.

## Release safety

Deployment must be gated by:
1. accepted work item,
2. QA evidence,
3. independent review,
4. reproducible build,
5. artifact identity/checksum,
6. human release approval,
7. rollback plan.

## Windows note

Do not make Bash the only supported lifecycle path. Maintain PowerShell parity for bootstrap/build commands used by ordinary Windows creators.

For a future packaged installer, install the application under Program Files (or the platform application directory) but keep Projects/Models/ToolData/Cache outside the application install directory. Updating KHOSAN Studio must not delete or silently migrate game projects.
