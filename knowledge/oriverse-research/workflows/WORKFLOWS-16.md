# Oriverse / Weave Research — 16 Reconstructed Workflow Diagrams

**PROVENANCE:** Reconstructed from the previously generated `Oriverse_Capability_Audit_SVG_Workflows.zip` DOT diagrams (graph titles, named steps, sequence/repair arrows). This is **not** a verbatim first-party Oriverse diagram or original Oriverse internal architecture. Oriverse-specific adapter mentions are *historical design proposals*, **not mandatory KHOSAN integration**. KHOSAN production remains native and independent.

## 01-end-to-end — Prompt-to-Playable Game

```mermaid
flowchart TB
  01endtoend_n0["User Prompt + References"]
  01endtoend_n1["LLM Intent / Planning"]
  01endtoend_n2["MCP Typed Tool Calls"]
  01endtoend_n3["Weave Source + Assets"]
  01endtoend_n4["Compile + Simulate"]
  01endtoend_n5["Playtest / Visual QA"]
  01endtoend_n6["Human Approval"]
  01endtoend_n7["Publish / Share"]
  01endtoend_n0 --> 01endtoend_n1
  01endtoend_n1 --> 01endtoend_n2
  01endtoend_n2 --> 01endtoend_n3
  01endtoend_n3 --> 01endtoend_n4
  01endtoend_n4 --> 01endtoend_n5
  01endtoend_n5 --> 01endtoend_n6
  01endtoend_n6 --> 01endtoend_n7
  01endtoend_n5 -.-> 01endtoend_n2
```

## 02-khosan-orchestrator — KHOSAN Studio Orchestration

```mermaid
flowchart TB
  02khosanorchestrator_n0["User / Creative Brief"]
  02khosanorchestrator_n1["Studio Orchestrator"]
  02khosanorchestrator_n2["Specialist Agents"]
  02khosanorchestrator_n3["Project Graph / UG-IR"]
  02khosanorchestrator_n4["Oriverse Adapter / MCP"]
  02khosanorchestrator_n5["Weave Compiler + Runtime"]
  02khosanorchestrator_n6["Evidence / QA Gate"]
  02khosanorchestrator_n7["Release Approval"]
  02khosanorchestrator_n0 --> 02khosanorchestrator_n1
  02khosanorchestrator_n1 --> 02khosanorchestrator_n2
  02khosanorchestrator_n2 --> 02khosanorchestrator_n3
  02khosanorchestrator_n3 --> 02khosanorchestrator_n4
  02khosanorchestrator_n4 --> 02khosanorchestrator_n5
  02khosanorchestrator_n5 --> 02khosanorchestrator_n6
  02khosanorchestrator_n6 --> 02khosanorchestrator_n7
  02khosanorchestrator_n6 -.-> 02khosanorchestrator_n2
```

## 03-reference-to-3d — Reference-to-3D Reconstruction

```mermaid
flowchart TB
  03referenceto3d_n0["Reference Image"]
  03referenceto3d_n1["Landmarks / Silhouette"]
  03referenceto3d_n2["Camera Fit / Constraints"]
  03referenceto3d_n3["3D Geometry Assumptions"]
  03referenceto3d_n4["Procedural #mesh"]
  03referenceto3d_n5["Material + Collider"]
  03referenceto3d_n6["Preview / Compare"]
  03referenceto3d_n7["Asset Registry"]
  03referenceto3d_n0 --> 03referenceto3d_n1
  03referenceto3d_n1 --> 03referenceto3d_n2
  03referenceto3d_n2 --> 03referenceto3d_n3
  03referenceto3d_n3 --> 03referenceto3d_n4
  03referenceto3d_n4 --> 03referenceto3d_n5
  03referenceto3d_n5 --> 03referenceto3d_n6
  03referenceto3d_n6 --> 03referenceto3d_n7
  03referenceto3d_n6 -.-> 03referenceto3d_n2
```

## 04-asset-provenance — Asset Provenance & Reuse

