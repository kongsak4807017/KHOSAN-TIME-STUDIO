$ErrorActionPreference = "Stop"
$StudioRoot = Split-Path -Parent $PSScriptRoot
$ProofPath = Join-Path $StudioRoot ".khosan\local3d\elephant-proof.json"
if (-not (Test-Path -LiteralPath $ProofPath)) { throw "No completed elephant proof exists. Run scripts\proof-local3d-elephant.ps1 first." }
$Proof = Get-Content -LiteralPath $ProofPath -Raw | ConvertFrom-Json
$ArtifactDirectory = [System.IO.Path]::GetFullPath($Proof.artifact_directory)
$ExpectedRoot = [System.IO.Path]::GetFullPath((Join-Path $StudioRoot ".khosan\local3d\jobs")) + [System.IO.Path]::DirectorySeparatorChar
if (-not $ArtifactDirectory.StartsWith($ExpectedRoot, [System.StringComparison]::OrdinalIgnoreCase)) { throw "Proof directory is outside the local job root." }
if (-not (Test-Path -LiteralPath $ArtifactDirectory -PathType Container)) { throw "Proof directory is missing." }
Invoke-Item -LiteralPath $ArtifactDirectory
