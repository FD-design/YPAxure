// Axvg = the Figma-side "Axure - Copy Selection for RP" plugin's clipboard format.
//
// Verified empirically (2026-05-27): Axure RP 11 natively accepts Axvg-format JSON via
// Ctrl+V — pasting reproduces the source design with correct positions, sizes, colors,
// and text. The format name on Windows clipboard is literally "Axvg" and the payload is
// a UTF-8 string starting with the comment line `// axvg\n` then a single JSON object.
//
// Schema (mined from a real Figma-plugin capture; not officially documented):
//
// {
//   "masters": {},          // master components keyed by id (not yet explored)
//   "imageMap": {},          // image asset references keyed by id
//   "scene": {
//     "items": [Frame]
//   }
// }
//
// Frame (itemType=2, the page/artboard wrapper):
// {
//   "id": "6-20",                       // stable id (string)
//   "name": "Login page",                // user-visible name
//   "itemType": 2,                       // 2 = frame
//   "resizingConstraints": { ... },      // fixed-left/right/top/bottom/width/height bools
//   "isNameDynamic": false,
//   "rect": {
//     "location": {"x": 399, "y": -999},
//     "size":     {"height": 812, "width": 375}
//   },
//   "backgroundFill": { "type": 1, "enabled": true, "color": {r,g,b,a} },
//   "backgroundShape": Widget,           // the frame's own background rect
//   "scene": { "items": [Widget] }       // child widgets
// }
//
// Widget (itemType=1, every leaf widget — rectangle, text, line, anything):
// {
//   "itemType": 1,
//   "id": "6-22",
//   "name": "Rectangle" | "G" | "Google登录" | ... ,
//   "visible": true,
//   "isLocked": false,
//   "isNameDynamic": false,              // when true the name is just user-text content
//   "rotation": 0,
//   "rect": { "location": {x,y}, "size": {width,height} },
//   "resizingConstraints": { ... },
//   "type": 0,                            // ?
//   "opacity": 1,
//   "rotation": 0,
//   "isMask": false,
//   "booleanOperation": 0,
//   "corners": [tl, tr, br, bl],         // 4 corner radii in px; [999,999,999,999] = pill
//   "border": [t, r, b, l],              // 4 border widths
//   "strokes": [Stroke],                  // empty = no border; one element = single border
//   "strokeThickness": number,            // top-level stroke width (matches border[0])
//   "strokePattern": [],
//   "backgroundFills": [Fill],            // empty = transparent; one element = solid fill
//   "effects": [],
//   "textAlignment": 0 | 1 | 2 | 3,       // ? — observed 1 mostly
//   "textPadding": [],
//   "textShadows": [],
//   "textRotation": 0,
//   "text"?: TextContent                  // only present when widget has text
// }
//
// Color: { "r": 0..1, "g": 0..1, "b": 0..1, "a": 0..1 }  (normalized — not 0..255)
// Fill:  { "type": 1, "enabled": true, "color": Color }   (type 1 = solid)
// Stroke: { "alignment": 0, "fill": Fill }
//
// TextContent:
// {
//   "paragraphs": [{
//     "horizontalAlignment": 0 | 1 | 2,   // 0=left, 1=center, 2=right (observed)
//     "lineSpacing": 0,
//     "inlines": [InlineRun]
//   }]
// }
// InlineRun (one entry per character — yes, the plugin emits per-char runs even when
// they all share the same style; we'll do the same when generating since it works):
// {
//   "type": 0,
//   "text": "免",
//   "family": "Inter",
//   "typeface": "Inter - Regular" | "Inter - Bold" | "Inter - Medium" | "Inter - Semi Bold",
//   "style": 0,
//   "weight": 400 | 500 | 700,            // matches typeface weight
//   "textColor": Color,
//   "size": number,                       // font size in px
//   "underline": false,
//   "strikethrough": false,
//   "superscript": 0,
//   "baselineOffset": 0,
//   "highlight": { "a": 1, "r": 0, "g": 0, "b": 0 },  // observed always black
//   "characterSpacing": 0,
//   "transform": 0,
//   "stretch": 5
// }
//
// One gotcha: text widget's `name` field doubles as the user-facing text (with isNameDynamic:true).
// The actual text content lives in `text.paragraphs[].inlines[].text`.

import { existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runPlatformScript, focusAxureAndPaste, IS_WINDOWS, RESEARCH_DIR } from "./platform.js";

export const AXVG_FORMAT = "Axvg";
/** Path to the platform-appropriate Axvg clipboard helper. Kept exported for diagnostics. */
export const PS_AXVG_SCRIPT = join(RESEARCH_DIR, IS_WINDOWS ? "set-axvg-clipboard.ps1" : "set-axvg-clipboard.sh");

/** Root shape of an Axvg JSON document. */
export interface AxvgRoot {
  masters: Record<string, unknown>;
  imageMap: Record<string, unknown>;
  scene: { items: unknown[] };
}

export interface PasteAxvgResult {
  /** Clipboard format used (always "Axvg"). */
  format: string;
  /** Number of characters in the JSON payload. */
  chars: number;
  /** Path to the .json file that was written (under a temp dir) and read by PowerShell. */
  tempPath: string;
  /** PowerShell helper's raw stdout, for debugging. */
  helperOutput: string;
  /** If autoPaste true: did the Ctrl+V land in Axure? */
  autoPaste?: "ok" | "skipped_no_axure" | "not_requested";
}

export interface PasteAxvgOptions {
  /** If true, after writing the clipboard, focus Axure and send Ctrl+V automatically. */
  autoPaste?: boolean;
}

/**
 * Write an Axvg JSON string to the Windows clipboard under the `Axvg` format name.
 * Axure RP 11 accepts this directly via Ctrl+V — pasting reproduces the design with
 * correct positions/sizes/colors/text.
 *
 * The `axvgJson` argument should be either a JSON string or an object that we can
 * stringify. We don't validate the schema here (Axure will silently ignore unknown
 * keys), but the helper prepends the `// axvg\n` header line that real captures have.
 */
export function pasteAxvg(axvgJson: string | object, opts: PasteAxvgOptions = {}): PasteAxvgResult {
  if (!existsSync(PS_AXVG_SCRIPT)) {
    throw new Error(`Axvg helper script missing: ${PS_AXVG_SCRIPT}`);
  }
  let text: string;
  if (typeof axvgJson === "string") {
    text = axvgJson;
  } else {
    text = JSON.stringify(axvgJson);
  }
  // Prepend the // axvg header if missing (matches the Figma-plugin output convention).
  if (!text.startsWith("// axvg")) {
    text = "// axvg\n" + text;
  }
  // Stage to a temp file so the platform helper can read it as-is without quoting headaches.
  const dir = join(tmpdir(), "axure-mcp-axvg");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const tempPath = join(dir, `payload-${Date.now()}.json`);
  writeFileSync(tempPath, text, "utf8");

  const r = runPlatformScript("set-axvg-clipboard", { Path: tempPath });
  if (r.status !== 0) {
    throw new Error(`Axvg helper exited with code ${r.status}. stderr:\n${r.stderr ?? ""}`);
  }
  const helperOutput = (r.stdout ?? "").trim();

  // Optionally also focus Axure and send Ctrl/Cmd+V
  let autoPaste: PasteAxvgResult["autoPaste"] = "not_requested";
  if (opts.autoPaste) {
    autoPaste = focusAxureAndPaste();
  }

  return {
    format: AXVG_FORMAT,
    chars: text.length,
    tempPath,
    helperOutput,
    autoPaste,
  };
}
