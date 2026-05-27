#!/usr/bin/env bash
# Mac equivalent of set-axvg-clipboard.ps1.
# Writes a UTF-8 text file's contents to the macOS pasteboard under the custom type "Axvg".
# Axure RP 11 (mac) accepts this format the same way Windows does.
#
# Usage:
#   bash research/set-axvg-clipboard.sh -Path /tmp/payload.json [-Format Axvg]
#
# Requires Xcode Command Line Tools (`xcode-select --install`) for the `swift` interpreter.

set -e

PATH_ARG=""
FORMAT="Axvg"

while [[ $# -gt 0 ]]; do
  case "$1" in
    -Path) PATH_ARG="$2"; shift 2 ;;
    -Format) FORMAT="$2"; shift 2 ;;
    *) shift ;;
  esac
done

if [[ -z "$PATH_ARG" ]]; then
  echo "ERR missing -Path argument"
  exit 1
fi
if [[ ! -f "$PATH_ARG" ]]; then
  echo "ERR file_not_found path=$PATH_ARG"
  exit 1
fi

ABS_PATH="$(cd "$(dirname "$PATH_ARG")" && pwd)/$(basename "$PATH_ARG")"
CHARS=$(/usr/bin/wc -c < "$ABS_PATH" | /usr/bin/awk '{print $1}')

# Escape path and format for safe embedding inside a Swift string literal.
ESC_PATH=$(printf '%s' "$ABS_PATH" | /usr/bin/sed 's/\\/\\\\/g; s/"/\\"/g')
ESC_FORMAT=$(printf '%s' "$FORMAT" | /usr/bin/sed 's/\\/\\\\/g; s/"/\\"/g')

SWIFT_FILE="$(mktemp -t axvg-swift).swift"
trap 'rm -f "$SWIFT_FILE"' EXIT

cat > "$SWIFT_FILE" <<SWIFT
import AppKit
import Foundation
do {
    let text = try String(contentsOfFile: "$ESC_PATH", encoding: .utf8)
    let pb = NSPasteboard.general
    pb.clearContents()
    let t = NSPasteboard.PasteboardType(rawValue: "$ESC_FORMAT")
    let ok = pb.setString(text, forType: t)
    if !ok { print("ERR_SET"); exit(2) }
    print("SWIFT_OK")
} catch {
    print("ERR_READ")
    exit(3)
}
SWIFT

SWIFT_OUT=$(/usr/bin/env swift "$SWIFT_FILE" 2>&1)

if [[ "$SWIFT_OUT" != *"SWIFT_OK"* ]]; then
  echo "ERR swift_failed: $SWIFT_OUT"
  exit 1
fi

echo "OK format=$FORMAT chars=$CHARS src=$ABS_PATH"
