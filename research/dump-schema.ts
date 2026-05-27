// Parse the inner record header + string table and print it.
// Run: npm exec tsx research/dump-schema.ts -- <record.bin>
import { readSample, u32le } from "./lib/io.js";

const path = process.argv[2];
if (!path) {
  console.error("usage: dump-schema <record.bin>");
  process.exit(1);
}
const buf = readSample(path);

// Header (hypothesized from PrintConfig):
//   u32  flag/version  (varies)
//   u32  major version (= 11)
//   u32  zero
//   u32  zero
//   u32  zero
//   u32  magic 0xC351
//   u32  unknown small
//   u32  string-table count

const w0 = u32le(buf, 0);
const w1 = u32le(buf, 4);
const w2 = u32le(buf, 8);
const w3 = u32le(buf, 12);
const w4 = u32le(buf, 16);
const w5 = u32le(buf, 20);
const w6 = u32le(buf, 24);
const w7 = u32le(buf, 28);

console.log(`[Header]`);
console.log(`  w0 (flag?):       ${w0}`);
console.log(`  w1 (majorVer):    ${w1}  ${w1 === 11 ? "(= 11 ✓)" : ""}`);
console.log(`  w2..w4:           ${w2}, ${w3}, ${w4}  (expect 0,0,0)`);
console.log(`  w5 (magic 0xC351):0x${w5.toString(16).toUpperCase()}  ${w5 === 0xc351 ? "(✓)" : "(mismatch — header layout may differ)"}`);
console.log(`  w6 (unk):         ${w6}`);
console.log(`  w7 (str count):   ${w7}`);

console.log(`\n[String table]`);
let off = 32;
for (let i = 0; i < w7 && off + 4 <= buf.length; i++) {
  const len = u32le(buf, off);
  off += 4;
  if (len > 10_000_000 || off + len > buf.length) {
    console.log(`  #${i}: <bogus length ${len} at offset ${off - 4}, aborting>`);
    break;
  }
  const s = buf.subarray(off, off + len).toString("utf8");
  console.log(`  #${i.toString().padStart(3)} [len=${len.toString().padStart(4)}]  ${s}`);
  off += len;
}
console.log(`\nString table ends at offset ${off} of ${buf.length} (${buf.length - off} payload bytes remain)`);
