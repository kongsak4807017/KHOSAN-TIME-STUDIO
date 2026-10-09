# KHOSAN Game Folder Inventory — executable increment

Problem reproduced from source: Studio v0.2 read project.json and manifests but did not traverse game content directories. This made the local installation appear to ignore game systems.

Implemented on the active DevSpace checkout:
- read-only inventory of assets/, world/, gameplay/, ui/, narrative/, shaders/, tests/, builds/ for an explicit project_id;
- GET /api/projects/:id/inventory; project detail shows actual discovered files;
- /api/orchestrate includes a per-project inventory summary and existing canonical JSON documents, while remaining **routing-only**;
- bounds: max 2,000 files / depth 7, symlink skip, dot directory skip;
- temporary real-folder fixtures for API and inventory smoke tests.

This does **not** magically discover arbitrary game projects outside KHOSAN_PROJECTS_DIR, execute source code, infer the semantics of every gameplay script, or enable direct ChatGPT inside the local web UI.

## Correct folder
Set KHOSAN_PROJECTS_DIR to the **parent directory of the game project folders**. Each child must contain project.json with project_id matching the folder name. The default repository projects/ directory is an empty development fallback, not a scan of all game code on disk.

## Acceptance
Run `npm run verify:unified` and `python scripts/harness_check.py`; create/open a project and put files under its world/ or gameplay/ directory. Project detail should display their paths, and /api/projects/:id/inventory must include them. No approval for deployment/merge is implied by a smoke-test pass.

## Remaining blocker
For legacy game folders without project.json, create an explicit, secured import/registration workflow (native folder picker, validate root, backup, no destructive migration). Do not scan arbitrary machine drives and do not expose local filesystem reads over public HTTP.
