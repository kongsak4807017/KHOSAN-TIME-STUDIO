# Local Installation and Deployment

## Important status

The repository currently provides the **master architecture/harness and deployment plan**. It is not yet a complete executable KHOSAN Studio UI/service distribution.

The usable mode today is:
**Git repository + ChatGPT + DevSpace local workspace + connected production tools.**

As executable Studio services are added, this document becomes the canonical self-host guide.

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

## Stage 5 — Local Studio shell (target)

Expected local topology:

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

The Studio service must never expose unrestricted shell execution to untrusted browser clients.

## Stage 6 — Docker/self-host target

Docker Compose becomes the preferred reproducible deployment only after executable services exist.

Planned service classes:
- `studio-web`
- `studio-api`
- `tool-worker`
- `preview`
- `qa-runner`

GPU-dependent tools may need host-specific deployment rather than a universal container.

See `deploy/README.md`.

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

## Data

Target local data separation:

```text
projects/          # user game projects
cache/             # regenerable generated/intermediate data
artifacts/         # build/export output
logs/              # local observability
tool-data/         # tool-specific caches/models
```

Large binaries should use Git LFS or an explicit asset store rather than normal Git history.

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
