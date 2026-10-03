$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $Root

if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw "Git is required." }
$status = git status --porcelain
if ($status) { throw "Working tree is not clean. Preserve local changes before updating." }

git pull --ff-only
& (Join-Path $PSScriptRoot "install.ps1")
