#!/usr/bin/env bash
# Mac: bring Axure RP 11 to front and send Cmd+V. Equivalent of the inline PS in axvg.ts'
# focusAxureAndPaste(). Prints "OK" if a paste was dispatched, "SKIP" if Axure not running.

OUT=$(/usr/bin/osascript <<'AS'
tell application "System Events"
    set procs to (every process whose name contains "Axure")
    if (count of procs) is 0 then
        return "SKIP"
    end if
    set p to item 1 of procs
    set frontmost of p to true
end tell
delay 0.25
tell application "System Events"
    keystroke "v" using command down
end tell
return "OK"
AS
)

echo "$OUT"
