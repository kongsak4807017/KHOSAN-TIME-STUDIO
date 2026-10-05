$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Ext = if ($env:KHOSAN_EXTERNAL_DIR) { $env:KHOSAN_EXTERNAL_DIR } else { Join-Path $Root "external" }
$Dst = if ($env:KHOSAN_IMAGE_BLASTER_DIR) { $env:KHOSAN_IMAGE_BLASTER_DIR } else { Join-Path $Ext "image-blaster" }
$Repo = "https://github.com/kongsak4807017/image-blaster.git"
$Sha = "4acb43ba126a12358f71838d1b1a05e856b10eaf"

New-Item -ItemType Directory -Force -Path (Split-Path $Dst -Parent) | Out-Null
if (-not (Test-Path (Join-Path $Dst ".git"))) {
  git clone $Repo $Dst
}
git -C $Dst fetch --tags origin
git -C $Dst checkout --detach $Sha

Write-Host "[KHOSAN] image-blaster source pinned at $Sha"
Write-Host "[KHOSAN] source: $Dst"
Write-Host "[KHOSAN] Provider credentials are NOT created or charged by this setup."
Write-Host "[KHOSAN] Run: npm run doctor:image-blaster"