```mermaid
flowchart TB
  04assetprovenance_n0["Asset Request"]
  04assetprovenance_n1["Search / Generate / Procedural"]
  04assetprovenance_n2["Asset Source + Dependencies"]
  04assetprovenance_n3["Mesh / Texture / Clip"]
  04assetprovenance_n4["License + Provenance Manifest"]
  04assetprovenance_n5["Validation / Preview"]
  04assetprovenance_n6["Registry + Version"]
  04assetprovenance_n7["World Placement"]
  04assetprovenance_n0 --> 04assetprovenance_n1
  04assetprovenance_n1 --> 04assetprovenance_n2
  04assetprovenance_n2 --> 04assetprovenance_n3
  04assetprovenance_n3 --> 04assetprovenance_n4
  04assetprovenance_n4 --> 04assetprovenance_n5
  04assetprovenance_n5 --> 04assetprovenance_n6
  04assetprovenance_n6 --> 04assetprovenance_n7
  04assetprovenance_n5 -.-> 04assetprovenance_n1
```

## 05-incremental-edit — Incremental Weave Editing

```mermaid
flowchart TB
  05incrementaledit_n0["Read Live World (Read-only)"]
  05incrementaledit_n1["Inspect Objects / Sections"]
  05incrementaledit_n2["Revision Snapshot"]
  05incrementaledit_n3["Patch Targeted Source"]
  05incrementaledit_n4["Compile + Simulate"]
  05incrementaledit_n5["Playtest / Inspect"]
  05incrementaledit_n6["Review Diff / Evidence"]
  05incrementaledit_n7["Apply / Save"]
  05incrementaledit_n0 --> 05incrementaledit_n1
  05incrementaledit_n1 --> 05incrementaledit_n2
  05incrementaledit_n2 --> 05incrementaledit_n3
  05incrementaledit_n3 --> 05incrementaledit_n4
  05incrementaledit_n4 --> 05incrementaledit_n5
  05incrementaledit_n5 --> 05incrementaledit_n6
  05incrementaledit_n6 --> 05incrementaledit_n7
  05incrementaledit_n4 -.-> 05incrementaledit_n3
  05incrementaledit_n5 -.-> 05incrementaledit_n3
```

## 06-compiler-vm — Weave Compiler & Runtime

```mermaid
flowchart TB
  06compilervm_n0["Weave Scene + Classes"]
  06compilervm_n1["Parser / Type Checks"]
  06compilervm_n2["Compiler / Bytecode"]
  06compilervm_n3["Deterministic Tick"]
  06compilervm_n4["Physics / Gameplay"]
  06compilervm_n5["UI / Render"]
  06compilervm_n6["Runtime Logs"]
  06compilervm_n7["Verification Report"]
  06compilervm_n0 --> 06compilervm_n1
  06compilervm_n1 --> 06compilervm_n2
  06compilervm_n2 --> 06compilervm_n3
  06compilervm_n3 --> 06compilervm_n4
  06compilervm_n4 --> 06compilervm_n5
  06compilervm_n5 --> 06compilervm_n6
  06compilervm_n6 --> 06compilervm_n7
  06compilervm_n1 -.-> 06compilervm_n0
```

## 07-multiplayer — Multiplayer Verification

```mermaid
flowchart TB
  07multiplayer_n0["Player A + Player B Inputs"]
  07multiplayer_n1["Session / Identity"]
  07multiplayer_n2["Shared Deterministic State"]
  07multiplayer_n3["Input Ordering / Simulation"]
  07multiplayer_n4["Join / Leave / Rejoin"]
  07multiplayer_n5["State / UI Inspection"]
  07multiplayer_n6["Divergence Tests"]
  07multiplayer_n7["PASS / FAIL Evidence"]
  07multiplayer_n0 --> 07multiplayer_n1
  07multiplayer_n1 --> 07multiplayer_n2
  07multiplayer_n2 --> 07multiplayer_n3
  07multiplayer_n3 --> 07multiplayer_n4
  07multiplayer_n4 --> 07multiplayer_n5
  07multiplayer_n5 --> 07multiplayer_n6
  07multiplayer_n6 --> 07multiplayer_n7
  07multiplayer_n6 -.-> 07multiplayer_n2
```

## 08-ui-qa — UI Interaction QA

