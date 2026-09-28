# KHOSAN 3D Auto-Rigging Pipeline — SkinTokens + UniRig

## Decision

KHOSAN will evaluate **SkinTokens as the preferred P0 auto-rigging candidate** and **UniRig as a fallback / expert / research path**.

This is not yet an ADOPT decision. Promotion to ADOPT requires a local integration fixture, reproducible command, license/provenance note, GPU/resource measurement, output validation and animation test.

> **Blender status clarification (2026-09-29):** Blender is now an ADOPT / CORE DCC for editable 3D master assets. SkinTokens and UniRig remain EVALUATE candidates for *automatic rig generation*. References in this document to Blender as a fallback mean fallback/manual rig correction inside the broader Blender master-asset workflow, not that Blender itself is a fallback tool.

## Why SkinTokens is preferred

SkinTokens / TokenRig accepts a single 3D mesh and produces a complete skeleton hierarchy plus skinning weights in one autoregressive pipeline.

Current repository capabilities include:
- input: OBJ / FBX / GLB,
- output: GLB,
- single-file and directory batch processing,
- optional preservation of original texture and scale via `--use_transfer`,
- optional existing-skeleton mode via `--use_skeleton`,
- optional voxel skin post-processing,
- local Gradio UI,
- direct CLI entrypoint.

Runtime requirements from the project:
- Python >= 3.11,
- CUDA >= 12.1,
- NVIDIA GPU with at least 14 GB VRAM for inference,
- PyTorch/CUDA dependencies,
- flash-attn,
- Blender Python (`bpy`).

Example:
~~~bash
python demo.py --input input.glb --output rigged.glb --use_transfer
~~~

For an existing skeleton:
~~~bash
python demo.py --input skeleton.glb --output skinned.glb --use_skeleton --use_transfer
~~~

## Why UniRig remains valuable

UniRig is the predecessor and separates the workflow into explicit stages:

1. skeleton prediction,
2. optional human/agent inspection/refinement,
3. skinning-weight prediction,
4. merge back into the source asset.

This separation is useful when KHOSAN needs:
- explicit skeleton QA before skinning,
- manual correction of missing tail/wing/limb bones,
- multiple skeleton candidates/seeds,
- research comparison,
- a fallback when TokenRig output is not acceptable.

Representative commands:
~~~bash
bash launch/inference/generate_skeleton.sh --input model.glb --output model_skeleton.fbx
bash launch/inference/generate_skin.sh --input model_skeleton.fbx --output model_skin.fbx
bash launch/inference/merge.sh --source model_skin.fbx --target model.glb --output model_rigged.glb
~~~

UniRig's own documentation warns that poor skeleton prediction can significantly degrade skinning, so KHOSAN should insert a skeleton inspection gate before the skinning stage when using this path.

## KHOSAN integration architecture

~~~text
Reference / Generated 3D
        |
        v
img2threejs or imported mesh
        |
        v
KHOSAN Mesh Normalize
  - scale / axis
  - topology/format
  - material references
        |
        v
Rigging Router
   +-------------------------------+
   |                               |
   v                               v
SkinTokens                     UniRig Expert Path
default candidate              skeleton -> inspect -> skin
   |                               |
   +---------------+---------------+
                   v
            Rigged GLB/FBX
                   |
                   v
           Rig Validation Gate
  - skeleton hierarchy
  - root/orientation
  - skin weights
  - max influences
  - deformation sanity
  - texture/material preservation
  - bounding box / scale
                   |
                   v
        Animation Retargeting
                   |
                   v
       glTF Transform / optimize
                   |
                   v
            KHOSAN Asset IR
                   |
                   v
            Asset Registry
                   |
                   v
          WebGPU / Godot / Unity
~~~

## ChatGPT agent routing

Normal creator request:

> Rig this character and make it animation-ready.

