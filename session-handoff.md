# Session Handoff

**Status:** Master repository bootstrap in progress.

## Goal
Make `kongsak4807017/KHOSAN-TIME-STUDIO` the source of truth for KHOSAN Studio architecture, harness, tools, local deployment and future implementation.

## Current decisions
- Human is Executive Producer.
- Studio Orchestrator routes work.
- 13 specialist roles form the production organization.
- sprite-gen is Core 2D Production.
- img2threejs is Core 3D Production.
- Asset IR / UG-IR sit between tools and engine adapters.
- Native WebGPU remains a first-class runtime while UG-IR stays engine-neutral.
- Verification requires maker/checker separation.
- Local self-host/deploy documentation must be maintained alongside code.

## Exact next action
Complete the `studio/`, `knowledge/`, `scripts/` and `deploy/` master structure, then begin Phase 1 Studio Shell as bounded work items.
