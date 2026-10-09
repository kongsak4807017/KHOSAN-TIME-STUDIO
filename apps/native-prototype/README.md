# Native Studio vertical slice (v0.1)

Open `apps/native-prototype/index.html` in a modern browser. No build, account, external network or Oriverse connection required.

## What works (implementation present; browser QA pending)
- Add house/tree/NPC/road/player-spawn objects on a 2D grid.
- Select and edit coordinates, remove, undo, clear.
- Validate schema, IDs, finite coordinate bounds, object budget, exactly one spawn.
- Import/export JSON; export editable SVG scene-plan.

## What is NOT implemented
- 3D rendering, WebGPU, mesh synthesis, real physics, multiplayer, persistence backend, AI coding agents, automated browser test, production release.

## Manual acceptance test
1. Open index.html; validation should show PASS and four sample objects.
2. Add a house; select it; edit X and Y; verify the source JSON changes.
3. Undo; verify prior source is restored.
4. Export JSON and SVG; inspect both files.
5. Import exported JSON; confirm the same object count.
6. Delete player spawn; validation must reject export.
7. Restore spawn; export should succeed.

## Documentation
- [Reverse engineering research plan](../../docs/research/ORIVERSE-REVERSE-ENGINEERING-PLAN.md)
- [Native production workflow SVG](../../docs/diagrams/native-studio-production.svg)
- [Evidence-led reverse engineering SVG](../../docs/diagrams/reverse-engineering-evidence.svg)

This branch is an incremental proof of implementation, not a declaration that KHOSAN Studio is finished.
