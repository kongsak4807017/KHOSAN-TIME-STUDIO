# Session Handoff

**Repository:** `kongsak4807017/KHOSAN-TIME-STUDIO`
**Branch:** `feature/blender-character-pipeline`
**Status:** BLENDER CHARACTER ASSET PIPELINE IMPLEMENTED IN BRANCH / LOCAL VERIFICATION BLOCKED

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
- GitHub issues #1–#11

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
- Blender = Core editable 3D DCC/master-asset stage.
- For 3D characters, `.blend` is the editable DCC master and `.glb` is a derived runtime artifact.
- ChatGPT remains the conversational orchestration surface; DevSpace performs bounded tool execution.
- Blender jobs are allowlisted data contracts and do not accept arbitrary Python execution.
- Asset IR / UG-IR remain canonical above backend-specific representations.
- Native WebGPU is first-class but does not own game semantics.
- Maker/checker separation is mandatory.
- Git LFS is planned but deliberately not force-enabled until local machines have git-lfs installed.
- Do not fake Docker/service deployment before real service entrypoints exist.

## Creative Intelligence implementation backlog
- #8 Idea/Taste Engine + Concept Lab
- #9 Prototype Arena + Creative Evolution Ledger
- #10 Community Pulse + Telemetry Intelligence
- #11 Live Experiment Board + Creative Constitution guard

## Known blocker
The legacy research reports listed in `knowledge/source-manifest.yaml` are **not yet mirrored verbatim**. This is tracked as GitHub issue #1 and prevents claiming the foundation archive is fully complete.

## Exact next action in DevSpace
1. Open/checkout branch `feature/blender-character-pipeline`.
2. Run:
   - `python scripts/harness_check.py`
   - `python -m unittest discover -s tools/adapters/blender/tests -p "test_*.py"`
   - `python tools/adapters/blender/doctor.py --json`
3. Prepare one non-sensitive local character fixture with known mesh/armature/object names.
4. Create a fixture job based on `tools/adapters/blender/examples/ploy_character_edit.json`.
5. Run the job without `--dry-run`.
6. Reopen the generated `.blend`, validate the exported GLB, inspect materials, morphs, skeleton and representative deformation.
7. Record QA evidence in `studio/evidence/TASK-ASSET-BLENDER-001.json`.
8. Route to Agent 11 Independent Reviewer. Do not mark accepted before reviewer evidence exists.

## Specialist startup prompt
> Operate as KHOSAN Studio Orchestrator. Read AGENTS.md, studio/studio_state.json, studio/graph.md, progress.md and this handoff. Select exactly one bounded work item. Do not widen scope or claim Done without evidence.
