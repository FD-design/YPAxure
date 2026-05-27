@echo off
title Axure Paste Template (no-wait test)
powershell -ExecutionPolicy Bypass -NoProfile -File "%~dp0research\set-clipboard.ps1" -Path "%~dp0samples\clipboard\rectangle_one.bin"
echo.
echo Script exited. Clipboard SHOULD still hold the data.
echo Switch to Axure and try Ctrl+V now. Then come back and press any key.
pause >nul
