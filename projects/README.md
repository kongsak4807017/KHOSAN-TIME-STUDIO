# Local game projects

KHOSAN Studio creates durable game-project state under this directory by default.

Runtime-created project directories are intentionally gitignored in the **Master Studio repository**. A game that becomes a real product should be promoted into its own repository or explicitly versioned workspace rather than silently mixed into KHOSAN Studio's source history.

Each v0.1 project starts with:

~~~text
<project-id>/
  project.json
  blueprint.json
  creative-constitution.json
  events/
  artifacts/
~~~

The Studio API can use another location through `KHOSAN_PROJECTS_DIR`.
