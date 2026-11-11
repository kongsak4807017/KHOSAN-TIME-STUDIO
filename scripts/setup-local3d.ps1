param([string]$PythonCommand = "", [string]$BlenderPath = "", [switch]$SkipInstall, [switch]$Async)
$ErrorActionPreference = "Stop"
$StudioRoot = Split-Path -Parent $PSScriptRoot
if ($Async) {
    $LogDirectory = Join-Path $StudioRoot ".khosan\local3d-setup"
    New-Item -ItemType Directory -Path $LogDirectory -Force | Out-Null
    $ChildArguments = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ('"' + $PSCommandPath + '"'))
    if ($PythonCommand) { $ChildArguments += @("-PythonCommand", ('"' + $PythonCommand + '"')) }
    if ($BlenderPath) { $ChildArguments += @("-BlenderPath", ('"' + $BlenderPath + '"')) }
    if ($SkipInstall) { $ChildArguments += "-SkipInstall" }
    $Process = Start-Process -FilePath "powershell.exe" -ArgumentList $ChildArguments -WorkingDirectory $StudioRoot -RedirectStandardOutput (Join-Path $LogDirectory "stdout.log") -RedirectStandardError (Join-Path $LogDirectory "stderr.log") -PassThru
    @{ process_id = $Process.Id; status = "STARTED"; log_directory = $LogDirectory } | ConvertTo-Json
    exit 0
}
. (Join-Path $PSScriptRoot "local3d-common.ps1")
$DriverArguments = @("setup")
if ($BlenderPath) { $DriverArguments += @("--blender", $BlenderPath) }
if ($SkipInstall) { $DriverArguments += "--skip-install" }
Invoke-KhosanLocal3D -Arguments $DriverArguments -PythonCommand $PythonCommand

