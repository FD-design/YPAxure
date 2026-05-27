# Dump every clipboard format right now (no waiting).
# Saves each format's bytes to research/clip-now-*.bin
Add-Type -AssemblyName System.Windows.Forms

$clip = [System.Windows.Forms.Clipboard]::GetDataObject()
if (-not $clip) { Write-Output "ERR clipboard_empty"; exit 0 }

$formats = $clip.GetFormats($false)
Write-Output ("FORMATS_COUNT={0}" -f $formats.Count)
$idx = 0
foreach ($fmt in $formats) {
    try {
        $data = $clip.GetData($fmt, $false)
        if ($null -eq $data) { Write-Output ("[{0}] {1} <null>" -f $idx, $fmt); $idx++; continue }
        $safeName = ($fmt -replace '[^A-Za-z0-9]', '_')
        if ($data -is [byte[]]) {
            $len = $data.Length
            $previewLen = [Math]::Min(48, $len)
            $hex = ($data[0..($previewLen-1)] | ForEach-Object { $_.ToString("x2") }) -join ' '
            Write-Output ("[{0}] {1}  type=byte[]  len={2}  head_hex={3}" -f $idx, $fmt, $len, $hex)
            $bin = Join-Path $PSScriptRoot ("clip-now-{0}-{1}.bin" -f $idx, $safeName)
            [System.IO.File]::WriteAllBytes($bin, $data)
        } elseif ($data -is [System.IO.MemoryStream]) {
            $bytes = $data.ToArray()
            $len = $bytes.Length
            $previewLen = [Math]::Min(48, $len)
            $hex = ($bytes[0..($previewLen-1)] | ForEach-Object { $_.ToString("x2") }) -join ' '
            Write-Output ("[{0}] {1}  type=MemoryStream  len={2}  head_hex={3}" -f $idx, $fmt, $len, $hex)
            $bin = Join-Path $PSScriptRoot ("clip-now-{0}-{1}.bin" -f $idx, $safeName)
            [System.IO.File]::WriteAllBytes($bin, $bytes)
        } elseif ($data -is [string]) {
            $len = $data.Length
            $preview = if ($len -gt 120) { $data.Substring(0, 120) + "..." } else { $data }
            Write-Output ("[{0}] {1}  type=string  len={2}  preview={3}" -f $idx, $fmt, $len, $preview)
            $bin = Join-Path $PSScriptRoot ("clip-now-{0}-{1}.txt" -f $idx, $safeName)
            [System.IO.File]::WriteAllText($bin, $data, [System.Text.Encoding]::UTF8)
        } else {
            Write-Output ("[{0}] {1}  type={2}" -f $idx, $fmt, $data.GetType().FullName)
        }
    } catch {
        Write-Output ("[{0}] {1}  ERR={2}" -f $idx, $fmt, $_.Exception.Message)
    }
    $idx++
}
