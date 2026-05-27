#!/usr/bin/env node
// MCP server exposing two read-only tools over Axure .rp files.
//
// Tools:
//   - axure_inspect(rp_path)        — overall outline of a .rp file
//   - axure_dump_record(rp_path, record_index) — full schema + strrefs for one record
//
// MCP stdio transport uses stdout for protocol frames, so all logging goes to stderr.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  inspect,
  dumpRecord,
  listTemplates,
  pasteTemplate,
  synthesizeAndPaste,
  pasteSequence,
  pasteLayoutOnCanvas,
  getAxureRect,
  canvasArea,
  captureClipboard,
  pasteAxvg,
  pasteLucideIcon,
  listLucideIcons,
  readAxureSelection,
} from "./parser/index.js";
import { readFileSync, existsSync } from "node:fs";

const server = new McpServer({
  name: "axure-mcp",
  version: "0.1.0",
});

server.registerTool(
  "axure_inspect",
  {
    title: "Inspect an Axure .rp file",
    description:
      "Open an Axure RP (.rp) prototype and return its outline: outer header, Axure version, " +
      "page/master counts, and per-record summary (class name, inflated size, schema string count, " +
      "widget kinds found in Page/Master records, and a heuristic list of user-supplied strings). " +
      "Read-only. Works with RP 11 and RP 9 source files.",
    inputSchema: {
      rp_path: z.string().describe("Absolute path to the .rp file"),
    },
  },
  async ({ rp_path }) => {
    const result = inspect(rp_path);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  "axure_dump_record",
  {
    title: "Dump one record from an Axure .rp file",
    description:
      "Decompress and parse one record from a .rp file. Returns the inner record header, the full " +
      "string table (schema field names + literal user strings), and the chronological sequence of " +
      "string-table references found in the typed-value payload. Use this after axure_inspect to " +
      "dive into a specific Page or Master record. record_index matches the indices in axure_inspect's " +
      "`records` array.",
    inputSchema: {
      rp_path: z.string().describe("Absolute path to the .rp file"),
      record_index: z.number().int().nonnegative().describe("Index of the record (0-based)"),
      strref_limit: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Max number of strref entries to return (default 2000)"),
    },
  },
  async ({ rp_path, record_index, strref_limit }) => {
    const result = dumpRecord(rp_path, record_index, { strrefLimit: strref_limit });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  "axure_list_templates",
  {
    title: "List available Axure paste templates",
    description:
      "List the captured Axure clipboard templates available for pasting. Each template is a real " +
      "byte sequence captured from Axure's own clipboard (the `AxureClipboardDocument11.0.0.0` format), " +
      "previously copied by selecting a widget in Axure RP and pressing Ctrl+C, then dumped to a `.bin` " +
      "file. Returns name, file size, and top-level class name (e.g. `Axure:PasteData`) for each template.",
    inputSchema: {
      dir: z
        .string()
        .optional()
        .describe("Optional absolute path to a templates directory. Defaults to <repo>/samples/clipboard."),
    },
  },
  async ({ dir }) => {
    const templates = listTemplates(dir);
    return {
      content: [{ type: "text", text: JSON.stringify({ templates }, null, 2) }],
    };
  },
);

server.registerTool(
  "axure_paste_template",
  {
    title: "Put an Axure widget template on the system clipboard",
    description:
      "Write a captured Axure clipboard template (`.bin` file) onto the Windows system clipboard under " +
      "the format name `AxureClipboardDocument11.0.0.0`. After this returns, the user can switch to " +
      "Axure RP, click on the canvas, and press Ctrl+V to paste the widget(s). Position is decided by " +
      "Axure (near the cursor / click point); the template's stored size and styling are preserved. " +
      "WARNING: this overwrites whatever was previously on the user's clipboard — confirm with the user " +
      "before calling.",
    inputSchema: {
      template: z
        .string()
        .describe(
          "Either a template name (resolved under <repo>/samples/clipboard/<name>.bin) or an absolute path to a .bin file.",
        ),
      auto_paste: z
        .boolean()
        .optional()
        .describe(
          "If true, after writing the clipboard, also focus the running Axure RP window and send " +
            "Ctrl+V automatically. Default false. Only enable when the user has explicitly asked for " +
            "auto-paste — this modifies the user's document without further confirmation, focuses Axure " +
            "(stealing focus from whatever they were doing), and pastes wherever Axure decides (typically " +
            "the canvas center or the last cursor position). If Axure is not running, falls back to " +
            "clipboard-only with autoPaste = 'skipped_no_axure'.",
        ),
      dir: z.string().optional().describe("Optional templates directory override."),
    },
  },
  async ({ template, auto_paste, dir }) => {
    const result = pasteTemplate(template, { autoPaste: auto_paste, dir });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              ok: true,
              ...result,
              note: "Clipboard now holds Axure widget data. User can press Ctrl+V in Axure RP to paste.",
            },
            null,
            2,
          ),
        },
      ],
    };
  },
);

