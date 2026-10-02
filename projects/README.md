# Local game projects

KHOSAN Studio uses this directory as the **development fallback Project Library** when `KHOSAN_PROJECTS_DIR` is not configured.

For an installed Studio, prefer a separate user-data location such as:

~~~text
D:\KHOSAN\Projects
~~~

The Studio installation/source repository and game projects are independent lifecycles.

Runtime-created projects are intentionally gitignored in the **Master Studio repository**. A real game should use its own Git repository/versioned workspace rather than silently sharing KHOSAN Studio history.

## v0.2 project layout

~~~text
<project-id>/
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
  artifacts/
~~~

The Project Library index is stored separately at:

~~~text
<KHOSAN_PROJECTS_DIR>/.khosan-studio/library.json
~~~

It stores navigation/active-project state; it is not authoritative game content.

See `docs/22-MULTI-PROJECT-WORKSPACE-ARCHITECTURE.md`.
