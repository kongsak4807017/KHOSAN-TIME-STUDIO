# Create Game Workflow

## Principle

KHOSAN should not rush directly from “idea” to “production.”

When the user already has a strong locked concept, the Studio can enter production quickly. When the user is exploring, KHOSAN should first help search the creative space and test the highest-risk assumptions cheaply.

## Mode A — Explore a game worth building

### Step A1 — Creative brief
The creator may start from:
- a theme,
- emotion,
- culture,
- mechanic,
- visual reference,
- social behavior,
- player fantasy,
- problem statement,
- or a fully formed game idea.

### Step A2 — Creative Intelligence research
Activate only needed Council roles:
- Cultural & Trend Researcher
- Player Experience Researcher
- Audience Researcher

Outputs are bounded evidence/hypotheses, not market certainty.

### Step A3 — Concept space
Concept Inventor creates intentionally different hypotheses.

Each concept should include:
- hook,
- player fantasy,
- core verbs,
- emotional promise,
- distinctive system premise,
- visual identity,
- major unknowns,
- prototype questions.

### Step A4 — Creative critique
Creative Critic identifies:
- derivative patterns,
- unclear hooks,
- fantasy/mechanic mismatch,
- weak emotional stakes,
- production illusions,
- cheapest experiment that could resolve uncertainty.

Do not collapse concepts into one universal score.

### Step A5 — Concept portfolio
Human + Creative Director select a small set of distinct bets for Prototype Arena.

### Step A6 — Micro-prototypes
Build only what is needed to answer the hypothesis.

Example:
If testing “does spending magic erase NPC memories create meaningful guilt?”, do not first build a complete economy, crafting system and online backend.

### Step A7 — Player evidence
Record:
- observation context,
- qualitative reactions,
- behavior,
- telemetry if appropriate,
- confounders,
- what was surprising.

### Step A8 — Creative synthesis
Concepts may be:
- retained,
- killed,
- revised,
- recombined into a new hypothesis.

### Step A9 — Creative Constitution
When the human finds a direction worth producing, formalize:
- player fantasy,
- emotional promise,
- core verbs,
- world point of view,
- art constitution,
- mechanical identity,
- sacred constraints,
- flexible implementation,
- audience hypothesis,
- falsification conditions.

### Step A10 — HG-01
Human locks the concept/Creative Constitution.

Only then move into normal production.

---

## Mode B — Production flow

### Step 1 — New Game / Approved Concept
The creator provides either:
- a human-locked Creative Constitution, or
- a sufficiently clear concept that can be drafted and approved immediately.

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

### Step 3 — Formal design
Creative Director, Game Designer and Narrative Architect contribute only when needed.

### Step 4 — Technical plan
Technical Architect converts approved intent into:
- IR requirements,
- subsystem boundaries,
- performance targets,
- tool selection,
- acceptance criteria,
- verification plan,
- backend capability assumptions.

### Step 5 — Production fan-out
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

### Step 6 — Preview
The Studio assembles the smallest playable vertical slice.

### Step 7 — QA and independent review
QA executes acceptance criteria; Reviewer independently checks requirements, architecture and evidence.

### Step 8 — Human playtest
The creator plays the build and gives natural-language feedback.

Example:
> “The village is too dark. Add warm lantern light but do not reduce the mobile frame-rate budget.”

The Studio converts the request into a change work item and routes Rendering + Asset as required.

### Step 9 — Build/export
After acceptance:
- Web/PWA,
- local desktop/package,
- optional Godot/Unity export,
- online service deployment if configured.

---

## Mode C — Live Community Intelligence

After real players exist:

1. Community Intelligence gathers permitted qualitative evidence.
2. Telemetry Analyst examines observed behavior with metric definitions, population, time window and data-quality notes.
3. Player Experience Researcher helps interpret experience hypotheses.
4. Live Game Designer creates a typed experiment proposal.
5. If implementation-level: convert to normal KHOSAN work item.
6. If it changes a sacred constraint / emotional promise / core vision: return to HG-01.
7. QA verifies the experiment.
8. Results are persisted before the next design decision.

## Community rule

“Players asked for X” is not itself a specification.

The Studio distinguishes:
- acknowledge,
- fix friction,
- experiment,
- Constitution review,
- reject/no action.

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
10. repeatable build,
11. at least one high-risk creative hypothesis where relevant.

Only then expand content.
