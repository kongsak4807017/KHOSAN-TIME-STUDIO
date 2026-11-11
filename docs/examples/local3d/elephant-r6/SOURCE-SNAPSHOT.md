# Exact historical r6 source

The independently reviewed elephant r6 runtime, its fixtures and reference are preserved in [commit f0be220249df92f81d249058dfeec5d4f425d13e](https://github.com/kongsak4807017/KHOSAN-TIME-STUDIO/commit/f0be220249df92f81d249058dfeec5d4f425d13e).

This is the exact 19-file runtime snapshot for implementation:

```text
7d54ae6d604e7d35869ebdfe816c30fb13f9830b84ff1a58809a55593cb68d82
```

It retains the original Python workers, modeling and lighting recipes, typed provider, V4 composition/verifier, fixtures, owner reference and reference contract. The snapshot was independently rehashed before publication. The earlier main source remains its parent without unrelated changes.

This commit preserves historical evidence; it is not the recommended installation target. Use the current main branch and [portable installation guide](../../../27-LOCAL3D-PORTABLE-INSTALL.md) for a new computer. The following portable release has its own fresh installation, renderer and independent review evidence under [portable-windows](../portable-windows/README.md).

The owner's local ZIP archives and complete job directories remain unchanged. They contain larger BLEND/GLB artifacts and intermediate REWORK records, and are not copied into Git. The repository includes the reproducible source, reference, real native preview images, hashes, measurements and the documented r4/r5 → r6 criticism/repair history.
