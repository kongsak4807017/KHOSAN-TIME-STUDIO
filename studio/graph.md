# KHOSAN Studio Execution Graph

```mermaid
flowchart TD
    H[Human Executive Producer] --> O[00 Studio Orchestrator]
    O --> CD[01 Creative Director]
    O --> GD[02 Game Designer]
    O --> NA[03 Narrative Architect]
    CD --> S[Specification fan-in]
    GD --> S
    NA --> S
    S --> C{Concept gate}
    C -->|approved| TA[06 Technical Architect]
    C -->|rework| O

    TA --> AS[04 Asset Synthesizer]
    TA --> AU[05 Audio & Soundscape]
    TA --> GP[07 Gameplay Programmer]
    TA --> RE[08 Rendering Engineer]
    TA --> EA[09 Engine Adapter]

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
    V -->|pass| RG{Release gate}

    RG -->|approved| RO[12 Release & Operations]
    RG -->|rejected| O
    RO --> DONE[Accepted / Released]
```

## Routing rules

1. Orchestrator creates one bounded work item.
2. Activate only roles required by the work.
3. Material changes to product vision go through Concept Gate.
4. Technical Architect establishes contracts/budgets before expensive implementation.
5. Parallel production requires isolated paths or worktrees.
6. QA and Independent Reviewer are separate from makers.
7. Failure returns to the defect-origin layer.
8. External release/deploy waits for human approval.

## Stop conditions

Stop/escalate if:
- requirements conflict,
- acceptance criteria are not testable,
- required context is missing,
- protected/destructive operation is required,
- verification is flaky/non-reproducible,
- parallel agents require overlapping writes,
- work expands beyond the active task.