server.registerTool(
  "axure_paste_at",
  {
    title: "Paste the bundled rectangle template at a screen cursor position",
    description:
      "Move the OS cursor to (cursor_x, cursor_y) on the maximized Axure window, click to set " +
      "the paste anchor, then Ctrl+V the bundled rectangle template. Useful for stamping multiple " +
      "rectangles at distinct positions to scaffold a layout. The rectangle's SIZE is fixed (the " +
      "template's intrinsic size) — width/height parameters are accepted but empirically do not " +
      "affect rendered widget size (Axure derives dimensions from path control points, not the " +
      "metadata Width/Height fields we can patch).",
    inputSchema: {
      cursor_x: z.number().int().describe("Screen X coordinate where paste should anchor"),
      cursor_y: z.number().int().describe("Screen Y coordinate where paste should anchor"),
      width: z
        .number()
        .positive()
        .optional()
        .describe("EXPERIMENTAL — patched into widget bytes but likely doesn't resize visible widget"),
    },
  },
  async ({ cursor_x, cursor_y, width }) => {
    const result = synthesizeAndPaste({
      width,
      cursorX: cursor_x,
      cursorY: cursor_y,
      autoPaste: true,
    });
    return {
      content: [{ type: "text", text: JSON.stringify({ ok: true, ...result }, null, 2) }],
    };
  },
);

server.registerTool(
  "axure_paste_login_page_scaffold",
  {
    title: "Stamp 7 rectangles in a rough login-page column layout",
    description:
      "Auto-paste 7 instances of the rectangle template into Axure, scaffolding a vertical " +
      "login-page column (outer container, logo, title, Google button, divider, email input, " +
      "continue button). Uses Win32 GetWindowRect to find Axure's actual position on screen, so " +
      "it works regardless of screen resolution or which monitor Axure is on. All 7 widgets come " +
      "out the same size as the captured template (~50×50) — Axure derives widget dimensions from " +
      "path control points which we can't yet resize per-widget. User drags widgets to exact size " +
      "and types text into each rectangle in Axure.",
    inputSchema: {
      delay_ms: z.number().int().positive().optional().describe("Delay between stamps (default 600ms)"),
    },
  },
  async ({ delay_ms }) => {
    // Canvas-relative offsets from canvas center, forming a vertical login-page column.
    // Vertical spacing 80px between rows is enough for default 50×50 widgets without overlap;
    // user can then resize and re-arrange each widget freely.
    const widgets = [
      { dx: 0, dy: -240 }, // outer phone container (visual frame, dragged larger by user)
      { dx: 0, dy: -160 }, // logo
      { dx: 0, dy: -80 },  // title
      { dx: 0, dy: 0 },    // Google login button
      { dx: 0, dy: 80 },   // divider
      { dx: 0, dy: 160 },  // email input
      { dx: 0, dy: 240 },  // continue button
    ];
    const result = await pasteLayoutOnCanvas(widgets, { delayMs: delay_ms ?? 600 });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              ok: result.axureRect !== null,
              stamped: result.pastes.length,
              axureRect: result.axureRect,
              canvasCenter: result.canvas ? { x: result.canvas.centerX, y: result.canvas.centerY } : null,
              note:
                "Each rectangle landed at a canvas-relative position around the visible canvas " +
                "center. Drag and resize manually to finish the layout — all widgets are default " +
                "size (~50×50) until per-widget resize is supported.",
              results: result.pastes.map((r) => ({
                screen: { x: r.screenX, y: r.screenY },
                canvasOffset: { dx: r.dx, dy: r.dy },
                autoPaste: r.autoPaste,
              })),
            },
            null,
            2,
          ),
        },
      ],
    };
  },
);

