// Extract printable ASCII runs >= minLen.
// Run: npm run ascii-runs -- <path> [--min=16] [--limit=200]
import { readSample } from "./lib/io.js";

const path = process.argv[2];
if (!path) {
  console.error("usage: ascii-runs <path-to-.rp> [--min=N] [--limit=M]");
  process.exit(1);
}
const minArg = process.argv.find((a) => a.startsWith("--min="));
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const minLen = minArg ? parseInt(minArg.split("=")[1]!, 10) : 16;
const limit = limitArg ? parseInt(limitArg.split("=")[1]!, 10) : 200;

const buf = readSample(path);
const runs: { offset: number; text: string }[] = [];
let start = -1;
for (let i = 0; i <= buf.length; i++) {
  const b = i < buf.length ? buf[i]! : 0;
  const printable = i < buf.length && b >= 0x20 && b < 0x7f;
  if (printable) {
    if (start === -1) start = i;
  } else {
    if (start !== -1 && i - start >= minLen) {
      runs.push({ offset: start, text: buf.subarray(start, i).toString("ascii") });
    }
    start = -1;
  }
}

console.log(`Total runs >= ${minLen} chars: ${runs.length} (showing first ${limit})\n`);
for (const r of runs.slice(0, limit)) {
  console.log(`@${r.offset.toString().padStart(8)}  ${r.text}`);
}
