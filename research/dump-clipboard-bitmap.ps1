# Save the Bitmap currently on the clipboard as a PNG file.
# Use after Ctrl+C in Axure to capture the visual state for vision-based reading.
param([string]$Out = "research/_axure_copy.png")

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$do = [System.Windows.Forms.Clipboard]::GetDataObject()
if (-not $do.GetDataPresent("Bitmap")) {
    Write-Output "ERR no_bitmap_format"
    exit 1
}
$img = $do.GetData("Bitmap")
if ($null -eq $img) {
    Write-Output "ERR null_image"
    exit 2
}

$absOut = $Out
if (-not [System.IO.Path]::IsPathRooted($absOut)) {
    $absOut = Join-Path (Get-Location) $absOut
}

$img.Save($absOut, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Output ("OK saved={0} size={1}x{2}" -f $absOut, $img.Width, $img.Height)
$img.Dispose()