```mermaid
flowchart TB
  08uiqa_n0["UI Requirements"]
  08uiqa_n1["Canvas / UI Source"]
  08uiqa_n2["Compile + Runtime"]
  08uiqa_n3["ui_inspect Tree"]
  08uiqa_n4["Synthetic Click / Input"]
  08uiqa_n5["Observed State / Layout"]
  08uiqa_n6["Accessibility + Overflow Gate"]
  08uiqa_n7["Evidence / Fix"]
  08uiqa_n0 --> 08uiqa_n1
  08uiqa_n1 --> 08uiqa_n2
  08uiqa_n2 --> 08uiqa_n3
  08uiqa_n3 --> 08uiqa_n4
  08uiqa_n4 --> 08uiqa_n5
  08uiqa_n5 --> 08uiqa_n6
  08uiqa_n6 --> 08uiqa_n7
  08uiqa_n6 -.-> 08uiqa_n1
```

## 09-rendering-qa — Rendering Diagnostic QA

```mermaid
flowchart TB
  09renderingqa_n0["Visual Reference"]
  09renderingqa_n1["Mesh + PBR Material"]
  09renderingqa_n2["Lighting / Shadows / AO"]
  09renderingqa_n3["Render / AOV Debug"]
  09renderingqa_n4["Albedo / Normal / Roughness"]
  09renderingqa_n5["Compare Reference"]
  09renderingqa_n6["Visual Defect Classification"]
  09renderingqa_n7["Fix / Verify"]
  09renderingqa_n0 --> 09renderingqa_n1
  09renderingqa_n1 --> 09renderingqa_n2
  09renderingqa_n2 --> 09renderingqa_n3
  09renderingqa_n3 --> 09renderingqa_n4
  09renderingqa_n4 --> 09renderingqa_n5
  09renderingqa_n5 --> 09renderingqa_n6
  09renderingqa_n6 --> 09renderingqa_n7
  09renderingqa_n6 -.-> 09renderingqa_n1
```

## 10-terrain-world — Terrain & World Generation

```mermaid
flowchart TB
  10terrainworld_n0["World Brief / Height Constraints"]
  10terrainworld_n1["Terrain Heightfield"]
  10terrainworld_n2["Biomes / Vegetation"]
  10terrainworld_n3["Roads / Settlements"]
  10terrainworld_n4["Collision / Navigation"]
  10terrainworld_n5["Walkable Slope QA"]
  10terrainworld_n6["World Playtest"]
  10terrainworld_n7["Approved World Region"]
  10terrainworld_n0 --> 10terrainworld_n1
  10terrainworld_n1 --> 10terrainworld_n2
  10terrainworld_n2 --> 10terrainworld_n3
  10terrainworld_n3 --> 10terrainworld_n4
  10terrainworld_n4 --> 10terrainworld_n5
  10terrainworld_n5 --> 10terrainworld_n6
  10terrainworld_n6 --> 10terrainworld_n7
  10terrainworld_n5 -.-> 10terrainworld_n1
```

## 11-character-factory — Character Factory

```mermaid
flowchart TB
  11characterfactory_n0["Character Brief / References"]
  11characterfactory_n1["Canonical Character IR"]
  11characterfactory_n2["Skeleton + Skin + Clothes"]
  11characterfactory_n3["Materials + Equipment"]
  11characterfactory_n4["Animations / Sockets"]
  11characterfactory_n5["Rig / Motion Verification"]
  11characterfactory_n6["Runtime Integration"]
  11characterfactory_n7["Reusable Character Asset"]
  11characterfactory_n0 --> 11characterfactory_n1
  11characterfactory_n1 --> 11characterfactory_n2
  11characterfactory_n2 --> 11characterfactory_n3
  11characterfactory_n3 --> 11characterfactory_n4
  11characterfactory_n4 --> 11characterfactory_n5
  11characterfactory_n5 --> 11characterfactory_n6
  11characterfactory_n6 --> 11characterfactory_n7
  11characterfactory_n5 -.-> 11characterfactory_n1
```

## 12-performance — Performance & Scaling

```mermaid
flowchart TB
  12performance_n0["Performance Targets"]
  12performance_n1["Scene / Instance Budgets"]
  12performance_n2["Render Profiles"]
  12performance_n3["Simulation / Multiplayer Load"]
  12performance_n4["Frame / Memory Capture"]
  12performance_n5["Bottleneck Classification"]
  12performance_n6["Optimization Patch"]
  12performance_n7["Regression Verification"]
  12performance_n0 --> 12performance_n1
  12performance_n1 --> 12performance_n2
  12performance_n2 --> 12performance_n3
  12performance_n3 --> 12performance_n4
  12performance_n4 --> 12performance_n5
  12performance_n5 --> 12performance_n6
  12performance_n6 --> 12performance_n7
  12performance_n6 -.-> 12performance_n3
```

