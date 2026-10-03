$ErrorActionPreference = "Continue"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $Root
$fail = 0

function Pass($name, $detail="") { Write-Host ("[PASS] {0} {1}" -f $name,$detail) }
function Optional($name, $detail="") { Write-Host ("[OPTIONAL] {0} {1}" -f $name,$detail) }
function Fail($name, $detail="") { Write-Host ("[FAIL] {0} {1}" -f $name,$detail); $script:fail++ }

Write-Host "KHOSAN STUDIO DOCTOR"
Write-Host "===================="

if (Get-Command git -ErrorAction SilentlyContinue) { Pass "Git" (git --version) } else { Fail "Git" "not found" }
if (Get-Command node -ErrorAction SilentlyContinue) {
    $major=[int](node -p "process.versions.node.split('.')[0]")
    if ($major -ge 20) { Pass "Node" (node --version) } else { Fail "Node" "20+ required" }
} else { Fail "Node" "not found" }

node scripts/verify-source.mjs
if ($LASTEXITCODE -eq 0) { Pass "Studio source" } else { Fail "Studio source" }

if (Get-Command python -ErrorAction SilentlyContinue) {
    python scripts/harness_check.py
    if ($LASTEXITCODE -eq 0) { Pass "Agent harness" } else { Fail "Agent harness" }
} elseif (Get-Command python3 -ErrorAction SilentlyContinue) {
    python3 scripts/harness_check.py
    if ($LASTEXITCODE -eq 0) { Pass "Agent harness" } else { Fail "Agent harness" }
} else { Optional "Python / harness check" "not installed" }

if ($env:KHOSAN_PROJECTS_DIR) { Pass "Project Library" $env:KHOSAN_PROJECTS_DIR } else { Pass "Project Library" "portable fallback: projects/" }
if (Test-Path "config/devspace.json") { Pass "DevSpace" "configured" } else { Optional "DevSpace" "NOT CONFIGURED" }
if (Get-Command docker -ErrorAction SilentlyContinue) { Optional "Docker" (docker --version) } else { Optional "Docker" "not installed" }

if ($fail -eq 0) {
    Write-Host ""
    Write-Host "STUDIO STATUS: READY"
    exit 0
}
Write-Host ""
Write-Host "STUDIO STATUS: NOT READY ($fail required check(s) failed)"
exit 1
