# KHOSAN Studio Vision

## Product thesis

KHOSAN is not an AI chat that writes arbitrary game code. It is an **AI-native production studio**.

The creator should operate at the level of intent:

> “Make the village darker, add warm lanterns, but keep mobile performance above the agreed frame budget.”

The Studio translates that request into:
- design changes,
- bounded work items,
- specialist routing,
- production-tool calls,
- deterministic processing,
- verification,
- preview,
- approval.

## Operating model

```text
Human creator / Executive Producer
             │
             ▼
      Studio Orchestrator
             │
   ┌─────────┼──────────┐
   ▼         ▼          ▼
 Agents     Tools     Knowledge
   │         │          │
   └─────────┼──────────┘
             ▼
        Shared State
             │
             ▼
       Asset IR / UG-IR
             │
   ┌─────────┼──────────┐
   ▼         ▼          ▼
 Assets    Systems     World
   └─────────┼──────────┘
             ▼
        Playable Game
```

## Creator-facing surfaces

The target Studio should ultimately provide:
1. **Home / Projects**
2. **Create New Game**
3. **Game Blueprint**
4. **Game Workspace**
5. **Live Preview**
6. **World Editor**
7. **Asset Lab**
8. **Logic Graph**
9. **Narrative / Quest**
10. **Audio Lab**
11. **Agent Workboard**
12. **QA / Evidence**
13. **Build & Export**
14. **Project Settings / Tool Registry**

The user should not need to choose specialist agents manually for normal work.

## Core product principle

**Agents are workers; tools are production machines; IR is the common language; the Studio owns orchestration.**

## Human-in-the-loop

Humans are required at high-value uncertainty boundaries:
- concept lock,
- major architecture exceptions,
- irreversible/destructive operations,
- external release/deployment,
- acceptance of generated assets when subjective fidelity matters.

## Reliability principle

Generative stages are probabilistic. Everything after them should become deterministic whenever practical:
- extraction,
- optimization,
- manifests,
- validation,
- compression,
- test execution,
- benchmark comparison,
- export.

This lets the Studio regenerate creatively while verifying mechanically.
