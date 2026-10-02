# KHOSAN Local / Self-Host Deployment

## Current deployable baseline — v0.2.0

KHOSAN TIME STUDIO now has a runnable trusted-local Web/API shell.

Available:
1. repository + ChatGPT + DevSpace mode,
2. optional DevSpace MCP tunnel/connectivity pack for ChatGPT access,
3. Node.js local Studio server,
4. Docker Compose local Studio server,
5. multi-project Project Library + active project persistence,
6. isolated new-project manifests/state/workspace directories,
7. project-aware routing and workspace boundary API,
8. SkinTokens/UniRig local rigging adapter boundary.

Not yet production remote-ready:
- authentication/authorization,
- multi-user isolation,
- remote tool execution,
- general GPU worker service,
- live WebGPU game preview from UG-IR,
- production backup/migration automation.

## Direct local run

~~~bash
git clone https://github.com/kongsak4807017/KHOSAN-TIME-STUDIO.git
cd KHOSAN-TIME-STUDIO
node scripts/verify-source.mjs
node apps/studio-server/server.mjs
~~~

Windows convenience:

~~~powershell
.\scripts\bootstrap.ps1
.\scripts\run-studio.ps1
~~~

Linux/macOS convenience:

~~~bash
chmod +x scripts/*.sh
./scripts/bootstrap.sh
./scripts/run-studio.sh
~~~

Open:

~~~text
http://127.0.0.1:8080
~~~

## Docker

~~~bash
docker compose up --build
~~~

Health:

~~~bash
curl http://127.0.0.1:8080/api/health
~~~

Stop:

~~~bash
docker compose down
~~~

## ChatGPT + DevSpace connectivity

For local-only Studio use, no tunnel is required.

When ChatGPT needs to access the local DevSpace workspace:

~~~text
ChatGPT -> HTTPS tunnel -> DevSpace MCP 127.0.0.1:7676
~~~

The KHOSAN Studio Web/API remains on `127.0.0.1:8080` and is **not** published by this tunnel.

Verify local connectivity:

~~~bash
python tools/devspace-connectivity/doctor.py
~~~

Verify public MCP connectivity:

~~~bash
python tools/devspace-connectivity/doctor.py --require-public
~~~

See `docs/18-DEVSPACE-CONNECTIVITY.md`.

## Rigging worker on host

Clone pinned source revisions:

Windows:
~~~powershell
.\scripts\setup-rigging.ps1
~~~

Linux/macOS:
~~~bash
./scripts/setup-rigging.sh
~~~

Then install the vendor-specific CUDA/Python dependencies and checkpoints according to `docs/16-3D-AUTO-RIGGING.md`.

Check readiness:

~~~bash
python tools/adapters/rigging/doctor.py
~~~

The Studio web container intentionally does not contain these GPU dependencies.

## Trust boundary

v0.2:
- binds localhost by default,
- no arbitrary-shell HTTP endpoint,
- 1 MiB request-body limit,
- project IDs/path traversal guarded,
- secrets stay outside git,
- local game projects are not committed to the Master repo by default,
- tool execution stays in DevSpace/registered local adapters,
- DevSpace tunnel publishes only the MCP service, not the Studio Web/API,
- DevSpace/tunnel credentials and machine-specific state stay outside Git.

Do not expose v0.2 directly to the public internet.

## Source verification

~~~bash
node scripts/verify-source.mjs
python scripts/harness_check.py
node --check apps/studio-server/server.mjs
node --check apps/studio-web/public/app.js
npm run verify:workspace
python -m py_compile tools/adapters/rigging/*.py
~~~

A manual GitHub Actions workflow is available at `.github/workflows/manual-verify.yml`; it does not run automatically on push.

## Production release gate

Future remote/team release requires:
- authentication,
- accepted security model,
- reproducible build,
- migration/backup plan,
- QA evidence,
- artifact identity/checksum,
- human release approval,
- rollback procedure.
