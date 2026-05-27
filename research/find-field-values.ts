// Walk the payload of a record and print every (strref field-name)(f64 value) pair.
// This reveals which fields have what numeric value, without needing a full payload parser.
// Run: npm exec tsx research/find-field-values.ts -- <record.bin> [--filter=name]
import { readSample, u32le } from "./lib/io.js";

const path = process.argv[2];
if (!path) {
  console.error("usage: find-field-values <record.bin> [--filter=substr]");
  process.exit(1);
}
const filterArg = process.argv.find((a) => a.startsWith("--filter="));
const filter = filterArg ? filterArg.split("=")[1]! : null;
const startArg = process.argv.find((a) => a.startsWith("--start="));
const startAt = startArg ? parseInt(startArg.split("=")[1]!, 10) : 0;
const endArg = process.argv.find((a) => a.startsWith("--end="));
const endAt = endArg ? parseInt(endArg.split("=")[1]!, 10) : Infinity;
const nonZeroOnly = process.argv.includes("--non-zero");

const buf = readSample(path);

// Parse string table
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

// Walk payload looking for (strref tag=08)(strref-value u32)(f64 tag=06)(8 bytes f64)
interface Hit {
  offset: number;
  field: string;
  fieldIndex: number;
  value: number;
}
const hits: Hit[] = [];

const scanStart = Math.max(payloadStart, startAt);
const scanEnd = Math.min(buf.length, endAt);
for (let i = scanStart; i + 20 <= scanEnd; i++) {
  // Match: 08 00 00 00 [u32 idx] 06 00 00 00 [f64]
  if (buf[i] !== 0x08 || buf[i + 1] !== 0 || buf[i + 2] !== 0 || buf[i + 3] !== 0) continue;
  const idx = u32le(buf, i + 4);
  if (idx >= strCount) continue;
  if (buf[i + 8] !== 0x06 || buf[i + 9] !== 0 || buf[i + 10] !== 0 || buf[i + 11] !== 0) continue;
  const value = buf.readDoubleLE(i + 12);
  // Filter NaN (false positives where bytes coincidentally match the pattern)
  if (Number.isNaN(value)) continue;
  if (nonZeroOnly && Math.abs(value) < 1e-12) continue;
  hits.push({ offset: i, field: strings[idx]!, fieldIndex: idx, value });
}

console.log(`Record: ${path}`);
console.log(`Payload starts at ${payloadStart}, length ${buf.length - payloadStart}`);
console.log(`Found ${hits.length} (strref field)(f64 value) pairs\n`);

// Group: show all distinct field-value combos and their offsets
const filtered = filter ? hits.filter((h) => h.field.includes(filter)) : hits;

for (const h of filtered) {
  const valStr =
    Number.isNaN(h.value)
      ? "NaN"
      : !Number.isFinite(h.value)
        ? String(h.value)
        : Math.abs(h.value) < 1e-10
          ? "0.0"
          : h.value.toString();
  console.log(`  @${h.offset.toString().padStart(6)}  ${h.field.padEnd(28)} = ${valStr}`);
}
