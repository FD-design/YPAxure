// Find every tag-06 (f64) typed value in the payload, group by value, report frequency.
// The widget's actual X/Y/W/H values typically appear 1-2 times each (unique), distinguishing
// them from the dozens of 0.0/1.0 default/style values.
// Run: npm exec tsx research/enumerate-f64s.ts -- <record.bin> [--start=N] [--end=N]
import { readSample, u32le } from "./lib/io.js";

const path = process.argv[2];
if (!path) {
  console.error("usage: enumerate-f64s <record.bin> [--start=N] [--end=N]");
  process.exit(1);
}
const startArg = process.argv.find((a) => a.startsWith("--start="));
const endArg = process.argv.find((a) => a.startsWith("--end="));
const startAt = startArg ? parseInt(startArg.split("=")[1]!, 10) : 0;
const endAt = endArg ? parseInt(endArg.split("=")[1]!, 10) : Infinity;

const buf = readSample(path);
const strCount = u32le(buf, 28);
let off = 32;
for (let i = 0; i < strCount; i++) {
  const len = u32le(buf, off);
  off += 4 + len;
}
const payloadStart = off;

interface Hit {
  offset: number;
  value: number;
}
const hits: Hit[] = [];
const scanStart = Math.max(payloadStart, startAt);
const scanEnd = Math.min(buf.length, endAt);
for (let i = scanStart; i + 12 <= scanEnd; i++) {
  if (buf[i] !== 0x06 || buf[i + 1] !== 0 || buf[i + 2] !== 0 || buf[i + 3] !== 0) continue;
  const v = buf.readDoubleLE(i + 4);
  if (Number.isNaN(v)) continue;
  hits.push({ offset: i, value: v });
}

// Group by value
const byValue = new Map<string, number[]>();
for (const h of hits) {
  const key = h.value.toString();
  if (!byValue.has(key)) byValue.set(key, []);
  byValue.get(key)!.push(h.offset);
}

// Sort by frequency ascending (rare values first — they're most likely widget params)
const sorted = [...byValue.entries()].sort((a, b) => a[1].length - b[1].length);

console.log(`Record: ${path}`);
console.log(`Payload [${scanStart}, ${scanEnd}): ${hits.length} f64 occurrences, ${byValue.size} distinct values\n`);

console.log("=== Rare values (likely widget params) ===");
for (const [val, offsets] of sorted) {
  if (offsets.length > 4) break;
  console.log(`  ${val.padEnd(28)}  ${offsets.length}× at offsets: ${offsets.join(", ")}`);
}

console.log("\n=== Common values (defaults/style) ===");
for (const [val, offsets] of sorted) {
  if (offsets.length <= 4) continue;
  console.log(`  ${val.padEnd(28)}  ${offsets.length}× (e.g. @${offsets[0]})`);
}
