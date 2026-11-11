param([string]$ProjectRoot = "", [string]$BlenderPath = "", [string]$PythonCommand = "")
. (Join-Path $PSScriptRoot "local3d-common.ps1")
$DriverArguments = @("serve")
if ($ProjectRoot) { $DriverArguments += @("--project-root", $ProjectRoot) }
if ($BlenderPath) { $DriverArguments += @("--blender", $BlenderPath) }
Invoke-KhosanLocal3D -Arguments $DriverArguments -PythonCommand $PythonCommand

