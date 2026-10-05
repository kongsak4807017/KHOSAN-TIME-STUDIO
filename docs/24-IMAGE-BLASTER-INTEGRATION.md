# KHOSAN image-blaster Integration

## Decision

`image-blaster` is accepted for **source integration / P0 evaluation** as a KHOSAN **Reference Scene Accelerator**.

It is not canonical Asset IR, not the Character Factory, and not a replacement for `img2threejs`.

Primary use:

```text
Reference image
  -> scene/object analysis
  -> static environment (World Labs Marble)
  -> atomic dynamic-object 3D generation (FAL providers)
  -> ambient / impact SFX
  -> local project artifacts
  -> KHOSAN Asset Registry / UG-IR (next integration layer)
```

Pinned source:

- repository: `https://github.com/kongsak4807017/image-blaster.git`
- commit: `4acb43ba126a12358f71838d1b1a05e856b10eaf`
- source license: MIT

External model/API terms and generated-content rights remain separate from the MIT source license and must be reviewed before production redistribution.

## Why it fits KHOSAN

The upstream workflow already separates a single reference into:

- static world output including local `.spz`, collider `.glb`, panorama and thumbnail when returned by World Labs,
- dynamic object outputs such as `.glb` / `.obj`,
- local request/provenance metadata,
- ambient and object-specific SFX.

That makes it useful for quickly bootstrapping a playable scene from concept/reference art.

### Routing boundary

Use **image-blaster** for scene acceleration and first-pass world/object/audio extraction.

Use **img2threejs** when KHOSAN needs structured/code-editable generic 3D reconstruction.

Use **KHOSAN Character Factory** for reusable humanoid/player/NPC characters that require canonical skeleton identity, wearables and animation semantics.

## Installation

Windows:

```powershell
.\scripts\setup-image-blaster.ps1
npm run doctor:image-blaster
```

Linux/macOS/WSL:

```bash
bash scripts/setup-image-blaster.sh
npm run doctor:image-blaster
```

Default source location:

```text
<KHOSAN-TIME-STUDIO>/external/image-blaster
```

Override with:

```text
KHOSAN_EXTERNAL_DIR
KHOSAN_IMAGE_BLASTER_DIR
```

## Credentials

Generation providers require user-owned credentials:

```text
WORLD_LABS_API_KEY
FAL_KEY
```

KHOSAN never stores real key values in Git. The adapter doctor only reports whether a credential is configured.

## Cost safety

`project` initialization is local/no-provider.

`world`, `object` and `sfx` actions are potentially paid and the KHOSAN wrapper refuses them unless `--allow-paid` is explicitly supplied for that invocation.

This is intentional.

## Project isolation

The upstream scripts use relative `worlds/<slug>` paths. KHOSAN does **not** execute them inside the external-tool checkout.

The adapter runs them with working directory:

```text
<ACTIVE_GAME_PROJECT>/assets/generated/image-blaster/
```

Therefore generated state is isolated per game project:

```text
GameProject/
  assets/
    generated/
      image-blaster/
        worlds/
          <world>/
            project.json
            source/
            output/
```

The external repository remains tool source, not game data storage.

## Usage

Initialize a local Image Blast envelope:

```bash
npm run image-blaster -- project \
  --project-root "D:\KHOSAN\Projects\my-game" \
  --world isaan-village
```

Stage images already placed in `assets/generated/image-blaster/input/`:

```bash
npm run image-blaster -- project \
  --project-root "D:\KHOSAN\Projects\my-game" \
  --world isaan-village \
  --stage-input
```

Generate the static world after explicitly accepting provider cost:

```bash
npm run image-blaster -- world \
  --project-root "D:\KHOSAN\Projects\my-game" \
  --world isaan-village \
  --image "references/village.png" \
  --prompt "dry Isan village, late afternoon, empty static environment" \
  --allow-paid
```

Generate one atomic object:

```bash
npm run image-blaster -- object \
  --project-root "D:\KHOSAN\Projects\my-game" \
  --world isaan-village \
  --image "references/village.png" \
  --object-name "wooden cart" \
  --description "one wooden ox cart" \
  --image-edit-prompt "isolate one wooden ox cart, centered, no other objects" \
  --provider hunyuan \
  --face-count 50000 \
  --allow-paid
```

Generate SFX:

```bash
npm run image-blaster -- sfx \
  --project-root "D:\KHOSAN\Projects\my-game" \
  --world isaan-village \
  --prompt "short dry wooden cart impact on packed soil" \
  --kind arbitrary \
  --allow-paid
```

## Readiness gates

`npm run doctor:image-blaster` verifies:

- Node >= 20,
- pinned Git commit,
- expected upstream scripts,
- MIT license file,
- World Labs credential presence,
- FAL credential presence,
- optional Bun viewer runtime,
- ffmpeg/ffprobe for post-processed SFX.

### Promotion to ADOPT

Do not promote from `evaluate` to `adopt` until a real project fixture proves:

1. source pin + doctor pass,
2. static world generation returns local artifacts,
3. one dynamic object produces usable 3D output,
4. SFX generation produces local audio when required,
5. generated files remain inside the active project boundary,
6. asset provenance can be translated into KHOSAN Asset Registry metadata,
7. visual/performance QA passes,
8. provider/license/cost policy is accepted.

## Known limitations

- A single image cannot provide ground-truth hidden geometry.
- Gaussian splats are useful for rapid environment reconstruction but are not automatically equivalent to optimized gameplay collision/mesh.
- External providers are network- and quota-dependent.
- FAL/World Labs generation may incur cost.
- The upstream viewer is Three.js based; KHOSAN treats it as an optional preview, not the canonical renderer.
- Generated assets still require KHOSAN optimization, collision, LOD/material and runtime QA before production use.
