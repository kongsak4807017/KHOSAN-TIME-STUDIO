$ErrorActionPreference = "Stop"

function Invoke-KhosanLocal3D {
    param([string[]]$Arguments, [string]$PythonCommand = "")
    $StudioRoot = Split-Path -Parent $PSScriptRoot
    $Driver = Join-Path $PSScriptRoot "local3d.py"
    $Prefix = @()
    $Executable = $PythonCommand
    $LocalPython = Join-Path $StudioRoot ".venv-local3d\Scripts\python.exe"
    if ([string]::IsNullOrWhiteSpace($Executable)) {
        if (Test-Path -LiteralPath $LocalPython) {
            $Executable = $LocalPython
        } elseif (Get-Command py -ErrorAction SilentlyContinue) {
            $Executable = (Get-Command py).Source
            try {
                & $Executable -3.12 -c "import sys; sys.exit(0)" 2>$null
                if ($LASTEXITCODE -eq 0) { $Prefix = @("-3.12") } else { $Prefix = @("-3") }
            } catch { $Prefix = @("-3") }
        } elseif (Get-Command python -ErrorAction SilentlyContinue) {
            $Executable = (Get-Command python).Source
        } elseif (Get-Command python3 -ErrorAction SilentlyContinue) {
            $Executable = (Get-Command python3).Source
        } else {
            throw "Install Python 3.12, or pass -PythonCommand with its executable path."
        }
    }
    $env:PYTHONUTF8 = "1"
    $env:PYTHONIOENCODING = "utf-8"
    & $Executable @Prefix $Driver @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Local 3D command failed with exit code $LASTEXITCODE." }
}

