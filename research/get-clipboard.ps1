# Read the current Windows clipboard's AxureClipboardDocument11.0.0.0 format bytes
# and write them to a .bin file. Use this to capture a template after the user has copied
# (Ctrl+C) one or more widgets in Axure RP.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File research/get-clipboard.ps1 -Out samples/clipboard/my_template.bin
param(
    [Parameter(Mandatory = $true)]
    [string]$Out,
    [string]$Format = "AxureClipboardDocument11.0.0.0"
)

Add-Type -AssemblyName System.Windows.Forms

$dataObj = [System.Windows.Forms.Clipboard]::GetDataObject()
if ($null -eq $dataObj) {
    Write-Output "ERR clipboard_empty"
    exit 1
}
if (-not $dataObj.GetDataPresent($Format)) {
    $formats = $dataObj.GetFormats() -join ","
    Write-Output ("ERR format_not_present available=[{0}]" -f $formats)
    exit 2
}

$data = $dataObj.GetData($Format)
if ($null -eq $data) {
    Write-Output "ERR data_null"
    exit 3
}

# The format can be returned as either a byte[] or a MemoryStream depending on how it was set.
if ($data -is [byte[]]) {
    $bytes = $data
} elseif ($data -is [System.IO.MemoryStream]) {
    $bytes = $data.ToArray()
} else {
    Write-Output ("ERR unexpected_type={0}" -f $data.GetType().FullName)
    exit 4
}

$absOut = $Out
if (-not [System.IO.Path]::IsPathRooted($absOut)) {
    $absOut = Join-Path (Get-Location) $absOut
}
$dir = Split-Path -Parent $absOut
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }

[System.IO.File]::WriteAllBytes($absOut, $bytes)
Write-Output ("OK format={0} bytes={1} out={2}" -f $Format, $bytes.Length, $absOut)
