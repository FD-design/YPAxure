// Byte-level diff between two .rp files.
// Run: npm run diff-files -- <fileA> <fileB> [--context=8] [--limit=40]
import { readSample, hex, asciiPreview } from "./lib/io.js";

const a = process.argv[2];
const b = process.argv[3];
if (!a || !b) {
  console.error("usage: diff-files <fileA> <fileB> [--context=N] [--limit=M]");
  process.exit(1);
}
const ctxArg = process.argv.find((x) => x.startsWith("--context="));
const limitArg = process.argv.find((x) => x.startsWith("--limit="));
const ctx = ctxArg ? parseInt(ctxArg.split("=")[1]!, 10) : 8;
const limit = limitArg ? parseInt(limitArg.split("=")[1]!, 10) : 40;

const bufA = readSample(a);
const bufB = readSample(b);
console.log(`A: ${a}  (${bufA.length} bytes)`);
console.log(`B: ${b}  (${bufB.length} bytes)`);
console.log(`size delta: ${bufB.length - bufA.length}\n`);

// naive aligned diff: report contiguous runs where A and B differ
const minLen = Math.min(bufA.length, bufB.length);
const ranges: { start: number; end: number }[] = [];
let i = 0;
while (i < minLen) {
  if (bufA[i] !== bufB[i]) {
    const start = i;
    while (i < minLen && bufA[i] !== bufB[i]) i++;
    ranges.push({ start, end: i });
  } else {
    i++;
  }
}

console.log(`Aligned diff ranges: ${ranges.length} (showing first ${limit})\n`);
for (const r of ranges.slice(0, limit)) {
  const len = r.end - r.start;
  const aStart = Math.max(0, r.start - ctx);
  const bEnd = Math.min(minLen, r.end + ctx);
  const sliceA = bufA.subarray(aStart, bEnd);
  const sliceB = bufB.subarray(aStart, bEnd);
  console.log(`@${r.start} length=${len}`);
  console.log(`  A hex: ${hex(sliceA)}`);
  console.log(`  A asc: ${asciiPreview(sliceA)}`);
  console.log(`  B hex: ${hex(sliceB)}`);
  console.log(`  B asc: ${asciiPreview(sliceB)}`);
  console.log();
}

if (bufA.length !== bufB.length) {
  console.log(`(files have different total lengths; tail diffs not analyzed)`);
}
