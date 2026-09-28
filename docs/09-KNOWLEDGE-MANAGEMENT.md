# Knowledge Management

## Why

KHOSAN has accumulated architecture reports, WebGPU subsystem reports, deployable archives, tool research and chat-derived decisions. The Master Repository must prevent three failures:
- decisions existing only in chat,
- summaries replacing source evidence,
- old deployable archives being treated as current architecture without verification.

## Three knowledge layers

### Layer A — Raw sources
`knowledge/research/`

Verbatim research/specification reports. Immutable except for provenance metadata or explicit corrected editions.

### Layer B — Canonical project documents
`docs/`

Current project truth: architecture, IR, workflows, deployment policy and roadmap.

### Layer C — Decisions/state
`studio/decisions/`, work items, evidence, progress and handoffs.

Why a choice was made and what currently executes.

## Promotion rule

Research does not automatically become project truth.

```text
source finding
 → specialist analysis
 → Technical Architect / owner synthesis
 → ADR when consequential
 → canonical docs/schema/code
 → verification
```

## Raw source mirror procedure

When the local source archive is available:
1. copy exact file bytes to `knowledge/research/`,
2. do not “clean up” content while mirroring,
3. record hash and source date,
4. update `knowledge/source-manifest.yaml`,
5. keep canonical decisions in `docs/` rather than editing old evidence to match current direction.

## Deployable archive policy

ZIP builds are artifacts, not architecture truth. Before promoting one:
- identify source commit/version,
- calculate checksum,
- reproduce build if possible,
- compare against current architecture,
- record supported platform/runtime,
- archive superseded builds.
