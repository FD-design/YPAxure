# Write a binary file to the Windows clipboard under the AxureClipboardDocument11.0.0.0 format,
# so a user can paste it into Axure RP with Ctrl+V.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File research/set-clipboard.ps1 -Path samples/clipboard/rectangle_one.bin
#
# After running, the script holds the clipboard until you close it (required on Windows for
# IDataObject persistence). Switch to Axure, Ctrl+V, then come back and press ENTER.

param(
    [Parameter(Mandatory = $true)]
    [string]$Path,
    [string]$Format = "AxureClipboardDocument11.0.0.0",
    [switch]$Wait,
    [switch]$AutoPaste,
    [int]$CursorX = -1,
    [int]$CursorY = -1,
    [string]$ProcessNamePattern = "AxureRP*"
)

Add-Type -AssemblyName System.Windows.Forms

# Combined struct + class — single Add-Type call so signatures can reference AxRect by name.
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public struct AxRect { public int Left; public int Top; public int Right; public int Bottom; }
public static class AxureMcpW32 {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out AxRect lpRect);
    [DllImport("user32.dll")] public static extern void mouse_event(uint dwFlags, int dx, int dy, uint dwData, int dwExtraInfo);
}
"@ -ErrorAction SilentlyContinue

$absPath = (Resolve-Path $Path).Path
$bytes = [System.IO.File]::ReadAllBytes($absPath)

$data = New-Object System.Windows.Forms.DataObject
$data.SetData($Format, $false, $bytes)
# Empty Guid[] for AxureMastersTransferred — Axure registers this format next to the main one.
$emptyGuids = New-Object 'System.Guid[]' 0
$data.SetData("AxureMastersTransferred", $false, $emptyGuids)

# SetDataObject(data, $true) calls OleSetClipboard + OleFlushClipboard, which detaches the
# data from this process so the clipboard survives after we exit.
[System.Windows.Forms.Clipboard]::SetDataObject($data, $true)

# Machine-readable confirmation on stdout — MCP tool parses this.
Write-Output ("OK format={0} bytes={1}" -f $Format, $bytes.Length)

if ($AutoPaste) {
    $proc = Get-Process $ProcessNamePattern -ErrorAction SilentlyContinue |
        Where-Object { $_.MainWindowHandle -ne 0 } |
        Select-Object -First 1
    if (-not $proc) {
        Write-Output "AUTOPASTE_SKIP reason=axure_not_running pattern=$ProcessNamePattern"
    } else {
        $h = $proc.MainWindowHandle
        # SW_MAXIMIZE = 3 — ensure Axure fills its monitor so cursor positions are predictable.
        [void][AxureMcpW32]::ShowWindow($h, 3)
        # Alt-key trick to bypass anti-focus-stealing protection.
        [AxureMcpW32]::keybd_event(0x12, 0, 0, [System.UIntPtr]::Zero)
        [AxureMcpW32]::keybd_event(0x12, 0, 0x2, [System.UIntPtr]::Zero)
        [void][AxureMcpW32]::SetForegroundWindow($h)
        Start-Sleep -Milliseconds 250

        # Report Axure's actual screen rect so callers can place cursors correctly.
        $r = New-Object AxRect
        [void][AxureMcpW32]::GetWindowRect($h, [ref]$r)
        Write-Output ("AXURE_RECT L={0} T={1} R={2} B={3}" -f $r.Left, $r.Top, $r.Right, $r.Bottom)

        if ($CursorX -ge 0 -and $CursorY -ge 0) {
            [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point($CursorX, $CursorY)
            Start-Sleep -Milliseconds 80
            # Click on canvas to set paste anchor
            $LEFTDOWN = 0x0002; $LEFTUP = 0x0004
            [AxureMcpW32]::mouse_event($LEFTDOWN, 0, 0, 0, 0)
            [AxureMcpW32]::mouse_event($LEFTUP, 0, 0, 0, 0)
            Start-Sleep -Milliseconds 100
        }
        [System.Windows.Forms.SendKeys]::SendWait("^v")
        Write-Output ("AUTOPASTE_OK pid={0} name={1}" -f $proc.Id, $proc.ProcessName)
    }
}

if ($Wait) {
    Write-Host ""
    Write-Host " Clipboard ready. Switch to Axure, click canvas, Ctrl+V."
    Read-Host " Press ENTER here when done"
}