server.registerTool(
  "axure_get_window_rect",
  {
    title: "Get the Axure RP window's current screen rect",
    description:
      "Query the running Axure RP window's screen rectangle via Win32 GetWindowRect. Also " +
      "computes the inferred canvas drawing area (excluding the left page-tree sidebar, top " +
      "toolbars, right inspect panel, and status strip). Maximizes and focuses Axure as a side " +
      "effect (same Win32 incantation used before pasting). Returns null window if Axure is not " +
      "running. Useful for callers that want to compute canvas-relative cursor positions for " +
      "subsequent pastes.",
    inputSchema: {},
  },
  async () => {
    const rect = getAxureRect();
    if (!rect) {
      return {
        content: [{ type: "text", text: JSON.stringify({ ok: false, reason: "axure_not_running" }, null, 2) }],
      };
    }
    const area = canvasArea(rect);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              ok: true,
              windowRect: rect,
              canvasArea: area,
            },
            null,
            2,
          ),
        },
      ],
    };
  },
);

server.registerTool(
  "axure_capture_clipboard",
  {
    title: "Save the current Axure clipboard contents as a reusable template",
    description:
      "Read the AxureClipboardDocument11.0.0.0 bytes currently on the Windows clipboard and save " +
      "them as a .bin template under the templates directory. Use this AFTER the user (or a prior " +
      "tool) has performed Ctrl+C in Axure to copy one or more widgets — the saved bytes can then " +
      "be pasted back via `axure_paste_template`. Lets you build up a library of widget variants " +
      "(buttons, text fields, headings, multi-widget compositions) without us needing to decode " +
      "Axure's serialization format. Fails if the clipboard does not contain the Axure format.",
    inputSchema: {
      name: z
        .string()
        .describe(
          "Filename (with or without .bin) to save under the templates directory. Should be a short, descriptive name like 'blue_button' or 'login_form'.",
        ),
      dir: z.string().optional().describe("Optional override for the templates directory."),
    },
  },
  async ({ name, dir }) => {
    const result = captureClipboard(name, { dir });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              ok: true,
              ...result,
              note: "Template saved. Call axure_list_templates to verify, or axure_paste_template to use it.",
            },
            null,
            2,
          ),
        },
      ],
    };
  },
);

server.registerTool(
  "axure_paste_layout",
  {
    title: "Paste multiple rectangle templates at canvas-relative positions",
    description:
      "Auto-paste a list of rectangle templates at canvas-relative offsets from the visible canvas " +
      "center. Robust across screen resolutions — uses Win32 GetWindowRect to find Axure's actual " +
      "position. Each widget is described by an offset (dx, dy) from canvas center in pixels. All " +
      "widgets come out at the captured template's default size; the user resizes and types text " +
      "after the layout is stamped. Returns the absolute screen coordinates used so callers can " +
      "verify positioning.",
    inputSchema: {
      widgets: z
        .array(
          z.object({
            dx: z.number().int().describe("Horizontal offset from canvas center in pixels (right is +)"),
            dy: z.number().int().describe("Vertical offset from canvas center in pixels (down is +)"),
            template: z
              .string()
              .optional()
              .describe("Optional template name or path; defaults to the bundled rectangle."),
          }),
        )
        .min(1)
        .describe("List of widgets to paste, in order. Each gets one Ctrl+V at the resolved screen coord."),
      delay_ms: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Delay between stamps in milliseconds (default 500)."),
    },
  },
  async ({ widgets, delay_ms }) => {
    const result = await pasteLayoutOnCanvas(widgets, { delayMs: delay_ms ?? 500 });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              ok: result.axureRect !== null,
              stamped: result.pastes.length,
              axureRect: result.axureRect,
              canvasArea: result.canvas,
              pastes: result.pastes.map((p) => ({
                offset: { dx: p.dx, dy: p.dy },
                screen: { x: p.screenX, y: p.screenY },
                autoPaste: p.autoPaste,
              })),
            },
            null,
            2,
          ),
        },
      ],
    };
  },
);

