# KHOSAN Knowledge Base

This directory indexes source material used to design KHOSAN TIME STUDIO.

## Rules

1. Raw source reports are preserved verbatim when mirrored.
2. Canonical decisions belong in `docs/` and ADRs, not hidden inside research reports.
3. A summary never replaces its source.
4. If sources disagree, record the disagreement and decision explicitly.
5. External tools are references/dependencies, not copied as if KHOSAN authored them.

## Primary repository references

- Harness Engineering: https://github.com/kongsak4807017/learn-harness-engineering
- 2D Production: https://github.com/kongsak4807017/sprite-gen
- 3D Reconstruction: https://github.com/kongsak4807017/img2threejs

## Project research archive

See `knowledge/source-manifest.yaml`.

Files marked `pending_verbatim_mirror` are known project source documents that must be copied into `knowledge/research/` unchanged when the local source archive is connected. Their titles are indexed now so they cannot be forgotten, but this index is not a substitute for their full content.

## Oriverse / Weave technical research (200-question study)

- [TRR-01–TRR-20 research category index](oriverse-research/README.md)
- [Question coverage register (001–200)](oriverse-research/questions.md)

**Status (11 Nov 2026):** The complete **user-consolidated Oriverse Capability Audit text** (452,573 characters) has been mirrored in 21 sections with 200/200 question headings. This is **not** a recovered verbatim set of the 200 original ChatGPT research messages, and it does not independently verify Oriverse internals. The archived first-party tool transcripts remain incomplete. See [archive index](oriverse-research/README.md), [manifest](oriverse-research/CONSOLIDATED-AUDIT-MANIFEST.json), and [16 reconstructed workflows](oriverse-research/workflows/WORKFLOWS-16.md). KHOSAN production remains independent; do not call Oriverse or require Weave runtime to use these references.