Expected routing:
1. Studio Orchestrator creates a bounded rigging work item.
2. Asset Synthesizer owns the task.
3. Technical Architect provides the Asset IR / skeleton contract when needed.
4. DevSpace executes the registered rigging adapter locally.
5. QA validates the rig and deformation.
6. Independent Reviewer checks evidence for production acceptance.
7. Engine Adapter consumes only the normalized KHOSAN Asset IR result.

The creator should not need to know whether SkinTokens or UniRig was used unless they open advanced details.

## DevSpace execution model

Recommended local layout:

~~~text
KHOSAN-TIME-STUDIO/
  tools/
    adapters/
      rigging/
        doctor.py
        rig.py
        validate.py
  external/
    SkinTokens/
    UniRig/
  tool-data/
    skintokens/
      checkpoints/
  projects/<game>/
    assets/source/
    assets/intermediate/rigging/
    assets/approved/
~~~

Do not copy external project source into KHOSAN as if authored by KHOSAN. Pin repository URL + commit/tag in the tool manifest.

The future KHOSAN adapter should expose stable commands independent of vendor CLI, for example:

~~~bash
python tools/adapters/rigging/doctor.py

python tools/adapters/rigging/rig.py \
  --input projects/game/assets/source/hero.glb \
  --output projects/game/assets/intermediate/rigging/hero.glb \
  --engine skintokens \
  --preserve-materials

python tools/adapters/rigging/validate.py \
  --input projects/game/assets/intermediate/rigging/hero.glb
~~~

The adapter can internally translate this into SkinTokens or UniRig commands.

## Tool doctor requirements

Before a ChatGPT agent attempts rigging, DevSpace should verify:
- NVIDIA GPU visible,
- VRAM >= required threshold for selected engine,
- driver/CUDA compatibility,
- Python environment,
- PyTorch CUDA availability,
- flash-attn availability,
- bpy/Blender import,
- model checkpoint presence,
- writable project/intermediate paths.

If doctor fails, the task becomes BLOCKED with evidence rather than repeatedly retrying installation.

## Windows

SkinTokens is the easier primary candidate for Windows because its main CLI is Python and its code explicitly handles Windows process creation for the Blender-Python server.

UniRig's documented inference entrypoints are Bash scripts. On Windows, use:
- WSL2, or
- a validated Bash environment,
- or preferably a KHOSAN Python adapter that reproduces the staged commands without exposing shell differences to the creator.

Do not make the Studio UI depend on Bash.

## Asset IR requirements for rigged assets

A normalized rigged asset should record:
- skeleton ID/version,
- bone hierarchy,
- bind/rest transforms,
- joint names or semantic aliases,
- skin weights,
- max bone influences per vertex,
- source mesh/version,
- rigging engine/version/commit,
- generation parameters/seed where applicable,
- material/texture preservation result,
- validation status,
- known uncertain/problematic bones,
- animation-retarget compatibility profile.

## QA gates

At minimum:
1. file opens and validates,
2. skeleton hierarchy is non-empty and acyclic,
3. root/orientation/scale are correct,
4. skin weights normalize correctly,
5. no catastrophic cross-part weight bleeding,
6. representative limb/tail/wing deformations are visually plausible,
7. materials/textures survive when requested,
8. runtime skinning fixture renders in KHOSAN WebGPU,
9. performance/bone-count limits are recorded,
10. failures and manual edits remain traceable.

## License

Both reviewed repositories declare MIT licenses. KHOSAN must still preserve required copyright/license notices and separately verify licenses/terms for downloaded checkpoints, upstream datasets and other transitive assets before redistribution.

## Promotion criteria: EVALUATE -> ADOPT

SkinTokens can become ADOPT only after:
- local DevSpace `doctor` passes,
- one humanoid and one non-humanoid fixture rig successfully,
- texture-preserving GLB round-trip passes,
- KHOSAN runtime skinning accepts the output,
- basic animation retarget/deformation test passes,
- resource/time measurement is recorded,
- checkpoint redistribution/deployment policy is documented.

UniRig remains available as fallback/expert mode unless testing shows no production value.