server.registerTool(
  "axure_paste_axvg",
  {
    title: "Paste an Axvg JSON design into Axure",
    description:
      "Write an Axvg-format JSON design spec to the Windows clipboard under the literal format " +
      "name 'Axvg', then optionally focus Axure RP and send Ctrl+V automatically. " +
      "Axure RP 11 natively accepts Axvg JSON on paste (verified empirically — same format the " +
      "Figma 'Axure - Copy Selection for RP' plugin emits), so this gives a Figma-MCP-equivalent " +
      "experience: describe a design in natural language, the LLM generates the JSON, this tool " +
      "drops it on the clipboard, Axure paints it. " +
      "Axvg JSON shape: " +
      "`{ masters: {}, imageMap: {}, scene: { items: [Frame] } }`. " +
      "A Frame has `itemType: 2`, `rect: {location: {x,y}, size: {width,height}}`, " +
      "`backgroundFill: {type:1, enabled:true, color:{r,g,b,a}}` (RGBA all 0..1), " +
      "`backgroundShape: Widget`, and `scene: {items: [Widget]}`. " +
      "A Widget has `itemType: 1`, `rect`, `corners: [tl,tr,br,bl]` (px radii — use 999 for pill), " +
      "`border: [t,r,b,l]`, `strokes: [{alignment:0, fill:{type:1,enabled:true,color}}]` (empty for no border), " +
      "`backgroundFills: [{type:1,enabled:true,color}]` (empty for transparent), and optional " +
      "`text: {paragraphs: [{horizontalAlignment: 0|1|2, lineSpacing:0, inlines: [InlineRun]}]}`. " +
      "An InlineRun is `{type:0, text:'x', family:'Inter', typeface:'Inter - Regular'|'Inter - Bold'|'Inter - Medium'|'Inter - Semi Bold', weight:400|500|700, textColor, size, underline:false, strikethrough:false, superscript:0, baselineOffset:0, highlight:{a:1,r:0,g:0,b:0}, characterSpacing:0, transform:0, stretch:5}`. " +
      "All other text-related fields can be defaulted (`textAlignment:1, textPadding:[], textShadows:[], textRotation:0, isMask:false, opacity:1, rotation:0, isLocked:false, visible:true, booleanOperation:0, isNameDynamic: true when widget IS text else false, type:0, resizingConstraints:{hasFixedLeft:true,hasFixedRight:false,hasFixedTop:true,hasFixedBottom:false,hasFixedWidth:true,hasFixedHeight:true}, strokePattern:[], effects:[], flippedHorizontal:false, flippedVertical:false`). " +
      "See `samples/axvg/login_page_email_error.axvg.json` for a complete real example.",
    inputSchema: {
      axvg_json: z
        .string()
        .describe(
          "The Axvg JSON as a string. Can start with `// axvg` header or not (tool adds it if missing). Should be valid JSON describing `{ masters, imageMap, scene: { items: [...] } }`.",
        ),
      auto_paste: z
        .boolean()
        .optional()
        .describe(
          "If true, after putting the JSON on the clipboard, also focus Axure RP and send Ctrl+V to drop the design on the active canvas. Default false — caller should confirm with user before auto-pasting.",
        ),
    },
  },
  async ({ axvg_json, auto_paste }) => {
    const result = pasteAxvg(axvg_json, { autoPaste: auto_paste });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              ok: true,
              ...result,
              note: auto_paste
                ? "Axvg JSON written to clipboard and Ctrl+V sent to Axure. The design should now be on Axure's canvas."
                : "Axvg JSON written to clipboard. Tell the user to switch to Axure and press Ctrl+V — the design will appear with correct positions/sizes/colors/text.",
            },
            null,
            2,
          ),
        },
      ],
    };
  },
);

server.registerTool(
  "axure_paste_lucide_icon",
  {
    title: "Paste a real Lucide UI icon into Axure",
    description:
      "Render a Lucide icon (https://lucide.dev — 1960+ functional UI icons like search, settings, " +
      "user, heart, play, mail, calendar, bell, etc.) as a PNG bitmap and paste it into Axure. " +
      "Internally: looks up the icon's SVG source from the bundled `lucide-static` npm package, " +
      "patches color/size/strokeWidth into the SVG attributes, renders to PNG via @resvg/resvg-js " +
      "at 4× super-sampling for crispness, then puts the bitmap on the Windows clipboard. With " +
      "`auto_paste: true`, focuses Axure and sends Ctrl+V to drop it on the canvas. " +
      "Use this when an Axvg-generated page has an icon slot — instead of trying to compose an icon " +
      "from rectangles/circles by hand, paste a real Lucide icon. The user will then have a high-" +
      "quality bitmap icon they can position and style in Axure.",
    inputSchema: {
      name: z
        .string()
        .describe(
          "Lucide icon name (kebab-case, e.g. 'search', 'arrow-right', 'eye-off', 'settings-2'). " +
          "Use the same slug as on https://lucide.dev/icons/. Call axure_list_lucide_icons to get the full list.",
        ),
      size: z.number().int().positive().optional().describe("Render size in px (square). Default 48."),
      color: z.string().optional().describe("CSS hex color for the icon stroke. Default '#1F2937' (gray-800)."),
      stroke_width: z.number().positive().optional().describe("SVG stroke width. Lucide default is 2."),
      auto_paste: z.boolean().optional().describe("If true, focus Axure + send Ctrl+V automatically."),
    },
  },
  async ({ name, size, color, stroke_width, auto_paste }) => {
    const result = await pasteLucideIcon(name, {
      size,
      color,
      strokeWidth: stroke_width,
      mode: "image",
      autoPaste: auto_paste,
    });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              ok: true,
              ...result,
              note: auto_paste
                ? "Icon rendered to PNG and pasted into Axure. The user should see the icon on canvas (resizable, draggable as a bitmap image widget)."
                : "Icon rendered and copied to clipboard. Tell the user to switch to Axure and Ctrl+V.",
            },
            null,
            2,
          ),
        },
      ],
    };
  },
);

