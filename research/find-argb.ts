// Find all (tag 0x05)(u32) values where the u32 looks like an ARGB color (A=0xFF or 0x00).
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
const payloadStart = off;

interface Hit {
  off: number;
  value: number;
  prevStrref?: string;
}

const hits: Hit[] = [];
let lastStrref: string | undefined;
let lastStrrefOff = 0;
for (let i = payloadStart; i + 8 <= buf.length; i++) {
  // strref?
  if (buf[i] === 0x08 && buf[i + 1] === 0 && buf[i + 2] === 0 && buf[i + 3] === 0) {
    const idx = u32le(buf, i + 4);
    if (idx < strings.length) {
      lastStrref = strings[idx]!;
      lastStrrefOff = i;
    }
  }
  // (tag 05)(u32) where u32 has alpha = 0xFF or 0xFE
  if (buf[i] === 0x05 && buf[i + 1] === 0 && buf[i + 2] === 0 && buf[i + 3] === 0) {
    const v = u32le(buf, i + 4) >>> 0;
    const a = (v >>> 24) & 0xff;
    // ARGB colors usually have alpha == 0xFF, so filter to those
    if (a === 0xff || a === 0xfe) {
      hits.push({ off: i, value: v, prevStrref: lastStrref });
    }
  }
}

console.log(`Found ${hits.length} (tag 05 u32 with alpha=FF) sites in payload:`);
for (const h of hits.slice(0, 100)) {
  const hex = "0x" + h.value.toString(16).padStart(8, "0").toUpperCase();
  console.log(`  @${h.off.toString().padStart(6)}  ARGB=${hex}   (prev strref: "${h.prevStrref}")`);
}
