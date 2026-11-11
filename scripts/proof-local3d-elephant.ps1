param([ValidateRange(15,600)][int]$TimeoutSeconds = 600, [string]$BlenderPath = "", [string]$PythonCommand = "", [ValidateSet("standard","draft")][string]$Quality = "standard")
. (Join-Path $PSScriptRoot "local3d-common.ps1")
$DriverArguments = @("proof", "--fixture", "elephant", "--quality", $Quality, "--timeout", [string]$TimeoutSeconds)
if ($BlenderPath) { $DriverArguments += @("--blender", $BlenderPath) }
Invoke-KhosanLocal3D -Arguments $DriverArguments -PythonCommand $PythonCommand

