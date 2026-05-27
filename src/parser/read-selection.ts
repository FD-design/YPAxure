// Read the user's CURRENT Axure selection (after they've Ctrl+C'd inside Axure RP)
// by inspecting the system clipboard. Returns:
//   - texts: every text content in the selection, in document order (from "Csv" format)
//   - pngPath: a rendered preview screenshot of the selection
//   - width/height: bitmap dimensions
//
// This gives the LLM a read path back from Axure to JSON-friendly state, complementing
// the write path (pasteAxvg). The user's workflow:
//   1. Modify the prototype in Axure.
//   2. Ctrl+A + Ctrl+C (or select specific widgets + Ctrl+C).
//   3. Call axure_read_selection — the tool dumps text + screenshot.
//   4. LLM uses both signals to diff against the previously generated design.
//
// Cross-platform: Windows uses System.Windows.Forms.Clipboard, Mac uses NSPasteboard.

import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runPlatformScript } from "./platform.js";

export interface ReadSelectionResult {
  /** Text contents in document order, parsed from the platform's text-dump format. */
  texts: string[];
  /** The raw concatenated text dump (newline-separated). */
  rawText: string;
  /** Absolute path to the saved selection PNG. */
  pngPath: string;
  /** PNG size in bytes. */
  pngBytes: number;
  /** Bitmap dimensions. */
  width: number;
  height: number;
  /** Comma-separated list of pasteboard format names observed (for debugging). */
  availableFormats: string;
  /** The platform helper's raw stdout. */
  helperOutput: string;
}

export interface ReadSelectionOptions {
  /** Override the directory where selection.csv and selection.png are saved. */
  outDir?: string;
}

/**
 * Read the user's current Axure selection from the clipboard.
 * Caller must have Ctrl+C'd inside Axure first — this function does not trigger the copy itself.
 */
export function readAxureSelection(opts: ReadSelectionOptions = {}): ReadSelectionResult {
  const outDir = opts.outDir ?? join(tmpdir(), "axure-mcp-read", String(Date.now()));
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  const r = runPlatformScript("dump-axure-selection", { OutDir: outDir });
  if (r.status !== 0) {
    throw new Error(
      `dump-axure-selection helper failed (exit ${r.status}). stdout:\n${r.stdout ?? ""}\nstderr:\n${r.stderr ?? ""}`,
    );
  }
  const helperOutput = (r.stdout ?? "").trim();

  const formatsMatch = helperOutput.match(/^FORMATS=(.+)$/m);
  const availableFormats = formatsMatch ? formatsMatch[1]!.trim() : "";

  const csvMatch = helperOutput.match(/^CSV=(.+?) bytes=/m);
  const csvPath = csvMatch ? csvMatch[1]!.trim() : "";

  const pngMatch = helperOutput.match(/^PNG=(.+?) size=(\d+)x(\d+)/m);
  const pngPath = pngMatch ? pngMatch[1]!.trim() : "";
  const width = pngMatch ? parseInt(pngMatch[2]!, 10) : 0;
  const height = pngMatch ? parseInt(pngMatch[3]!, 10) : 0;

  let rawText = "";
  if (csvPath && existsSync(csvPath)) {
    rawText = readFileSync(csvPath, "utf8");
  }
  const texts = rawText
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  let pngBytes = 0;
  if (pngPath && existsSync(pngPath)) {
    pngBytes = statSync(pngPath).size;
  }

  return {
    texts,
    rawText,
    pngPath,
    pngBytes,
    width,
    height,
    availableFormats,
    helperOutput,
  };
}
