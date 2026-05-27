# Focus Axure, then capture a region in the same script (so focus is held).
param(
    [int]$X = 0,
    [int]$Y = 0,
    [int]$W = 0,
    [int]$H = 0,
    [string]$Out = "research/focused.png"
)

Add-Type -AssemblyName System.Windows.Forms

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public struct AxRect { public int Left; public int Top; public int Right; public int Bottom; }
public static class AxW32 {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out AxRect lpRect);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
}
"@ -ErrorAction SilentlyContinue

$proc = Get-Process AxureRP* -ErrorAction SilentlyContinue |
    Where-Object { $_.MainWindowHandle -ne 0 } |
    Select-Object -First 1
if (-not $proc) { Write-Output "ERR axure_not_running"; exit 1 }
$h = $proc.MainWindowHandle
[void][AxW32]::ShowWindow($h, 3)
[AxW32]::keybd_event(0x12, 0, 0, [System.UIntPtr]::Zero)
[AxW32]::keybd_event(0x12, 0, 0x2, [System.UIntPtr]::Zero)
[void][AxW32]::SetForegroundWindow($h)
Start-Sleep -Milliseconds 400

$r = New-Object AxRect
[void][AxW32]::GetWindowRect($h, [ref]$r)

if ($W -le 0) { $X = $r.Left; $Y = $r.Top; $W = $r.Right - $r.Left; $H = $r.Bottom - $r.Top }

$bmp = New-Object System.Drawing.Bitmap $W, $H
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($X, $Y, 0, 0, (New-Object System.Drawing.Size $W, $H))
$abs = Resolve-Path -LiteralPath (Split-Path $Out) -ErrorAction SilentlyContinue
if ($null -eq $abs) { $abs = (Get-Location).Path }
$full = Join-Path $abs (Split-Path $Out -Leaf)
$bmp.Save($full, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
$fg = [AxW32]::GetForegroundWindow()
Write-Output ("OK out={0} size={1}x{2} at ({3},{4}) axureRect=({5},{6},{7},{8}) foreground={9}" -f $full, $W, $H, $X, $Y, $r.Left, $r.Top, $r.Right, $r.Bottom, $fg)
