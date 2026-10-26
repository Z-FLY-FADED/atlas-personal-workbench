@echo off
set "WORKSPACE_EXE=%~dp0release\flutter\windows\WorkSpace.exe"
if not exist "%WORKSPACE_EXE%" (
  echo Please build WorkSpace for Windows first.
  pause
  exit /b 1
)
start "" "%WORKSPACE_EXE%"
