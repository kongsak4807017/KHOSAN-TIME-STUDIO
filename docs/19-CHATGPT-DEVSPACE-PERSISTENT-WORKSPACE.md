# ChatGPT + DevSpace Persistent Workspace Contract

## Purpose

Prevent unnecessary workspace churn and incorrect tunnel/OAuth recovery during long KHOSAN production sessions.

## AI operating contract

1. Call `open_workspace` only when no valid workspace exists for the current project root.
2. Reuse the returned `workspaceId` for subsequent calls in the same continuous project session.
3. Do not close, release, delete or disconnect the workspace merely because one answer/tool turn ended.
4. Opening a new workspace is allowed only when:
   - none exists yet,
   - the server confirms the old ID is invalid/expired,
   - the project root changes,
   - or the human explicitly requests a new workspace.
5. Preserve the current project root and working directory unless the task requires a bounded change.
6. Do not create a new connector, reconnect OAuth, restart DevSpace/tunnel or rotate credentials solely because ChatGPT reports that the conversation does not support developer MCP.
7. Treat a host/runtime capability failure separately from a DevSpace server failure.
8. If the DevSpace namespace exists but no callable functions are available, classify it as `HOST_CAPABILITY_BLOCKED`; no request has reached DevSpace yet.
9. If a callable function returns an error, correlate the time/request with DevSpace logs before changing server/tunnel state.
10. After temporary host capability returns, try the existing `workspaceId` before opening another workspace.

## Startup status

Recommended status after first successful open:

> DevSpace workspace is open and the same workspaceId will be reused for this project session unless the server reports it invalid or the project root changes.

## HOST_CAPABILITY_BLOCKED

Recommended status:

> DEVSPACE CONNECTOR: HOST_CAPABILITY_BLOCKED — the conversation currently has no callable DevSpace functions, so no request has reached the local DevSpace server. Do not restart the tunnel/server or rotate credentials for this condition.

## Project persistence boundary

This contract improves logical-session continuity but cannot guarantee workspace persistence across:
- deleted chats,
- account changes,
- OAuth expiry,
- DevSpace restart,
- server-side workspace cleanup,
- host/runtime changes that remove developer MCP capability.

Durable project truth remains in the repository and work-item/handoff/evidence files.
