// Clipboard write path. Two flavors:
//   - Axvg JSON (Windows + macOS) — see axvg.ts. This is the primary flow.
//   - AxureClipboardDocument byte[] (Windows only) — legacy binary template flow below.
//
// On Windows the helpers are PowerShell scripts; on macOS the equivalents are bash + Swift
// + AppleScript (see research/*.sh).
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseRecord } from "./record.js";
import { readFile } from "./io.js";
import { runPlatformScript, IS_WINDOWS, RESEARCH_DIR, repoRoot } from "./platform.js";

export const DEFAULT_TEMPLATE_DIR = join(repoRoot(), "samples", "clipboard");
export const PS_SCRIPT = join(RESEARCH_DIR, "set-clipboard.ps1");
export const PS_RECT_SCRIPT = join(RESEARCH_DIR, IS_WINDOWS ? "get-axure-rect.ps1" : "get-axure-rect.sh");
export const PS_GET_SCRIPT = join(RESEARCH_DIR, "get-clipboard.ps1");
export const CLIPBOARD_FORMAT = "AxureClipboardDocument11.0.0.0";

export interface CaptureResult {
  /** Absolute path to the saved .bin file. */
  outputPath: string;
  /** Bytes saved. */
  bytes: number;
  /** First string in the parsed record (typically a class name like "Axure:PasteData"). */
  className?: string;
  /** Number of strings in the parsed record's string table. */
  stringCount?: number;
}

/**
 * Read the current Windows clipboard's AxureClipboardDocument bytes and save them as a template
 * .bin file. Use this to capture a template after a user has copied (Ctrl+C) one or more widgets
 * from Axure RP — the saved file can later be pasted via `pasteTemplate(...)`.
 */
export function captureClipboard(name: string, opts?: { dir?: string }): CaptureResult {
  if (!IS_WINDOWS) {
    throw new Error(
      "captureClipboard (binary template capture) is Windows-only. The Axvg JSON flow " +
      "(pasteAxvg) is cross-platform — use that instead of binary templates on macOS.",
    );
  }
  if (!existsSync(PS_GET_SCRIPT)) throw new Error(`clipboard get helper missing: ${PS_GET_SCRIPT}`);
  const dir = opts?.dir ?? DEFAULT_TEMPLATE_DIR;
  const outName = name.endsWith(".bin") ? name : name + ".bin";
  const outPath = resolve(join(dir, outName));
  const r = spawnSync(
    "powershell",
    ["-ExecutionPolicy", "Bypass", "-NoProfile", "-File", PS_GET_SCRIPT, "-Out", outPath],
    { encoding: "utf8" },
  );
  if (r.status !== 0) {
    throw new Error(`capture failed (exit ${r.status}): stdout=${r.stdout}\nstderr=${r.stderr}`);
  }
  const out = (r.stdout ?? "").trim();
  if (!out.startsWith("OK")) {
    throw new Error(`capture failed: ${out}`);
  }
  const bytesMatch = out.match(/bytes=(\d+)/);
  const bytes = bytesMatch ? parseInt(bytesMatch[1]!, 10) : 0;
  // Try to parse the captured bytes to enrich the result
  let className: string | undefined;
  let stringCount: number | undefined;
  try {
    const buf = readFile(outPath);
    const parsed = parseRecord(buf);
    className = parsed.strings[0];
    stringCount = parsed.strings.length;
  } catch {
    /* not a parseable record */
  }
  return { outputPath: outPath, bytes, className, stringCount };
}

/** Query Axure's main window rect on the screen. Focuses Axure as a side effect (the same
 * incantation we use before pasting — on Windows that's a maximize, on Mac just an activate).
 * Returns null if Axure is not running or the helper script is missing. */
export function getAxureRect(): AxureRect | null {
  if (!existsSync(PS_RECT_SCRIPT)) return null;
  const r = runPlatformScript("get-axure-rect");
  if (r.status !== 0) return null;
  const out = (r.stdout ?? "").trim();
  const m = out.match(/RECT L=(-?\d+) T=(-?\d+) R=(-?\d+) B=(-?\d+)/);
  if (!m) return null;
  const left = parseInt(m[1]!, 10);
  const top = parseInt(m[2]!, 10);
  const right = parseInt(m[3]!, 10);
  const bottom = parseInt(m[4]!, 10);
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

export interface TemplateInfo {
  name: string;
  path: string;
  sizeBytes: number;
  className?: string;
}

export function listTemplates(dir: string = DEFAULT_TEMPLATE_DIR): TemplateInfo[] {
  if (!existsSync(dir)) return [];
  const entries: TemplateInfo[] = [];
  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".bin")) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (!st.isFile()) continue;
    const info: TemplateInfo = {
      name: name.replace(/\.bin$/, ""),
      path: full,
      sizeBytes: st.size,
    };
    try {
      const buf = readFile(full);
      const parsed = parseRecord(buf);
      if (parsed.strings.length > 0) info.className = parsed.strings[0];
    } catch {
      // not a valid record; leave className undefined
    }
    entries.push(info);
  }
  return entries;
}

