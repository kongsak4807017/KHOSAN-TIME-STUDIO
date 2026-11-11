# Portable static-GLB and LTC rendering proof

This optional fixture connects the local GLB provider to **real Remotion + ThreeCanvas + Three.js**. Its default mode uses an isolated, locked runtime installed in this checkout. It does not require the owner's channel tree, private V4 episode source or globally installed Node packages.

## Install on another computer

Use Node.js **20 or later** with npm; a current LTS version is recommended. From the repository root, including a path containing spaces or non-Latin characters:

```sh
node scripts/setup-local3d-v4.mjs
node tools/local_3d_mcp/adapter/v4/verify.mjs --job "<actual-job-directory>"
```

Setup runs `npm ci` against `portable-runtime/package-lock.json`, then uses the pinned Remotion renderer's `ensureBrowser()` API to install its matching Chrome Headless Shell. All eight direct package versions are exact: Remotion/bundler/renderer/three `4.0.542`, Three `0.187.0`, React/React DOM `19.2.0`, and React Three Fiber `9.8.2`. Transitive versions and integrity hashes are committed in the lockfile. Setup requires network access for npm and the browser download; normal verification uses the local installation.

The dependencies, versioned browser cache and machine-specific setup receipt stay under `portable-runtime/node_modules/`, excluded from publication. A repeated setup reuses a matching installation. `--force-install` performs a clean locked install; `--skip-browser` installs only dependencies and reports the browser step as pending.

If downloading a browser is unavailable, select an existing local Chromium, Chrome or Edge explicitly:

```sh
node scripts/setup-local3d-v4.mjs --browser "<path-to-browser-executable>"
# Or select a different browser for one verification:
node tools/local_3d_mcp/adapter/v4/verify.mjs --job "<actual-job-directory>" --browser "<path-to-browser-executable>"
```

`KHOSAN_LOCAL3D_BROWSER` is the equivalent explicit browser override. An explicitly selected browser's actual version is recorded; it is not described as Remotion's managed browser build. Linux must also provide Chromium's [system libraries](https://www.remotion.dev/docs/miscellaneous/linux-dependencies). Setup does not change OS packages or install global software.

