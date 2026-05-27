// Cross-platform helpers for invoking the OS-specific clipboard / window scripts.
//
// axure-mcp works on:
//   - win32: PowerShell scripts in research/*.ps1 (System.Windows.Forms.Clipboard + Win32)
//   - darwin: bash + Swift + AppleScript in research/*.sh (NSPasteboard + System Events)
//
// Each helper script accepts the same dash-prefixed argument names across platforms
// (e.g. `-Path`, `-PngPath`, `-AutoPaste`), so this dispatcher can flatten an args object
// the same way for both.

import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const IS_WINDOWS = process.platform === "win32";
export const IS_MAC = process.platform === "darwin";

export function repoRoot(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, "..", "..");
}

export const RESEARCH_DIR = join(repoRoot(), "research");

/** Throw a clear error if the current platform isn't supported. */
export function assertSupportedPlatform(): void {
  if (!IS_WINDOWS && !IS_MAC) {
    throw new Error(
      `axure-mcp supports only Windows and macOS. Detected: ${process.platform}.`,
    );
  }
}

export type ScriptArg = string | number | boolean | undefined;

/**
 * Invoke a platform-specific helper script. Pass `scriptBase` without extension —
 * on Windows we look up `${scriptBase}.ps1`, on Mac `${scriptBase}.sh`.
 *
 * `args` is a flat record of dash-prefixed CLI args. A boolean `true` becomes a
 * standalone switch (e.g. `-AutoPaste`); a boolean `false`/`undefined` is omitted.
 */
export function runPlatformScript(
  scriptBase: string,
  args: Record<string, ScriptArg> = {},
): SpawnSyncReturns<string> {
  assertSupportedPlatform();

  const flatArgs: string[] = [];
  for (const [k, v] of Object.entries(args)) {
    if (v === undefined || v === false) continue;
    if (v === true) {
      flatArgs.push(`-${k}`);
    } else {
      flatArgs.push(`-${k}`, String(v));
    }
  }

  if (IS_WINDOWS) {
    const psFile = join(RESEARCH_DIR, `${scriptBase}.ps1`);
    return spawnSync(
      "powershell",
      ["-ExecutionPolicy", "Bypass", "-NoProfile", "-File", psFile, ...flatArgs],
      { encoding: "utf8" },
    );
  }
  // mac
  const shFile = join(RESEARCH_DIR, `${scriptBase}.sh`);
  return spawnSync("bash", [shFile, ...flatArgs], { encoding: "utf8" });
}

/**
 * Focus Axure RP and dispatch a paste (Ctrl+V on Windows, Cmd+V on Mac).
 * Returns "ok" if a paste was sent, "skipped_no_axure" if Axure isn't running.
 */
export function focusAxureAndPaste(): "ok" | "skipped_no_axure" {
  assertSupportedPlatform();

  if (IS_WINDOWS) {
    const script = `
      Add-Type -AssemblyName System.Windows.Forms
      Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class AxAxvgW32 {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
}
"@ -ErrorAction SilentlyContinue
      $proc = Get-Process AxureRP* -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
      if (-not $proc) { Write-Output "SKIP"; exit 0 }
      [void][AxAxvgW32]::ShowWindow($proc.MainWindowHandle, 3)
      [AxAxvgW32]::keybd_event(0x12, 0, 0, [System.UIntPtr]::Zero)
      [AxAxvgW32]::keybd_event(0x12, 0, 0x2, [System.UIntPtr]::Zero)
      [void][AxAxvgW32]::SetForegroundWindow($proc.MainWindowHandle)
      Start-Sleep -Milliseconds 250
      [System.Windows.Forms.SendKeys]::SendWait("^v")
      Write-Output "OK"
    `.trim();
    const r = spawnSync(
      "powershell",
      ["-ExecutionPolicy", "Bypass", "-NoProfile", "-Command", script],
      { encoding: "utf8" },
    );
    if (r.status !== 0) return "skipped_no_axure";
    return (r.stdout ?? "").includes("OK") ? "ok" : "skipped_no_axure";
  }

  // mac: invoke focus-axure-and-paste.sh which uses osascript under the hood
  const r = runPlatformScript("focus-axure-and-paste");
  if (r.status !== 0) return "skipped_no_axure";
  const out = (r.stdout ?? "").trim();
  return out.includes("OK") ? "ok" : "skipped_no_axure";
}
