# Dump all formats currently on the Windows clipboard, plus a preview of each.
# Use this to check what Axure writes to the clipboard when the user does Ctrl+C
# inside Axure RP. If "Axvg" appears in the format list, we have a clean read path
# for round-tripping the user's modifications back to JSON.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File research/dump-clipboard-formats.ps1 [-Out research/_clip.json]

param(
    [string]$Out = ""
)

Add-Type -AssemblyName System.Windows.Forms

$do = [System.Windows.Forms.Clipboard]::GetDataObject()
if ($null -eq $do) {
    Write-Output "ERR clipboard_empty"
    exit 1
}

$formats = $do.GetFormats()
Write-Output "FORMATS_COUNT=$($formats.Count)"
Write-Output ""

$dumps = @{}

foreach ($fmt in $formats) {
    $line = "  $fmt"
    try {
        $data = $do.GetData($fmt)
        if ($null -eq $data) {
            $line += "    -> null"
        } elseif ($data -is [byte[]]) {
            $line += "    -> bytes len=$($data.Length)"
            if ($Out -ne "") { $dumps[$fmt] = "<bytes len=$($data.Length)>" }
        } elseif ($data -is [System.IO.MemoryStream]) {
            $line += "    -> stream len=$($data.Length)"
            if ($Out -ne "") { $dumps[$fmt] = "<stream len=$($data.Length)>" }
        } elseif ($data -is [string]) {
            $preview = $data
            if ($preview.Length -gt 200) { $preview = $preview.Substring(0, 200) + "..." }
            $line += "    -> string len=$($data.Length) preview=$preview"
            if ($Out -ne "") { $dumps[$fmt] = $data }
        } elseif ($data -is [System.Drawing.Bitmap] -or $data -is [System.Drawing.Image]) {
            $line += "    -> image $($data.Width)x$($data.Height)"
        } else {
            $line += "    -> type=$($data.GetType().FullName)"
        }
    } catch {
        $line += "    -> ERR $($_.Exception.Message)"
    }
    Write-Output $line
}

# If the magic Axvg format is present, write its content to a file for inspection.
if ($Out -ne "") {
    if ($formats -contains "Axvg") {
        $axvgText = $do.GetData("Axvg")
        if ($axvgText -is [string]) {
            $absOut = $Out
            if (-not [System.IO.Path]::IsPathRooted($absOut)) {
                $absOut = Join-Path (Get-Location) $absOut
            }
            [System.IO.File]::WriteAllText($absOut, $axvgText, [System.Text.Encoding]::UTF8)
            Write-Output ""
            Write-Output "AXVG_DUMP saved to: $absOut (len=$($axvgText.Length))"
        }
    } else {
        Write-Output ""
        Write-Output "NO_AXVG_FORMAT — formats available: $($formats -join ', ')"
    }
}