## 13-security-release — Security & Release Governance

```mermaid
flowchart TB
  13securityrelease_n0["Tool Request + Identity"]
  13securityrelease_n1["Permission / Scope Check"]
  13securityrelease_n2["Source Revision Guard"]
  13securityrelease_n3["Compile / QA Evidence"]
  13securityrelease_n4["Asset License Review"]
  13securityrelease_n5["Human High-impact Approval"]
  13securityrelease_n6["Audit Receipt"]
  13securityrelease_n7["Publish / Share"]
  13securityrelease_n0 --> 13securityrelease_n1
  13securityrelease_n1 --> 13securityrelease_n2
  13securityrelease_n2 --> 13securityrelease_n3
  13securityrelease_n3 --> 13securityrelease_n4
  13securityrelease_n4 --> 13securityrelease_n5
  13securityrelease_n5 --> 13securityrelease_n6
  13securityrelease_n6 --> 13securityrelease_n7
  13securityrelease_n1 -.-> 13securityrelease_n0
  13securityrelease_n4 -.-> 13securityrelease_n0
```

## 14-portability — Cross-engine Portability (Proposed)

```mermaid
flowchart TB
  14portability_n0["Weave / Asset Sources"]
  14portability_n1["Extract Dependency Graph"]
  14portability_n2["KHOSAN UG-IR + Asset IR"]
  14portability_n3["Adapter: Oriverse / Native"]
  14portability_n4["Material / Rig / Gameplay Mapping"]
  14portability_n5["Target Compile + Import"]
  14portability_n6["Round-trip / Parity Tests"]
  14portability_n7["Release Candidate"]
  14portability_n0 --> 14portability_n1
  14portability_n1 --> 14portability_n2
  14portability_n2 --> 14portability_n3
  14portability_n3 --> 14portability_n4
  14portability_n4 --> 14portability_n5
  14portability_n5 --> 14portability_n6
  14portability_n6 --> 14portability_n7
  14portability_n6 -.-> 14portability_n2
```

## 15-research-evidence — Technical Research Record (TRR)

```mermaid
flowchart TB
  15researchevidence_n0["Question / Hypothesis"]
  15researchevidence_n1["First-party Documentation"]
  15researchevidence_n2["API Signature Evidence"]
  15researchevidence_n3["Safe Experiment"]
  15researchevidence_n4["Observed vs Expected"]
  15researchevidence_n5["Disclosure Status"]
  15researchevidence_n6["Research Gaps"]
  15researchevidence_n7["TRR + Next Experiment"]
  15researchevidence_n0 --> 15researchevidence_n1
  15researchevidence_n1 --> 15researchevidence_n2
  15researchevidence_n2 --> 15researchevidence_n3
  15researchevidence_n3 --> 15researchevidence_n4
  15researchevidence_n4 --> 15researchevidence_n5
  15researchevidence_n5 --> 15researchevidence_n6
  15researchevidence_n6 --> 15researchevidence_n7
```

## 16-production-roadmap — KHOSAN Production Roadmap

```mermaid
flowchart TB
  16productionroadmap_n0["Phase 0: Baseline + Backup"]
  16productionroadmap_n1["Phase 1: Evidence Registry"]
  16productionroadmap_n2["Phase 2: Oriverse Adapter"]
  16productionroadmap_n3["Phase 3: Asset IR + Character IR"]
  16productionroadmap_n4["Phase 4: Automated QA Harness"]
  16productionroadmap_n5["Phase 5: Vertical Slice"]
  16productionroadmap_n6["Phase 6: Cross-engine Validation"]
  16productionroadmap_n7["Human Release Gate"]
  16productionroadmap_n0 --> 16productionroadmap_n1
  16productionroadmap_n1 --> 16productionroadmap_n2
  16productionroadmap_n2 --> 16productionroadmap_n3
  16productionroadmap_n3 --> 16productionroadmap_n4
  16productionroadmap_n4 --> 16productionroadmap_n5
  16productionroadmap_n5 --> 16productionroadmap_n6
  16productionroadmap_n6 --> 16productionroadmap_n7
  16productionroadmap_n5 -.-> 16productionroadmap_n2
```

