// Widget synthesis: take a captured clipboard template and patch known fields (Width / Height /
// font size / color) before writing to the clipboard.
//
// Strategy: rather than hard-code byte offsets, we parse the template's string table to find
// the index of each field name (e.g. "Width") and then scan the payload for the pattern
// `08 00 00 00 [idx] 06 00 00 00 [8 bytes f64]`. The f64 right after that is the patchable value.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseRecord } from "./record.js";
import { pasteTemplate, DEFAULT_TEMPLATE_DIR, getAxureRect, type PasteResult, type AxureRect } from "./clipboard.js";
import { canvasArea, canvasToScreen, type CanvasOffset } from "./layout.js";

function repoRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
}

export interface PatchSite {
  field: string;
  /** offset in record bytes where the f64 starts (right after the tag) */
  offset: number;
  /** the f64 value currently stored there */
  currentValue: number;
}

/**
 * Find every `(strref FieldName)(tag 06)(f64)` pattern in a record's payload.
 * Returns the byte offset of the f64 and its current value.
 *
 * Note: a field name may appear at MULTIPLE offsets (style cache defaults + widget instance(s)).
 * Callers must pick the right one by context — typically the LAST occurrence is the actual
 * widget value, since style defaults appear first.
 */
export function findF64Sites(recordBytes: Buffer, fieldName: string): PatchSite[] {
  const parsed = parseRecord(recordBytes);
  const fieldIdx = parsed.strings.indexOf(fieldName);
  if (fieldIdx < 0) return [];
  const sites: PatchSite[] = [];
  const buf = recordBytes;
  // Pattern: 08 00 00 00 [fieldIdx u32] 06 00 00 00 [f64 8 bytes]  — 20 bytes total
  for (let i = parsed.payloadStart; i + 20 <= buf.length; i++) {
    if (buf[i] !== 0x08 || buf[i + 1] !== 0 || buf[i + 2] !== 0 || buf[i + 3] !== 0) continue;
    if (buf.readUInt32LE(i + 4) !== fieldIdx) continue;
    if (buf[i + 8] !== 0x06 || buf[i + 9] !== 0 || buf[i + 10] !== 0 || buf[i + 11] !== 0) continue;
    const value = buf.readDoubleLE(i + 12);
    if (Number.isNaN(value)) continue;
    sites.push({ field: fieldName, offset: i + 12, currentValue: value });
  }
  return sites;
}

/**
 * Pick the patch site most likely to be the widget instance's value (not a schema default
 * and not a canvas-viewport value). Heuristic: prefer non-zero values that aren't canvas-like
 * (e.g., 1174 is the page viewport width). Currently empirical observation: the FIRST non-zero
 * value is typically the widget's own dimension; later ones are canvas-related.
 *
 * NOTE: Width/Height patching observed to NOT visibly affect Axure's rendered widget size —
 * Axure appears to derive rendered dimensions from path control points, not this metadata
 * field. Patching is still useful for documentation but won't resize the widget on paste.
 */
export function pickWidgetSite(sites: PatchSite[]): PatchSite | null {
  if (sites.length === 0) return null;
  // Filter out clearly canvas-like values (large round numbers commonly seen in viewport)
  const candidates = sites.filter(
    (s) => Math.abs(s.currentValue) > 1e-12 && s.currentValue < 1000 && s.currentValue > 0,
  );
  if (candidates.length > 0) return candidates[0]!;
  const nonZero = sites.filter((s) => Math.abs(s.currentValue) > 1e-12);
  if (nonZero.length > 0) return nonZero[0]!;
  return sites[0]!;
}

export interface SynthesizeParams {
  /** Path to the .bin template. Defaults to bundled `rectangle_one`. */
  template?: string;
  width?: number;
  height?: number;
  /** Screen X to place cursor before paste (for positioning, used with autoPaste). */
  cursorX?: number;
  /** Screen Y to place cursor before paste. */
  cursorY?: number;
}

export const BUNDLED_RECTANGLE = join(repoRoot(), "samples", "clipboard", "rectangle_one.bin");

