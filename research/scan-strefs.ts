// Scan a record's payload for `08 XX XX XX XX` patterns where XX XX XX XX is a valid string-table index.
// Prints the chronological sequence of string references in the payload — even when full structural
// parsing fails. This is enough to answer "what classes/fields/text appear in this record".
//
// Run: npm exec tsx research/scan-strefs.ts -- <record.bin> [--filter=substr] [--unique]
import { readSample, u32le } from "./lib/io.js";

const path = process.argv[2];
if (!path) {
  console.error("usage: scan-strefs <record.bin> [--filter=SUBSTR] [--unique]");
  process.exit(1);
}
const filterArg = process.argv.find((a) => a.startsWith("--filter="));
const filter = filterArg ? filterArg.split("=")[1]! : null;
const unique = process.argv.includes("--unique");

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

interface Hit {
  offset: number;
  index: number;
  text: string;
}
const hits: Hit[] = [];
for (let i = payloadStart; i + 8 <= buf.length; i++) {
  // Look for pattern: tag=0x08, then a u32 < strCount
  if (buf[i] !== 0x08 || buf[i + 1] !== 0 || buf[i + 2] !== 0 || buf[i + 3] !== 0) continue;
  const idx = u32le(buf, i + 4);
  if (idx >= strCount) continue;
  hits.push({ offset: i, index: idx, text: strings[idx]! });
}

console.log(`Record: ${path}`);
console.log(`String table: ${strCount} entries; payload starts at ${payloadStart}`);
console.log(`Found ${hits.length} candidate '08 XX XX XX XX' strref patterns in payload\n`);

let printed: Hit[] = hits;
if (filter) {
  printed = hits.filter((h) => h.text.includes(filter));
  console.log(`(filtered to those containing "${filter}": ${printed.length})\n`);
}
if (unique) {
  const seen = new Set<number>();
  printed = printed.filter((h) => {
    if (seen.has(h.index)) return false;
    seen.add(h.index);
    return true;
  });
  console.log(`(unique only: ${printed.length})\n`);
}

for (const h of printed) {
  console.log(`@${h.offset.toString().padStart(6)}  #${h.index.toString().padStart(3)}  ${JSON.stringify(h.text)}`);
}
