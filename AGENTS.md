# KHOSAN TIME STUDIO — Agent Operating Manual

This root file is the routing page. Detailed role instructions live under `studio/agents/`.

## Mandatory startup
1. Confirm repository root and git state.
2. Run the repository bootstrap/verification script appropriate for the OS.
3. Read `studio/studio_state.json`, `progress.md`, and `session-handoff.md`.
4. Read `studio/graph.md`.
5. Select exactly one active work item.
6. Read the active role contract.
7. Load only context required by that task.
8. Do not implement until scope, allowed paths, acceptance criteria, verification and human gates are explicit.

## Authority
- Human owner = Executive Producer and final authority.
- `00-studio-orchestrator` owns routing/state, not hidden implementation.
- `13`–`20` form the Creative Intelligence Council. They are advisory and cannot select the game, change the Creative Constitution, or push production changes directly.
- `01-creative-director` protects the locked Creative Constitution with the human.
- Technical architecture changes route through `06-technical-architect`.
- Makers cannot approve their own work.
- QA evidence + independent review are required before acceptance.

## Creative Intelligence invariants
- Explore a portfolio before collapsing to one concept when the task is genuinely exploratory.
- Do not use one universal creativity/winner score.
- Separate stated community feedback from observed player behavior.
- Claims about players require source context, population/time window where known, uncertainty and contrary evidence when material.
- Community/telemetry findings become hypotheses or typed work items; they do not mutate the game directly.
- Changes to player fantasy, emotional promise, core vision or sacred constraints require HG-01.
- Do not infer sensitive personal traits for audience targeting or player analysis.

## Project workspace invariants
- Before project-scoped production, resolve one active `project_id` and project root.
- Project-scoped work items use `studio/contracts/project-work-item.schema.json` and require `project_id`.
- One interactive Studio session has one active game project.
- Sibling game projects are never implicit read/write context.
- One project root maps to one reusable DevSpace workspace per continuous session.
- Shared tools/models may be reused, but project source/state/assets remain isolated.
- Never accept an arbitrary filesystem path from Studio HTTP as a project write root.
- See `docs/22-MULTI-PROJECT-WORKSPACE-ARCHITECTURE.md`.

## Durable source of truth
- Product architecture: `docs/`
- Tool decisions: `studio/tool-registry.yaml`
- Execution graph: `studio/graph.md`
- Current state: `studio/studio_state.json`
- Work items: `studio/tasks/`
- Handoffs: `studio/handoffs/`
- Evidence: `studio/evidence/`
- Decisions: `studio/decisions/`
- Human gates: `studio/human-gates.md`

## Safety invariants
- Preserve unrelated dirty-tree changes.
- Never run destructive git/filesystem operations without explicit human approval.
- Do not push, merge, publish, deploy, expose secrets, or incur paid external side effects without explicit human approval.
- Write tools are serialized unless path isolation/worktrees prove independence.
- Never change acceptance criteria to make failing work pass.
- Never hide skipped tests, unsupported targets, generated uncertainty or unresolved risk.

## Context discipline
Use progressive disclosure:
1. always load metadata/state;
2. load role/task instructions;
3. load technical/research resources only on demand.

Workers receive self-contained tasks. Do not rely on another agent's private chat history.

## Native 3D Harness (reference-driven geometry / scenes)

For 3D production tasks, load `docs/27-HARNESS-3D-EXECUTION-CONTRACT.md` and the **source review** in `knowledge/oriverse-research/harness-blueprint/README.md`. The user-supplied Google Doc is archived as research, **not** an executable tool specification or proof of proprietary internals.

- Use phase-specific maker roles; preserve the approved reference, coordinate/units contract, asset and task identifiers, source revision and locked invariants.
- **No fabricated QA:** do not copy historical sample code that returns `passed: True` while the independent VLM call is a TODO. Unsupported adapters, unrendered images, and unexecuted checks must be `BLOCKED` or `NOT VERIFIED`.
- Distinct QA and independent reviewer identities/sessions are required; their receipts must bind hashes of the actual current reference and render output. A checkbox does not authenticate identity.
- Before claiming a 3D asset accepted, invoke the project-scoped local verifier `node tools/harness-3d/cli.mjs verify <project-root> <evidence-json>` and store its result. An LLM's verdict is not a substitute for measurement or a binary-file check.
- Final artistic acceptance, release and publishing still require the **authenticated human approval** defined by the project governance. The current CLI verifies Ed25519 reviewer and human-approval receipt signatures against independently provisioned public trust keys; only a trusted Studio approval/checker service holding protected private keys can issue genuine receipts. It does not prove the actual VLM/human action occurred unless the issuer performed that work.
- Do not assume all geometry types are validated: the initial native layout linter supports **only bounded Z-up/cm boxes** and fails closed on unsupported anchors/CSG/rigging. Do not claim full production support from its unit tests.

## Part 7 Differential Patch Policy (research integration)

When a 3D task requires incremental repair, load `docs/28-PART7-HARD-LOCKS-SECURITY-REVIEW.md` and use the bounded `tools/ugir-geometry-linter/hard_lock_enforcer.py` only for supported Z-up/cm AABB scenes. The developer's sample `hard_lock_enforcer.py` and HMAC `verify_evidence_gate.py` must **not** be used verbatim: the latter has a hardcoded default signing secret and can sign self-declared review results. Freeze source revision and verified node coordinates; patch only measured failing axes and rerun geometry tests. **Do not claim that this rule is enforced across Studio/DevSpace until a trusted dispatcher with OS-level permission isolation is integrated and tested.** The existing `tools/harness-3d/gate.mjs` provides distinct signed review/human receipts for asset acceptance, but not the missing native tool authorization layer.

## Signed 3D gateway usage (Nov 2026)

For supported project-scoped 3D geometry work, load `docs/29-TRUSTED-6-HARD-LOCKS-GATEWAY.md`. LLM/DevSpace makers may propose signed `create_geometry` / `patch_failing_layout_nodes` actions but are **not permitted to declare acceptance**, mutate protected source, or sign for Controller, Checker, Renderer, Reviewer or Human. Calls to the trusted gateway must carry a signed, short-lived command with exact project/task, expected version, and non-replayed nonce. Only `trusted-gateway.mjs` can promote the signed finite-state task under a dedicated OS service identity. On Windows the separate-account/NTFS ACL and key-issuer service setup is a **mandatory deployment prerequisite**; code-only tests do not prove the current developer account is restricted. Never run `gateway-daemon.mjs` as an unrestricted Maker. Real image critique and signed human service receipts remain independent human/backend acceptance gates. Run `npm run verify:gateway` and inspect GitHub `trusted-gateway-and-evidence` CI before acceptance.

## Definition of Done
A work item is Done only when:
1. acceptance criteria are satisfied,
2. deterministic checks pass,
3. QA evidence is recorded,
4. Independent Reviewer returns ACCEPT or a documented human override exists,
5. state/progress/handoff are updated,
6. residual risks and unverified areas are explicit.

## End of session
Update `progress.md`, write `session-handoff.md`, persist evidence/handoffs, and leave the repository restartable.
