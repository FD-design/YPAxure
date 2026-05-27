#!/usr/bin/env bash
# Mac counterpart of dump-axure-selection.ps1.
# Reads the current macOS pasteboard (after a Ctrl+C/Cmd+C inside Axure) and extracts:
#   - text content (any text-ish pasteboard type concatenated)
#   - rendered preview as PNG (from public.tiff or public.png)
#
# NOTE: untested on a real mac Axure copy yet — written speculatively based on what
# macOS apps typically write to NSPasteboard. If the format names are wrong, edit the
# Swift block below.
#
# Usage:
#   bash research/dump-axure-selection.sh -OutDir <abs dir>

set -e

OUT_DIR=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    -OutDir) OUT_DIR="$2"; shift 2 ;;
    *) shift ;;
  esac
done

if [[ -z "$OUT_DIR" ]]; then
  echo "ERR missing -OutDir"
  exit 1
fi
mkdir -p "$OUT_DIR"

ESC_DIR=$(printf '%s' "$OUT_DIR" | /usr/bin/sed 's/\\/\\\\/g; s/"/\\"/g')

SWIFT_FILE="$(mktemp -t axure-read).swift"
trap 'rm -f "$SWIFT_FILE"' EXIT

cat > "$SWIFT_FILE" <<SWIFT
import AppKit
import Foundation

let outDir = "$ESC_DIR"
let pb = NSPasteboard.general
let types = pb.types ?? []
print("FORMATS=" + types.map { \$0.rawValue }.joined(separator: ","))

// ---- Text: dump every text-ish type, concatenated ----
let textTypes: [NSPasteboard.PasteboardType] = [
    NSPasteboard.PasteboardType(rawValue: "Csv"),
    NSPasteboard.PasteboardType(rawValue: "public.utf8-plain-text"),
    .string,
]
var csvWritten = false
for t in textTypes {
    if types.contains(t), let s = pb.string(forType: t) {
        let p = outDir + "/selection.csv"
        try? s.write(toFile: p, atomically: true, encoding: .utf8)
        let bytes = s.lengthOfBytes(using: .utf8)
        print("CSV=\(p) bytes=\(bytes) from=\(t.rawValue)")
        csvWritten = true
        break
    }
}
if !csvWritten { print("CSV_MISSING") }

// ---- Image: tiff or png → save as PNG ----
let imageTypes: [NSPasteboard.PasteboardType] = [.png, .tiff]
var pngWritten = false
for t in imageTypes {
    if types.contains(t), let data = pb.data(forType: t) {
        if let img = NSImage(data: data),
           let tiff = img.tiffRepresentation,
           let bitmap = NSBitmapImageRep(data: tiff),
           let png = bitmap.representation(using: .png, properties: [:]) {
            let p = outDir + "/selection.png"
            try? png.write(to: URL(fileURLWithPath: p))
            print("PNG=\(p) size=\(Int(img.size.width))x\(Int(img.size.height))")
            pngWritten = true
            break
        }
    }
}
if !pngWritten { print("PNG_MISSING") }

print("OK csv=\(outDir)/selection.csv png=\(outDir)/selection.png")
SWIFT

/usr/bin/env swift "$SWIFT_FILE"
