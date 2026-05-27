# Put an image file on the Windows clipboard so Axure (or any app) can paste it as a bitmap.
# Also tries to attach an SVG text payload alongside for apps that prefer vector.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File research/set-image-clipboard.ps1 -PngPath search.png [-SvgPath search.svg] [-AutoPaste]
param(
    [Parameter(Mandatory = $true)]
    [string]$PngPath,
    [string]$SvgPath = "",
    [switch]$AutoPaste,
    [int]$CursorX = -1,
    [int]$CursorY = -1
)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class ImgW32 {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
    [DllImport("user32.dll")] public static extern void keybd_event(byte v, byte s, uint f, UIntPtr e);
    [DllImport("user32.dll")] public static extern void mouse_event(uint f, int dx, int dy, uint dw, int de);
}
"@ -ErrorAction SilentlyContinue

$absPng = (Resolve-Path $PngPath).Path
$image = [System.Drawing.Image]::FromFile($absPng)

$data = New-Object System.Windows.Forms.DataObject
# Put as Bitmap (the format Axure and most apps will paste)
$data.SetImage($image)
# If an SVG source is given, attach it under "image/svg+xml" and "SVG" too,
# so any app that prefers vector can find it.
if ($SvgPath -ne "" -and (Test-Path $SvgPath)) {
    $svgText = [System.IO.File]::ReadAllText((Resolve-Path $SvgPath).Path, [System.Text.Encoding]::UTF8)
    $data.SetData("image/svg+xml", $false, $svgText)
    $data.SetData("SVG", $false, $svgText)
}

[System.Windows.Forms.Clipboard]::SetDataObject($data, $true)
Write-Output ("OK png=$absPng size={0}x{1}" -f $image.Width, $image.Height)

if ($AutoPaste) {
    $proc = Get-Process AxureRP* -ErrorAction SilentlyContinue |
        Where-Object { $_.MainWindowHandle -ne 0 } |
        Select-Object -First 1
    if (-not $proc) {
        Write-Output "AUTOPASTE_SKIP reason=axure_not_running"
    } else {
        [void][ImgW32]::ShowWindow($proc.MainWindowHandle, 3)
        [ImgW32]::keybd_event(0x12, 0, 0, [System.UIntPtr]::Zero)
        [ImgW32]::keybd_event(0x12, 0, 0x2, [System.UIntPtr]::Zero)
        [void][ImgW32]::SetForegroundWindow($proc.MainWindowHandle)
        Start-Sleep -Milliseconds 250
        if ($CursorX -ge 0 -and $CursorY -ge 0) {
            [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point($CursorX, $CursorY)
            Start-Sleep -Milliseconds 80
            [ImgW32]::mouse_event(0x0002, 0, 0, 0, 0)
            [ImgW32]::mouse_event(0x0004, 0, 0, 0, 0)
            Start-Sleep -Milliseconds 100
        }
        [System.Windows.Forms.SendKeys]::SendWait("^v")
        Write-Output "AUTOPASTE_OK"
    }
}

$image.Dispose()
