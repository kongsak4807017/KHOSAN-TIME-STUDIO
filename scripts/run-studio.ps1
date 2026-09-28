$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $Root
node scripts/verify-source.mjs
node apps/studio-server/server.mjs
