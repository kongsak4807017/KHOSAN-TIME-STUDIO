$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $Root

Write-Host "[KHOSAN] Unified local installation"
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw "Git is required." }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Node.js 20+ is required." }

$nodeMajor = [int]((node -p "process.versions.node.split('.')[0]"))
if ($nodeMajor -lt 20) { throw "Node.js 20+ is required; found $(node --version)." }

if (Test-Path package-lock.json) {
    npm ci
} elseif (Test-Path package.json) {
    npm install
}

if (-not $env:KHOSAN_PROJECTS_DIR) {
    Write-Host "[KHOSAN] KHOSAN_PROJECTS_DIR not set; repository-local projects/ fallback will be used."
}
Write-Host "[KHOSAN] DevSpace is optional and may be configured after installation."

node scripts/verify-source.mjs
if (Get-Command python -ErrorAction SilentlyContinue) {
    python scripts/harness_check.py
} elseif (Get-Command python3 -ErrorAction SilentlyContinue) {
    python3 scripts/harness_check.py
} else {
    Write-Host "[KHOSAN] Python not found; harness verification skipped."
}

& (Join-Path $PSScriptRoot "doctor.ps1")
