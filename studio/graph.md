# KHOSAN Studio Execution Graph

## Full creative-to-live graph

~~~mermaid
flowchart TD
    H[Human Executive Producer] --> O[00 Studio Orchestrator]

    subgraph DISCOVERY[Creative Intelligence — Discovery Loop]
      CTR[13 Cultural & Trend Researcher] --> CI[15 Concept Inventor]
      PXR[14 Player Experience Researcher] --> CI
      AR[17 Audience Researcher] --> CI
      CI --> CC[16 Creative Critic]
      CC --> CP[Concept Portfolio]
      CP --> PA[Prototype Arena]
      PA --> OBS[Player Observations]
      OBS --> CP
    end

    O --> CTR
    O --> PXR
    O --> AR
    CP --> CG{HG-01 Concept / Constitution Gate}
    CG -->|rework / explore| O
    CG -->|approved| CD[01 Creative Director]

    CD --> GD[02 Game Designer]
    CD --> NA[03 Narrative Architect]
    CD --> CONST[Creative Constitution]
    GD --> S[Specification fan-in]
    NA --> S
    CONST --> S

    S --> TA[06 Technical Architect]

    TA --> RQ{Reference-driven visual work?}
    RQ -->|yes| RR[Reference Reconstruction Workflow]
    RQ -->|no| AS[04 Asset Synthesizer]
    RR --> AS
    RR --> RE[08 Rendering Engineer]
    RR --> EA[09 Engine Adapter]

    TA --> AU[05 Audio & Soundscape]
    TA --> GP[07 Gameplay Programmer]
    TA --> RE
    TA --> EA

    AS --> F[Implementation fan-in]
    AU --> F
    GP --> F
    RE --> F
    EA --> F

    F --> QA[10 QA & Playtester]
    F --> IR[11 Independent Reviewer]
    QA --> V{Verification fan-in}
    IR --> V

    V -->|code defect| GP
    V -->|render/perf defect| RE
    V -->|adapter/export defect| EA
    V -->|spec misunderstanding| S
    V -->|architecture defect| TA
    V -->|pass| RG{HG-04 Release Gate}

    RG -->|approved| RO[12 Release & Operations]
    RG -->|rejected| O
    RO --> LIVE[Playable / Released Game]

    subgraph LIVELOOP[Creative Intelligence — Live Loop]
      LIVE --> COM[18 Community Intelligence]
      LIVE --> TEL[19 Telemetry Analyst]
      COM --> LGD[20 Live Game Designer]
      TEL --> LGD
      PXR --> LGD
      LGD --> EXP[Typed Experiment Proposal]
      EXP --> XG{Vision-level change?}
      XG -->|no| O
      XG -->|yes| CG
    end
~~~

## Routing rules

1. Orchestrator creates one bounded work item or one bounded creative-intelligence artifact.
2. Discovery Council is advisory; the human does not lose creative authority.
3. Concept portfolios should contain meaningfully different bets, not cosmetic variations.
4. Micro-prototypes test high-value uncertainty before full production.
5. Human locks the Creative Constitution at HG-01 before expensive production.
6. Activate only production roles required by approved work.
7. Technical Architect establishes contracts/budgets before expensive implementation.
8. Reference-driven scenes, generic assets and UI surfaces use `docs/21-REFERENCE-RECONSTRUCTION-WORKFLOW.md`; reusable characters remain governed by the Character Factory.
9. Reference reconstruction locks approved dimensions, diagnoses mismatches and repairs only failing dimensions before QA.
10. Parallel production requires isolated paths or worktrees.
11. QA and Independent Reviewer are separate from makers.
12. Failure returns to the defect-origin layer.
13. Community/telemetry findings create experiments or work items; they never directly mutate production.
14. A proposed change to a sacred constraint, emotional promise or core vision returns to HG-01.
15. External release/deploy waits for HG-04.

## Council boundaries

Creative Intelligence roles may:
- research,
- generate hypotheses,
- critique,
- design experiments,
- synthesize evidence.

They may not:
- declare a concept “the winner” by a universal score,
- change the Creative Constitution,
- push production code directly from community sentiment,
- infer sensitive player traits,
- bypass QA/review/release gates.

## Stop conditions

Stop/escalate if:
- requirements conflict,
- acceptance criteria or experiment hypotheses are not testable,
- evidence source/population/time window is materially unknown,
- protected/destructive operation is required,
- verification is flaky/non-reproducible,
- parallel agents require overlapping writes,
- work expands beyond the active task,
- a community request conflicts with the locked Constitution.


## Project workspace gate

Creative exploration may begin without an active game project. Before any project-scoped production write, the Orchestrator must resolve:

~~~text
Project Library
  ↓
active project_id
  ↓
project root / write boundary
  ↓
project-scoped task
  ↓
specialist / DevSpace workspace
~~~

Rules:
- one interactive Studio session has one active project,
- project-scoped work items use `studio/contracts/project-work-item.schema.json` and require `project_id`,
- sibling game projects are never implicit context,
- one project root maps to one reusable DevSpace workspace per continuous session,
- Studio-level product/harness tasks remain separate from game-project tasks.

See `docs/22-MULTI-PROJECT-WORKSPACE-ARCHITECTURE.md`.
