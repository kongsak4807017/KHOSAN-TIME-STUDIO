$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $Root
node scripts/verify-source.mjs
Write-Host "[KHOSAN] Starting Studio at http://127.0.0.1:8080"
node apps/studio-server/server.mjs
