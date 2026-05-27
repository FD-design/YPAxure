#!/usr/bin/env bash
# Mac equivalent of set-image-clipboard.ps1.
# Put a PNG file on the macOS pasteboard as an image so Axure (or any app) can paste it.
# Optionally also activate Axure and Cmd+V automatically.
#
# Usage:
#   bash research/set-image-clipboard.sh -PngPath search.png [-SvgPath search.svg] [-AutoPaste]
#
# Requires Xcode Command Line Tools (`xcode-select --install`).

set -e

PNG_PATH=""
SVG_PATH=""
AUTO_PASTE=false
CURSOR_X=-1
CURSOR_Y=-1

while [[ $# -gt 0 ]]; do
  case "$1" in
    -PngPath) PNG_PATH="$2"; shift 2 ;;
    -SvgPath) SVG_PATH="$2"; shift 2 ;;
    -AutoPaste) AUTO_PASTE=true; shift ;;
    -CursorX) CURSOR_X="$2"; shift 2 ;;
    -CursorY) CURSOR_Y="$2"; shift 2 ;;
    *) shift ;;
  esac
done

if [[ -z "$PNG_PATH" ]]; then
  echo "ERR missing -PngPath"
  exit 1
fi
if [[ ! -f "$PNG_PATH" ]]; then
  echo "ERR png_not_found path=$PNG_PATH"
  exit 1
fi

ABS_PNG="$(cd "$(dirname "$PNG_PATH")" && pwd)/$(basename "$PNG_PATH")"
ABS_SVG=""
if [[ -n "$SVG_PATH" && -f "$SVG_PATH" ]]; then
  ABS_SVG="$(cd "$(dirname "$SVG_PATH")" && pwd)/$(basename "$SVG_PATH")"
fi

ESC_PNG=$(printf '%s' "$ABS_PNG" | /usr/bin/sed 's/\\/\\\\/g; s/"/\\"/g')
ESC_SVG=$(printf '%s' "$ABS_SVG" | /usr/bin/sed 's/\\/\\\\/g; s/"/\\"/g')

SWIFT_FILE="$(mktemp -t img-swift).swift"
trap 'rm -f "$SWIFT_FILE"' EXIT

cat > "$SWIFT_FILE" <<SWIFT
import AppKit
import Foundation
let pngPath = "$ESC_PNG"
let svgPath = "$ESC_SVG"

guard let pngData = try? Data(contentsOf: URL(fileURLWithPath: pngPath)) else {
    print("ERR_PNG_LOAD"); exit(1)
}
let size = NSImage(data: pngData)?.size ?? .zero

var declared: [NSPasteboard.PasteboardType] = [.png, .tiff]
var svgText: String? = nil
if !svgPath.isEmpty {
    if let s = try? String(contentsOfFile: svgPath, encoding: .utf8) {
        svgText = s
        declared.append(NSPasteboard.PasteboardType(rawValue: "public.svg-image"))
        declared.append(NSPasteboard.PasteboardType(rawValue: "image/svg+xml"))
    }
}

let pb = NSPasteboard.general
pb.clearContents()
pb.declareTypes(declared, owner: nil)
pb.setData(pngData, forType: .png)

if let img = NSImage(data: pngData), let tiff = img.tiffRepresentation {
    pb.setData(tiff, forType: .tiff)
}
if let svg = svgText {
    pb.setString(svg, forType: NSPasteboard.PasteboardType(rawValue: "public.svg-image"))
    pb.setString(svg, forType: NSPasteboard.PasteboardType(rawValue: "image/svg+xml"))
}
print("IMG_OK \(Int(size.width))x\(Int(size.height))")
SWIFT

SWIFT_OUT=$(/usr/bin/env swift "$SWIFT_FILE" 2>&1)
if [[ "$SWIFT_OUT" != *"IMG_OK"* ]]; then
  echo "ERR swift_failed: $SWIFT_OUT"
  exit 1
fi

SIZE_PART=$(printf '%s' "$SWIFT_OUT" | /usr/bin/awk '/IMG_OK/{print $2}')
echo "OK png=$ABS_PNG size=$SIZE_PART"

if [[ "$AUTO_PASTE" == "true" ]]; then
  AP_OUT=$(/usr/bin/osascript <<'AS'
tell application "System Events"
    set procs to (every process whose name contains "Axure")
    if (count of procs) is 0 then
        return "AUTOPASTE_SKIP reason=axure_not_running"
    end if
    set p to item 1 of procs
    set frontmost of p to true
end tell
delay 0.25
tell application "System Events"
    keystroke "v" using command down
end tell
return "AUTOPASTE_OK"
AS
)
  echo "$AP_OUT"
fi
