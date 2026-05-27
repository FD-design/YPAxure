// Deeper path decoder: find all 4 control points (LowerHandle pairs) and confirm the
// rectangle is encoded as normalized [0,1]×[0,1].
// Also enumerate ALL Width / Height f64 occurrences in the file so we can identify which one
// is the actual widget metadata.

import { readSample, u32le } from "./lib/io.js";

const path = process.argv[2];
if (!path) {
  console.error("usage: decode-path2 <record.bin>");
  process.exit(1);
}

const buf = readSample(path);
const strCount = u32le(buf, 28);
const strings: string[] = [];
let off = 32;
for (let i = 0; i < strCount; i++) {
  const len = u32le(buf, off);
  off += 4;
  strings.push(buf.subarray(off, off + len).toString("utf8"));
  off += len;
}
const payloadStart = off;

const Y_IDX = strings.indexOf("Y");
const W_IDX = strings.indexOf("Width");
const H_IDX = strings.indexOf("Height");
const X_IDX = strings.indexOf("X");
const LH_IDX = strings.indexOf("LowerHandle");
const HH_IDX = strings.indexOf("HigherHandle");
const PATH_IDX = strings.indexOf("Path");
const CP_IDX = strings.indexOf("ControlPoints");

console.log(`Indices: Y=${Y_IDX}, X=${X_IDX}, Width=${W_IDX}, Height=${H_IDX}, LH=${LH_IDX}, HH=${HH_IDX}, Path=${PATH_IDX}, CP=${CP_IDX}`);

// Find every strref to LowerHandle and read the (Y, Width) pair that follows
function findLowerHandlePoints() {
  const points: { off: number; x: number; y: number }[] = [];
  for (let i = payloadStart; i + 60 < buf.length; i++) {
    if (buf[i] !== 0x08 || u32le(buf, i + 4) !== LH_IDX) continue;
    // pattern: 08 LH(u32) 01 02 08 Y(u32) 06 f64 08 W(u32) 06 f64
    // offsets:  0          8 12 16        24 28      36        44
    if (u32le(buf, i + 16) !== 0x08) continue;
    if (u32le(buf, i + 20) !== Y_IDX) continue;
    if (u32le(buf, i + 24) !== 0x06) continue;
    const y = buf.readDoubleLE(i + 28);
    if (u32le(buf, i + 36) !== 0x08) continue;
    if (u32le(buf, i + 40) !== W_IDX) continue;
    if (u32le(buf, i + 44) !== 0x06) continue;
    const x = buf.readDoubleLE(i + 48);
    points.push({ off: i, x, y });
  }
  return points;
}

const lhPoints = findLowerHandlePoints();
console.log(`\nLowerHandle (the actual path corner points) — ${lhPoints.length} found:`);
for (const p of lhPoints) console.log(`  @${p.off}: (x=${p.x}, y=${p.y})`);

// Also enumerate all Width occurrences as f64 + their full context
function findFieldF64(fieldIdx: number, label: string) {
  console.log(`\nAll ${label} (strref ${fieldIdx}) → f64 occurrences:`);
  for (let i = payloadStart; i + 20 <= buf.length; i++) {
    if (buf[i] !== 0x08 || u32le(buf, i + 4) !== fieldIdx) continue;
    if (buf[i + 8] !== 0x06) continue;
    const v = buf.readDoubleLE(i + 12);
    if (Number.isNaN(v)) continue;
    // What field name precedes this (if any)?
    let beforeLabel = "?";
    for (let j = i - 24; j >= payloadStart; j--) {
      if (buf[j] !== 0x08) continue;
      const idx = u32le(buf, j + 4);
      if (idx < strings.length && strings[idx] !== "Y" && strings[idx] !== "Width" && strings[idx] !== "Height" && strings[idx] !== "X") {
        beforeLabel = `..${strings[idx]}`;
        break;
      }
    }
    console.log(`  @${i.toString().padStart(6)} value=${v}     (context: ${beforeLabel})`);
  }
}

findFieldF64(W_IDX, "Width");
findFieldF64(H_IDX, "Height");
if (X_IDX >= 0) findFieldF64(X_IDX, "X");
findFieldF64(Y_IDX, "Y");
