// Scan a .rp file for byte patterns we suspect are tag markers,
// and show context around each occurrence.
// Run: npm run scan-tags -- <path> [--max=200]
import { readSample, hex, asciiPreview } from "./lib/io.js";

const path = process.argv[2];
if (!path) {
  console.error("usage: scan-tags <path-to-.rp> [--max=N]");
  process.exit(1);
}
const maxArg = process.argv.find((a) => a.startsWith("--max="));
const max = maxArg ? parseInt(maxArg.split("=")[1]!, 10) : 200;

const buf = readSample(path);

interface Hit {
  offset: number;
  tag: string;
  context: string;
  ascii: string;
}

// Tags we currently suspect (extend as NOTES.md grows)
function isTagAt(buf: Buffer, i: number): string | null {
  // Skip past header
  if (i < 15) return null;
  const b0 = buf[i]!;
  const b1 = i + 1 < buf.length ? buf[i + 1]! : -1;
  // F0 XX — appears to introduce length-prefixed sections
  if (b0 === 0xf0) return `F0 ${b1.toString(16).padStart(2, "0").toUpperCase()}`;
  // 0C 00 — guess: list-element separator
  if (b0 === 0x0c && b1 === 0x00) return `0C 00`;
  return null;
}

const byTag = new Map<string, Hit[]>();

for (let i = 15; i < buf.length; i++) {
  const tag = isTagAt(buf, i);
  if (!tag) continue;
  const ctxStart = Math.max(0, i - 4);
  const ctxEnd = Math.min(buf.length, i + 20);
  const slice = buf.subarray(ctxStart, ctxEnd);
  const hit: Hit = {
    offset: i,
    tag,
    context: hex(slice),
    ascii: asciiPreview(slice),
  };
  if (!byTag.has(tag)) byTag.set(tag, []);
  byTag.get(tag)!.push(hit);
}

const tags = [...byTag.entries()].sort((a, b) => b[1].length - a[1].length);
console.log(`Found ${tags.length} distinct tag patterns in ${path}\n`);
for (const [tag, hits] of tags) {
  console.log(`==== Tag ${tag}  (count=${hits.length}) ====`);
  for (const hit of hits.slice(0, Math.min(max, 5))) {
    console.log(`  @${hit.offset.toString().padStart(8)}  ${hit.context}`);
    console.log(`              ${hit.ascii}`);
  }
  if (hits.length > 5) console.log(`  ... and ${hits.length - 5} more`);
  console.log();
}
