// Look at the bytes BEFORE the widget Y=50 / Width=50 pair to find what container they live in.
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

function dumpAround(off: number, before = 80, after = 60) {
  console.log(`\n--- Around offset ${off} ---`);
  const start = Math.max(0, off - before);
  const end = Math.min(buf.length, off + after);
  // Walk backwards to find the most recent strrefs
  console.log("  Recent strrefs before:");
  const recent: { off: number; idx: number; text: string }[] = [];
  for (let i = start; i < off; i++) {
    if (buf[i] !== 0x08 || buf[i + 1] !== 0 || buf[i + 2] !== 0 || buf[i + 3] !== 0) continue;
    const idx = u32le(buf, i + 4);
    if (idx >= strings.length) continue;
    recent.push({ off: i, idx, text: strings[idx]! });
  }
  for (const r of recent.slice(-8)) {
    console.log(`     @${r.off}  strref=${r.idx} "${r.text}"`);
  }
  console.log("  Hex:");
  for (let i = start; i < end; i += 16) {
    const slice = buf.subarray(i, Math.min(i + 16, end));
    const hex = Array.from(slice).map((b) => b.toString(16).padStart(2, "0")).join(" ");
    const marker = i <= off && off < i + 16 ? " <--" : "";
    console.log(`     ${i.toString().padStart(6)}: ${hex}${marker}`);
  }
}

for (const o of [5643, 9075]) dumpAround(o);

// Also dump 9337 — the first LowerHandle Width=0 — to see how Path opens
dumpAround(9269, 50, 100);
