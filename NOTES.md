# Axure .rp Format — Reverse-Engineering Notes

Living document. Append, don't rewrite.

## TL;DR (current understanding)

A `.rp` file is:
```
[15-byte header]
[LZ-compressed JSON manifest, ends with `}}}`]
[N × gzip-compressed records]
[trailing zeros]
```

Each gzip record decompresses to a .NET-style binary serialization of one Axure object: `Axure:Page`, `Axure:Master`, `Axure:HtmlPrototypeGeneratorConfiguration`, `Axure:Word2007SpecificationGeneratorConfiguration`, `Axure:CsvAnnotationReportGeneratorConfiguration`, `Axure:PrintConfig`, etc.

Read-only parser is now realistic. Write-side is still aspirational (would need to re-serialize the .NET-style inner format).

## Header (15 bytes, verified)
- `0..1`: magic `AC EF`
- `2`: major version (`0B` = 11, `09` = 9)
- `3`: `0x00` (constant in all samples seen)
- `4..7`: little-endian u32, varies. Hypothesis: header-or-manifest length. Needs samples to confirm.
- `8`: `0x01` (constant)
- `9..14`: 6 unknown bytes, varies per file.

## Manifest (offset 15 .. first `}}}`)
- Plaintext JSON, but **with LZ77-style back-references inlined as 2-byte markers**.
- Examples of inlined back-refs:
  - `"children` then `0C 00 F0 11` then GUID-of-child → the `0C 00` and `F0 11` likely encode a short copy from earlier in the stream.
  - `"package":0` written as `"...0C 00 FF 1C ckage":0` → `pa` came from a back-reference (probably to earlier `"parts"`).
- The manifest contains:
  - `"root":{"children":[...],"thumbnail":31786,...}` — page tree
  - `"DesignDocument":16562` — IDs of records to load (NOT byte offsets; just internal IDs)
  - `"version":"11.0.0.4137"` — Axure RP version that wrote the file
  - `"Settings":...` — settings record ID
  - Short IDs like `g144541`, `g206722`, `g785653` — Axure internal widget short-IDs
- The LZ scheme is **not yet decoded**. We can mine plaintext fragments but not yet faithfully reconstruct the JSON.

## Body: gzip-compressed records (CONFIRMED)
- After the manifest ends with `}}}`, there are a few null bytes, then records:
  ```
  [u32 LE: record length?]
  [gzip stream: 1F 8B 08 ...]
  ```
- Sample `漫剧.rp` (1.6 MB) contains 8 gzip records. All decoded cleanly with `zlib.gunzipSync`.
- Each record's payload begins with a class identifier like `Axure:Page`, `Axure:Master`, etc., followed by field names and values in what looks like .NET-style binary serialization.

### Records seen in `漫剧.rp`
| Offset (hex) | Class | Inflated size |
|---|---|---|
| 0x48A | `Axure:HtmlPrototypeGeneratorConfiguration` | 1575 |
| 0x77F | `Axure:Word2007SpecificationGeneratorConfiguration` | 41941 |
| 0x7D7D | `Axure:CsvAnnotationReportGeneratorConfiguration` | 1162 |
| 0x7FC7 | `Axure:PrintConfig` | 414 |
| 0x8ABC | `Axure:Page` | 520150 |
| 0x11A8B | `Axure:Master` | 10289 |
| 0x13532 | `Axure:Page` | 904031 |
| 0x2456E | `Axure:Page` | 735326 |

## Embedded resources
- JPEG signatures (`FF D8 FF`) inside the file — but these are almost certainly *inside* the gzip-decompressed records (as raw image bytes in widget fills), not floating in the outer container.
- The `78 XX` "zlib candidates" found by signature scan are false positives; nothing inflates at those raw offsets. Outer compression is **gzip only**.

## Inner record format (CONFIRMED across `PrintConfig`, `Page`, `DesignDocument`)

After gunzip, every record begins with a fixed 32-byte header:
```
w0 (u32 LE)  = 27   format flag (constant across records)
w1 (u32 LE)  = 11   major version (matches outer header byte 2)
w2..w4       = 0    three reserved zeros
w5 (u32 LE)  = 0xC351   format magic (constant — verified in 4 different record types)
w6 (u32 LE)  = 31   constant across records — meaning still unknown
w7 (u32 LE)  = N    string-table entry count
```
Followed immediately by N string entries:
```
[u32 LE: byte length]
[UTF-8 bytes]
```
Then the payload (integer references into the string table + scalar data + nested structures).

