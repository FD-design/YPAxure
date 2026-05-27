# Dump the Csv format from the current clipboard to a file.
param([string]$Out = "research/_axure_copy.csv")

Add-Type -AssemblyName System.Windows.Forms
$do = [System.Windows.Forms.Clipboard]::GetDataObject()
if (-not $do.GetDataPresent("Csv")) {
    Write-Output "ERR no_csv_format"
    exit 1
}
$data = $do.GetData("Csv")
if ($data -is [System.IO.MemoryStream]) {
    $bytes = $data.ToArray()
} elseif ($data -is [byte[]]) {
    $bytes = $data
} else {
    Write-Output "ERR unexpected_type=$($data.GetType().FullName)"
    exit 2
}

$absOut = $Out
if (-not [System.IO.Path]::IsPathRooted($absOut)) {
    $absOut = Join-Path (Get-Location) $absOut
}
[System.IO.File]::WriteAllBytes($absOut, $bytes)
$preview = [System.Text.Encoding]::UTF8.GetString($bytes)
Write-Output "OK saved=$absOut len=$($bytes.Length)"
Write-Output ""
Write-Output "===== preview ====="
Write-Output $preview
