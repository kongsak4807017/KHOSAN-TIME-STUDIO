# Session Handoff

**Active work item:** none  
**Last released work item:** `TASK-LOCAL3D-PORTABLE-001`  
**Working root:** this checkout; commands below resolve local paths through `scripts/local3d.py`  
**Current result:** portable local 3D source release **published and read back**, with independent overall publication ACCEPT  
**Portable implementation SHA-256:** `59038921d1a2e6de25dbb9c35bbef58e0778681b2685309c234daa659554e821`  
**Source release commit:** [`73f468e3ea0b883bf47271b8f48b2efd93f81069`](https://github.com/kongsak4807017/KHOSAN-TIME-STUDIO/commit/73f468e3ea0b883bf47271b8f48b2efd93f81069)  
**Publication/readback time:** `2026-11-11T18:36:49Z`

## Completed portable publication

The published source was prepared separately from the owner's accepted r6 installation. The owner-PC runtime, source snapshots and reviewed outputs remain untouched. Existing episodes, sibling projects and the separate Studio browser-acceptance work remain outside this release task.

The non-force main update used expected base `38ae23cb08829e1867dfac05293e4f3e5683aff2` and produced source tree `c77249169402b69cb117847cd1a92899af35d79b`. Readback matched all 91 changed blob SHAs/modes and confirmed 147 unrelated base blobs unchanged. Historical r6 source commit [`f0be220249df92f81d249058dfeec5d4f425d13e`](https://github.com/kongsak4807017/KHOSAN-TIME-STUDIO/commit/f0be220249df92f81d249058dfeec5d4f425d13e) is an ancestor of this release.

Independent overall publication review returned **ACCEPT** bound to the release. The [publication receipt](docs/examples/local3d/publication-receipt.json) and [independent publication review](docs/examples/local3d/independent-publication-review.json) contain the readback and review identities/scope. The task is **released**, with no active work item.

This handoff and the accompanying status/evidence updates belong to a subsequent **metadata-only closure commit**. That closure commit is distinct from the source release commit above and does not replace the implementation digest used by the reproduced Blender/MCP and renderer proofs. The 91 changed / 147 preserved blob counts describe the source-release readback, not a later metadata commit.

The release provides checkout-relative Python/PowerShell/Bash setup and run commands, pinned Python dependencies, explicit Blender selection passed to subprocesses, generated UTF-8 local MCP configuration, authored fixtures/reference, and an optional locked Remotion/Three runtime. Standalone rendering no longer requires the owner's private Harness V4 directories. Generated machine settings, virtual environments, dependency/browser caches and job directories remain local; the public gallery labels its r6 images as historical.

The fresh implementation and its new artifacts do not inherit the r6 review. Technical build/render PASS, independent visual acceptance and owner approval retain separate records.

## Completed portable verification

| Check | Observed result |
|---|---|
| Fresh Windows installation | New virtual environment and locked dependencies installed successfully in a checkout containing spaces/Thai characters |
| Windows runtime | Python 3.12.10, Blender 5.2.2 LTS, MCP SDK 1.29.0 |
| Standard official-SDK proof | PASS; job `job-d51740b6569f4a17`; 428,900 triangles, 41 editable parts; cold build 30.094 s, verified warm request 0.047 s |
| Standalone renderer installation | Fresh `npm ci` and managed Chrome Headless Shell setup READY |
| Actual Windows renderer | `PASS_STANDALONE_STATIC_GLB_LTC_STILLS`; six native 960×540 captures/control checks; 39 unchanged source/runtime/input hashes; zero browser errors; identical repeated frame-45 PNG |
| Linux Blender/MCP | Python 3.12.14 / Blender 4.3.2; full draft proof PASS on CPU, recorded at 108.1264 s |
| Linux renderer limit | Dependency installation and contained bundling passed; local socket restrictions blocked browser launch, producing no Linux V4 stills. The earlier standard Blender render was interrupted. |
| Linux local Python suite | 39 tests in 3.518 s, OK |
| Windows local Python suite | 39 cases in 3.402 s: 38 PASS and one expected symlink-privilege skip |
| Hosted GitHub workflow | `.github/workflows/local3d-verify.yml` added as manual-only source; not yet run on GitHub |
| macOS | Untested build/render target; no acceptance claim |

The canonical portable evidence is `studio/evidence/TASK-LOCAL3D-PORTABLE-001.json`; the public reproduction summary is `docs/examples/local3d/portable-proof.json`. They identify exact source/job evidence and review status. The source publication and its readback are complete as recorded above. The manual workflow remains unrun on GitHub; publishing its source does not constitute a hosted CI result. Platform and artistic limits remain attached to the published release.

## Current operational commands

Run from this checkout's root after installing Blender, replacing the executable placeholder with its path on the current machine:

```powershell
python scripts/local3d.py setup --blender "<path-to-installed-blender-executable>"
python scripts/local3d.py doctor
python scripts/local3d.py proof --fixture elephant --quality draft
python scripts/local3d.py config
```

Draft requests 640×360 / 8 samples while keeping model geometry unchanged. For final visual inspection use `python scripts/local3d.py proof --fixture elephant --quality standard`; standard preserves the original 1280×720 / 64-sample fixture and remains the default. On Linux/macOS use the selected `python3` interpreter as appropriate. Read the returned job path and current review; the latest-proof pointer is not an artistic acceptance pointer.

Optional standalone renderer:

```powershell
node scripts/setup-local3d-v4.mjs
$Local3DElephantProof = Get-Content -Raw -Encoding UTF8 ".khosan/local3d/elephant-proof.json" | ConvertFrom-Json
node tools/local_3d_mcp/adapter/v4/verify.mjs --job $Local3DElephantProof.artifact_directory
```

On other shells pass the actual artifact directory returned by the proof to `--job`. An existing private V4 checkout is used only when explicitly selected with `--v4-root` or `KHOSAN_V4_ROOT`; the standalone result is not private-V4 source verification.

On Windows, `OPEN_LOCAL3D_ELEPHANT.bat` opens the latest completed elephant proof folder. Open `scene.blend` for editing or `scene.glb` in a compatible renderer. The generated `.khosan/local3d-mcp.json` supplies this checkout's stdio client configuration and selected Blender executable; do not copy another machine's paths. `python scripts/local3d.py serve` is the direct stdio entry point. No TCP service or new tunnel is required, and registration does not automatically add local tools to every ChatGPT Web conversation.

See `docs/27-LOCAL3D-PORTABLE-INSTALL.md` for the complete bilingual installation, quality, review/repair and renderer instructions. Manual mesh/export edits create new artifacts requiring fresh evidence.

## Historical r6 deliverable — preserved independently

The following sections retain the original r6 handoff and measurements, recorded at `2026-11-11T17:44:54Z` / 12 November 2026 in Asia/Bangkok. The initial repository baseline was commit `38ae23cb08829e1867dfac05293e4f3e5683aff2`. Read the historical artifact locations through `studio/evidence/TASK-LOCAL-3D-ELEPHANT-001.json` and its corresponding handoff; their job directories/source snapshots refer to the preserved original installation, not files required in a fresh checkout.

`TASK-LOCAL-3D-ELEPHANT-001` is accepted within its local, editable, static procedural modeling and lighting-integration trial scope. The exact owner reference is preserved at `tools/local_3d_mcp/references/ep02_elephant_ref_r7.png`, SHA-256 `d71d369974ceb275f3baffad6ca88bd88b1ac10d4c76c1b4db403779897f8bac`. It supplied visual direction. Trellis2 was not used or modified.

The six bounded recipe families are amphora, table, column, rock, terrain and elephant. The new optional lighting preset is `elephant_studio`; absence preserves legacy behavior. The official SDK exposes the same eleven stdio tools. No TCP service or new tunnel is needed.

The elephant has connected torso/head/legs/trunk geometry with separate editable ears, tusks, eyes, lids, nails and tail parts. Surface relief is real geometry with plain exportable PBR materials. Overall height is 3.0 m by authoring convention; unseen anatomy is inferred.

## Historical r6 exact accepted evidence

- Job: `job-bd3b994f2785413c`
- Implementation: `7d54ae6d604e7d35869ebdfe816c30fb13f9830b84ff1a58809a55593cb68d82`
- Artifact-set digest: `006ee0ffea11cfb760333701469f8c67abeb27fbf13882642f1b3524c8468700`
- Job directory: `.khosan/local3d/jobs/job-bd3b994f2785413c`
- Review: `review-7f2be586e1a6.json` in that directory; SHA-256 `49839f9318155521d47f7da34d64e41813e677027b6f34a341bdd2fba4463883`
- Historical integrity receipts: `accepted-status.json` and `acceptance-receipt.json` in that directory.
- V4 report: `qa-v4/2026-11-11T17-40-32.826Z-85e645/verification.json` in that directory.
- Task records: `studio/evidence/TASK-LOCAL-3D-ELEPHANT-001.json` and corresponding handoff.
- Runtime snapshot: `.khosan/local3d/source_snapshots/elephant-r6-7d54ae6d604e.zip`.

The native artifact contains 428,900 triangles, 41 editable mesh parts, one semantic elephant and 14 authored material instances. GLB import uses 11 material instances with no missing material and preserves topology, semantic identity and bounds exactly. GLB is 9,998,572 bytes; BLEND is 7,576,743 bytes.

Actual Windows cold build: 26.328 s, including 16.476 s for four 1280×720 Blender views. Verified warm request: 0.047 s. Whole SDK smoke sequence: 28.454 s. Warm reuse is not new geometry generation.

Schema/core extension tests: Linux 30 PASS; Windows 29 PASS plus one expected symlink-privilege skip. A separate real Blender budget probe on Linux rejected an excessive first rock before constructing a subsequent elephant. Existing nonfatal Pydantic lifespan and Three.Clock warnings remain recorded.

## Historical r6 existing-V4 proof

The isolated V4 composition uses installed Remotion 4.0.542, Three 0.187.0, R3F 9.8.2, React 19.2.0 and local Chrome. Native 960×540 frames 0 and 45 show the actual GLB. Frame 45 repeated to the identical PNG hash; hidden-asset, LTC-off and ground-shadow-off controls are recorded.

Three rectangular area lights use the installed LTC lookup textures. Linked GPU uniforms and controlled image differences establish a real LTC contribution. Turning only those lights off changes 83.58% of the asset visibility mask, which also includes its floor shadow. A separate zero-illumination directional VSM shadow proxy changes 23,204 pixels when its receiver is hidden. LTC illumination and projected floor shadows are distinct mechanisms.

All 41 source/dependency/asset fingerprints remained unchanged and were checked again after review. Browser errors are empty. Source parts become 44 render meshes through material grouping. GPU render-pass work is not the unique authored triangle count.

The core manifest and initial smoke/harness-asset snapshots do not fabricate a full V4 PASS. They preserve their earlier execution state; the V4 report and later review/current-status receipts are separate evidence.

## Historical r6 visual review and retained limits

The independent reviewer inspected the owner reference, four actual Blender views and native V4 controls. Earlier r4/r5 failures are retained. Final r6 resolves the central ear gather and uniform corrugation/coarse-pebbling findings. The task is ACCEPT for this trial, with three nonblocking findings:

- `REFERENCE_SCOPE`: Fine wrinkle density, face detail and ear-fold complexity remain simplified.
- `V4_PRESENTATION_LIMIT`: V4 is darker/browner than Blender with a heavier projected shadow; no finished-episode lighting or look parity is accepted.
- `V4_SHADOW_PROXY_EDGE`: A faint dotted edge remains behind the trunk toward the right background.

Human acceptance remains NOT_REVIEWED; production_ready remains false. This is static geometry with no rig, animation, physics or cloth. No video, full episode, continuous-playback or same-page seek proof is claimed. No Oriverse/Trellis2 speed or quality comparison was performed.

## Preserved history and Studio context

The earlier static prop task remains `TASK-LOCAL-3D-MCP-001`, job `job-f79716ca948546c4`, with its own evidence/handoff. Read its historical artifacts through `studio/evidence/TASK-LOCAL-3D-MCP-001.json` and the matching handoff. Its implementation is archived as `v0.1-be73aee29b30.zip`; elephant r4/r5 source snapshots and their REWORK records are preserved. Changed implementations do not inherit old current-source PASS.

The Studio v0.2 baseline has Project Library, active-project APIs/switcher, isolated project roots and restart-persistent state. Source/API/workspace checks previously passed on Windows; browser acceptance remains pending. `WORKSPACE-001` and its task remain verify. Docker and external GPU rigging acceptance are separate. Asset Registry / Asset Lab and World Editor remain subsequent product work.

One project root maps to one reusable DevSpace workspace. This task concerns shared Studio tooling; original episode and sibling game sources were not edited.

## Restart and next work

Read AGENTS.md, studio/studio_state.json, progress.md and this handoff. `TASK-LOCAL3D-PORTABLE-001` is released; source publication and readback are complete. Select a new bounded work item before beginning further production. No work item is currently active.

Keep the owner-PC accepted r6 runtime untouched. Consult each task's own evidence for fresh or historical review status. A finished-episode pass should separately refine face/skin detail and V4 tone/shadow presentation before rigging or episode integration. Preserve the existing Studio browser backlog and accepted masters.

