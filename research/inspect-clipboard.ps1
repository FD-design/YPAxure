# Dump every registered Windows clipboard format and a preview of its data.
# Usage:
#   1. In Axure, select one widget and press Ctrl+C.
#   2. In PowerShell:  powershell -ExecutionPolicy Bypass -File research/inspect-clipboard.ps1
# Output goes to stdout and to research/clipboard-dump.txt for later inspection.

Add-Type -AssemblyName System.Windows.Forms

Write-Host ""
Write-Host "================================================================"
Write-Host " Clipboard probe ready."
Write-Host ""
Write-Host " NOW DO THIS in Axure RP:"
Write-Host "   1. Open a .rp file (e.g. samples\one_rect.rp)"
Write-Host "   2. Click a single widget to select it"
Write-Host "   3. Press Ctrl+C"
Write-Host "   4. Switch back here and press ENTER (do NOT copy anything else)"
Write-Host "================================================================"
Write-Host ""
Read-Host "Press ENTER after you have copied a widget in Axure"
Write-Host ""

$out = New-Object System.Collections.Generic.List[string]
function W($s) { $out.Add($s); Write-Output $s }

try {
    $clip = [System.Windows.Forms.Clipboard]::GetDataObject()
} catch {
    W "Failed to read clipboard: $_"
    exit 1
}

if (-not $clip) {
    W "Clipboard is empty."
    exit 0
}

$formats = $clip.GetFormats($false)  # registered formats only, no auto-converted ones
W "===== Registered clipboard formats ====="
W ("Total: {0}" -f $formats.Count)
W ""
$idx = 0
foreach ($fmt in $formats) {
    W ("[{0}] {1}" -f $idx, $fmt)
    try {
        $data = $clip.GetData($fmt, $false)
        if ($null -eq $data) {
            W "    <null>"
        } elseif ($data -is [byte[]]) {
            $len = $data.Length
            $previewLen = [Math]::Min(64, $len)
            $hex = ($data[0..($previewLen-1)] | ForEach-Object { $_.ToString("X2") }) -join ' '
            $ascii = -join ($data[0..($previewLen-1)] | ForEach-Object {
                if ($_ -ge 32 -and $_ -lt 127) { [char]$_ } else { '.' }
            })
            W ("    Type: byte[]  Length: {0}" -f $len)
            W ("    HEX:   {0}" -f $hex)
            W ("    ASCII: {0}" -f $ascii)
            # Save full bytes for later analysis
            $safeName = ($fmt -replace '[^A-Za-z0-9]', '_')
            $binPath = Join-Path $PSScriptRoot ("clipboard-{0}-{1}.bin" -f $idx, $safeName)
            [System.IO.File]::WriteAllBytes($binPath, $data)
            W ("    Saved full bytes to: {0}" -f $binPath)
        } elseif ($data -is [System.IO.MemoryStream]) {
            $len = $data.Length
            $bytes = $data.ToArray()
            $previewLen = [Math]::Min(64, $bytes.Length)
            $hex = ($bytes[0..($previewLen-1)] | ForEach-Object { $_.ToString("X2") }) -join ' '
            $ascii = -join ($bytes[0..($previewLen-1)] | ForEach-Object {
                if ($_ -ge 32 -and $_ -lt 127) { [char]$_ } else { '.' }
            })
            W ("    Type: MemoryStream  Length: {0}" -f $len)
            W ("    HEX:   {0}" -f $hex)
            W ("    ASCII: {0}" -f $ascii)
            $safeName = ($fmt -replace '[^A-Za-z0-9]', '_')
            $binPath = Join-Path $PSScriptRoot ("clipboard-{0}-{1}.bin" -f $idx, $safeName)
            [System.IO.File]::WriteAllBytes($binPath, $bytes)
            W ("    Saved full bytes to: {0}" -f $binPath)
        } elseif ($data -is [string]) {
            $len = $data.Length
            $preview = if ($len -gt 200) { $data.Substring(0, 200) + "..." } else { $data }
            W ("    Type: string  Length: {0}" -f $len)
            W ("    Preview: {0}" -f $preview)
            $safeName = ($fmt -replace '[^A-Za-z0-9]', '_')
            $txtPath = Join-Path $PSScriptRoot ("clipboard-{0}-{1}.txt" -f $idx, $safeName)
            [System.IO.File]::WriteAllText($txtPath, $data, [System.Text.Encoding]::UTF8)
            W ("    Saved full text to: {0}" -f $txtPath)
        } elseif ($data -is [System.Drawing.Image] -or $data -is [System.Drawing.Bitmap]) {
            W ("    Type: Image  Size: {0}x{1}" -f $data.Width, $data.Height)
        } else {
            $tn = $data.GetType().FullName
            W ("    Type: {0}" -f $tn)
            $s = "$data"
            if ($s.Length -gt 200) { $s = $s.Substring(0, 200) + "..." }
            W ("    Value: {0}" -f $s)
        }
    } catch {
        W ("    ERROR reading data for this format: {0}" -f $_.Exception.Message)
    }
    W ""
    $idx++
}

$logPath = Join-Path $PSScriptRoot "clipboard-dump.txt"
$out -join "`r`n" | Set-Content -Encoding utf8 -Path $logPath
Write-Output ""
Write-Output ("Summary written to: {0}" -f $logPath)
