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
Product vision, GDD/world/narrative docs. Avoid renderer reports unless feasibility requires them.

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