The string table holds **both schema (class/field names) AND user-level string values** (widget default names, font family names, custom labels, etc.). See "Rectangle baseline" below.

For PrintConfig the string table is:
```
"Axure:PrintConfig", "PrintScalingConfig", "Type", "FitPrinter",
"ScaleDownOnly", "PrintPagesConfig", "PrintAll", "IdsToPrint", "PrintMastersConfig"
```
These are class name + field names — i.e., the **schema** for the record. After the schema comes an integer-indexed value section that references the strings as field IDs.

The one record labeled "unknown" (index 21 in 漫剧.rp) is **literally raw XML** — `<BreakingChanges>…</BreakingChanges>` — Axure's "this file is too new to open" message stored verbatim. Not a gzip record at all, just a misidentified detection.

## Rectangle baseline (CONFIRMED via `blank.rp` vs `one_rect.rp` minimum pair)

Both files: same Axure version, same Axure session. `one_rect.rp` is identical to `blank.rp` plus one default rectangle dragged onto the first page.

Outer:
- File size: 40617 → 44681 (+4064 bytes for one rectangle)
- Record count: 8 → 8 (unchanged)
- Only 2 records differ in size: `Axure:Page` (+4473) and `Axure:DesignDocument` (+2519)
- All 6 other records (4 generator configs + XML guard + DocumentSettings) are byte-identical

Page record:
- blank Page: 85 strings, payload starts at offset 1267, total 5682 bytes
- one_rect Page: 146 strings, payload starts at offset 2451, total 10155 bytes
- 61 strings added, 0 removed
- Inline rectangle payload encoding ≈ 3289 bytes

