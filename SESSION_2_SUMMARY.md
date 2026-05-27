# Session 2 — autonomous progress while you slept

## TL;DR
- **Write path to Axure is now end-to-end working.** Claude can put bytes on Windows clipboard under `AxureClipboardDocument11.0.0.0`, focus Axure, send Ctrl+V automatically, and rectangles appear in your canvas.
- **3 new MCP tools** added beyond the read-only `axure_inspect` / `axure_dump_record`:
  - `axure_paste_template` — drop any captured template on clipboard, optionally auto-paste
  - `axure_paste_at(cursor_x, cursor_y)` — paste at a chosen screen coordinate
  - `axure_paste_login_page_scaffold` — stamps 7 rectangles in a vertical login-page column layout (cursor coords tuned for 1920×1080 maximized Axure)
- **Compiled and live**. Restart Claude Code (or reload window) and all 6 tools show up under MCP `axure`.

## Try it when you wake up

```
你: "用 axure_paste_login_page_scaffold 帮我搭个登录页"
```

Claude calls the tool. PowerShell maximizes Axure → moves cursor to 7 positions in sequence → clicks + Ctrl+Vs each time → 7 rectangles appear roughly in a column. You drag them to exact positions and type text in.

Or more granular:
```
你: "在 Axure 画布 (800, 400) 处贴一个矩形"
```
→ `axure_paste_at(cursor_x=800, cursor_y=400)` lands a rectangle exactly there.

## What I learned and got working today

### The discovery that unlocked everything
**Axure's clipboard format is just its inner record format**. The Windows clipboard "AxureClipboardDocument11.0.0.0" byte[] has the same 32-byte header + string table + payload structure we already decoded for `.rp` records — no gzip wrapper. So our existing parser works on it directly. This means:
- We can READ what Axure puts on clipboard
- We can WRITE bytes back to clipboard that Axure will accept on Ctrl+V

### Verified mechanically
- `[System.Windows.Forms.Clipboard]::SetDataObject(data, $true)` calls `OleFlushClipboard`, data survives PowerShell exit ✓
- Win32 SetForegroundWindow + the Alt-key trick + SendKeys Ctrl+V reliably triggers paste in Axure ✓
- `[Cursor]::Position` + `mouse_event` click sets paste anchor at a chosen screen coordinate ✓
- Auto-paste end-to-end works from Claude → MCP → Node → PowerShell → Axure with no manual steps ✓

### Style encoding cracked (font / color / weight)
By mining 4 different state instances of the `Google登录` button in your `漫剧.rp`:
- Font size: `(strref "Size") (tag 0x06) (f64)` — observed 9.75 default, 15 when bold
- Font weight: `(strref "Weight") (tag 0x05) (u32 = 400 or 700)`
- Color: `(strref "Color" / "fill-color") (tag 0x05) (u32 ARGB)` — default text `0xFF333333`

These can be patched in templates to customize style. NOT yet exposed as MCP tool args, but easy to add later.

## Honest limitations (and why)

1. **All pasted rectangles are the same size** as the captured template. I tried patching the metadata `Width` f64 field — Axure ignores it and uses the path's control points instead. To resize widgets we'd need to scale path control points proportionally, which is more decode work.

2. **Cursor positioning assumes 1920×1080 maximized Axure**. If your screen is different or Axure isn't maximized, pastes may land off-canvas. Easy fix: detect Axure window rect via Win32 `GetWindowRect`.

3. **Text inside widgets isn't customizable yet**. The captured template has `形状` as the widget name. To inject custom text per paste, we'd need to either modify the string table (varies length, complex) or capture additional templates with specific text.

## What you can build on this

The clipboard-write pipeline is the right primitive. Extensions for the team:

1. **Capture more templates** (one-time dev work, you do it once for the team package):
   - A small rectangle (50×50)
   - A medium rectangle (200×100)
   - A wide button (300×44)
   - A text label
   - A horizontal line
   - A circle
   Bundle them in `samples/clipboard/` and ship.

2. **Compose multiple widgets into one paste-data byte[]** — Axure's clipboard format supports multiple `diagram-objects` in one payload. One Ctrl+V = whole pre-designed page. This is how the existing Figma plugin actually works.

3. **Decode path control points** — unlocks per-paste resize. Each VectorShape has a `Path` with `ControlPoints` that define the rectangle's corners; scale these uniformly to scale the widget.

## Files updated this session

- `src/parser/synth.ts` — NEW. Widget synthesis (Width/Height patching) + multi-widget paste sequencing.
- `src/parser/clipboard.ts` — added `cursorX`/`cursorY` to `PasteOptions`.
- `src/mcp-server.ts` — registered `axure_paste_at` and `axure_paste_login_page_scaffold`.
- `research/set-clipboard.ps1` — added `-CursorX/-CursorY` for positioned paste; `SW_MAXIMIZE` Axure before paste.
- `research/screenshot.ps1` — NEW. Full-screen capture for visual verification.
- `research/patch-and-paste.ts` — NEW. Quick byte-patch experiment runner.
- `research/find-field-values.ts`, `enumerate-f64s.ts` — NEW analysis scripts.
- `NOTES.md` — Session 2 section appended with all detailed findings.
- `samples/extracted/无标题 - 639...rp/` — auto-backup analysis dumps from your live Axure session.

## Just so you know — what didn't work

- Width patching didn't visibly resize widgets (Axure recomputes from path data).
- Low-res full-screen screenshots couldn't confirm exact widget sizes — Axure's right Inspect panel is unreadable at 2048×1152.
- Used Axure's auto-backup files (every ~15 min) as ground truth instead.

## Status: ready for you to test

Open a fresh Claude Code conversation, make sure Axure RP is open (maximized helps), and say:
> "用 axure_paste_login_page_scaffold 给我搭个登录页"

7 rectangles will appear in Axure. They'll look like garbage — same size, roughly stacked vertically — but they prove the end-to-end flow works. From here we iterate.
