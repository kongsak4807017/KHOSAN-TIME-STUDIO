# Context Routing Index

## Always load
- AGENTS.md
- studio/studio_state.json
- active work item
- current role file
- progress.md
- session-handoff.md

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
Asset pipeline, 2D/3D tool docs, material/animation constraints.

### Technical Architect
UG-IR, architecture, relevant research/specification and target constraints.

### Gameplay Programmer
Active design/system contract + nearest source/tests.

### Rendering Engineer
Only renderer reports relevant to the active feature: PBR, clustered lighting, shadows, SSAO, compute/instancing, post-processing, terrain, skinning.

### Engine Adapter
UG-IR + target backend/export contracts.

### QA / Reviewer
Acceptance criteria, changed files, handoff/evidence, minimal specs needed to judge.

### Release/Ops
Deployment, packaging, benchmark and actual build configuration.

## Rule
If a named source is absent, record missing context; do not invent its contents.
