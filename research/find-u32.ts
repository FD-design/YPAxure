// Find all occurrences of a given u32 LE value in a file.
// Run: npm exec tsx research/find-u32.ts -- <path> <decimal-value> [--start=N] [--context=8]
import { readSample, hex, asciiPreview } from "./lib/io.js";

const path = process.argv[2];
const valStr = process.argv[3];
if (!path || !valStr) {
  console.error("usage: find-u32 <path> <decimal-value> [--start=N] [--context=N]");
  process.exit(1);
}
const value = parseInt(valStr, 10);
const startArg = process.argv.find((a) => a.startsWith("--start="));
const ctxArg = process.argv.find((a) => a.startsWith("--context="));
const start = startArg ? parseInt(startArg.split("=")[1]!, 10) : 0;
const ctx = ctxArg ? parseInt(ctxArg.split("=")[1]!, 10) : 8;

const buf = readSample(path);
const needle = Buffer.alloc(4);
needle.writeUInt32LE(value, 0);

const hits: number[] = [];
for (let i = start; i <= buf.length - 4; i++) {
  if (buf[i] === needle[0] && buf[i + 1] === needle[1] && buf[i + 2] === needle[2] && buf[i + 3] === needle[3]) {
    hits.push(i);
  }
}

console.log(`Searching for u32 LE = ${value} (hex: ${needle.toString("hex").toUpperCase()}) in ${path}`);
console.log(`Found ${hits.length} occurrence(s)${start ? ` from offset ${start}` : ""}\n`);
for (const off of hits) {
  const cs = Math.max(0, off - ctx);
  const ce = Math.min(buf.length, off + 4 + ctx);
  const slice = buf.subarray(cs, ce);
  const marker = " ".repeat((off - cs) * 3) + "^^^^^^^^^^^";
  console.log(`@${off.toString().padStart(8)}  ${hex(slice)}`);
  console.log(`              ${marker}`);
  console.log(`              ${asciiPreview(slice)}`);
  console.log();
}
