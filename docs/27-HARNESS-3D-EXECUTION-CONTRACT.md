# KHOSAN native 3D harness — executable acceptance contract (initial slice)

**Status:** implemented *verification slice* with 14 local Node.js tests; not complete autonomous reconstruction. Source: [AI 3D harness user blueprint](../knowledge/oriverse-research/harness-blueprint/README.md). This is a KHOSAN-native design; no Oriverse runtime or Weave dependency.

## How ChatGPT / DevSpace must actually follow the harness

```
Human request + approved reference
  ↓ project-scoped work item, budget and source/rights records
Research → decomposition → lock art direction and reference metadata
  ↓ TASK: bounded geometry/asset work with explicit expected outputs
DevSpace maker (04) produces canonical UG-IR + model code
  ↓ independent deterministic geometry lint (not a prompt)
Native/Blender worker compiles and exports actual GLB
  ↓ render/capture 16 views + camera/performance evidence
Fresh isolated reviewer (11) receives current contact sheet + reference
  ↓ writes defect list / exact image digests; never pre-filled PASS
Studio orchestrator checks machine/file/review receipts
  ↓ **local evidence gate** checks immutable hashes and bound approvals
Human Executive Producer approves via trusted interface
  ↓ freeze / release separately after HG-04
```

### Mandatory agent contracts

- **00 Orchestrator:** intake, work-item scope, transition order, budgets, failure routing, checkpoint. Never grants its own acceptance.
- **06 Technical Architect:** declares coordinate system, UG-IR schema, compiler target, geometry budget, domain limits. Breaking IR changes require HG-02.
- **04 Maker:** writes new code/assets under its allowed project root and preserves locked invariants. No self-approval.
- **08 Rendering Engineer:** independent rendered camera, lighting and exposure metrics (currently external adapter required).
- **10 QA:** executes deterministic tests and creates receipts. A `PASS` string written by an LLM is not a test.
- **11 Independent Reviewer:** runs in a separate actual session; must inspect the current reference and rendered artifact and report defects with region IDs. A mocked VLM must produce **BLOCKED**.
- **Human:** approves final art/identity; HG-01 for vision/constitution, HG-02 for incompatible architecture, HG-03 for destructive operations, HG-04 for release/external side effects.

### Supported data and command

The gate expects project-relative paths in a JSON evidence record conforming to `studio/contracts/3d-verification-evidence.schema.json`. It must be run from a trusted local CLI, never exposed as arbitrary HTTP filesystem access:

```bash
node tools/harness-3d/cli.mjs verify "<absolute-game-project-root>" "<path-to-evidence-json>"
node --test scripts/test-3d-harness.mjs
```

The CLI exits nonzero and prints `BLOCKED` on missing evidence, unresolved paths, bad file hashes, deviations from machine budgets, invalid JSON/glTF/PNG headers, a self-review, absent visual assessment, or missing human-approval binding.

Canonical dimensions for this contract: `cm`, `+Z` up; a Three.js `[x, y, z]` meter point converts to `[100x, -100z, 100y]` cm. This mapping is **explicit** and must not silently mutate older Y-up/meter assets. The current deterministic layout validator supports only `place_bounds_box` instances. Anchor/CSG/skin/rig/mesh-interpenetration tests are not silently accepted.

### Immutable evidence and real-world authority

The sample source used `passed: True` in a TODO stub. This implementation **has no stub critic**. The caller must supply a distinct reviewer receipt and actual binary files, which are validated and hashed. SHA-256 binds artifacts, review and approval to the same bytes. The gate recomputes AABB floating, overlap, seam gaps from UG-IR, and reads the GLB POSITION accessor counts; it does **not** infer that a renderer or a human actually ran merely from metadata.

Before full autonomous acceptance, the Studio must issue and verify authenticated worker run receipts (identity, provider, job ID, source revision, executable/tool digest, signed outputs), run the real independent VLM on isolated context, validate camera rays against the scene, validate actual GLB geometry rather than only metadata, and require an authenticated human approval UI. Until then, passing the local gate means **fixture-level evidence consistency**, not independent proof of cinematic quality or ownership approval.

### Iteration and scope safety

Use the ordered stages: `specified → reference_locked → geometry_built → geometry_verified → rendered → independent_reviewed → human_accepted`. The `advanceStage` API forbids skipping, reversal and manual promotion to `human_accepted`; final approval uses the evidence gate. Store one revision per repair with an explicit problem location, numeric target, protected invariants, and before/after comparisons. A failed tool run leaves task status `verify`, `rework` or `blocked`, never `accepted`.

No user request should cause the Studio API to run unrestricted shell, open an arbitrary drive root, reveal API keys, copy external proprietary engine code, or deploy/publish without HG-04. Use context routing from `studio/context-index.md`, source/rights provenance, and bounded DevSpace workspaces.

## Verification that exists now

`node --test scripts/test-3d-harness.mjs`: 14 local tests passed in a clean Node.js validation directory on 11 Nov 2026. This suite checks a sample native UG-IR box layout, glTF 2.0 triangle GLB, PNG with valid chunks, hashes, role separation, unauthorized stage advancement, and intentional failures. It is **not** a render benchmark or user-PC GPU acceptance. Run it again after checkout and capture a CI receipt.

## Next milestones (not claimed done)

1. Wire real Blender/Three.js 15-command adapters and GLB importer to the native project folder.
2. Produce real contact sheets and raycast camera metrics as trusted worker output.
3. Bind independent VLM critique receipts to actual isolated provider sessions; repair only failing regions.
4. Integrate the CLI gate into the Studio task-state transition backend with authenticated human approval and regression CI.
5. Demonstrate one genuine reference-to-playable scene with QA screenshots, edit diffs, performance and interaction tests.