# Write the contents of a .txt/.json file to the Windows clipboard under the "Axvg" format.
# Axure RP 11 natively accepts this format on paste (verified empirically).
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File research/set-axvg-clipboard.ps1 -Path research/clip-now-0-Axvg.txt
param(
    [Parameter(Mandatory = $true)]
    [string]$Path,
    [string]$Format = "Axvg"
)

Add-Type -AssemblyName System.Windows.Forms

$absPath = (Resolve-Path $Path).Path
$text = [System.IO.File]::ReadAllText($absPath, [System.Text.Encoding]::UTF8)

$data = New-Object System.Windows.Forms.DataObject
$data.SetData($Format, $false, $text)
[System.Windows.Forms.Clipboard]::SetDataObject($data, $true)

Write-Output ("OK format={0} chars={1} src={2}" -f $Format, $text.Length, $absPath)
