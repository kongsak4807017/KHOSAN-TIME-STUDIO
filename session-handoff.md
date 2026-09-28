# Session Handoff

**Repository:** `kongsak4807017/KHOSAN-TIME-STUDIO`
**Branch:** `main`
**Status:** MASTER STRUCTURE CREATED / FOUNDATION VERIFICATION BLOCKED

## What is now authoritative in GitHub
- Product vision and architecture
- Create-game workflow
- 21-role harness and graph (13 production/governance + 8 Creative Intelligence Council)
- Tool Registry
- Asset pipeline
- UG-IR direction
- local/self-host deployment strategy
- ChatGPT + DevSpace workflow
- roadmap
- Creative Intelligence / Creative Constitution / Prototype Arena / Community Intelligence specifications
- work-item/handoff/evidence contracts
- bootstrap scripts/checker
- knowledge/source manifest
- GitHub issues #1–#7

## Creative Intelligence decisions
- Game generation is treated as a production subsystem; competitive advantage is expected to come from taste, point of view, experimentation and community learning.
- Creative Intelligence has two loops: Discovery before Concept Lock and Live Intelligence after players exist.
- Council roles are advisory; Human + Creative Director own vision.
- No universal creativity/winner score.
- Community sentiment never directly edits production.
- Telemetry findings must state metric definition, population/time window and data limitations.
- Vision-level live changes route back to HG-01.

## Core decisions
- Human = Executive Producer.
- Studio Orchestrator routes work.
- Agents use specialized tools; they are not expected to implement every capability from scratch.
- sprite-gen = Core 2D Production.
- img2threejs = Core 3D Reconstruction.
- Asset IR / UG-IR remain canonical above backend-specific representations.
- Native WebGPU is first-class but does not own game semantics.
- Maker/checker separation is mandatory.
- Git LFS is planned but deliberately not force-enabled until local machines have git-lfs installed.
- Do not fake Docker/service deployment before real service entrypoints exist.

## Known blocker
The legacy research reports listed in `knowledge/source-manifest.yaml` are **not yet mirrored verbatim**. This is tracked as GitHub issue #1 and prevents claiming the foundation archive is fully complete.

## Exact next action in DevSpace
1. Clone/open this repository as a local workspace.
2. Run:
   - Windows: `.\scripts\bootstrap.ps1`
   - Linux/macOS: `./scripts/bootstrap.sh`
3. Record the checker result.
4. Copy the legacy source documents into `knowledge/research/` verbatim and record hashes.
5. Update source-manifest statuses.
6. Then start a bounded work item for Studio Shell + Idea/Concept Lab, Prototype Arena, or Issue #4 (UG-IR v0.1).

## Specialist startup prompt
> Operate as KHOSAN Studio Orchestrator. Read AGENTS.md, studio/studio_state.json, studio/graph.md, progress.md and this handoff. Select exactly one bounded work item. Do not widen scope or claim Done without evidence.