The 61 added strings break down as:
- 1 user-visible widget name (default Chinese name `形状` for a new shape)
- 20 strings forming the Arial font fallback table (the document hadn't needed font metadata until a widget that can have text was added)
- 6 vector-shape fields: `ControlPoints`, `Path`, `LowerHandle`, `HigherHandle`, `HigherSegmentExists`, `Shape`
- 1 class identifier: `Axure:DiagramObject:VectorShape`
- 11 widget identity/container fields: `name-block`, `*type`, `text-block`, `text`, `property-dictionary`, `type`, `label`, `diagram-object-id`, `parent-diagram-id`, `tooltip`, `reference-page-package-id`
- 9 UX state fields: `IsContained`, `IsLocked`, `SelectedStyleGroup`, `MyStyle`, `SubmitButton`, `Disabled`, `Selected`, `Error`, `VisibleFromSettings`
- 2 layout fields: `AutoFitHeight`, `AutoFitWidth`
- 3 style-system fields: `Axure:Style`, `MatchInfo`, `LegacyName`

Key takeaways:
- A rectangle widget is class **`Axure:DiagramObject:VectorShape`** (not `Rectangle` — it's a generic vector shape with a rectangle-shaped path).
- Adding any visible widget appears to drag in the full text/font/style capability chain, even if the widget has no text.
- The "five button states" (`MyStyle`/`Disabled`/`Selected`/`Error`/`VisibleFromSettings` + `SubmitButton`) are part of every shape's style system, not just buttons.

## Payload type-tag stream (PARTIALLY DECODED)

After the string table, the payload is a **stream of typed values**. Each value is `<u32 LE tag> <variable-length data>`:

| Tag (hex) | Decoded | Notes |
|---|---|---|
| `0x01` | u32 follows | count / scalar1 |
| `0x02` | u32 follows | scalar2 (often `1` like a boolean) |
| `0x03` | u32 follows | scalar3 |
| `0x05` | u32 follows | scalar5 — holds colors as 0xAARRGGBB, font weight 400/etc. |
| `0x06` | f64 follows (8 bytes) | doubles — font size 9.75, coordinates |
| `0x08` | u32 string-index follows | **string-table reference** — most common tag |
| `0x09` | u32 follows | scalar9 |
| `0x11` | u32 follows | scalar17 — appears between strref pairs |
| `0x12` | u32 follows | scalar18 |
| `0x19` | u32 follows | scalar25 — used with Baseline-style fields |
| `0x1a` | u32 count, then N typed values | **container open** — opens a sub-list of that many typed values |
| `0x1e` | u32 count, then N × 16 raw bytes | **GUID list** — fixed-size GUID array |

Confirmed common patterns inside the stream:
- Font definition: `(strref "Family") (strref "Arial Normal") (strref "Weight") (u32(t5) 400) (strref "Style") (u32(t5) 0) (strref "Stretch") (u32(t5) 5)` — recurs for every typeface variant
- Color value: `(strref "fill-color") (u32(t5) 0xFFRRGGBB)` — default text color seen as `0xFF333333`
- Default font size: `(strref "Size") (f64 9.75)`
- Text content: `(strref "Axure:AttributedString:AxRun") (strref "Text") (strref "测试")` — the literal user-entered text is just another string-table entry referenced like any other field

The walker in `research/parse-payload.ts` reliably walks ~70 typed values into a 4 KB payload before drifting on an unrecognized byte sequence (presumably a non-tagged variable-length inline structure that we don't yet know how to skip). The fallback tool in `research/scan-strefs.ts` ignores structure entirely and just locates every `0x08 XX XX XX XX` that points at a valid string-table index — on `rect_with_text`'s Page record it finds **497 valid strrefs**, which is enough to enumerate every class/field/user-string used in the page in chronological order.

## Per-widget byte cost (CONFIRMED via blank → one_rect → two_rects → rect_with_text)

| Sample | Page record size | Schema strings | GUID count in payload section 1 |
|---|---:|---:|---:|
| `blank.rp` | 5682 | 85 | 14 |
| `one_rect.rp` | 10155 | 146 (+61) | 19 (+5) |
| `two_rects.rp` | 11772 | 146 (+0) | 22 (+3) |
| `rect_with_text.rp` | 11094 | 172 (+26 vs one_rect) | 19 (probably +3 vs blank if a single widget) |

Derived costs:
- First widget (any class): brings in `+61` schema strings + `+5` GUIDs + `+4473` payload bytes — most of this is one-time infrastructure (font tables, capability flags) that is shared by all subsequent widgets.
- Each subsequent rectangle: `+0` schema strings + `+3` GUIDs + `+1617` payload bytes — pure per-widget cost.
- Adding text content `测试` to an existing rectangle: `+26` schema strings + same GUID count + `+939` payload bytes — most of the extra is the rich-text infrastructure (paragraph/run/inline metadata) that's also one-time.

This gives us a working "rectangle widget = string-index range + 3 GUIDs + ~1.6 KB" model.

## What we still don't know
1. **LZ scheme of the front manifest** — to reconstruct the page tree / GUID list cleanly. Currently we can extract textual fragments but not faithfully decompress.
2. **Mapping from manifest IDs (e.g., `"DesignDocument":16562`) to which gzip record they refer to** — is the number a byte offset, a record sequence number, or some internal handle?
3. **Full container scoping in the payload** — we know `0x1A` opens a container and `0x1E` is a GUID list, but other variable-length inline structures (likely raw u32 arrays or count-prefixed blobs) cause the structural walker to drift after ~70 typed values. Resolving this requires either reading enough samples to enumerate all variable-length tags, or making the walker aware of expected counts per parent type.

## Next experiments
1. **Identify the constant `0xC351`** across many records — confirm it's a format magic, not coincidence.
2. **Write a string-table dumper** that walks every extracted record and prints its full schema (class + field names). This will reveal the full vocabulary of Axure object types in a few minutes.
3. **Decode `Axure:Page`** — the payload after the string table. Use the smallest Page record (520 KB) and the schema gives field names.
4. **Crack the LZ manifest** by creating a tiny `.rp` (blank doc) and diffing its compressed manifest against `漫剧.rp`'s.
5. **Look at `Axure:DesignDocument`** (record 20, 69 KB) — likely the master list mapping GUIDs to which record holds each page.

---

## Session 2 (2026-05-27 afternoon) — clipboard write path + login-page scaffold

### CRITICAL: Axure clipboard format = Axure inner record format
- Format name on Windows clipboard: **`AxureClipboardDocument11.0.0.0`**
- Class name in payload: `Axure:PasteData`
- Bytes are **raw inner record format** — same 32-byte header (`0xC351` magic) + string table + payload
- **No gzip wrapper** (unlike records inside .rp files)
- Same parser library (`parseRecord`) reads it correctly

### Clipboard write path WORKS end-to-end
- `set-clipboard.ps1`: uses `[System.Windows.Forms.Clipboard]::SetDataObject(data, $true)` which calls `OleFlushClipboard` — data survives PowerShell exit
- Auto-paste: Win32 `ShowWindow(SW_MAXIMIZE) + keybd_event(Alt) trick + SetForegroundWindow + SendKeys "^v"` works on Axure RP 11
- Cursor positioning before paste: `[System.Windows.Forms.Cursor]::Position` + `mouse_event(LEFTDOWN/UP)` to click → paste anchors there
- AxureMastersTransferred (`System.Guid[]` empty) registered alongside main format — required for paste to take effect

### Style/font/color encoding decoded
For text inside a widget instance:
- Font size: `(strref "Size") (tag 0x06) (f64)` — e.g. 9.75 default, 15 bold
- Font weight: `(strref "Weight") (tag 0x05) (u32)` — 400 = Normal, 700 = Bold
- Color: `(strref "fill-color" / "Color") (tag 0x05) (u32 0xAARRGGBB)` — default text `0xFF333333`
- Confirmed by mining 4 instances of `Google登录` button in 漫剧 login page record

### Per-widget X/Y/Width/Height — PARTIAL with caveat
For widget instance fields in a Page record:
- `Y` (strref #29 in clipboard / #33 in 漫剧 schema): `(tag 0x06)(f64)` — empirically observed values like Y=404.5
- `Width` (strref #30 / #34): `(tag 0x06)(f64)` — observed values like Width=201.5
- `X` (strref #28 / #32): mostly absent or stored as `(tag 0x05)(u32 = 0)` — likely defaults to 0
- `Height`: in widgets examined, only canvas-viewport height (694.8181...) was found via this pattern — widget Height seems to come from PATH bounding box, not the metadata field
- **EMPIRICAL FINDING**: patching the metadata Width f64 in the clipboard template and pasting does NOT visibly resize the rendered widget. Axure derives dimensions from path control points. So our W/H patch is currently a no-op for rendering.
- Path control points use fields like `Height` / `Start` / `End` for path-local coordinates — these affect the actual shape geometry.

### Tool surface (6 MCP tools, all in dist/)
1. `axure_inspect(rp_path)` — full outline of a .rp file
2. `axure_dump_record(rp_path, record_index)` — deep dive into one record
3. `axure_list_templates()` — list captured `samples/clipboard/*.bin` templates
4. `axure_paste_template(template, auto_paste?)` — paste a template, optional auto-paste
5. `axure_paste_at(cursor_x, cursor_y, width?)` — paste rectangle at specific screen cursor position
6. `axure_paste_login_page_scaffold(delay_ms?)` — stamp 7 rectangles in a vertical login-page column layout (positions tuned for 1920×1080 / maximized Axure)

Underlying parser library `src/parser/synth.ts` has `findF64Sites`, `synthesizeWidget`, `synthesizeAndPaste`, `pasteSequence`.

### Verification methodology
- **Visual**: PowerShell `System.Drawing` full-screen screenshots → read via Claude image tool. Low resolution made widget-size verification hard; the screenshot does prove pastes are happening but exact W/H is unreadable.
- **Programmatic (more reliable)**: Axure auto-backups every ~15 min to `$LOCALAPPDATA\Axure\Axure-11-0\backup\无标题 - <ticks>.rp`. We can extract THIS backup's Page record and read widget data — most reliable verification path. Used to confirm pastes landed but NOT to confirm Width patches took effect (they didn't — Axure ignored our patched Width).

### Honest limitations (state at session 2 end)
- ALL pasted widgets come out same size as the captured template
- Cursor positioning works in principle but depends on Axure being maximized and screen resolution matching tuned coords (1920×1080)
- The widgets can land off-canvas if Axure is positioned oddly
- The user must DRAG widgets into final layout and type text into each rectangle manually after stamping

### Path forward to "Figma-MCP smoothness"
1. **Decode path control points** — only way to make widgets actually resize. Would unlock arbitrary widget dimensions.
2. **Capture more template variants** (text widget, line, circle, button-styled rect) — broadens widget library without needing path decode.
3. **Compose multi-widget paste-data** — `Axure:PasteData` can hold multiple diagram-objects. One Ctrl+V = whole layout instead of N stamps.
4. **Better cursor coord detection** — read Axure window rect from Win32 instead of hardcoding 1920×1080 assumptions.

---

## Session 3 (2026-05-27 evening) — path decode, dynamic cursor, clipboard capture

### Path control points DECODED — but they don't drive widget size
For a `VectorShape` rectangle, the path is encoded as:
```
(strref Path) (tag 02 count=1) (tag 02 count=4) (tag 01 count=4)
  ── 4 corners follow, each a quartet of LowerHandle / HigherHandle / HigherSegmentExists / Shape ──
  LH_i = (strref LowerHandle) (tag 01 count=2) (strref Y)(tag 06)(f64 y_i) (strref Width)(tag 06)(f64 x_i)
```
- Field names `"Y"` and `"Width"` are recycled inside the path container as keys for a 2D point's
  y and x coords respectively. Misleading naming but consistent across all observed records.
- For a default 50×50 rectangle copied from Axure, the 4 corners are `(0,0) (0,1) (1,1) (1,0)` —
  a **normalized unit square**. Every widget we've inspected (single rect at 50, 200, 290, 391
  pixels wide, etc.) has the SAME unit-square path.
- Therefore the path defines SHAPE, not SIZE. Size is supposed to come from a separate
  `(Height, Start, Y, Width)` quartet of f64 fields in the widget-instance container,
  preceded by `Capabilities → Value → Arial → Value → Arial` lead-in.
- **Empirical test:** patching the path's 8 control-point coords from (0/1) to absolute pixel
  values (e.g., 200/100) on the clipboard template, pasting, and reading the auto-backup —
  Axure re-normalizes the path back to unit square AND assigns its own arbitrary widget bounds
  (observed `W=695, H=501` after a 200×100 patch). Neither path-coord patching nor metadata-field
  patching makes the rendered widget the size we requested.

### Why patching the clipboard doesn't visibly resize widgets
We can patch any of these in `rectangle_one.bin` and the bytes do reach Axure (verified via
clipboard read-back), but none of them visually affect the pasted widget:
- `(Path → LowerHandle).Y/.Width` (the path corner coords)
- `(strref Width)(tag 06)(f64)` in the schema-cache section
- `(strref fill-color → IndentLevel)(tag 05)(u32 ARGB)` color values at offsets 3661/3733/7093/7165

The Axure widget-instance references an `AdaptiveStyles` group (strref `MyStyle-Axure:DiagramObject:VectorShape`),
and on paste Axure appears to look up the style group's defaults and OVERRIDE whatever we
embedded in the bytes. So embedded color/size are essentially decorative — only the structural
fields (path topology, widget class, schema field names) are load-bearing.

To actually customize size/color per widget we'd need to either (a) decode and modify the
style group's contents, or (b) capture different-sized/colored widgets from Axure directly
and use those as separate templates.

### Color encoding decoded (read-only — patch doesn't render)
At offsets `(strref fill-color)(strref IndentLevel)(tag 05)(u32 ARGB)`, the bundled rectangle
template has these slots:
| Site type | Style-cache @ | Widget-instance @ | Default value |
|---|---|---|---|
| Text color   | 2713 | 6145 | `0xFF333333` |
| Fill color   | 3661 | 7093 | `0xFFFFFFFF` |
| Border color | 3733 | 7165 | `0xFF797979` |

Patching all 6 sites doesn't change the rendered widget — see above.

### Dynamic cursor positioning — WORKS ✅
- New `get-axure-rect.ps1` uses Win32 `GetWindowRect` (combined struct + class via single
  `Add-Type -TypeDefinition` to avoid the `PassThru` array-of-types bug we hit earlier).
- `getAxureRect()` returns `{ left, top, right, bottom, width, height }` of the Axure main window.
- `canvasArea(rect)` infers the canvas drawing area by subtracting fixed sidebar/toolbar widths
  (left page tree 320px, right inspect 250px, top toolbar 200px, bottom status 30px). On a
  2046×1110 Axure window the canvas is ~1476×880 with center at ~(1059, 641).
- `pasteLayoutOnCanvas(widgets, opts)` takes an array of `(dx, dy)` canvas-relative offsets and
  resolves each to absolute screen coords before pasting. No more hardcoded 1920×1080 assumption.

### Clipboard capture path — WORKS ✅
- New `get-clipboard.ps1` reads `[System.Windows.Forms.Clipboard]::GetDataObject().GetData(format)`
  and writes the bytes to disk. Handles both `byte[]` and `MemoryStream` return types.
- `captureClipboard(name)` in the parser library spawns the helper and saves to
  `samples/clipboard/<name>.bin`, then re-parses the saved bytes to confirm it's a valid record
  and report class name + string count.
- Exposed via MCP tool `axure_capture_clipboard(name)`. After a user does Ctrl+C in Axure (on
  any selection — single widget, multi-widget composition, formatted button, anything), this
  saves it as a reusable template that subsequent pastes can drop on the canvas.
- This is the **most practical path** to broadening the widget vocabulary without decoding more
  of the format: capture the variants the team needs once, ship them in `samples/clipboard/`.

### Tool surface (9 MCP tools, all in dist/)
Sessions 1–2 (6 tools):
1. `axure_inspect(rp_path)`
2. `axure_dump_record(rp_path, record_index)`
3. `axure_list_templates()`
4. `axure_paste_template(template, auto_paste?)`
5. `axure_paste_at(cursor_x, cursor_y, width?)`
6. `axure_paste_login_page_scaffold(delay_ms?)` — now uses dynamic canvas-relative positioning

Session 3 (3 new tools):
7. `axure_get_window_rect()` — query Axure's screen rect + computed canvas area
8. `axure_capture_clipboard(name)` — save current clipboard as a template
9. `axure_paste_layout(widgets, delay_ms?)` — paste multiple widgets at `(dx, dy)` canvas offsets

### Honest current state
- ✅ Pasting works, robustly, across screen resolutions.
- ✅ Cursor coords compute from live Axure window position.
- ✅ Templates can be grown without my needing to decode anything further.
- ❌ Per-widget resize/recolor at paste time still doesn't work — needs style-group decode or
  pre-captured size/color variants.
- ❌ Multi-widget single-paste needs a multi-widget capture from the user (or decoded composition).

### Path forward
1. **Capture more templates** (one-time per team): a small/medium/large rect, a circle, a thin
   line, a text widget, a styled button, a multi-widget login form. Bundle as samples.
2. **Style group decode** — find where the `MyStyle-Axure:DiagramObject:VectorShape` group
   stores its fill/border/size defaults; patch those and the widget instance's style reference
   to make per-paste customization work.
3. **Sticky cursor across pastes** — after each paste, click on an empty canvas area BEFORE
   the next paste to avoid Axure's cascade-on-top behavior. Currently consecutive pastes
   land on top of each other if a widget is selected.

---

## Session 4 (2026-05-27 evening) — THE BREAKTHROUGH: Axure natively accepts Axvg JSON

### What we found (and why it changes everything)
The user copied a design from Figma using the "Axure - Copy Selection for RP" plugin and
pasted it directly into Axure with Ctrl+V — the design appeared with **correct positions,
sizes, colors, and text**. We inspected the clipboard and found ONLY ONE format on it:
`Axvg`, a plain UTF-8 JSON string with the header `// axvg\n` followed by a single JSON object.

**No `AxureClipboardDocument11.0.0.0` binary was on the clipboard.** Axure RP 11 parses
`Axvg` JSON natively. Confirmed via roundtrip: we wrote the captured JSON back to the
clipboard under the `Axvg` format name, user pressed Ctrl+V, the design reappeared.

**This means all the binary-format reverse engineering from Sessions 1–3 is not needed
for the generation path.** We can compose any design in JSON and Axure will paint it.

### End-to-end "from zero" verified
We wrote a small TypeScript script that generates an Axvg JSON object from scratch
(no Figma involved) describing 3 widgets:
- A 120×80 blue rounded rectangle (`corners: [8,8,8,8]`, fill `rgba(0.23, 0.51, 0.96, 1)`)
- An 80×80 red circle (`corners: [999,999,999,999]`, fill `rgba(0.94, 0.27, 0.27, 1)`)
- A "Hello from MCP!" text label below them (Inter Regular 18px)

The MCP tool dropped the JSON on the clipboard, focused Axure, sent Ctrl+V. **All 3
widgets appeared at their correct positions, with correct sizes, colors, corner radii,
and text content.** This is genuinely "Figma-MCP-equivalent": natural language →
LLM generates JSON → MCP delivers it → Axure renders.

### Axvg JSON schema (mined from real captures)
```
{
  "masters": {},        // master components keyed by id (not yet explored)
  "imageMap": {},        // image asset references keyed by id
  "scene": { "items": [Frame] }
}

Frame (itemType: 2):
{
  "id": "frame-1",
  "name": "Login Page",
  "itemType": 2,
  "isNameDynamic": false,
  "rect": { "location": {"x":0,"y":0}, "size": {"width":375,"height":812} },
  "resizingConstraints": { hasFixedLeft, hasFixedRight, ... },
  "backgroundFill": { "type":1, "enabled":true, "color": {r,g,b,a} },
  "backgroundShape": Widget,   // the frame's own bg rect
  "scene": { "items": [Widget] }
}

Widget (itemType: 1):
{
  "itemType": 1,
  "id": "rect-1",
  "name": "Rectangle" | "<user text content when isNameDynamic:true>",
  "visible": true, "isLocked": false, "rotation": 0, "opacity": 1,
  "isNameDynamic": false (true for text widgets — name == text content),
  "rect": { "location":{x,y}, "size":{width,height} },
  "resizingConstraints": { ... },
  "type": 0,
  "isMask": false,
  "booleanOperation": 0,
  "flippedHorizontal": false, "flippedVertical": false,
  "corners": [tl, tr, br, bl],   // px radii; [999,999,999,999] = pill/circle
  "border":  [t, r, b, l],
  "strokes": [{ alignment:0, fill:{type:1,enabled:true,color} }],  // empty = no border
  "strokeThickness": number,
  "strokePattern": [],
  "backgroundFills": [{ type:1, enabled:true, color }],  // empty = transparent
  "effects": [],
  "textAlignment": 1,
  "textPadding": [], "textShadows": [], "textRotation": 0,
  "text"?: TextContent  // only present for text widgets
}

Color: { r:0..1, g:0..1, b:0..1, a:0..1 }  (normalized, NOT 0..255)

TextContent:
{
  "paragraphs": [{
    "horizontalAlignment": 0 | 1 | 2,  // left/center/right
    "lineSpacing": 0,
    "inlines": [InlineRun]
  }]
}

InlineRun (one per character — the Figma plugin emits per-char, our code does the same):
{
  "type": 0,
  "text": "x",
  "family": "Inter",
  "typeface": "Inter - Regular" | "Inter - Bold" | "Inter - Medium" | "Inter - Semi Bold",
  "style": 0,
  "weight": 400 | 500 | 700,
  "textColor": Color,
  "size": number,                // font size in px
  "underline": false, "strikethrough": false,
  "superscript": 0, "baselineOffset": 0,
  "highlight": { a:1, r:0, g:0, b:0 },  // observed always black
  "characterSpacing": 0, "transform": 0, "stretch": 5
}
```

### Tool added (10 total now)
`axure_paste_axvg(axvg_json, auto_paste?)` — write Axvg JSON to clipboard under format
`Axvg`. With `auto_paste: true`, also focuses Axure and sends Ctrl+V.

Implementation: `src/parser/axvg.ts` writes the JSON to a temp file, spawns
`research/set-axvg-clipboard.ps1` which loads it and calls
`[System.Windows.Forms.Clipboard]::SetDataObject(data, $true)` with format name "Axvg".
The `$true` second arg → `OleFlushClipboard` so the data survives PowerShell exit.

### Reference sample
`samples/axvg/login_page_email_error.axvg.json` — a real Figma-plugin export of a
375×812 mobile login page with 16+ widgets (close button, logo, Google login button,
divider, error-state email input, continue button, terms text). Use this as the gold
template when writing the LLM-side JSON generator.

### Implications for the project direction
- **All Session 1–3 binary RE was suboptimal.** The Axvg path is dramatically simpler
  and more reliable.
- **The MCP layer is essentially complete** for the "generate from natural language"
  use case. The LLM (Claude in any future session) writes the Axvg JSON, calls
  `axure_paste_axvg(json, auto_paste=true)`, design appears.
- **Future work should focus on**: (a) the LLM-side prompt/skill that helps Claude produce
  well-structured Axvg JSON quickly from natural-language descriptions, possibly via a
  Skill markdown file; (b) high-level TypeScript helpers (`makeRect`, `makeText`, `makeFrame`)
  that the LLM can ALSO call if it wants to avoid writing per-character inline runs by hand.
- **Templates (rectangle_one.bin etc.) are now largely deprecated** — kept for backwards
  compat and the rare case where someone wants pixel-perfect reproduction of a real Axure
  widget's style.
