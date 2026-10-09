# Existing Game Registration and Source Index v0.1

## What works
1. Configure KHOSAN_PROJECTS_DIR to the parent folder of existing game folders.
2. Open Projects → Scan existing folders → select folder → Register selected folder. Only immediate child directories without project.json are candidates.
3. Registration creates **only** project.json (exclusive create), preserving existing assets and source files; does not overwrite an existing project manifest.
4. Open a registered project to view inventory and source index. GET /api/projects/:id/source-index indexes known code extensions in assets/world/gameplay/ui/narrative/shaders/tests/builds.
5. Index includes path, language, line count, imports and declarations, not raw source text. Read-only; bounded 2,000 inventory files, 250 source files, 128 KiB each; skips symlinks, dot folders, node_modules, and sensitive filenames.
6. Run npm run verify:unified and python scripts/harness_check.py.

## Known limitations
- Legacy folders **outside** KHOSAN_PROJECTS_DIR are not importable via HTTP; configure the parent root and restart Studio. No unrestricted filesystem picker or drive-wide search.
- A source index is not an AST, semantic compiler, full dependency graph or AI agent. This is metadata extraction only; regex declaration detection can miss syntax.
- Registered legacy projects may lack blueprint.json and khosan-project.json. They are intentionally not synthesized to avoid modifying game state.
- The Studio remains routing-only; actual ChatGPT/DevSpace work requires a connected agent workflow and explicit project root.
- Only localhost deployment is within this security model; no remote exposure.
- If source code lives outside the standard game subfolders, it will not be indexed yet. Extend roots with a reviewed schema, not arbitrary HTTP paths.
- No target-PC browser acceptance recorded for this increment.