server.registerTool(
  "axure_list_lucide_icons",
  {
    title: "List all available Lucide icon names",
    description:
      "Returns every Lucide icon slug available via `axure_paste_lucide_icon`. There are ~1960 icons. " +
      "Use this to discover what icons exist or to fuzzy-match a user's request (e.g. 'shopping bag' → 'shopping-bag').",
    inputSchema: {
      filter: z
        .string()
        .optional()
        .describe("Optional substring filter — only return slugs containing this string (case-insensitive)."),
      limit: z.number().int().positive().optional().describe("Max results. Default 200."),
    },
  },
  async ({ filter, limit }) => {
    let icons = listLucideIcons();
    if (filter) {
      const f = filter.toLowerCase();
      icons = icons.filter((n) => n.toLowerCase().includes(f));
    }
    const max = limit ?? 200;
    const total = icons.length;
    const truncated = icons.length > max;
    icons = icons.slice(0, max);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { total, returned: icons.length, truncated, icons },
            null,
            2,
          ),
        },
      ],
    };
  },
);

server.registerTool(
  "axure_read_selection",
  {
    title: "Read what the user has selected/copied in Axure",
    description:
      "Read the user's CURRENT Axure selection by inspecting the system clipboard. The user " +
      "must have already done Ctrl+C inside Axure RP (selecting widgets and copying) before calling " +
      "this tool — this tool does not trigger the copy itself, it only reads what's there. " +
      "Two signals come back: (1) a list of every text content in the selection, parsed from Axure's " +
      "'Csv' clipboard format (a UTF-8 newline-separated dump in document order); (2) an inline PNG " +
      "screenshot of the selection (bitmap that Axure renders alongside the binary). Together these " +
      "let you read what the user has on canvas — text changes via the text list, color/position/" +
      "state changes via the image. Useful for: round-tripping user modifications back to your JSON " +
      "source, diffing what changed since the last paste, syncing modifications between Axure and " +
      "external artifacts like HTML mockups. Note: does NOT decode the proprietary " +
      "AxureClipboardDocument11.0.0.0 binary (that's separate, incomplete work).",
    inputSchema: {
      out_dir: z
        .string()
        .optional()
        .describe(
          "Optional directory to save selection.csv and selection.png. Defaults to a fresh temp dir.",
        ),
    },
  },
  async ({ out_dir }) => {
    const result = readAxureSelection({ outDir: out_dir });

    const summary = {
      ok: true,
      texts: result.texts,
      textCount: result.texts.length,
      pngPath: result.pngPath,
      width: result.width,
      height: result.height,
      pngBytes: result.pngBytes,
      availableFormats: result.availableFormats,
      note:
        "The PNG screenshot is also embedded inline below — view it to read colors, positions, " +
        "and component states (checked/unchecked, visible/hidden) that the text list can't convey.",
    };

    const content: Array<
      | { type: "text"; text: string }
      | { type: "image"; data: string; mimeType: string }
    > = [{ type: "text", text: JSON.stringify(summary, null, 2) }];

    // Embed the PNG inline so the LLM can vision-read it directly.
    if (result.pngPath && existsSync(result.pngPath)) {
      try {
        const png = readFileSync(result.pngPath);
        content.push({
          type: "image",
          data: png.toString("base64"),
          mimeType: "image/png",
        });
      } catch (e) {
        // non-fatal: still return text summary
      }
    }

    return { content };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`axure-mcp ready on stdio`);
