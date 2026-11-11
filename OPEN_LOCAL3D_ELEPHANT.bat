@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\open-local3d-elephant.ps1"
if errorlevel 1 pause
