# Find Axure RP's main window, maximize and focus it, then return its screen rect.
# Output (single line, parseable):  RECT L=... T=... R=... B=... W=... H=...

Add-Type -AssemblyName System.Windows.Forms

# Single TypeDefinition for the struct + the helper class — keeps them in the same assembly so
# the [DllImport] signatures can use the struct by name.
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public struct AxRect { public int Left; public int Top; public int Right; public int Bottom; }
public static class AxW32 {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out AxRect lpRect);
}
"@ -ErrorAction SilentlyContinue

$proc = Get-Process AxureRP* -ErrorAction SilentlyContinue |
    Where-Object { $_.MainWindowHandle -ne 0 } |
    Select-Object -First 1
if (-not $proc) {
    Write-Output "ERR axure_not_running"
    exit 1
}
$h = $proc.MainWindowHandle
[void][AxW32]::ShowWindow($h, 3)
[AxW32]::keybd_event(0x12, 0, 0, [System.UIntPtr]::Zero)
[AxW32]::keybd_event(0x12, 0, 0x2, [System.UIntPtr]::Zero)
[void][AxW32]::SetForegroundWindow($h)
Start-Sleep -Milliseconds 250

$r = New-Object AxRect
[void][AxW32]::GetWindowRect($h, [ref]$r)
$w = $r.Right - $r.Left
$h2 = $r.Bottom - $r.Top
Write-Output ("RECT L={0} T={1} R={2} B={3} W={4} H={5}" -f $r.Left, $r.Top, $r.Right, $r.Bottom, $w, $h2)
