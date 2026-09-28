# DevSpace Connectivity & Tunnel Deployment

## Decision

DevSpace connectivity is an **official deploy-readiness layer** for KHOSAN TIME STUDIO, but it is optional by deployment profile.

It is not part of the game runtime and must not be coupled to the Studio Web/API process.

## Deployment profiles

### Profile A — Local Studio only

~~~text
Browser
  ↓
KHOSAN Studio Web/API
127.0.0.1:8080
~~~

No tunnel is required.

### Profile B — ChatGPT + DevSpace local workspace

~~~text
ChatGPT
   ↓ HTTPS / OAuth MCP
Tunnel provider
   ↓
DevSpace MCP
127.0.0.1:7676
   ↓
Allowed local project root(s)
~~~

This is the recommended development profile when ChatGPT needs to read/edit/run bounded work in the local workspace.

### Profile C — Remote/team Studio

Not ready in v0.1.0.

Do not reuse the DevSpace tunnel as a shortcut for publishing the KHOSAN Studio Web/API to the public internet. Remote/team Studio requires its own authentication, authorization, tenant/project isolation and tool-worker security model.

## Provider strategy

KHOSAN supports provider-agnostic connectivity.

### ngrok
Good for quick Windows setup and static developer domains.

Operational requirements:
- DevSpace remains bound to localhost,
- tunnel targets the configured DevSpace port (default 7676),
- use a static domain when continuity matters,
- keep the ngrok auth token outside Git,
- validate the public MCP endpoint after startup.

### Cloudflare Tunnel
Recommended alternative when a controlled domain is available.

Use a named tunnel/config that targets:

~~~text
http://127.0.0.1:7676
~~~

Keep:
- `cert.pem`,
- tunnel credentials JSON,
- concrete hostname,
- account-specific config

outside the repository.

## Important port separation

~~~text
7676  DevSpace MCP connectivity
8080  KHOSAN Studio Web/API
~~~

A DevSpace tunnel must not automatically publish port 8080.

## Master-repository files

Safe to version:
- connectivity documentation,
- example configs,
- tunnel/provider wrappers without credentials,
- connectivity doctor,
- persistent workspace contract,
- acceptance criteria.

Local-only / never commit:
- ngrok authtoken,
- DevSpace owner token/password,
- `~/.devspace/auth.json`,
- actual tunnel credential JSON,
- Cloudflare `cert.pem`,
- provider account state,
- actual production hostname if policy treats it as environment config,
- logs/locks/stop files,
- downloaded tunnel binaries.

## DevSpace config example

See `config/devspace.example.json`.

The machine-local file remains:

~~~text
~/.devspace/config.json
~~~

The authentication file remains:

~~~text
~/.devspace/auth.json
~~~

Do not copy authentication secrets into the Studio repository.

## Connectivity doctor

Run:

~~~bash
python tools/devspace-connectivity/doctor.py
~~~

Require public MCP connectivity:

~~~bash
python tools/devspace-connectivity/doctor.py --require-public
~~~

The doctor checks:
- local DevSpace config,
- allowed roots,
- local port,
- local MCP authentication challenge,
- public MCP authentication challenge when configured,
- availability of DevSpace and tunnel-provider executables,
- Git Bash on Windows where required.

It does not print owner tokens.

## Windows launch

DevSpace:

~~~powershell
.\scripts\run-devspace.ps1
~~~

ngrok tunnel:

~~~powershell
$env:KHOSAN_DEVSPACE_DOMAIN="your-static-domain.example"
.\scripts\run-devspace-ngrok.ps1
~~~

Cloudflare named tunnel:

~~~powershell
$env:KHOSAN_CLOUDFLARED_CONFIG="$HOME\.cloudflared\config.yml"
.\scripts\run-devspace-cloudflare.ps1
~~~

These wrappers intentionally do not configure or embed account tokens.

## Existing local control-panel workflow

A machine-specific GUI/control panel may manage:
- allowed roots,
- DevSpace port,
- tunnel domain,
- start/stop,
- autostart,
- logs.

That is an operator convenience layer. It must not become the canonical source for project state or secrets.

Generated launchers should derive their path at setup time. Do not commit a VBS launcher containing an absolute path to one user's Downloads/Desktop folder.

## Persistent ChatGPT workspace

See `docs/19-CHATGPT-DEVSPACE-PERSISTENT-WORKSPACE.md`.

The logical rule is:
- open one workspace for one project root,
- reuse its `workspaceId` while valid,
- do not restart tunnel/OAuth merely because a ChatGPT conversation lacks developer-MCP capability,
- distinguish host capability failure from an actual request reaching DevSpace.

## Acceptance matrix

Connectivity becomes accepted on a target development PC only after evidence for:

1. DevSpace listens only on configured localhost port.
2. Allowed roots contain only intended project roots.
3. Local MCP endpoint returns the expected authenticated challenge/response.
4. Tunnel maps the intended public hostname to the intended DevSpace port.
5. Public MCP endpoint is reachable with authentication protection.
6. No owner token/authtoken/Cloudflare credentials exist in Git.
7. Restart/autostart behavior is tested if enabled.
8. ChatGPT opens one workspace and can reuse the same `workspaceId`.
9. A read/write/test smoke task succeeds within the allowed root.
10. Stopping the tunnel does not stop or corrupt the Studio/project workspace.

## Security note

A public tunnel increases attack surface even when OAuth/Bearer protection exists.

Use the minimum exposed service:
- expose DevSpace MCP only when needed,
- keep Studio Web/API localhost-only in v0.1,
- keep allowed roots narrow,
- rotate compromised credentials outside Git,
- never log or display owner secrets in shared evidence.
