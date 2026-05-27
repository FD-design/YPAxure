# Take a full-screen screenshot, save to research/screenshot.png.
# Usage: powershell -ExecutionPolicy Bypass -File research/screenshot.ps1 [-OutPath path]
param(
    [string]$OutPath = "$PSScriptRoot\screenshot.png",
    [string]$FocusProcess = "AxureRP*"
)

Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms

# Bring Axure to front first if running (so the screenshot captures it)
$proc = Get-Process $FocusProcess -ErrorAction SilentlyContinue |
    Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if ($proc) {
    $sig = '[DllImport("user32.dll")] public static extern bool SetForegroundWindow(System.IntPtr hWnd); [DllImport("user32.dll")] public static extern bool ShowWindow(System.IntPtr hWnd, int n); [DllImport("user32.dll")] public static extern void keybd_event(byte v, byte s, uint f, System.UIntPtr e);'
    try {
        Add-Type -MemberDefinition $sig -Name "Snap1" -Namespace "_ax_snap" -ErrorAction Stop
    } catch {}
    [_ax_snap.Snap1]::ShowWindow($proc.MainWindowHandle, 9) | Out-Null
    [_ax_snap.Snap1]::keybd_event(0x12, 0, 0, [System.UIntPtr]::Zero)
    [_ax_snap.Snap1]::keybd_event(0x12, 0, 0x2, [System.UIntPtr]::Zero)
    [_ax_snap.Snap1]::SetForegroundWindow($proc.MainWindowHandle) | Out-Null
    Start-Sleep -Milliseconds 350
}

$screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bmp = New-Object System.Drawing.Bitmap($screen.Width, $screen.Height)
$gfx = [System.Drawing.Graphics]::FromImage($bmp)
$gfx.CopyFromScreen(0, 0, 0, 0, $bmp.Size)
$bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
$gfx.Dispose()
$bmp.Dispose()
Write-Output ("OK out={0} size={1}x{2}" -f $OutPath, $screen.Width, $screen.Height)
