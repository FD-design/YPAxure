// Lucide icon integration — uses the real SVG source from the `lucide-static` npm package
// and renders/pastes it into Axure via clipboard.
//
// Two paste modes:
//   - "image" (default, reliable):   SVG → PNG via @resvg/resvg-js → Bitmap on clipboard
//   - "svg"   (experimental):         raw SVG text on clipboard under "image/svg+xml"
//
// Use this when the user asks for a specific functional UI icon and you want the real
// Lucide design (1960+ icons available). Call `listLucideIcons()` to enumerate.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runPlatformScript, IS_WINDOWS, repoRoot } from "./platform.js";

const LUCIDE_DIR = join(repoRoot(), "node_modules", "lucide-static", "icons");

export interface LucidePasteOpts {
  /** Render size in pixels (square). Default 48. */
  size?: number;
  /** Stroke color as CSS hex string. Default "#1F2937" (gray-800). */
  color?: string;
  /** Stroke width as a number — Lucide default is 2. */
  strokeWidth?: number;
  /** "image" (PNG bitmap, default — reliable) or "svg" (raw SVG text, experimental). */
  mode?: "image" | "svg";
  /** If true, focus Axure and send Ctrl+V automatically. */
  autoPaste?: boolean;
}

export interface LucidePasteResult {
  name: string;
  mode: "image" | "svg";
  size: number;
  /** Path to the rendered/temp file (PNG or SVG). */
  outputPath: string;
  helperOutput: string;
  autoPaste?: "ok" | "skipped_no_axure" | "not_requested";
}

/** Load Lucide SVG source by icon name (e.g. "search", "heart", "settings"). */
export function getLucideSvg(name: string): string {
  const file = join(LUCIDE_DIR, `${name}.svg`);
  if (!existsSync(file)) {
    throw new Error(`Lucide icon not found: "${name}" (looked at ${file})`);
  }
  return readFileSync(file, "utf8");
}

/** List every available Lucide icon slug. */
export function listLucideIcons(): string[] {
  if (!existsSync(LUCIDE_DIR)) return [];
  return readdirSync(LUCIDE_DIR)
    .filter((f) => f.endsWith(".svg"))
    .map((f) => f.replace(/\.svg$/, ""));
}

/** Apply color, size, and strokeWidth tweaks to the SVG source. */
function customizeSvg(svg: string, opts: LucidePasteOpts): string {
  const size = opts.size ?? 48;
  const color = opts.color ?? "#1F2937";
  const strokeWidth = opts.strokeWidth ?? 2;
  return svg
    .replace(/width="\d+"/, `width="${size}"`)
    .replace(/height="\d+"/, `height="${size}"`)
    .replace(/stroke="[^"]*"/, `stroke="${color}"`)
    .replace(/stroke-width="\d+(?:\.\d+)?"/, `stroke-width="${strokeWidth}"`);
}

/** Render SVG to PNG bytes using @resvg/resvg-js. */
async function svgToPng(svg: string, size: number): Promise<Buffer> {
  const { Resvg } = await import("@resvg/resvg-js");
  // Pass background as transparent (omit explicit bg)
  const r = new Resvg(svg, { fitTo: { mode: "width", value: size * 4 } }); // 4× for sharpness
  const png = r.render();
  return png.asPng();
}

/**
 * Paste a Lucide icon into Axure.
 * Default mode renders SVG to PNG and pastes as a bitmap (reliable, but bitmap).
 */
export async function pasteLucideIcon(name: string, opts: LucidePasteOpts = {}): Promise<LucidePasteResult> {
  const svg = customizeSvg(getLucideSvg(name), opts);
  const mode = opts.mode ?? "image";
  const size = opts.size ?? 48;
  const tmpDir = join(tmpdir(), "axure-mcp-lucide");
  if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });

  const svgPath = join(tmpDir, `${name}-${Date.now()}.svg`);
  writeFileSync(svgPath, svg, "utf8");

  let helperOutput = "";
  let outputPath = svgPath;
  let autoPaste: LucidePasteResult["autoPaste"] = "not_requested";

  if (mode === "image") {
    const pngBytes = await svgToPng(svg, size);
    const pngPath = join(tmpDir, `${name}-${Date.now()}.png`);
    writeFileSync(pngPath, pngBytes);
    outputPath = pngPath;

    const r = runPlatformScript("set-image-clipboard", {
      PngPath: pngPath,
      SvgPath: svgPath,
      AutoPaste: opts.autoPaste === true,
    });
    if (r.status !== 0) {
      throw new Error(`image-clipboard helper failed (exit ${r.status}). stderr:\n${r.stderr}`);
    }
    helperOutput = (r.stdout ?? "").trim();
    if (opts.autoPaste) {
      autoPaste = helperOutput.includes("AUTOPASTE_OK") ? "ok" : "skipped_no_axure";
    }
  } else {
    // svg mode: raw text on clipboard (experimental). Platform-branched inline.
    if (IS_WINDOWS) {
      const psScript = `
        Add-Type -AssemblyName System.Windows.Forms
        $svg = [System.IO.File]::ReadAllText('${svgPath.replace(/\\/g, "\\\\")}', [System.Text.Encoding]::UTF8)
        $d = New-Object System.Windows.Forms.DataObject
        $d.SetData('image/svg+xml', $false, $svg)
        $d.SetData('SVG', $false, $svg)
        [System.Windows.Forms.Clipboard]::SetDataObject($d, $true)
        Write-Output "OK"
      `.trim();
      const r = spawnSync("powershell", ["-ExecutionPolicy", "Bypass", "-NoProfile", "-Command", psScript], { encoding: "utf8" });
      helperOutput = (r.stdout ?? "").trim();
    } else {
      // mac: use the image-clipboard helper but only pass SvgPath — it'll attach SVG to whatever
      // image is loaded. Since svg-only mode means no PNG, fall back to a tiny osascript that
      // writes the SVG text under public.svg-image.
      const escSvgPath = svgPath.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      const r = spawnSync("osascript", ["-e", `
        set svgPath to POSIX file "${escSvgPath}"
        set svgText to read svgPath as «class utf8»
        set the clipboard to svgText
        return "OK"
      `], { encoding: "utf8" });
      helperOutput = (r.stdout ?? "").trim();
    }
  }

  return { name, mode, size, outputPath, helperOutput, autoPaste };
}
