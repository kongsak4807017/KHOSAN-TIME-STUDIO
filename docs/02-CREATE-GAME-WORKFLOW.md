# Create Game Workflow

## Creator flow

### Step 1 — New Game
The creator describes the game naturally and may attach references.

Minimum questions should cover only unresolved high-impact choices:
- game type / player experience,
- 2D / 2.5D / 3D,
- target platform,
- online/offline requirement,
- visual references,
- prototype/vertical-slice target.

### Step 2 — Game Blueprint
The Orchestrator synthesizes:
- working title,
- genre,
- core loop,
- player verbs,
- world,
- camera,
- art direction,
- core systems,
- content list,
- target platform,
- performance budget,
- first playable scope,
- explicit unknowns.

### Step 3 — Concept Gate
Material product decisions are approved by the human before expensive production begins.

### Step 4 — Formal design
Creative Director, Game Designer and Narrative Architect contribute only when needed.

### Step 5 — Technical plan
Technical Architect converts approved intent into:
- IR requirements,
- subsystem boundaries,
- performance targets,
- tool selection,
- acceptance criteria,
- verification plan,
- backend capability assumptions.

### Step 6 — Production fan-out
Possible parallel work:
- sprite/2D asset pipeline,
- 3D asset pipeline,
- material pipeline,
- gameplay systems,
- rendering,
- world/navigation/physics,
- audio,
- dialogue/quest,
- adapters.

Parallel writes require isolated paths or worktrees.

### Step 7 — Preview
The Studio assembles the smallest playable vertical slice.

### Step 8 — QA and independent review
QA executes acceptance criteria; Reviewer independently checks requirements, architecture and evidence.

### Step 9 — Human playtest
The creator plays the build and gives natural-language feedback.

Example:

> “The village is too dark. Add warm lantern light but do not reduce the mobile frame-rate budget.”

The Studio converts the request into a change work item and routes Rendering + Asset as required.

### Step 10 — Build/export
After acceptance:
- Web/PWA,
- local desktop/package,
- optional Godot/Unity export,
- online service deployment if configured.

## First vertical-slice rule

Do not attempt an entire commercial game at once. A first slice should prove:
1. one representative scene,
2. one player loop,
3. one enemy/NPC interaction,
4. one asset path,
5. one physics/nav path if required,
6. one UI flow,
7. one audio flow,
8. one save or state transition,
9. target-platform performance,
10. repeatable build.

Only then expand content.
