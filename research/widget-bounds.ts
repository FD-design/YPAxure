// Walk a Page record and group widget instances by their (Height, Start, Y, Width) quartet.
// Pattern in widget instance container:
//   ...some "Value, Arial" lead-in...
//   (strref Height)(tag 06)(f64 H)
//   (strref Start)(tag 06)(f64 X)
//   ...(strref Value)(tag 05/01)(u32)(strref Arial)(tag 01/05)(u32)...
//   (strref Y)(tag 06)(f64 Y)
//   (strref Width)(tag 06)(f64 W)
// We look for the pattern (Height, Start, ..., Y, Width) where all four are close to each other.

import { readSample, u32le } from "./lib/io.js";

const buf = readSample(process.argv[2]!);
const strCount = u32le(buf, 28);
const strings: string[] = [];
let off = 32;
for (let i = 0; i < strCount; i++) {
  const len = u32le(buf, off);
  off += 4;
  strings.push(buf.subarray(off, off + len).toString("utf8"));
  off += len;
}

const Y_IDX = strings.indexOf("Y");
const W_IDX = strings.indexOf("Width");
const H_IDX = strings.indexOf("Height");
const S_IDX = strings.indexOf("Start");

interface Entry {
  off: number;
  field: string;
  value: number;
}
const entries: Entry[] = [];
for (let i = 32; i + 20 <= buf.length; i++) {
  if (buf[i] !== 0x08 || buf[i + 1] !== 0 || buf[i + 2] !== 0 || buf[i + 3] !== 0) continue;
  const idx = u32le(buf, i + 4);
  if (idx !== Y_IDX && idx !== W_IDX && idx !== H_IDX && idx !== S_IDX) continue;
  if (buf[i + 8] !== 0x06) continue;
  const v = buf.readDoubleLE(i + 12);
  if (Number.isNaN(v)) continue;
  entries.push({
    off: i,
    field: idx === Y_IDX ? "Y" : idx === W_IDX ? "Width" : idx === H_IDX ? "Height" : "Start",
    value: v,
  });
}

// Group into widget instances: a quartet (Height, Start, Y, Width) within ~200 bytes
const widgets: Array<{ height: number; start: number; y: number; width: number; off: number }> = [];
for (let i = 0; i < entries.length - 3; i++) {
  const a = entries[i]!;
  const b = entries[i + 1]!;
  const c = entries[i + 2]!;
  const d = entries[i + 3]!;
  if (a.field === "Height" && b.field === "Start" && c.field === "Y" && d.field === "Width") {
    if (d.off - a.off < 200) {
      widgets.push({ height: a.value, start: b.value, y: c.value, width: d.value, off: a.off });
    }
  }
}

console.log(`Widget instances found (quartet pattern): ${widgets.length}`);
console.log();
for (const w of widgets) {
  console.log(`  @${w.off.toString().padStart(6)}  rect(x=${w.start.toFixed(2)}, y=${w.y.toFixed(2)}, w=${w.width.toFixed(2)}, h=${w.height.toFixed(2)})`);
}

// Also dump the LAST few entries to find widgets that don't fit the quartet pattern
console.log("\nAll entries (last 30):");
for (const e of entries.slice(-30)) {
  console.log(`  @${e.off.toString().padStart(6)}  ${e.field.padEnd(8)} = ${e.value}`);
}
