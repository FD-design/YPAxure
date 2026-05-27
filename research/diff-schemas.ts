// Parse two extracted records' string tables and report schema diff.
// Run: npm exec tsx research/diff-schemas.ts -- <recordA.bin> <recordB.bin>
import { readSample, u32le } from "./lib/io.js";

function parseSchema(buf: Buffer): { strings: string[]; payloadStart: number } {
  const count = u32le(buf, 28);
  const strings: string[] = [];
  let off = 32;
  for (let i = 0; i < count; i++) {
    const len = u32le(buf, off);
    off += 4;
    strings.push(buf.subarray(off, off + len).toString("utf8"));
    off += len;
  }
  return { strings, payloadStart: off };
}

const a = process.argv[2];
const b = process.argv[3];
if (!a || !b) {
  console.error("usage: diff-schemas <recordA.bin> <recordB.bin>");
  process.exit(1);
}

const sa = parseSchema(readSample(a));
const sb = parseSchema(readSample(b));

const setA = new Set(sa.strings);
const setB = new Set(sb.strings);
const onlyA: string[] = [];
const onlyB: string[] = [];
for (const s of sa.strings) if (!setB.has(s)) onlyA.push(s);
for (const s of sb.strings) if (!setA.has(s)) onlyB.push(s);

console.log(`A: ${a}`);
console.log(`   strings=${sa.strings.length}, payload starts at offset ${sa.payloadStart}`);
console.log(`B: ${b}`);
console.log(`   strings=${sb.strings.length}, payload starts at offset ${sb.payloadStart}`);
console.log("");
console.log(`Only in A (${onlyA.length}):`);
for (const s of onlyA) console.log(`  - ${s}`);
console.log("");
console.log(`Only in B (${onlyB.length}):`);
for (const s of onlyB) console.log(`  + ${s}`);
