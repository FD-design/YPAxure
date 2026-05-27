#!/usr/bin/env bash
# Mac equivalent of get-axure-rect.ps1.
# Find Axure RP's main window via System Events, bring it to front, then print its rect.
# Output (single line, parseable): RECT L=... T=... R=... B=... W=... H=...
#
# Requires Accessibility permission for the parent terminal/process (System Settings →
# Privacy & Security → Accessibility). On first run macOS prompts the user.

OUT=$(/usr/bin/osascript <<'AS'
tell application "System Events"
    set procs to (every process whose name contains "Axure")
    if (count of procs) is 0 then
        return "ERR axure_not_running"
    end if
    set p to item 1 of procs
    set frontmost of p to true
end tell
delay 0.25
tell application "System Events"
    set procs to (every process whose name contains "Axure")
    if (count of procs) is 0 then
        return "ERR axure_disappeared"
    end if
    set p to item 1 of procs
    if (count of windows of p) is 0 then
        return "ERR no_window"
    end if
    set w to window 1 of p
    set pos to position of w
    set sz to size of w
    set L to (item 1 of pos) as integer
    set T to (item 2 of pos) as integer
    set W to (item 1 of sz) as integer
    set H to (item 2 of sz) as integer
    set R to L + W
    set B to T + H
    return "RECT L=" & L & " T=" & T & " R=" & R & " B=" & B & " W=" & W & " H=" & H
end tell
AS
)

echo "$OUT"
if [[ "$OUT" == ERR* ]]; then
  exit 1
fi