export interface AxureRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface PasteResult {
  source: string;
  format: string;
  bytes: number;
  className?: string;
  /** stdout line printed by the PowerShell helper, for debugging */
  helperOutput: string;
  /** if autoPaste was requested: what actually happened */
  autoPaste?: "ok" | "skipped_no_axure" | "not_requested";
  /** Axure window screen rect at the moment of paste (only populated when autoPaste=true and
   * Axure was found). Useful for callers that want to compute cursor positions for subsequent
   * pastes without re-querying. */
  axureRect?: AxureRect;
}

export interface PasteOptions {
  /** If true, after writing to clipboard, focus Axure and SendKeys Ctrl+V automatically. */
  autoPaste?: boolean;
  /** Override the default templates directory. */
  dir?: string;
  /** If set (and autoPaste true), move the OS cursor to this absolute screen position and
   * click before pasting, so the paste lands near that point on Axure's canvas. */
  cursorX?: number;
  cursorY?: number;
}

export function pasteTemplate(templatePathOrName: string, opts: PasteOptions = {}): PasteResult {
  if (!IS_WINDOWS) {
    throw new Error(
      "pasteTemplate (binary AxureClipboardDocument templates) is Windows-only. " +
      "Use pasteAxvg (Axvg JSON) instead — it works on both platforms and is the recommended path.",
    );
  }
  const dir = opts.dir ?? DEFAULT_TEMPLATE_DIR;
  let absPath = templatePathOrName;
  if (!existsSync(absPath)) {
    // Try resolving as a name under the templates directory
    const candidate = join(dir, templatePathOrName.endsWith(".bin") ? templatePathOrName : templatePathOrName + ".bin");
    if (existsSync(candidate)) absPath = candidate;
    else throw new Error(`template not found: ${templatePathOrName} (looked in ${candidate})`);
  }
  absPath = resolve(absPath);

  let className: string | undefined;
  try {
    const buf = readFile(absPath);
    className = parseRecord(buf).strings[0];
  } catch {
    /* not fatal */
  }

  if (!existsSync(PS_SCRIPT)) {
    throw new Error(`clipboard helper script missing: ${PS_SCRIPT}`);
  }

  const psArgs = [
    "-ExecutionPolicy",
    "Bypass",
    "-NoProfile",
    "-File",
    PS_SCRIPT,
    "-Path",
    absPath,
    "-Format",
    CLIPBOARD_FORMAT,
  ];
  if (opts.autoPaste) psArgs.push("-AutoPaste");
  if (opts.cursorX !== undefined && opts.cursorY !== undefined) {
    psArgs.push("-CursorX", String(opts.cursorX), "-CursorY", String(opts.cursorY));
  }

  const r = spawnSync("powershell", psArgs, { encoding: "utf8" });

  if (r.status !== 0) {
    throw new Error(`PowerShell exited with code ${r.status}. stderr:\n${r.stderr ?? ""}`);
  }

  const helperOutput = (r.stdout ?? "").trim();
  const bytesMatch = helperOutput.match(/bytes=(\d+)/);
  const bytes = bytesMatch ? parseInt(bytesMatch[1]!, 10) : 0;

  let autoPaste: PasteResult["autoPaste"] = "not_requested";
  if (opts.autoPaste) {
    if (helperOutput.includes("AUTOPASTE_OK")) autoPaste = "ok";
    else if (helperOutput.includes("AUTOPASTE_SKIP")) autoPaste = "skipped_no_axure";
  }

  let axureRect: AxureRect | undefined;
  const rectMatch = helperOutput.match(/AXURE_RECT L=(-?\d+) T=(-?\d+) R=(-?\d+) B=(-?\d+)/);
  if (rectMatch) {
    const left = parseInt(rectMatch[1]!, 10);
    const top = parseInt(rectMatch[2]!, 10);
    const right = parseInt(rectMatch[3]!, 10);
    const bottom = parseInt(rectMatch[4]!, 10);
    axureRect = { left, top, right, bottom, width: right - left, height: bottom - top };
  }

  return {
    source: absPath,
    format: CLIPBOARD_FORMAT,
    bytes,
    className,
    helperOutput,
    autoPaste,
    axureRect,
  };
}
