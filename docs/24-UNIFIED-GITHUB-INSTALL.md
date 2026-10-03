# KHOSAN TIME STUDIO — Unified GitHub Install Contract

## Goal

A fresh machine can clone this repository, install required local dependencies, verify the Studio, and start it without inheriting any machine-specific DevSpace connection or absolute project path.

## Windows quick path

~~~powershell
git clone https://github.com/kongsak4807017/KHOSAN-TIME-STUDIO.git
cd KHOSAN-TIME-STUDIO
.\scripts\install.ps1
.\scripts\doctor.ps1
.\scripts\start.ps1
~~~

The direct local Studio opens on `http://127.0.0.1:8080`.

## Required vs optional

Required:
- Git
- Node.js 20+
- KHOSAN source verification

Optional:
- Python for harness verification and Python-based adapters
- Docker for container mode
- DevSpace for bounded ChatGPT/local workspace execution
- GPU-heavy AI tools such as SkinTokens/UniRig

A missing DevSpace configuration must not make the core Studio doctor fail.

## Portable project storage

If `KHOSAN_PROJECTS_DIR` is not configured, development uses repository-local `projects/`.

For an installed workstation, set a user-selected project library, for example:

~~~text
D:\KHOSAN\Projects
~~~

Do not commit machine-specific paths to project manifests.

## DevSpace

DevSpace is configured after installation. Copy/adapt `config/devspace.example.json` locally and replace placeholders with the allowed project roots for that machine.

The GitHub repository must not encode ChatGPT connector IDs, DevSpace link IDs, tunnel secrets, or a developer workstation's absolute path.

## Update safety

`scripts/update.ps1` requires a clean Git working tree and uses fast-forward-only pull behavior. It must not overwrite uncommitted local work.

## Capability truth

`config/webgpu-capabilities.json` is the truth manifest for the legacy WebGPU package series. A capability is not labeled implemented merely because a report or package version exists.

The legacy v1.1-v2.1 package audit found the embedded `khosan-studio/` payload identical across packages. Therefore the old application payload must not overwrite the newer v0.2 Studio architecture.

Distinct executable prototype artifacts are preserved/integrated separately when available.

## Acceptance target

~~~text
Fresh machine
  -> Clone
  -> Install
  -> Doctor GREEN
  -> Start
  -> Create Project
  -> Save/Reopen
  -> Agent/DevSpace integration when configured
  -> WebGPU Preview when runtime bridge is implemented
  -> Build/Export
~~~

Until WebGPU live preview/runtime bridge is implemented and verified, that step remains explicitly open rather than being reported as complete.
