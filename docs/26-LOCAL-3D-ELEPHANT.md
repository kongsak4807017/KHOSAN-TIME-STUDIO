# Reference-guided local elephant and Harness V4 lighting

For installation on another computer and the optional standalone LTC renderer, use the [portable runbook](27-LOCAL3D-PORTABLE-INSTALL.md). This document retains the original accepted r6 experiment and its exact source/artifact identity. A new release build receives new evidence and does not inherit that review. Current verification defaults to the standalone runtime; selecting the historical existing-V4 mode requires an explicit `--v4-root` or `KHOSAN_V4_ROOT`. The [original image gallery](examples/local3d/elephant-r6/README.md) preserves the reviewed views.

Task: `TASK-LOCAL-3D-ELEPHANT-001`  
Version: Local 3D MCP 0.2  
Evidence: actual native Windows r6 job and separate V4 report; independent visual PASS within the reference-guided static procedural trial. Human acceptance remains separate. The final hash-bound MCP review is `review-7f2be586e1a6.json`.

## Outcome and scope

This extension adds an original, editable static elephant to the local Blender/MCP workflow introduced in [Local headless 3D production adapter](25-LOCAL-3D-MCP.md). The owner's supplied image guides the authored proportions, pose, ears, trunk, tusks, surface and studio presentation. Geometry is built locally by the procedural recipe, without Trellis2, an image-to-3D service, downloaded elephant assets or projection of the reference onto a flat surface.

The asset is delivered as editable `scene.blend` and self-contained `scene.glb`, with four actual Blender views and a separate native Harness V4 still test. The reference does not determine unseen anatomy or physical scale. Those are recorded authoring decisions. No rig, skeletal skinning, character animation, simulation, complete episode, movie export or production approval is implied.

The original prop recipes and their proof remain a separate capability and evidence set. This work adds the elephant recipe and an optional lighting preset. It does not replace the prior v0.1 acceptance record with new measurements.

## Exact reference and authoring contract

| Item | Locked value |
|---|---|
| User-supplied image | `ep02_elephant_ref_r7.png` |
| Resolution | 1024 × 576 |
| SHA-256 | `d71d369974ceb275f3baffad6ca88bd88b1ac10d4c76c1b4db403779897f8bac` |
| Project-relative reference path | `tools/local_3d_mcp/references/ep02_elephant_ref_r7.png` |
| Visual contract | `tools/local_3d_mcp/references/elephant-reference-contract.md` |
| Fixture | `tools/local_3d_mcp/fixtures/elephant_scene.json` |
| Semantic object | `reference_elephant` |
| Scene ID / seed | `drkho_elephant_reference_sculpt` / `201117` |

The target is a substantial adult elephant: a continuous rounded torso and short neck, grounded columnar legs, large asymmetric hanging fan ears, a descending tapered trunk with an inward-curled tip, two modest curved ivory tusks and small recessed eyes. Warm grey matte skin has irregular creases with larger folds at joints and the trunk. The hero camera is guided by the reference's three-quarter view; front, side and back expose the model beyond that view.

The unseen side, underside, hind anatomy, tail details and exact wrinkle placement are inferred. The supplied image is retained unchanged and its hash participates in build provenance. Reference likeness remains an image-review judgment; successful schema validation, a reference hash or a dense mesh does not establish it.

## Geometry and editability

`elephant_recipe.py` authors broad anatomical volumes and sweeps, then uses voxel union and smoothing to make the torso, head, neck, four legs and trunk one connected sculpt surface. This avoids a final assembly of exposed intersecting body spheres. Ears, tusks, small eyes and eyelids, nail plates, tail and tuft remain named mesh parts so they can be selected and edited independently.

Skin relief is encoded in actual vertex positions. It combines shallow irregular microrelief with longer localized creases and transverse folds on the trunk and ankles. The current ear patch uses distributed quad sampling and separate crease paths, avoiding an exposed polar fan center. PBR base color and roughness variants are exportable material values; no important surface feature depends on a Blender-only procedural shader or an external texture download.

The native BLEND is editable mesh geometry. It does not contain a poseable skeleton or a non-destructive anatomical node rig. To regenerate a parameter change, edit the fixture and create a new job. To make direct sculpt or mesh edits, open the BLEND. Such edits create a different artifact set and require new measurement/export/review evidence before being treated as verified outputs.