Standalone verification defaults to `--gl swangle`, using software WebGL so a GPU is not assumed. On a desktop GPU, `--gl angle` is available. The selected backend and actual browser version are recorded. Software rendering can be slower; output parity between different GPUs/browsers is not promised. See the [upstream GL backend guidance](https://www.remotion.dev/docs/gl-options).

Use the real job directory returned by the headless tool. The verifier requires its self-contained `scene.glb` and `harness-asset.json`; Blender and the MCP server do not need to remain running to render an existing verified artifact.

## Two explicit runtime modes

| Mode | Selection | What is checked |
|---|---|---|
| `standalone_locked` (default) | Run without a V4-root selection | This checkout's locked runtime, own source and actual input/output artifacts. No private V4 files are loaded or verified. |
| `existing_v4` | `--v4-root "<existing studio_harness_v4>"` or `KHOSAN_V4_ROOT` | Exact tested package versions from the selected V4 root, plus before/after hashes of its explicitly listed source files. It remains a separate composition, not an episode test. |

Example of the optional existing-V4 mode:

```sh
node tools/local_3d_mcp/adapter/v4/verify.mjs --job "<actual-job-directory>" --v4-root "<existing studio_harness_v4>" --browser "<existing-browser>"
```

This mode never upgrades or installs dependencies in the selected V4 root. It defaults to `angle`. Missing or different package versions fail with a suggestion to use the standalone runtime.

Dependency resolution uses `createRequire` at the selected root and explicit browser-side aliases. Both direct package resolution and bundled dependency paths must remain inside that root's `node_modules`; ancestor/global fallback is rejected. The process uses its own loopback/HTTP Host guard, independent of any private channel script. Bundler caching is disabled. Build output and the only two public input files live under the selected job's fresh `qa-v4/<run>/` directory. The verifier performs no automatic package/browser download, movie export or persistent preview-server setup.

## What the proof checks

- Native 960×540 PNGs at frames 0 and 45, using a deliberate absolute-time camera change.
- A repeated render of frame 45, checked for byte-identical PNG output.
- A hidden-asset control at frame 45, with decoded-pixel comparison against the visible scene.
- Actual browser metrics from the parsed scene: artifact hash, semantic object/part counts, draw calls and rendered triangles.
- Attached asset meshes are checked separately from total render work. An elephant's hidden-asset control retains its render-only floor and lights.
- Zero browser errors; warnings are retained explicitly.
- Unchanged proof source, package lock, dependency entry points and input artifacts during verification; explicitly selected private V4 sources are included only in `existing_v4` mode.

The PNG comparison decoder/encoder uses only Node's built-in zlib. It supports the 8-bit RGB/RGBA non-interlaced PNGs emitted by Chromium, validates chunk CRCs and bounds decompression. The comparison image places the rendered view on the left and an amplified asset-versus-hidden difference on the right.

## Output

Each fresh run preserves:

- `frame-000.png`
- `frame-045.png`
- `visibility-comparison.png`
- `verification.json`, including failed reports when applicable
- isolated public input copies and the render bundle

The repeat and hidden controls are checked in memory and their hashes/metrics are retained in the report. They do not add extra delivery images.

The report schema is `khosan.local3d-v4-proof/2`. Only a completed standalone verifier reports `PASS_STANDALONE_STATIC_GLB_STILLS` (or the LTC variant), with `renderer_integration: PASS_SCOPED_STATIC_ASSET`. It records `v4_render_integration: NOT_TESTED_PRIVATE_V4`, `originalV4SourceUnchanged: null`, and `original_v4_source_verification: NOT_APPLICABLE_STANDALONE_RUNTIME`. These fields distinguish the portable renderer evidence from private V4 source verification.

Explicit `existing_v4` mode retains `PASS_SCOPED_STATIC_GLB_STILLS` (or the LTC variant) and its scoped V4 integration field. Its source hashes establish that the selected files stayed unchanged, not that an original episode was executed.

The repeated still check is not a continuous-playback or same-page seek test. Neither mode establishes whole-episode integration, animation, rigging, physics, voice synchronization, Blender-versus-Three material parity, final artistic approval or publication readiness. The headless pipeline's separate status command remains responsible for current source/spec/build verification.

`entry.tsx` uses the Remotion frame clock, async loading holds, explicit lighting and a separately mounted scene. No independent animation loop is introduced. The imported 3D geometry remains static and independently editable.

## Elephant studio: genuine LTC lighting and separate ground shadows

The optional scene setting `"lighting": {"preset": "elephant_studio"}` is forwarded by the compiler to the asset manifest's `presentation.lighting`. `presentation.camera` carries the explicit scene camera: `position`, `target`, and `lens_mm`. The absent/default preset is `storybook`, retaining the original demonstration lighting and framing.

For `elephant_studio`, the proof uses three **real Three.js RectAreaLight** instances: a broad upper-camera-left key, restrained cool fill, and soft rim. `lighting-ltc.mjs` initializes `RectAreaLightUniformsLib` from the same installed Three version as the renderer. It verifies the four 64×64 LTC lookup textures and inspects linked GPU programs for active `ltc_1`, `ltc_2`, and `rectAreaLights` uniforms. The final report records the actual Three revision, light positions, rectangle sizes and intensities, and hashes the installed LTC implementation sources and lookup data.

This reuses the Three.js implementation of **Eric Heitz, Jonathan Dupuy, Stephen Hill and David Neubelt, “Real-Time Polygonal-Light Shading with Linearly Transformed Cosines,” ACM SIGGRAPH 2016**. It does not claim a new implementation of the paper or an exact BRDF integral. Primary references:

- [Authors' paper and explanation](https://eheitzresearch.wordpress.com/415-2/)
- [Three.js RectAreaLight](https://threejs.org/docs/pages/RectAreaLight.html)
- [Three.js RectAreaLightUniformsLib](https://threejs.org/docs/pages/RectAreaLightUniformsLib.html)
- [Three.js ShadowMaterial](https://threejs.org/docs/pages/ShadowMaterial.html)
- [Three.js LightShadow](https://threejs.org/docs/pages/LightShadow.html)

**LTC area lights do not cast shadows in Three.js.** Grounding is deliberately separate: a zero-illumination directional light produces a blurred VSM shadow map, received by a transparent `ShadowMaterial` overlay on a neutral backdrop floor. This is an approximate projected ground shadow, not LTC occlusion, full self-shadowing, area-light visibility integration or global illumination. The backdrop is unlit and matches the background, preventing distant light falloff from creating a black horizon band. Neither plane enters exported geometry, asset bounds or the semantic ledger.

The fixture camera determines the hero position, target and lens. The frame-45 proof adds a deterministic four-degree yaw to that same camera; there is no accumulated animation state. Blender's default 36 mm horizontal sensor width is used to convert the supplied lens to the 16:9 proof's vertical field of view. The floor never expands the framing bounds.

Two additional bounded controls are rendered for this preset:

1. **LTC disabled:** only the three rectangular light intensities become zero. Camera, imported geometry, ambient fill, floor and shadow proxy remain fixed. Pixel contribution must be measurable in the region changed by showing the asset. That region includes its ground shadow; it is not an object-ID segmentation mask.
2. **Ground-shadow receiver disabled:** the three LTC lights remain enabled, while only the separate shadow-receiving overlay is hidden. The resulting difference must be nonzero, demonstrating actual shadow contribution rather than merely declaring a shadow setting.

The additional outputs are `frame-045-ltc-off.png`, `ltc-contribution-comparison.png`, and `ground-shadow-comparison.png`. The shadow-off capture itself remains in memory, with its hash and metrics retained in the report. Only a completed verifier reports `PASS_STANDALONE_STATIC_GLB_LTC_STILLS` in portable mode or `PASS_SCOPED_STATIC_GLB_LTC_STILLS` in explicitly selected existing-V4 mode. Artistic/production approval remains separate.

The Blender-side `lighting.py` uses **Blender's native rectangular AREA lights** for the same studio-lighting intent. Its render-only floor has a low emission baseline matched to the world radiance to prevent a distant unlit horizon band. Blender does not run this JavaScript LTC implementation; image equivalence between the two renderers is not claimed. The helper preserves the fixture camera and authored asset materials, and the worker excludes all `render_only` objects from measurements and GLB export.
