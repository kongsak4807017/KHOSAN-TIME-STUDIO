$ErrorActionPreference = "Stop"
$GitBash = if ($env:KHOSAN_GIT_BASH) { $env:KHOSAN_GIT_BASH } else { "C:\Program Files\Git\bin\bash.exe" }
if (-not (Test-Path $GitBash)) { throw "Git Bash not found: $GitBash" }

& $GitBash -lc "devspace serve"
