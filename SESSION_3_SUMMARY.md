# Session 3 — autonomous progress while you slept (round 2)

## TL;DR
- **9 MCP tools now (was 6).** 3 new: `axure_get_window_rect`, `axure_paste_layout`, `axure_capture_clipboard`.
- **Cursor positioning is now robust** across screen resolutions / which monitor Axure is on. No more hardcoded 1920×1080 — uses Win32 `GetWindowRect` to find Axure's actual rect and compute canvas-relative offsets dynamically.
- **Clipboard CAPTURE pipeline shipped** — `axure_capture_clipboard(name)` saves whatever's currently on the Axure clipboard as a reusable `.bin` template. This is the practical path forward for broadening the widget library without me having to decode more of the format.
- **Path control points fully decoded** — but it turns out resizing via path patching doesn't work either (Axure ignores the values and uses its style group). See "honest limitations" below.

## What to try when you wake up

The smartest first move: build out your template library by capturing the variants your team will want.

```
你: "我要为团队准备登录页模板。我现在在 Axure 中画好一个 300x44 的蓝色按钮，
     然后选中它按 Ctrl+C，请你把它保存成 blue_button 模板。"
```
Claude calls `axure_capture_clipboard(name="blue_button")`. The MCP reads your clipboard and saves `samples/clipboard/blue_button.bin`. Future calls to `axure_paste_template(template="blue_button")` paste an exact copy of that button — correct size, correct color, no manual fixup.

Repeat for whatever variants you want:
- `tall_input` — a wide thin text field
- `small_circle` — a circular icon background
- `divider_line` — a 1px horizontal rule
- `login_form` — capture a multi-widget composition with Ctrl+A then Ctrl+C, save as one template (one Ctrl+V to drop the whole layout)

Then the layout-stamping tools (`axure_paste_layout`, `axure_paste_login_page_scaffold`) can position each captured variant at the right canvas location.

## What got built tonight

### `axure_get_window_rect()` — query Axure's screen position
Returns the live Axure window rect plus the inferred canvas drawing area (excluding sidebars and toolbars). Maximizes + focuses Axure as a side effect. Solves the "screen resolution mismatch" problem from Session 2.

### `axure_paste_layout(widgets, delay_ms?)` — layout-aware stamping
Each widget is `{ dx, dy }` — pixel offset from canvas center. The MCP resolves these to absolute screen coords using Axure's live window rect. So the same call works whether Axure is at (0, 0) 1920×1080 or (1, 1) on a 2046×1110 secondary monitor (which is your actual setup).

### `axure_capture_clipboard(name, dir?)` — save the current clipboard as a template
Reads the `AxureClipboardDocument11.0.0.0` format off the Windows clipboard and saves it as a `.bin` under `samples/clipboard/`. Fails fast if the clipboard doesn't have the Axure format. Returns the bytes count + parsed class name + string count for confirmation.

### `axure_paste_login_page_scaffold` — same tool, smarter
Now uses canvas-relative offsets `dx/dy` from the live canvas center instead of hardcoded `cursorX/cursorY`. Should work on any monitor / resolution.

## Honest limitations — what I tried and what didn't work

Spent significant time on widget resize. Here's the full state:

### Path control points are NORMALIZED to unit square
Every VectorShape rectangle I've inspected — 50×50, 200×100, 290×694, 391×21, anything — has the SAME 4 path corners `(0,0) (0,1) (1,1) (1,0)`. The path defines SHAPE, the actual size comes from a separate `(Height, Start, Y, Width)` quartet of f64 fields elsewhere in the widget instance. Sessions 2 + 3 located that quartet but...

### Patching anything in the clipboard doesn't change the rendered widget
Tested patching the path corners to absolute pixel coords (e.g., `(0,0) (0,100) (200,100) (200,0)` for a 200×100 rect): the patched bytes ARE on the clipboard (verified by reading them back), but Axure RE-NORMALIZES the path to unit square on paste AND assigns its own arbitrary widget bounds (saw `W=695, H=501` for the patched 200×100 attempt). Same story for `Width` f64 patches and `fill-color` u32 patches — the bytes reach Axure, Axure ignores them.

Why: the widget instance references an `AdaptiveStyles` group named `MyStyle-Axure:DiagramObject:VectorShape`, and on paste Axure looks up THAT style group for actual size/color/font defaults. Patches on the widget instance's embedded values are essentially decorative.

### The practical workaround
Two options:
1. **Capture more templates** (what I shipped tonight): once per team, capture each visual variant from a real Axure session via `axure_capture_clipboard`. Ship the `.bin` files. Teammates `npm install` + add to `.claude.json` + use, zero manual capture on their side.
2. **Decode the AdaptiveStyles group** (future work): find where the style group stores its fill/border/size defaults, patch THOSE on the clipboard, and the widget will render with the patched values. Bigger reverse-engineering lift.

## Files updated this session

- `src/parser/clipboard.ts` — added `AxureRect`, `getAxureRect()`, `captureClipboard()`, `axureRect` in `PasteResult`.
- `src/parser/layout.ts` — NEW. `canvasArea(rect)` + `canvasToScreen(area, offset)`.
- `src/parser/synth.ts` — added `pasteLayoutOnCanvas(widgets, opts)`.
- `src/parser/index.ts` — exports layout module.
- `src/mcp-server.ts` — registered 3 new tools.
- `research/set-clipboard.ps1` — emits `AXURE_RECT` line on autopaste so callers can pick it up.
- `research/get-axure-rect.ps1` — NEW. Standalone Win32 query.
- `research/get-clipboard.ps1` — NEW. Read clipboard → save .bin.
- `research/focus-and-shot.ps1` — NEW. Focus Axure then screenshot in one shell (otherwise focus shifts between calls).
- `research/screenshot-region.ps1` — NEW. Crop a screen region.
- `research/decode-path.ts`, `decode-path2.ts`, `decode-path3.ts`, `decode-path4.ts` — NEW analysis scripts.
- `research/widget-bounds.ts` — NEW. Extract `(Height, Start, Y, Width)` quartets from any record.
- `research/find-colors.ts`, `find-colors2.ts`, `find-argb.ts` — NEW. Locate color slots.
- `research/experiment-resize.ts` — NEW. Path-patching experiment runner.
- `research/select-all-copy.ps1` — NEW. Programmatic Ctrl+A+C in Axure.
- `NOTES.md` — Session 3 section appended (full reverse-engineering notes).
- `README.md` — updated tools list + honest limitation section.
- `samples/backup_*.rp`, `samples/extracted/backup_*/` — auto-backup snapshots used for verification.

## Status: ready for you to grow the template library

Open a fresh Claude Code conversation. Make sure Axure is running with the doc you want to capture variants from. Then:

> "我用 Axure 画好了 7 种登录页常用元件，每种都帮我保存成模板：现在选中第一个，蓝色按钮，请保存成 blue_button"

Walk through each variant. After 7 captures you have a real widget library, and the existing `axure_paste_layout` tool can drop them into place at the right canvas positions for any new page.
