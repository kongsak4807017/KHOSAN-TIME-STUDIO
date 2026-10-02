# KHOSAN Multi-Project Workspace Architecture

## Status

**Canonical local workspace architecture**

KHOSAN Studio is installed once. Game projects are independent workspaces and may be created, opened, switched, backed up and versioned independently.

Core rule:

> **Studio installation != Game project != Shared production tools != Regenerable cache**

This separation is required before Asset Lab, World Editor and large binary production become primary authoring surfaces.

## 1. Installation model

Recommended Windows topology:

~~~text
C:\Program Files\KHOSAN Studio\
  Studio runtime / shell / adapters

D:\KHOSAN\
  Projects\
  SharedAssets\
  Models\
  ToolData\
  Cache\
  Logs\
~~~

The exact data drive is user-configurable. The source/development checkout may continue to use the repository-local `projects/` fallback.

Environment boundary:

- `KHOSAN_PROJECTS_DIR` — project library root.
- `KHOSAN_SHARED_ASSETS_DIR` — optional shared asset library.
- `KHOSAN_MODELS_DIR` — optional shared model/checkpoint storage.
- `KHOSAN_TOOL_DATA_DIR` — optional tool installations/data.
- `KHOSAN_CACHE_DIR` — optional global regenerable cache.
- `KHOSAN_LOGS_DIR` — optional local logs.

Studio updates must not silently rewrite game projects or project schema versions.

## 2. Project Library

The Studio maintains a lightweight Project Library index under the configured project root:

~~~text
<ProjectsRoot>/
  .khosan-studio/
    library.json
  game-a/
  game-b/
  game-c/
~~~

The library index stores:
- registered project IDs,
- relative project location inside the library root,
- project name/status metadata,
- last-opened timestamp,
- one `active_project_id`.

The index is navigation state, not authoritative game content. Project truth stays inside each project.

## 3. One active interactive project

One Studio browser/session has exactly one active project at a time.

~~~text
Studio
  ├─ active → Game A
  ├─ inactive → Game B
  └─ inactive → Game C
~~~

Switching project means:
1. persist current project state,
2. select the new project ID,
3. load that project's manifest/state,
4. resolve the DevSpace workspace for that project root,
5. load only project-relevant context.

Background workers may later operate on multiple projects, but every background job must carry an explicit `project_id`.

## 4. Game Project Contract

New projects use this structure:

~~~text
<project-root>/
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
  events/
    events.jsonl
  artifacts/
~~~

Legacy v0.1 directories remain readable. New structure is additive and backward-compatible.

### `khosan-project.json`

Portable project manifest. It must not contain machine-specific absolute paths.

Required semantics:
- stable `project_id`,
- project schema version,
- Studio version that created/last opened it,
- target/runtime profile,
- IR version pins,
- Git policy,
- project-scoped state path,
- source/asset provenance policy.

## 5. Project isolation

Every project-scoped agent/tool operation must have:
- `project_id`,
- resolved `project_root`,
- allowed paths under that root,
- explicit shared-resource reads if required.

A project worker must never infer a sibling project as writable context.

~~~text
Project A worker
  WRITE → Project A only
  READ  → Project A + explicitly allowed shared resources
  DENY  → Project B / Project C
~~~

Cross-project copy/promotion is a separate governed operation.

## 6. Git model

Recommended production model:

~~~text
KHOSAN-TIME-STUDIO.git     # Studio product source

Game-A.git                 # independent game
Game-B.git
Game-C.git
~~~

Projects are not required to share the Studio repository history.

Each game may choose:
- its own Git remote,
- its own branch strategy,
- Git LFS / external binary asset storage,
- its own release cadence.

Project creation may initialize Git in a later bounded feature; v0.2 does not execute arbitrary Git commands from the Studio HTTP API.

## 7. DevSpace workspace mapping

Contract:

> **one project root → one reusable DevSpace workspaceId per continuous session**

~~~text
Game A → workspace A
Game B → workspace B
Game C → workspace C
~~~

When switching:
- reuse the known valid workspace for the selected root,
- open a new workspace only when none exists, the root changes or the existing ID is invalid,
- never treat a chat turn ending as a reason to destroy the workspace.

Workspace IDs are runtime/session data, not portable project truth.

## 8. Shared tools and models

Large production dependencies are installed once when practical:

~~~text
ToolData/
  sprite-gen/
  img2threejs/
  SkinTokens/
  UniRig/
  Blender adapters/
  ComfyUI/

Models/
  image/
  3d/
  rigging/
  audio/
~~~

Projects consume tools through the KHOSAN Tool Registry/adapters.

Do not duplicate multi-GB checkpoints inside every game unless a project intentionally pins a private copy.

## 9. Shared Asset Library

Project Asset Registries remain isolated.

A future Shared Asset Library may expose stable URIs such as:

~~~text
khosan://animation/humanoid/walk/v3
khosan://material/wood/aged/v2
~~~

Promotion from a project asset into the shared library is explicit and must preserve:
- provenance,
- license/rights,
- version,
- dependency graph,
- validation evidence.

No project should hard-code a machine-specific shared-library path into canonical game data.

## 10. Cache and build separation

### Global cache

Regenerable/downloaded common data:

~~~text
Cache/
Models/
ToolData/
~~~

### Project cache

Derived data specific to a game:

~~~text
<project>/.khosan/cache/
~~~

### Authoritative content

Must survive cache deletion:
- source code,
- approved source assets,
- project manifests/state,
- decisions,
- Asset Registry metadata,
- human-approved reconstruction references,
- build profiles.

## 11. Project schema migration

Opening a project created with an older schema must never silently migrate destructive data.

Expected UX:

~~~text
Project schema: 2
Studio supports: 3

[ Backup + Migrate ]
[ Open Read Only ]
[ Cancel ]
~~~

Migration implementation is future work; the manifest stores version information now so the contract exists before asset/world data becomes heavy.

## 12. Multi-project Studio Shell

The shell provides:
- Project Hub,
- active-project selector,
- Create Project,
- Open/Activate Project,
- project root visibility,
- per-project workspace contract,
- clear active-project identity in the header.

Every production surface added later (Asset Lab, World Editor, Logic Graph, QA, Build) must resolve the active project first.

## 13. API baseline

v0.2 adds/uses:

~~~text
GET  /api/project-library
GET  /api/projects
POST /api/projects
POST /api/projects/:id/activate
GET  /api/projects/:id
GET  /api/projects/:id/workspace
POST /api/projects/:id/events
POST /api/orchestrate
~~~

`POST /api/orchestrate` includes the active/resolved `project_id` in its routing response when available.

The HTTP API still exposes no generic shell execution.

## 14. Invariants

1. Studio is installed/updated independently from games.
2. Project IDs are stable and unique inside a library.
3. One interactive session has one active project.
4. Project-scoped work carries `project_id`.
5. Project writes are contained to the resolved project root.
6. Sibling projects are never implicit context.
7. Tools/models may be shared; project truth is not.
8. Canonical project manifests never persist machine-specific absolute paths.
9. Cache is regenerable; approved source/state is authoritative.
10. Project schema migration is explicit and reversible.
11. Studio HTTP API never becomes an arbitrary shell.
12. Asset Lab and World Editor must consume this workspace contract rather than inventing their own storage roots.

## Related

- `docs/06-LOCAL-DEPLOYMENT.md`
- `docs/19-CHATGPT-DEVSPACE-PERSISTENT-WORKSPACE.md`
- `docs/21-REFERENCE-RECONSTRUCTION-WORKFLOW.md`
- `studio/contracts/game-project.schema.json`
- `studio/contracts/project-work-item.schema.json`
