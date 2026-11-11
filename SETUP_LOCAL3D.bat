@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\setup-local3d.ps1" %*
if errorlevel 1 (
    echo Local 3D setup failed. See the message above.
    pause
    exit /b 1
)
echo Setup command returned. READY_FOR_LOCAL_BUILD confirms completion.
echo With -Async, STARTED means setup is still running; check the reported logs.
echo A successful setup writes .khosan\local3d-mcp.json for your MCP client.
pause

