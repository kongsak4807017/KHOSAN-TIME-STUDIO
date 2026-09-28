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
- Technical architecture changes route through `06-technical-architect`.
- Makers cannot approve their own work.
- QA evidence + independent review are required before acceptance.

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
