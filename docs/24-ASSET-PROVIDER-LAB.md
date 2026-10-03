# Asset Provider Lab

KHOSAN uses a provider-agnostic Asset Provider Layer. External services are optional production machines; KHOSAN Asset IR remains canonical.

## Goal

Make the Studio able to evaluate and later route real asset work through local/native tools or cloud providers without binding project data to one vendor.

## Provider order

1. **Native/procedural first** when geometry, VFX, terrain, materials or motion can be produced deterministically.
2. **Existing licensed asset** when it is cheaper and provenance is acceptable.
3. **Local adopted tools**: sprite-gen for 2D; img2threejs for structured 3D.
4. **Cloud generation** only when useful: Ludo, Meshy, Tripo.
5. Every result passes technical QA, visual QA, provenance/license QA, then enters Asset Registry.

## Runnable baseline

Run:

~~~bash
npm run doctor:assets
~~~

This reads `config/asset-providers.json`, reports available providers and checks whether optional credentials exist. It does **not** print secrets, call paid APIs, or spend credits.

Optional local environment variables:

~~~text
LUDO_API_KEY=
MESHY_API_KEY=
TRIPO_API_KEY=
KHOSAN_ENABLE_CLOUD_ASSETS=0
~~~

Do not commit real keys.

## Evaluation fixtures

Use the same fixtures across providers so comparisons are reproducible:

- 2D: one full-body character reference -> idle/walk sprite output.
- 3D prop: one reference image -> GLB.
- Humanoid: one clear biped model -> rig -> walk animation.
- Audio: one short SFX brief.
- Motion: one canonical walk request.

Record: provider, model/version, request, seed if available, cost/credits, elapsed time, output hashes, license/provenance, QA result and human approval.

## Adapter contract

Every cloud adapter should implement asynchronous jobs rather than leaking provider APIs into Studio:

~~~text
submit(request) -> job
status(job) -> queued|running|succeeded|failed
collect(job) -> local artifact(s)
normalize(artifact) -> KHOSAN Asset IR
verify(asset) -> evidence
~~~

Generated URLs are temporary inputs, never canonical asset locations. Download approved outputs into project/shared asset storage.

## License gate

Marketplace/library assets require per-asset provenance. Unknown or ambiguous license means **prototype-only** and blocks production/export until resolved. Do not infer a license from a site's "free" category.

## Current external candidates

- Ludo: P0 evaluation; CLI/REST/MCP surface makes it suitable for agent automation.
- Meshy: P0 evaluation; useful 3D/rig/animation API surface. Auto-rig is currently aimed at clear humanoid bipeds.
- Tripo: P0 evaluation behind the same adapter contract.
- itch.io: discovery source, not a trusted-license bucket.
- Mixkit SFX: reference library; capture asset-level provenance.
- JustSketchMe: optional pose/reference tool; KHOSAN Motion/Pose IR remains canonical.

## Acceptance before ADOPT

A provider is not promoted from EVALUATE to ADOPT until a reproducible fixture proves: usable output, stable adapter, deterministic validation where possible, provenance capture, acceptable cost/latency, fallback behavior and human acceptance.
