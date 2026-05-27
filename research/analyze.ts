// Top-level summary report for one .rp file.
// Run: npm run analyze -- <path>
import { readSample, hex, asciiPreview, u32le, entropy, getArgFile } from "./lib/io.js";

const path = getArgFile();
const buf = readSample(path);
const size = buf.length;

console.log(`File:    ${path}`);
console.log(`Size:    ${size} bytes (${(size / 1024 / 1024).toFixed(2)} MB)`);

// ---- Header ----
const magic = hex(buf.subarray(0, 2));
const majorVer = buf[2]!;
const byte3 = buf[3]!;
const u32_4 = u32le(buf, 4);
const byte8 = buf[8]!;
const bytes9to14 = hex(buf.subarray(9, 15));
console.log("\n[Header]");
console.log(`  magic (0..1):      ${magic}    (expected AC EF)`);
console.log(`  majorVer (2):      0x${majorVer.toString(16).padStart(2, "0").toUpperCase()} (= ${majorVer})`);
console.log(`  byte3:             0x${byte3.toString(16).padStart(2, "0").toUpperCase()}`);
console.log(`  u32le (4..7):      ${u32_4}  (0x${u32_4.toString(16)})`);
console.log(`  byte8:             0x${byte8.toString(16).padStart(2, "0").toUpperCase()}`);
console.log(`  bytes 9..14:       ${bytes9to14}`);
console.log(`  bytes 15..34 hex:  ${hex(buf.subarray(15, 35))}`);
console.log(`  bytes 15..34 asc:  ${asciiPreview(buf.subarray(15, 35))}`);

// ---- Tail ----
const tailStart = Math.max(0, size - 32);
console.log("\n[Tail (last 32 bytes)]");
console.log(`  hex: ${hex(buf.subarray(tailStart))}`);
console.log(`  asc: ${asciiPreview(buf.subarray(tailStart))}`);

// ---- Entropy ----
const sampleLen = Math.min(65536, size);
const ent = entropy(buf, 0, sampleLen);
console.log(`\n[Entropy] first ${sampleLen} bytes: ${ent.toFixed(3)} bits/byte (random=8.000)`);

// ---- Signature scan ----
let jpeg = 0,
  png = 0,
  zlibLike = 0,
  gzip = 0;
const jpegOffsets: number[] = [];
const zlibOffsets: number[] = [];
for (let i = 0; i < size - 3; i++) {
  const b0 = buf[i]!,
    b1 = buf[i + 1]!,
    b2 = buf[i + 2]!,
    b3 = buf[i + 3]!;
  if (b0 === 0xff && b1 === 0xd8 && b2 === 0xff) {
    jpeg++;
    if (jpegOffsets.length < 5) jpegOffsets.push(i);
  }
  if (b0 === 0x89 && b1 === 0x50 && b2 === 0x4e && b3 === 0x47) png++;
  if (b0 === 0x78 && (b1 === 0x9c || b1 === 0xda || b1 === 0x5e || b1 === 0x01)) {
    zlibLike++;
    if (zlibOffsets.length < 5) zlibOffsets.push(i);
  }
  if (b0 === 0x1f && b1 === 0x8b) gzip++;
}
console.log("\n[Embedded signature scan]");
console.log(`  JPEG (FF D8 FF):       ${jpeg}  first offsets: ${jpegOffsets.join(", ")}`);
console.log(`  PNG  (89 50 4E 47):    ${png}`);
console.log(`  zlib-like (78 9C/...): ${zlibLike}  first offsets: ${zlibOffsets.join(", ")}`);
console.log(`  gzip (1F 8B):          ${gzip}  (often false positives at high density)`);
