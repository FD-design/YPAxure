// Patch one f64 value at a specific byte offset in a template, write to clipboard, auto-paste.
// Used for empirical decoding: change a candidate byte, see what visible effect Axure produces.
//
// Run: npx tsx research/patch-and-paste.ts -- <template.bin> <offset> <new-f64-value> [--auto-paste]
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const templatePath = process.argv[2];
const offsetStr = process.argv[3];
const valStr = process.argv[4];
if (!templatePath || !offsetStr || !valStr) {
  console.error("usage: patch-and-paste <template.bin> <offset> <new-f64-value> [--auto-paste]");
  process.exit(1);
}
const offset = parseInt(offsetStr, 10);
const newVal = parseFloat(valStr);
const autoPaste = process.argv.includes("--auto-paste");

const absTpl = resolve(templatePath);
const buf = readFileSync(absTpl);

// Verify the byte at offset-4 is tag 06 (f64 indicator) — sanity check
const tag = buf.readUInt32LE(offset - 4);
if (tag !== 0x06) {
  console.warn(`WARNING: byte at offset-4 = 0x${tag.toString(16)} (expected 0x06 for f64 tag).`);
}
const oldVal = buf.readDoubleLE(offset);
console.log(`Patching offset ${offset}: ${oldVal} → ${newVal}`);

const newBuf = Buffer.from(buf);
newBuf.writeDoubleLE(newVal, offset);

const outPath = resolve("research", "_patched.bin");
writeFileSync(outPath, newBuf);
console.log(`Patched bytes written to ${outPath}`);

// Drop on clipboard via existing helper
const psScript = resolve("research", "set-clipboard.ps1");
const args = ["-ExecutionPolicy", "Bypass", "-NoProfile", "-File", psScript, "-Path", outPath];
if (autoPaste) args.push("-AutoPaste");
const r = spawnSync("powershell", args, { encoding: "utf8" });
console.log(r.stdout?.trim() ?? "");
if (r.status !== 0) console.error(r.stderr ?? "");
