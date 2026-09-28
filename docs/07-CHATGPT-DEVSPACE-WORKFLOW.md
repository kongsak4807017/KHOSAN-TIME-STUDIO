# ChatGPT + DevSpace Local Workspace Workflow

## Primary operating model

ChatGPT acts as the Studio control surface while DevSpace provides access to the real local repository.

The repository, not chat history, is the durable memory.

## Orchestrator session

Prompt:

> Open this local workspace. Operate as KHOSAN Studio Orchestrator. Read AGENTS.md first, run bootstrap checks, read studio/studio_state.json, progress.md, session-handoff.md and studio/graph.md. Convert my request into one bounded work item with allowed paths, acceptance criteria, verification and human gates. Do not implement specialist work unless explicitly assigned.

## Specialist session

Prompt:

> Operate as KHOSAN agent `08-rendering-engineer` for `TASK-XXXX` only. Read AGENTS.md, the task, your role file and only the context routed for this task. Stay inside allowed_paths. Return a typed handoff and verification evidence. Do not expand scope.

Replace the role ID as needed.

## Parallel work

Use separate worktrees only when:
- tasks are genuinely independent,
- ownership is explicit,
- shared files will not collide.

Rules:
- worker cannot recursively spawn more workers,
- each worker gets a self-contained task,
- Orchestrator performs fan-in,
- integration receives its own verification.

## Maker/checker

Implementation agent:
- writes production changes and relevant tests,
- records exact commands/results.

QA:
- verifies acceptance criteria independently,
- does not silently fix production code while grading it.

Independent Reviewer:
- uses fresh context where practical,
- reviews requirement fidelity, architecture, scope and evidence.

## Session handoff

Before ending:
- persist files changed,
- commands/results,
- blockers,
- decisions,
- exact next action.

Do not depend on “we discussed this yesterday.”

## Tool access

Tools should be least-privilege by role:
- researchers/design: read-mostly,
- implementers: bounded writes,
- QA/reviewer: tests/evidence, production source read-only by default,
- release: build/package; external deployment requires human approval.

## Recommended work-unit size

Prefer work that can be described with:
- one objective,
- one owner,
- one bounded file area,
- observable acceptance criteria,
- runnable verification.

If a task cannot fit this form, decompose it first.


## Persistent workspace rule

For long-running project work:
- open one DevSpace workspace for the project root,
- reuse the same `workspaceId` while it remains valid,
- do not restart OAuth/tunnel/workspace merely because a ChatGPT conversation does not expose developer-MCP tools,
- distinguish host capability failure from an actual DevSpace server request failure.

Canonical contract:
`docs/19-CHATGPT-DEVSPACE-PERSISTENT-WORKSPACE.md`

## Connectivity profile

When ChatGPT must reach the local DevSpace server:

~~~text
ChatGPT -> HTTPS tunnel -> DevSpace MCP 127.0.0.1:7676
~~~

Use:
`docs/18-DEVSPACE-CONNECTIVITY.md`

The KHOSAN Studio Web/API on `127.0.0.1:8080` remains separate and localhost-only in v0.1.
