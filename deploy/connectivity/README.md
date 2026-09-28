# DevSpace Connectivity Pack

This directory documents the optional connectivity layer used when ChatGPT needs to reach the local DevSpace MCP server.

## Architecture

~~~text
ChatGPT
  ↓
HTTPS tunnel provider
  ↓
DevSpace MCP 127.0.0.1:7676
  ↓
allowedRoots
~~~

KHOSAN Studio Web/API remains:

~~~text
127.0.0.1:8080
~~~

Do not tunnel port 8080 by default.

## Included in the Master repository

- provider-neutral architecture and security policy,
- DevSpace example config,
- Cloudflare example config,
- Windows wrappers for DevSpace/ngrok/Cloudflare,
- connectivity doctor,
- persistent ChatGPT workspace contract.

## Intentionally local-only

Do not commit:
- auth tokens,
- owner token/password,
- tunnel credentials,
- machine-specific domains/state,
- absolute-path launchers,
- downloaded ngrok/cloudflared binaries,
- logs and lock files.

## Verify

Local only:

~~~bash
python tools/devspace-connectivity/doctor.py
~~~

Require public MCP endpoint:

~~~bash
python tools/devspace-connectivity/doctor.py --require-public
~~~

See:
- `docs/18-DEVSPACE-CONNECTIVITY.md`
- `docs/19-CHATGPT-DEVSPACE-PERSISTENT-WORKSPACE.md`