Semantic IDs, recipe names and part IDs are retained as object properties and GLB extras. The worker exports the actual GLB, imports it into a fresh scene and checks counts, bounds, material presence and semantic IDs. It measures evaluated triangles and mesh parts; declared budgets are enforced against these measurements. The render-only studio floor is excluded from exported asset geometry, bounds and the semantic ledger.

## Parameters and coordinates

The schema remains `khosan.scene/1.0`. It accepts strict JSON or the documented KHOSAN Weave subset. Unknown recipes, keys, presets and unsupported operations are rejected. The elephant fixture uses one semantic object and the optional `lighting` field.

| Parameter | Default | Accepted range | Meaning |
|---|---:|---:|---|
| `height` | 3.0 | 1.5–4.5 m | Overall modeled height from the lowest to highest point, including ears, before object transforms. It is not shoulder height. |
| `body_length` | 3.9 | 2.8–5.5 m | Authored rump-to-head source span before union, excluding trunk, tusks and tail. Longitudinal scaling is independent of height. |
| `ear_size` | 1.0 | 0.75–1.3 | Multiplier for the authored fan-ear dimensions. |
| `tusk_length` | 0.72 | 0.25–1.3 | Meter-scale tusk shaping control; it is not a guaranteed measured tusk arc length or tip-to-root distance after all transforms. |
| `skin_detail` | 1.0 | 0–1 | Strength of modeled surface relief; zero omits that relief. |

The body's source span is an authoring definition, not the full elephant's final bounding-box length. Union, smoothing, the trunk and other protruding parts affect final dimensions. Use `measured.json` for actual world bounds. The 3.0 m fixture height is a modeling convention, not a measurement recovered from the image; object scale and rotation can subsequently change world dimensions.

Canonical coordinates are right-handed, Y-up and meters, with the elephant facing +Z. The worker maps them to Blender Z-up as `(x, -z, y)` and the GLB exporter returns glTF Y-up. The V4 loader must not repeat that conversion. Object rotations use Euler XYZ degrees.

The supplied fixture uses `height=3.0`, `body_length=3.9`, `ear_size=1.0`, `tusk_length=0.72`, `skin_detail=1.0`, unit object scale and no rotation. Skin base color is `#777164`, roughness 0.87 and metallic 0. The hero camera is at `[-8.6, 3.0, 5.8]`, targeting `[0, 1.43, 0.12]` with a 49 mm lens. Its four native Blender views are 1280 × 720 at 64 samples. The asset budget is 1,000,000 evaluated triangles and 150 mesh parts.

## Two lighting implementations with separate evidence

The fixture sets `"lighting": {"preset": "elephant_studio"}`. With no override, the original `storybook` presentation remains available. The preset carries the lighting intent into each renderer; it does not promise identical output between Blender and Three.js.

| Renderer or component | Actual implementation | What it establishes |
|---|---|---|
| Native Blender previews | Rectangular native `AREA` lights, Blender rendering and a render-only studio floor | Native four-view appearance, modeled detail and contact with the floor |
| Harness V4 asset lighting | Three genuine `RectAreaLight` objects with `RectAreaLightUniformsLib` from the installed renderer's Three version | Real LTC lookup/shader use and measured lighting contribution in V4 |
| V4 ground shadow | A zero-illumination directional shadow proxy, blurred VSM map and separate transparent `ShadowMaterial` receiver | An approximate projected ground shadow, separate from LTC illumination |

