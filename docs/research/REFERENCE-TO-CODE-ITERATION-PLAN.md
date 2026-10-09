# Reference Image → Native Asset Code: Iterative Research and Production Contract

**State:** A deterministic procedural mesh generator and manual image-reference comparison UI exist on this branch. Automatic reference understanding, photogrammetry, diffusion-to-mesh, high-quality PBR and GPU rendering are **NOT implemented**.

## Non-negotiable design
Source image → rights/provenance → reference package → semantic decomposition → locked dimensions → parameterized procedural asset specification → geometry generator → rendered preview → comparison and region-specific diagnosis → bounded code patch → regression verification → acceptance.

A single image does not reveal backfaces, interior topology or absolute depth. Annotate each dimension as measured, inferred, user-specified or unknown.

## Iterative work packages
- **ASSET-01 (implemented, tests pending):** independent deterministic mesh generator for house/tree/crate; OBJ + JSON output.
- **ASSET-02 (implemented, visual QA pending):** browser Asset Lab with local reference preview and editable dimensions.
- **ASSET-03:** source-image annotation: landmarks, silhouettes, bounding boxes, camera cues, scale markers.
- **ASSET-04:** structured scene/asset decomposition with independently addressable submeshes.
- **ASSET-05:** procedural roofs, trim, windows, doors, foliage, UVs, tangents and LOD; validate watertightness where applicable.
- **ASSET-06:** materials and PBR maps; physically meaningful roughness/metallic; texture provenance.
- **ASSET-07:** WebGPU/WebGL render preview and orbit camera; reference overlay and visual diff.
- **ASSET-08:** iterative optimizer (parameter search with human locks) and golden-reference regression checks.
- **ASSET-09:** asset registry, semantic versioning, source manifests and export validation.
- **ASSET-10:** production hardening: performance budgets, licensing, accessibility and independent human acceptance.

## Asset record fields
`asset_id`, `source_image_sha256`, `source_license`, `reference_camera`, `geometry_spec`, `invariants`, `unknowns`, `generated_mesh_hash`, `qa_receipts`, `human_approval`.

## Acceptance matrix
| Dimension | Evidence |
|---|---|
| Silhouette | side-by-side overlay or edge comparison, per-view |
| Proportion | landmark and ratio error |
| Geometry | nondegenerate triangles, indices, normals, bounds |
| Materials | PBR channel inspection, color space |
| Performance | triangles, draw calls, VRAM, frame time |
| Reproducibility | same spec -> same mesh and hash |
| Preservation | approved geometry and materials unchanged outside patch |
| Rights | traceable license for image, code and textures |

No composite magic score and no claim of 100% fidelity from a single image. QA and independent reviewer must be separate from generator. Never modify the original reference or overwrite an accepted asset in place.
