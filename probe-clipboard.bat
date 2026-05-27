@echo off
title Axure Clipboard Probe
powershell -ExecutionPolicy Bypass -NoProfile -File "%~dp0research\inspect-clipboard.ps1"
echo.
echo Done. Press any key to close this window.
pause >nul
