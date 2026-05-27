# Focus Axure, send Ctrl+A then Ctrl+C, then exit (so the clipboard is left with whatever
# Axure copied). Use together with get-clipboard.ps1 to capture a multi-widget template.

Add-Type -AssemblyName System.Windows.Forms

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public struct AxRect2 { public int Left; public int Top; public int Right; public int Bottom; }
public static class AxW32B {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
}
"@ -ErrorAction SilentlyContinue

$proc = Get-Process AxureRP* -ErrorAction SilentlyContinue |
    Where-Object { $_.MainWindowHandle -ne 0 } |
    Select-Object -First 1
if (-not $proc) { Write-Output "ERR axure_not_running"; exit 1 }
$h = $proc.MainWindowHandle
[void][AxW32B]::ShowWindow($h, 3)
[AxW32B]::keybd_event(0x12, 0, 0, [System.UIntPtr]::Zero)
[AxW32B]::keybd_event(0x12, 0, 0x2, [System.UIntPtr]::Zero)
[void][AxW32B]::SetForegroundWindow($h)
Start-Sleep -Milliseconds 350

# Send Ctrl+A then Ctrl+C
[System.Windows.Forms.SendKeys]::SendWait("^a")
Start-Sleep -Milliseconds 200
[System.Windows.Forms.SendKeys]::SendWait("^c")
Start-Sleep -Milliseconds 400
Write-Output ("OK select_all_copy_sent pid={0}" -f $proc.Id)
