# Context Routing Index

## Always load
- AGENTS.md
- studio/studio_state.json
- active work item
- current role file
- progress.md
- session-handoff.md

## Project workspace boundary

For project-scoped production, resolve the active `project_id` and project root before loading specialist context. Load `khosan-project.json`, `.khosan/project-state.json`, the project-scoped work item, and only files inside that project plus explicitly allowed shared resources. Sibling game projects are never implicit context.

See `docs/22-MULTI-PROJECT-WORKSPACE-ARCHITECTURE.md`.

## Load on demand


### Creative / Game Design / Narrative
Product vision, Creative Constitution, GDD/world/narrative docs. Avoid renderer reports unless feasibility requires them.

### Creative Intelligence Council
Load docs/12-CREATIVE-INTELLIGENCE.md plus only the evidence domain needed for the task.
- Cultural/Trend: research question + source set/time window.
- Player Experience: Creative Constitution + prototype/playtest observations.
- Concept Inventor/Critic: bounded concept brief + relevant research; do not preload production internals.
- Audience Researcher: audience question + source context; avoid sensitive-trait inference.
- Community Intelligence: approved community sources + collection period/population.
- Telemetry Analyst: metric definitions + event schema + population/time window + data-quality notes.
- Live Game Designer: Constitution + community/telemetry findings + experiment history.

Community and telemetry agents must not treat chat memory as evidence.

### Trusted six-lock 3D command dispatcher (active architecture)
Start with `docs/29-TRUSTED-6-HARD-LOCKS-GATEWAY.md` for the actual signed-role gateway and local IPC commands. Load `tools/harness-3d/repair-protocol.mjs` for permitted coordinate edits, `trusted-gateway.mjs` for server-verified state transitions, and `gateway-daemon.mjs`/`gateway-client.mjs` for the local DevSpace bridge. The server's `/api/projects/:id/harness/:taskId/status` is **read-only and opt-in**; no browser mutation or human approval button is exposed. The hard-lock mechanism is not a Windows sandbox until a protected service principal, external issuer private keys and ACLs are provisioned and tested.

### Reference-to-3D / native harness execution
For 3D assets and reference scenes, load `docs/27-HARNESS-3D-EXECUTION-CONTRACT.md`, the authored template review at `knowledge/oriverse-research/harness-blueprint/README.md`, then only relevant source sections from the preserved `AI-3D-HARNESS-SOURCE.txt`. The Google Doc includes demonstration code with a **fake independent-critic PASS** and must not be used verbatim as QA. Run native deterministic tests and `tools/harness-3d/cli.mjs` on actual project-scoped artifact/evidence files. Its supported linter is bounded boxes only. The LLM may plan, repair and request checks, but cannot declare acceptance without receipts and human governance.

### Part 7 hard-lock implementation review
Before following the Google Doc's **6 Hard Locks**, read `docs/28-PART7-HARD-LOCKS-SECURITY-REVIEW.md`. The original Python sample is **not safe as a production gate**. For bounded +Z-up centimeter AABB repair, prefer `tools/ugir-geometry-linter/hard_lock_enforcer.py`, independently run `npm run verify:part7`, and require a trusted server-side tool dispatcher + existing signed evidence gate. The module is not globally wired into DevSpace, so simply showing the AI the schema or agent instructions is **not** proof of hard enforcement.

### Asset Synthesizer
Asset pipeline, 2D/generic-3D/character tool docs, `docs/20-CHARACTER-FACTORY.md` for character work, material/animation/wearable constraints.

### Technical Architect
UG-IR, architecture, relevant research/specification and target constraints.

### Historical Oriverse / Weave research (load only when relevant)
Read `knowledge/oriverse-research/README.md`, then the specific `consolidated-audit/TRR-XX.txt` plus `CONSOLIDATED-AUDIT-MANIFEST.json`. This is the complete **consolidated user audit** covering 200 research questions, **not** all 200 original chat transcripts and not KHOSAN-authoritative implementation. Preserve the question-level Documented/Observed/Inferred/Undisclosed status and provenance. Do not use external Oriverse tools or make Oriverse a dependency; implement a KHOSAN-native equivalent only after technical validation and approval.


### Gameplay Programmer
Active design/system contract + nearest source/tests.

### Rendering Engineer
Only renderer reports relevant to the active feature: PBR, clustered lighting, shadows, SSAO, compute/instancing, post-processing, terrain, skinning.

### Engine Adapter
UG-IR + Asset/Character IR + target backend/export contracts. Load `docs/20-CHARACTER-FACTORY.md` when skeleton/animation/socket/wearable semantics are involved.

### QA / Reviewer
Acceptance criteria, changed files, handoff/evidence, minimal specs needed to judge. For character work load the Character Factory QA contract without preloading unrelated renderer research.

### Release/Ops
Deployment, packaging, benchmark and actual build configuration.

## Rule
If a named source is absent, record missing context; do not invent its contents.