The V4 implementation reuses Three.js's implementation of **Eric Heitz, Jonathan Dupuy, Stephen Hill and David Neubelt, “Real-Time Polygonal-Light Shading with Linearly Transformed Cosines,” ACM SIGGRAPH 2016**. It does not claim to implement a new research renderer or evaluate the BRDF integral exactly. See the [authors' paper and explanation](https://eheitzresearch.wordpress.com/415-2/), [Three.js RectAreaLight](https://threejs.org/docs/pages/RectAreaLight.html) and [RectAreaLightUniformsLib](https://threejs.org/docs/pages/RectAreaLightUniformsLib.html).

The V4 verifier checks the four 64 × 64 LTC lookup textures, records installed source hashes, including the lookup-table modules, and inspects linked GPU programs for active `ltc_1`, `ltc_2` and `rectAreaLights` uniforms. The light positions, rectangle sizes, intensities and actual Three revision are retained in its report. Declaring a light name alone is insufficient evidence.

Three.js rectangular area lights do not themselves cast shadows. The independent ground-shadow receiver therefore has its own control image and metrics. It is not LTC occlusion, full self-shadowing, area-light visibility integration or global illumination. The neutral backdrop floor is separate from the GLB and does not expand the framing bounds. The [ShadowMaterial](https://threejs.org/docs/pages/ShadowMaterial.html) and [LightShadow](https://threejs.org/docs/pages/LightShadow.html) documentation describe the relevant Three components.

Blender's helper uses Blender's own area-light implementation and native shadows. It does not execute the JavaScript LTC path. The two renderers' images are evaluated independently; material or lighting parity at the pixel level is not asserted.

## Current portable commands: build, inspect and render

Run from the root of this checkout, replacing the Blender executable placeholder with the installed path on this machine. These are the current portable commands; the recorded r6 results later in this document remain historical.

```powershell
python scripts/local3d.py setup --blender "<path-to-installed-blender-executable>"
python scripts/local3d.py doctor
python scripts/local3d.py proof --fixture elephant
.\OPEN_LOCAL3D_ELEPHANT.bat
```

The proof script uses the real MCP client and background Blender worker. It records the resulting job path in `.khosan/local3d/elephant-proof.json`. Each job has a unique artifact directory under `.khosan/local3d/jobs/`. Existing master assets and episode files are outside this work item.

`OPEN_LOCAL3D_ELEPHANT.bat` opens the directory of the most recently completed elephant proof. It does not select the last artistically accepted version or grant approval. Inspect the current job manifest and review record to determine acceptance. The proof pointer records an earlier execution instant and need not contain later critic or V4 results.

| Artifact | Purpose |
|---|---|
| `scene.blend` | Native editable model and Blender presentation |
| `scene.glb` | Self-contained geometry and PBR materials for interchange/V4 |
| `preview_front.png` | Front inspection |
| `preview_side.png` | Side anatomy and silhouette inspection |
| `preview_back.png` | Rear anatomy and hidden-side inspection |
| `preview_hero.png` | Reference-guided presentation |
| `measured.json` | Actual evaluated geometry, bounds and GLB reimport checks |
| `manifest.json` | Job identity, artifact hashes and current review state |
| `harness-asset.json` | Asset metadata and V4 presentation contract |

Install the optional standalone renderer and read the actual completed job path from this checkout's elephant proof:

```powershell
node scripts/setup-local3d-v4.mjs
$Local3DElephantProof = Get-Content -Raw -Encoding UTF8 ".khosan/local3d/elephant-proof.json" | ConvertFrom-Json
node tools/local_3d_mcp/adapter/v4/verify.mjs --job $Local3DElephantProof.artifact_directory
```

The default uses this checkout's isolated locked runtime in `standalone_locked` mode. It requires no private V4 source or episodes and records private-V4 verification as not tested. A new `qa-v4/<run>/` preserves the native 960 × 540 stills and report. To inspect an actual existing V4 installation, explicitly add `--v4-root "<existing-v4-root>"`; that selects the separate `existing_v4` scope used by the historical r6 report. See [the renderer guide](../tools/local_3d_mcp/adapter/v4/README.md) for browser selection and the exact mode boundaries.

For the elephant preset the controls cover frames 0 and 45, a repeat of frame 45, the asset hidden, only LTC lights disabled and only the separate ground-shadow receiver disabled. Frame 45 uses a deterministic four-degree camera yaw around the fixture's target. It does not animate the elephant. The visibility-difference region includes the ground shadow and is not an object-ID segmentation mask. A same-frame PNG match checks that specific still-render experiment; it is not a complete playback or same-page seeking test.

## Acceptance and remaining boundaries

Keep three decisions separate:

1. **Technical integrity:** actual files, measured budgets, GLB readback, current hashes and native V4 controls pass for the exact job.
2. **Independent visual review:** a reviewer other than the maker inspects the real four views against the locked reference, including silhouette, proportions, connections, skin detail, material values, lighting and composition. A failed visual review remains REWORK even when the technical checks pass.
3. **Owner acceptance:** the owner accepts the appearance. A critic record cannot grant this on the owner's behalf.

The independent critic inspected all four actual Windows r6 views and returned **PASS within the reference-guided static procedural elephant scope**. The central ear gather is eliminated; localized trunk/ankle folds and irregular flank creases read more clearly, while coarse uniform pebbling and corrugation are reduced. Broad anatomy, grounded feet, tusks, small eyes and nail plates remain coherent. The review concerns the specific r6 output, not earlier prop acceptance or earlier elephant technical passes.

Fine wrinkle density and facial/ear detail remain simplified compared with the owner's reference. No photographic likeness or exact reconstruction is claimed. V4 is technically verified but its appearance is darker/browner than the Blender presentation, with a heavier ground shadow and a faint shadow-proxy edge. It is not a final V4 beauty approval. These limitations are retained rather than hidden by the technical PASS.

The actual V4 success label `PASS_SCOPED_STATIC_GLB_LTC_STILLS` concerns the separate static-asset and lighting experiment. It does not assert exact reference reconstruction, animation, physical behavior, a full episode or publication readiness. Human acceptance remains `NOT_REVIEWED` and `production_ready` remains false until the applicable owner decision and production work are recorded.

## Observed final Windows and V4 evidence

These measurements come from the actual r6 MCP proof, `measured.json` and its native V4 `verification.json`. Unsuccessful and superseded iteration evidence is retained separately. The smoke record predates later critic/V4 decisions, so its original `NOT_REVIEWED` / `NOT_TESTED` fields are not rewritten to pretend those steps happened during the build.

| Evidence | Final value |
|---|---|
| Job ID and artifact directory | `job-bd3b994f2785413c` / `.khosan/local3d/jobs/job-bd3b994f2785413c/` |
| Target runtime | Windows Python 3.12.10, Blender 5.2.2 LTS; MCP protocol 2025-11-25, 11 tools |
| Implementation SHA-256 | `7d54ae6d604e7d35869ebdfe816c30fb13f9830b84ff1a58809a55593cb68d82` |
| Artifact-set digest | `006ee0ffea11cfb760333701469f8c67abeb27fbf13882642f1b3524c8468700` |
| Cold Windows build / verified warm-cache request | 26.328 s / 0.047 s; complete smoke sequence 28.454 s |
| Native Blender render seconds | 16.476 s for the four 1280 × 720 views |
| Evaluated triangles / editable mesh parts | 428,900 / 41 |
| Materials | 14 authored material instances; 11 used after GLB reimport; no mesh missing a material |
| Measured canonical world dimensions | X 3.0063933 × Y 3.0000000 × Z 4.4055619 m |
| GLB reimport and maximum bounds difference | PASS; 428,900 triangles, 41 meshes and semantic IDs preserved; 0.0 m bounds difference |
| Deliverable sizes | GLB 9,998,572 bytes; BLEND 7,576,743 bytes |
| GLB SHA-256 | `8156b2353ad416429837fd8be4e3244cec95993564ede295b419e58977e6b4ad` |
| Independent critic verdict and bound record | PASS within the static procedural reference-guided scope; `review-7f2be586e1a6.json` |
| Native V4 runtime | Remotion 4.0.542, Three 0.187.0, installed Chrome; native 960 × 540 stills |
| V4 report | `.khosan/local3d/jobs/job-bd3b994f2785413c/qa-v4/2026-11-11T17-40-32.826Z-85e645/verification.json` |
| V4 technical result | `PASS_SCOPED_STATIC_GLB_LTC_STILLS` / `PASS_SCOPED_STATIC_ASSET` |
| LTC contribution | 3 actual rectangular lights; 1 active LTC GPU program; 128,909 pixels change when only LTC is disabled |
| Separate ground-shadow contribution | 23,204 pixels change when only the shadow receiver is hidden |
| Repeat-frame and source-boundary checks | Frame 45 repeat PNG SHA-256 identical; all 41 fingerprinted files unchanged; browser errors 0 |
| Human acceptance | `NOT_REVIEWED` unless explicitly updated by the owner |

The task-level evidence record is `studio/evidence/TASK-LOCAL-3D-ELEPHANT-001.json`; it also identifies the preserved source archive. The V4 report retains a nonfatal Three.Clock deprecation warning. The 41 editable source parts become 44 imported render meshes because of material grouping; GPU draw calls and triangles across shadow/render passes are distinct from unique authored mesh counts.

Measurements, timing and appearance conclusions identify the exact source and output digests above. A cache request reuses verified artifacts; it is not new-geometry generation time. This single fixture does not establish a speed or quality advantage over Oriverse across other asset categories.

