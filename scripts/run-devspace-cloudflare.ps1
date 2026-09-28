$ErrorActionPreference = "Stop"
$Config = if ($env:KHOSAN_CLOUDFLARED_CONFIG) { $env:KHOSAN_CLOUDFLARED_CONFIG } else { Join-Path $HOME ".cloudflared\config.yml" }
if (-not (Test-Path $Config)) { throw "Cloudflared config not found: $Config" }

$Cloudflared = if ($env:KHOSAN_CLOUDFLARED) { $env:KHOSAN_CLOUDFLARED } else { "cloudflared" }
& $Cloudflared tunnel "--config" $Config run
