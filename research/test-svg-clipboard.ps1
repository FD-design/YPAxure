# Test: does Axure accept SVG via the Windows clipboard?
# Try a few likely clipboard format names with the same SVG payload. The user pastes
# (Ctrl+V) in Axure after each format and reports which one (if any) works.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File research/test-svg-clipboard.ps1 -Format "image/svg+xml"
#   powershell -ExecutionPolicy Bypass -File research/test-svg-clipboard.ps1 -Format "SVG"
#   powershell -ExecutionPolicy Bypass -File research/test-svg-clipboard.ps1 -Format "Scalable Vector Graphics"
param(
    [string]$Format = "image/svg+xml"
)

Add-Type -AssemblyName System.Windows.Forms

# A simple Lucide "search" icon SVG (24x24, stroked) - magnifying glass
$svg = @'
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#1F2937" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="11" cy="11" r="8"/>
  <path d="m21 21-4.3-4.3"/>
</svg>
'@

$data = New-Object System.Windows.Forms.DataObject
$data.SetData($Format, $false, $svg)
[System.Windows.Forms.Clipboard]::SetDataObject($data, $true)

Write-Output ("OK format=$Format chars={0}" -f $svg.Length)
Write-Output "Now switch to Axure and press Ctrl+V to see if the SVG renders."
