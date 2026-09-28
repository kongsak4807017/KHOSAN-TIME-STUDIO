# KHOSAN Local / Self-Host Deployment

## Current deployable mode

Today the repository is deployable as a **local AI-assisted development workspace**:

1. clone the repository,
2. bootstrap/verify the harness,
3. open it with ChatGPT + DevSpace,
4. connect/install approved production tools,
5. work through durable tasks/evidence.

The finished Visual Studio Shell/API services are a roadmap item; this guide does not pretend nonexistent services are runnable.

## Local workspace

```bash
git clone https://github.com/kongsak4807017/KHOSAN-TIME-STUDIO.git
cd KHOSAN-TIME-STUDIO
./scripts/bootstrap.sh
```

Windows:
```powershell
git clone https://github.com/kongsak4807017/KHOSAN-TIME-STUDIO.git
cd KHOSAN-TIME-STUDIO
.\scripts\bootstrap.ps1
```

## Target self-host architecture

```text
localhost
  ├─ Studio Web UI
  ├─ Studio API / Orchestrator
  ├─ Preview runtime (WebGPU)
  ├─ Tool worker(s)
  │    ├─ sprite-gen
  │    ├─ 3D pipeline
  │    ├─ material/rig/optimization
  │    └─ build/export
  └─ QA runner / Playwright
```

## Docker policy

Do not add a misleading compose stack until executable service entrypoints exist.

When Phase 1/2 services land:
- pin image/runtime versions,
- add healthchecks,
- mount project/cache/artifact directories explicitly,
- keep secrets in environment/secret store,
- do not mount unrestricted host roots into tool workers,
- isolate tools that can execute arbitrary code,
- document GPU passthrough per OS.

## Production release gate

A self-host release requires:
- reproducible build,
- config example,
- migration notes,
- healthcheck,
- backup/restore path,
- rollback instructions,
- QA evidence,
- human release approval.

## Offline/local-first principle

Core editing and deterministic validation should work locally where practical. Cloud/generative providers are plugins, not hidden requirements.
