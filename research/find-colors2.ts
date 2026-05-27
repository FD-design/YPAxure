// Find every fill-color strref site and dump the 32 bytes following it.
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

const targets = ["fill-color", "fill-type", "solid", "Color", "FillColor"];
for (const t of targets) {
  const idx = strings.indexOf(t);
  if (idx < 0) continue;
  console.log(`\n${t} (strref ${idx}):`);
  for (let i = 32; i + 16 <= buf.length; i++) {
    if (buf[i] !== 0x08 || u32le(buf, i + 4) !== idx) continue;
    // Dump 32 bytes following
    const slice = buf.subarray(i, Math.min(i + 32, buf.length));
    const hex = Array.from(slice).map((b) => b.toString(16).padStart(2, "0")).join(" ");
    console.log(`  @${i.toString().padStart(6)}: ${hex}`);
  }
}
