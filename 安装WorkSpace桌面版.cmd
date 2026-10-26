@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install-desktop-app.ps1"
if errorlevel 1 (
  echo WorkSpace shortcut installation failed.
  pause
)
