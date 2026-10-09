# KHOSAN Studio — Evidence-led Reverse Engineering Program

Status: **Phase 0 research integrated / Phase 1 browser vertical slice implemented; NOT production-complete.**

## Source provenance
- User-owned **Oriverse Capability Audit.docx**, 20 TRRs / 200 research questions (research record, not proof of internal implementation).
- KHOSAN architecture reports and existing repository AGENTS.md / studio/graph.md.
- Prior diagram set: Oriverse Capability Audit SVG Workflow Pack; this branch includes canonical SVG redraws under docs/diagrams/.

## Reverse engineering rules
1. Study publicly documented behavior, available interfaces, observed input/output and user-authorized experiments; never claim access to undisclosed source code.
2. Reimplement *capabilities* independently. Do not copy proprietary assets, code, private APIs, bypass authentication, or claim license rights not verified.
3. Every capability record carries evidence, confidence, expected/actual results and implementation status.
4. Do not make Oriverse a runtime dependency. Oriverse is comparative research only.
5. Preserve existing repository paths and human gates. Do not claim that visual demos prove 3D, multiplayer, GPU, security or shipping readiness.

## Target architecture
Human intent → Orchestrator → Task contracts → Game Project Graph / semantic IR → Asset / Scene / Gameplay IR → Native renderer & simulation → Automated tests → Independent review → Human release gate.

## Research backlog and verification
| Track | Research | Build | Required evidence |
|---|---|---|---|
| R1 | Weave language and compiler semantics | KHOSAN typed scene IR / validator | golden input/output, negative tests |
| R2 | Procedural geometry and texture DSL | independent mesh/material pipeline | mesh topology + PBR channel QA |
| R3 | Scene editing and lifecycle | native scene editor | save/load roundtrip and undo |
| R4 | Rendering | WebGPU renderer and WebGL fallback | visual captures and frame timings |
| R5 | Multiplayer | authoritative state/session protocol | replay, concurrency, anti-spoof tests |
| R6 | Persistence | versioned save schema | migration, corruption, restore tests |
| R7 | AI harness | bounded agents with tool permissions | dry-run receipts and independent review |
| R8 | Security & publishing | local release gates | abuse tests, license audit, signed release |

## Immediate deliverable
`apps/native-prototype/index.html`: dependency-free, offline-capable 2D scene-plan editor. Add/select/edit/remove objects; undo; schema validation; JSON import/export; SVG export. This is **not** a 3D game engine.

## Next executable increments
1. Add schema fixtures and automated roundtrip tests in CI.
2. Extract the embedded scene model into a shared TypeScript package and use a deterministic command log.
3. Map scene IR to 3D transforms, procedural primitives, materials, collision and camera.
4. Integrate with existing Studio server/project workspace after API/security review.
5. Implement independent WebGPU rendering and headless QA, with measured benchmarks.
6. Review licensing and security before any production publishing.

## Release gate
No Evidence → No Done. Never mark a research finding as implemented merely because an API was documented. Maintain separate **Documented**, **Experimentally Verified**, **Inferred**, **Undisclosed**, **Implemented**, **Tested**, and **Human Accepted** fields.
