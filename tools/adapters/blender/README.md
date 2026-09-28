# KHOSAN Blender Adapter

This adapter is the first headless bridge between ChatGPT-authored semantic asset jobs and Blender.

## Purpose

The adapter keeps the creator workflow conversational while making Blender execution deterministic and auditable:

```text
ChatGPT -> JSON edit job -> DevSpace -> Blender background mode -> .blend master + .glb runtime artifact
```

The `.blend` file is the editable DCC master. The `.glb` file is a derived runtime artifact.

## Commands

Check Blender:

```bash
python tools/adapters/blender/doctor.py --json
```

Validate a job and print the Blender invocation without running it:

```bash
python tools/adapters/blender/run_job.py \
  --job tools/adapters/blender/examples/ploy_character_edit.json \
  --dry-run
```

Execute a real job:

```bash
python tools/adapters/blender/run_job.py \
  --job path/to/job.json
```

Use `BLENDER_BIN` when Blender is not on `PATH`.

## Supported source formats

- `.blend`
- `.glb`
- `.gltf`

Relative paths inside a job are resolved relative to the job JSON file by the Blender worker.

## Initial allowlisted operations

- `set_shape_key_value`
- `set_object_visibility`
- `set_object_transform`
- `parent_object_to_bone`
- `set_custom_property`
- `rename_data_block`

There is deliberately **no `execute_python` operation**.

## Why the operation list is narrow

Blender scripting is extremely powerful. A conversational agent must not be allowed to smuggle arbitrary code through an asset job. The runner validates the job and the worker dispatches only to hard-coded operations.

Adding a new operation requires:
1. contract/schema update,
2. implementation,
3. tests,
4. security review,
5. real Blender fixture evidence.

## What this adapter does not yet do

- automatic sculpting/body-region morphology,
- topology generation,
- automatic shape-key creation,
- automatic facial rig generation,
- automatic anatomical muscle simulation,
- full animation authoring,
- runtime secondary-motion solving,
- auto-rigging.

Auto-rigging remains the SkinTokens/UniRig workstream. Rich character editing is composed incrementally on top of the Blender master.

## Verification

Pure-Python contract tests:

```bash
python -m unittest discover -s tools/adapters/blender/tests -p "test_*.py"
```

Then perform a real fixture round-trip in DevSpace with Blender installed and inspect both the saved `.blend` and exported `.glb`.

See:
- `docs/17-BLENDER-CHARACTER-ASSET-PIPELINE.md`
- `studio/contracts/blender-character-edit-job.schema.json`
- `studio/decisions/ADR-0001-BLENDER-CORE-DCC.md`
- `studio/tasks/TASK-ASSET-BLENDER-001.json`
