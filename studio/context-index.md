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
