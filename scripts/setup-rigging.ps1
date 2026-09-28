$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Ext = if ($env:KHOSAN_EXTERNAL_DIR) { $env:KHOSAN_EXTERNAL_DIR } else { Join-Path $Root "external" }
New-Item -ItemType Directory -Force -Path $Ext | Out-Null

function Clone-Pin($Name, $Url, $Sha) {
  $Dst = Join-Path $Ext $Name
  if (-not (Test-Path (Join-Path $Dst ".git"))) { git clone $Url $Dst }
  git -C $Dst fetch --tags origin
  git -C $Dst checkout --detach $Sha
}

Clone-Pin "SkinTokens" "https://github.com/kongsak4807017/SkinTokens.git" "273b691d35989d71cd17ff2895fdc735097b92d1"
Clone-Pin "UniRig" "https://github.com/kongsak4807017/UniRig.git" "6793c6640ff01c8fb389f3993434124bb43d2933"

Write-Host "[KHOSAN] Rigging sources pinned under $Ext"
Write-Host "[KHOSAN] Dependencies/checkpoints are intentionally NOT installed automatically."
Write-Host "[KHOSAN] Follow docs/16-3D-AUTO-RIGGING.md, then run: python tools/adapters/rigging/doctor.py"