export function synthesizeWidget(params: SynthesizeParams): {
  bytes: Buffer;
  patched: Array<{ field: string; from: number; to: number; offset: number }>;
} {
  const tplPath = params.template ?? BUNDLED_RECTANGLE;
  const bytes = Buffer.from(readFileSync(tplPath));
  const patched: Array<{ field: string; from: number; to: number; offset: number }> = [];

  if (params.width !== undefined) {
    const sites = findF64Sites(bytes, "Width");
    const site = pickWidgetSite(sites);
    if (site) {
      const from = site.currentValue;
      bytes.writeDoubleLE(params.width, site.offset);
      patched.push({ field: "Width", from, to: params.width, offset: site.offset });
    }
  }
  if (params.height !== undefined) {
    const sites = findF64Sites(bytes, "Height");
    const site = pickWidgetSite(sites);
    if (site) {
      const from = site.currentValue;
      bytes.writeDoubleLE(params.height, site.offset);
      patched.push({ field: "Height", from, to: params.height, offset: site.offset });
    }
  }
  return { bytes, patched };
}

export interface SynthPasteResult extends PasteResult {
  patched: Array<{ field: string; from: number; to: number; offset: number }>;
}

/**
 * Synthesize a widget with the given dimensions, write to clipboard, optionally auto-paste.
 */
export function synthesizeAndPaste(
  params: SynthesizeParams & { autoPaste?: boolean },
): SynthPasteResult {
  const { bytes, patched } = synthesizeWidget(params);
  // Persist the synthesized bytes to a temp .bin and let pasteTemplate handle the clipboard write
  const tmpPath = join(repoRoot(), "research", "_synth.bin");
  writeFileSync(tmpPath, bytes);
  const result = pasteTemplate(tmpPath, {
    autoPaste: params.autoPaste,
    cursorX: params.cursorX,
    cursorY: params.cursorY,
  });
  return { ...result, patched };
}

/**
 * Compose a multi-widget paste sequence. For now, just stamps multiple widgets one at a time
 * with delays between them (since we can't yet combine multiple widgets into one paste-data byte[]).
 *
 * Returns the list of individual paste results.
 */
export async function pasteSequence(
  widgets: SynthesizeParams[],
  opts: { autoPaste?: boolean; delayMs?: number } = {},
): Promise<SynthPasteResult[]> {
  const delay = opts.delayMs ?? 400;
  const results: SynthPasteResult[] = [];
  for (let i = 0; i < widgets.length; i++) {
    const w = widgets[i]!;
    const r = synthesizeAndPaste({
      ...w,
      autoPaste: opts.autoPaste,
      cursorX: w.cursorX,
      cursorY: w.cursorY,
    });
    results.push(r);
    if (i < widgets.length - 1) await new Promise((resolve) => setTimeout(resolve, delay));
  }
  return results;
}

/**
 * Paste widgets at canvas-relative offsets. Detects Axure's current window position via
 * GetWindowRect, then translates each widget's (dx, dy) offset from canvas-center into
 * absolute screen cursor coordinates. Robust across screen resolutions and Axure window
 * positions.
 *
 * Returns the resolved screen coordinates used + each paste result.
 */
export async function pasteLayoutOnCanvas(
  widgets: Array<SynthesizeParams & CanvasOffset>,
  opts: { delayMs?: number } = {},
): Promise<{
  axureRect: AxureRect | null;
  canvas: { left: number; top: number; right: number; bottom: number; centerX: number; centerY: number } | null;
  pastes: Array<SynthPasteResult & { screenX: number; screenY: number; dx: number; dy: number }>;
}> {
  const rect = getAxureRect();
  if (!rect) {
    return { axureRect: null, canvas: null, pastes: [] };
  }
  const area = canvasArea(rect);
  const delay = opts.delayMs ?? 500;
  const pastes: Array<SynthPasteResult & { screenX: number; screenY: number; dx: number; dy: number }> = [];
  for (let i = 0; i < widgets.length; i++) {
    const w = widgets[i]!;
    const { x, y } = canvasToScreen(area, { dx: w.dx, dy: w.dy });
    const r = synthesizeAndPaste({
      template: w.template,
      width: w.width,
      height: w.height,
      cursorX: x,
      cursorY: y,
      autoPaste: true,
    });
    pastes.push({ ...r, screenX: x, screenY: y, dx: w.dx, dy: w.dy });
    if (i < widgets.length - 1) await new Promise((resolve) => setTimeout(resolve, delay));
  }
  return {
    axureRect: rect,
    canvas: {
      left: area.left,
      top: area.top,
      right: area.right,
      bottom: area.bottom,
      centerX: area.centerX,
      centerY: area.centerY,
    },
    pastes,
  };
}
