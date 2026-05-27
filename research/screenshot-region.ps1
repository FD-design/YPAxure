# Capture a specific screen region (for reading Axure's inspect panel up close).
# Usage: powershell -File screenshot-region.ps1 -X 1700 -Y 200 -W 220 -H 400 -Out research/inspect.png
param(
    [int]$X = 0,
    [int]$Y = 0,
    [int]$W = 0,
    [int]$H = 0,
    [string]$Out = "research/region.png"
)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

if ($W -le 0 -or $H -le 0) {
    $bounds = [System.Windows.Forms.SystemInformation]::VirtualScreen
    $X = $bounds.X; $Y = $bounds.Y; $W = $bounds.Width; $H = $bounds.Height
}

$bmp = New-Object System.Drawing.Bitmap $W, $H
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($X, $Y, 0, 0, (New-Object System.Drawing.Size $W, $H))
$abs = Resolve-Path -LiteralPath (Split-Path $Out) -ErrorAction SilentlyContinue
if ($null -eq $abs) { $abs = (Get-Location).Path }
$full = Join-Path $abs (Split-Path $Out -Leaf)
$bmp.Save($full, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
Write-Output ("OK out={0} size={1}x{2} at ({3},{4})" -f $full, $W, $H, $X, $Y)
