# Read the user's CURRENT Axure selection by inspecting whatever is on the Windows
# clipboard. Use this AFTER the user (or a prior tool) has done Ctrl+C inside Axure RP.
#
# Two signals are extracted:
#   - "Csv" format (a UTF-8 newline-separated dump of every text content in the selection,
#     in document order — Axure exports this alongside the binary)
#   - "Bitmap" format (a rendered preview of the selection — what the user sees)
#
# Together they let an LLM read what the user has on canvas without us needing to
# decode the proprietary AxureClipboardDocument11.0.0.0 binary.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File research/dump-axure-selection.ps1 -OutDir <abs dir>

param(
    [Parameter(Mandatory = $true)]
    [string]$OutDir
)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir -Force | Out-Null }

$do = [System.Windows.Forms.Clipboard]::GetDataObject()
if ($null -eq $do) {
    Write-Output "ERR clipboard_empty"
    exit 1
}

$formats = $do.GetFormats()
Write-Output ("FORMATS=" + ($formats -join ','))

# ---- Csv: plain-text dump of selection contents ----
$csvPath = ""
if ($do.GetDataPresent("Csv")) {
    $csvData = $do.GetData("Csv")
    if ($csvData -is [System.IO.MemoryStream]) {
        $bytes = $csvData.ToArray()
    } elseif ($csvData -is [byte[]]) {
        $bytes = $csvData
    } else {
        $bytes = $null
    }
    if ($null -ne $bytes) {
        $csvPath = Join-Path $OutDir "selection.csv"
        [System.IO.File]::WriteAllBytes($csvPath, $bytes)
        Write-Output ("CSV=" + $csvPath + " bytes=" + $bytes.Length)
    } else {
        Write-Output "CSV_ERR unexpected_type"
    }
} else {
    Write-Output "CSV_MISSING"
}

# ---- Bitmap: rendered selection screenshot ----
$pngPath = ""
$width = 0
$height = 0
if ($do.GetDataPresent("Bitmap")) {
    $img = $do.GetData("Bitmap")
    if ($null -ne $img) {
        $pngPath = Join-Path $OutDir "selection.png"
        $img.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $width = $img.Width
        $height = $img.Height
        Write-Output ("PNG=" + $pngPath + " size=" + $width + "x" + $height)
        $img.Dispose()
    } else {
        Write-Output "PNG_ERR null"
    }
} else {
    Write-Output "PNG_MISSING"
}

# ---- Binary outline (best-effort, optional) ----
# Not extracting AxureClipboardDocument bytes here — the binary parser is incomplete.
# Keep this as a marker for future work.

Write-Output ("OK csv={0} png={1} width={2} height={3}" -f $csvPath, $pngPath, $width, $height)
