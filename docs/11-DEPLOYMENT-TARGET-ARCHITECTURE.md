# Deployment Target Architecture

## Development modes

### Mode A — Repository + ChatGPT + DevSpace
Available first. Best for building the Studio itself.

### Mode B — Local Studio App
Target for ordinary creators.

```text
Desktop/browser UI
      ↓ localhost
Studio API / orchestration service
      ↓
local project workspace + tool adapters
      ↓
WebGPU preview
```

### Mode C — Local packaged stack
Reproducible multi-service install after service boundaries stabilize.

### Mode D — Remote/team server
Optional later. Must add authentication, tenant/project isolation, secrets, quotas and sandboxing.

## Trust boundary

The Studio UI must not gain arbitrary host shell access.

A local agent/tool service should expose bounded operations:
- read/write inside project roots,
- invoke registered tool commands,
- build/test,
- stream logs/artifacts.

Protected operations remain approval-gated.

## Tool execution

Prefer:
- isolated venv for Python tools,
- pinned Node dependencies,
- containers for high-conflict services,
- explicit GPU host integration where containers are unsuitable.

## Directories

```text
<studio-root>/
  projects/
  tool-data/
  cache/
  artifacts/
  logs/
```

Project source and approved assets are durable. Caches/build artifacts are replaceable.

## Observability

Every long-running job should have:
- task ID,
- tool/version,
- start/end/status,
- input/output artifact references,
- logs,
- resource metrics where useful,
- cancellation state.

This lets agents resume/review without trusting chat memory.
