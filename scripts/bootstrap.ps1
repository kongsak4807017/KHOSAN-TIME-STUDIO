$ErrorActionPreference = "Stop"

Write-Host "[KHOSAN] Master repository bootstrap"

$python = Get-Command python -ErrorAction SilentlyContinue
if ($python) {
    python scripts/harness_check.py
} else {
    $python3 = Get-Command python3 -ErrorAction SilentlyContinue
    if ($python3) {
        python3 scripts/harness_check.py
    } else {
        Write-Host "[KHOSAN] Python not found; structural verification skipped."
    }
}

Write-Host ""
Write-Host "[KHOSAN] Git state"
git status --short

Write-Host ""
Write-Host "[KHOSAN] Optional tool discovery"
foreach ($cmd in @("git","node","npm","python","docker")) {
    if (Get-Command $cmd -ErrorAction SilentlyContinue) {
        Write-Host "  [found] $cmd"
    } else {
        Write-Host "  [missing/optional] $cmd"
    }
}

Write-Host ""
Write-Host "[KHOSAN] Ready for repository/harness mode."
Write-Host "Read AGENTS.md -> studio/studio_state.json -> studio/graph.md."
