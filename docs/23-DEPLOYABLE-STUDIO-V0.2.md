# KHOSAN TIME STUDIO v0.2.0 — Multi-Project Local Studio Baseline

## Purpose

v0.2.0 moves KHOSAN from “a local Studio that can create project folders” to a **multi-project local production shell** with explicit project isolation.

The release is still local-first and trusted-local only. It does not add remote multi-user authentication or arbitrary filesystem access.

## What runs in v0.2.0

### Project Library

The Studio now maintains a lightweight local library at:

~~~text
<KHOSAN_PROJECTS_DIR>/
  .khosan-studio/
    library.json
~~~

The library tracks:
- discovered projects,
- one active project,
- last-opened metadata,
- relative project locations.

Existing v0.1 project directories remain discoverable.

### Active project

One interactive Studio session resolves one active project.

The shell header exposes an active-project selector and the Projects view provides explicit activation.

Production routing includes the resolved `project_id` and project root when an active project exists.

### New project layout

Creating a project initializes:

~~~text
projects/<id>/
  khosan-project.json
  project.json
  blueprint.json
  creative-constitution.json

  .khosan/
    project-state.json
    tasks/
    evidence/
    handoffs/
    decisions/
    reconstructions/
    cache/

  assets/
    source/
    characters/
    props/
    environment/
    textures/
    audio/

  world/
  gameplay/
  ui/
  narrative/
  shaders/
  tests/
  builds/
  concepts/
  experiments/
  tasks/
  events/
  artifacts/
~~~

The legacy folders are retained for compatibility while `.khosan/` becomes the project-scoped operational state surface.

### Portable manifest

`khosan-project.json` records:
- stable project ID,
- project schema version,
- Studio version,
- target,
- IR version pins,
- logical relative paths,
- Git/LFS policy.

It intentionally avoids machine-specific absolute paths.

### Workspace boundary API

~~~text
GET /api/projects/:id/workspace
~~~

returns:
- project ID,
- project root,
- write boundary,
- DevSpace root recommendation,
- explicit rule that sibling projects are not implicit context,
- configured shared resource roots.

This is descriptive/routing metadata. The HTTP API still cannot execute arbitrary shell commands.

### Project-aware orchestration

`POST /api/orchestrate` accepts an optional `project_id`. If omitted, the active project is used.

The routing response includes a project context when available.

This remains routing-only:
- ChatGPT = reasoning/agent execution,
- DevSpace = bounded local workspace/tool execution,
- Studio Web/API = local state, project selection and routing.

## API additions

~~~text
GET  /api/project-library
POST /api/projects/:id/activate
GET  /api/projects/:id/workspace
~~~

Existing project APIs remain available.

## Installation/data separation

Recommended installed topology:

~~~text
C:\Program Files\KHOSAN Studio\
  application/runtime

D:\KHOSAN\
  Projects\
  SharedAssets\
  Models\
  ToolData\
  Cache\
  Logs\
~~~

Development checkout may continue to fall back to repository-local `projects/`.

Configuration environment variables:

~~~text
KHOSAN_PROJECTS_DIR
KHOSAN_SHARED_ASSETS_DIR
KHOSAN_MODELS_DIR
KHOSAN_TOOL_DATA_DIR
KHOSAN_CACHE_DIR
KHOSAN_LOGS_DIR
~~~

Only `KHOSAN_PROJECTS_DIR` is actively used for project persistence in the current baseline. Other roots establish the separation contract for later tool/asset integrations.

## Project isolation contract

Project-scoped tasks use:

~~~text
studio/contracts/project-work-item.schema.json
~~~

and require `project_id`.

Studio-product tasks continue to use the existing root work-item schema because they modify KHOSAN Studio itself rather than a game.

## DevSpace contract

One project root maps to one reusable DevSpace workspace per continuous project session.

Switching projects changes the workspace root/context. Ending one chat/tool turn does not itself invalidate the workspace.

See `docs/19-CHATGPT-DEVSPACE-PERSISTENT-WORKSPACE.md`.

## Security boundary

v0.2 deliberately does not expose:
- arbitrary local path registration from the browser,
- generic shell execution,
- Git command execution over HTTP,
- secret management,
- public-network binding by default.

Projects are contained inside the configured `KHOSAN_PROJECTS_DIR`.

External arbitrary project import should later be implemented through a trusted desktop/native picker or other allowlisted mechanism, not a free-form HTTP path.

## Verification

Source-level:
- `node scripts/verify-source.mjs`
- `node --check apps/studio-server/server.mjs`
- `node --check apps/studio-web/public/app.js`

Required local acceptance:
1. launch Studio,
2. create Game A,
3. create Game B,
4. verify different roots and manifests,
5. activate A,
6. verify project switcher/header,
7. route an instruction and verify A's `project_id`,
8. switch to B,
9. verify routing now carries B's `project_id`,
10. restart Studio and verify Project Library / active project persistence.

## Still not production-complete

- native desktop installer/setup wizard,
- safe external-project import picker,
- project schema migration engine,
- Asset Registry,
- Shared Asset Library,
- World Editor,
- Asset Lab UI,
- full tool-worker fleet,
- UG-IR live preview,
- remote/team authentication.

These must build on the workspace contract rather than inventing independent storage roots.

## Canonical architecture

See `docs/22-MULTI-PROJECT-WORKSPACE-ARCHITECTURE.md`.
