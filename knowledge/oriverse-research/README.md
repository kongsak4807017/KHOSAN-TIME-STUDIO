# Oriverse / Weave — historical technical research for KHOSAN

> **Source-grounded archive, not an endorsement or a live Oriverse dependency.** KHOSAN must remain independently owned and operable. No Oriverse connection is necessary to consume this reference.

## Archive status (11 November 2026)

- **200/200 question headings** (001–200, TRR-01 through TRR-20) are present in the archived **consolidated audit text**.
- The full plain-text content extracted from the user's Google Doc **Oriverse Capability Audit** was split **without rewriting its content** into `consolidated-audit/00-background.txt` plus 20 TRR text files. Source length: **452,573 JavaScript characters**; all 21 parts were read back from GitHub and compared to their matching source segments.
- This **does not recover all 200 verbatim original ChatGPT research-answer messages** or tool outputs. Those are distinct evidence objects; the `original-excerpts/` archive contains only recovered originals already available. See [ORIGINAL-RECOVERY.md](ORIGINAL-RECOVERY.md).
- [Machine-readable coverage/provenance manifest](CONSOLIDATED-AUDIT-MANIFEST.json); [all 200 question links](questions.md).
- [MCP / Weave pipeline interpretation](supplemental/MCP-Pipeline-Interpretive-Notes.txt) is archived as **prior design commentary**, not verified proprietary implementation evidence.
- [16 reconstructed workflow diagrams](workflows/WORKFLOWS-16.md) restate the research patterns. They are NOT recovered first-party Oriverse SVGs or measurements.

## Source and confidence

Primary consolidated source: [Oriverse Capability Audit (Google Doc)](https://docs.google.com/document/d/137S6eGaPtZhMYkTQh-kE0ZtctXTRmcj9459sHL-TwcQ). The research report itself describes interactions with Oriverse documentation, tool contracts, and selected runtime experiments on 8–9 October 2026. Uploading that report **does not rerun those experiments** or prove undocumented internals.

Treat each statement according to its own recorded status:
**Documented**, **Experimentally Verified**, **Partially Documented**, **Inferred**, **Undisclosed**, **Not Verified**, or **Proposed for KHOSAN**. When a status is missing, do not silently promote it.

Important source limits: the research reports bytecode/class compilation behavior but does not disclose complete parser/VM internals; reports limited multiplayer simulation, **not** full shared-state/gameplay correctness; and does not establish exact image/3D parity, published licensing rights, or complete security controls.

## Topics and preserved full consolidated text

| Record | Questions | Domain | Archive status |
|---|---|---|---|
| [TRR-01](consolidated-audit/TRR-01.txt) | 001–010 | Weave Language Architecture | Consolidated audit captured; original transcript status separately incomplete |
| [TRR-02](consolidated-audit/TRR-02.txt) | 011–020 | Grammar, Types & Semantics | Consolidated audit captured; original transcript status separately incomplete |
| [TRR-03](consolidated-audit/TRR-03.txt) | 021–030 | Compiler, Bytecode & VM | Consolidated audit captured; original transcript status separately incomplete |
| [TRR-04](consolidated-audit/TRR-04.txt) | 031–040 | Runtime, Tick & Event Scheduling | Consolidated audit captured; original transcript status separately incomplete |
| [TRR-05](consolidated-audit/TRR-05.txt) | 041–050 | Scene Graph & Object Lifecycle | Consolidated audit captured; original transcript status separately incomplete |
| [TRR-06](consolidated-audit/TRR-06.txt) | 051–060 | Physics, Collision & Movement | Consolidated audit captured; original transcript status separately incomplete |
| [TRR-07](consolidated-audit/TRR-07.txt) | 061–070 | Multiplayer, Lockstep & Rollback | Consolidated audit captured; original transcript status separately incomplete |
| [TRR-08](consolidated-audit/TRR-08.txt) | 071–080 | State, Persistence & Save System | Consolidated audit captured; original transcript status separately incomplete |
| [TRR-09](consolidated-audit/TRR-09.txt) | 081–090 | Procedural Mesh & Asset Generation | Consolidated audit captured; original transcript status separately incomplete |
| [TRR-10](consolidated-audit/TRR-10.txt) | 091–100 | Texture, Shader & Rendering | Consolidated audit captured; original transcript status separately incomplete |
| [TRR-11](consolidated-audit/TRR-11.txt) | 101–110 | Terrain, World Generation & Streaming | Consolidated audit captured; original transcript status separately incomplete |
| [TRR-12](consolidated-audit/TRR-12.txt) | 111–120 | UI, HTML Binding & Input | Consolidated audit captured; original transcript status separately incomplete |
| [TRR-13](consolidated-audit/TRR-13.txt) | 121–130 | AI Prompt-to-Game Pipeline | Consolidated audit captured; original transcript status separately incomplete |
| [TRR-14](consolidated-audit/TRR-14.txt) | 131–140 | AI Tools, MCP & Orchestration | Consolidated audit captured; original transcript status separately incomplete |
| [TRR-15](consolidated-audit/TRR-15.txt) | 141–150 | NPC, Animation, Crowd & AI | Consolidated audit captured; original transcript status separately incomplete |
| [TRR-16](consolidated-audit/TRR-16.txt) | 151–160 | Audio, VFX & Cinematics | Consolidated audit captured; original transcript status separately incomplete |
| [TRR-17](consolidated-audit/TRR-17.txt) | 161–170 | Testing, Debugging & Observability | Consolidated audit captured; original transcript status separately incomplete |
| [TRR-18](consolidated-audit/TRR-18.txt) | 171–180 | Performance, Scaling & Platform | Consolidated audit captured; original transcript status separately incomplete |
| [TRR-19](consolidated-audit/TRR-19.txt) | 181–190 | Assets, Export & Interoperability | Consolidated audit captured; original transcript status separately incomplete |
| [TRR-20](consolidated-audit/TRR-20.txt) | 191–200 | Security, Publishing & Governance | Consolidated audit captured; original transcript status separately incomplete |

## Usage by ChatGPT / DevSpace agents

1. Start with an explicit KHOSAN project/task and its role contract; load only the relevant TRR and ten-section question.
2. Extract source claims into a *claim/evidence/uncertainty register* rather than copying undocumented assumptions into implementation.
3. Build KHOSAN-native interfaces and test fixtures; do not assume Oriverse proprietary APIs, source, or licensing.
4. Use deterministic tests + independent reviewer; a *planned benchmark* is not a *passed benchmark*.
5. Preserve source provenance in task/evidence records and human approval for release.
6. **Do not connect to Oriverse** for this archived-research workflow. Weave is studied as a text-based declarative game authoring pattern, not required as a dependency.

## Separate artifacts / known gaps

- Original 200 ChatGPT message transcripts are **not fully recovered**, despite consolidated coverage.
- Some source references in the audit are named tool/guide sections, not independently mirrored first-party documents.
- Original raw SVG/DOT diagram package used as a drafting reference remains separate; the Mermaid diagrams here are a **reconstruction**.
- Runtime benchmarks, cross-engine fidelity, licensing/commercial terms and real-system security tests remain independent future verification work.

**No Evidence → No Done.**
