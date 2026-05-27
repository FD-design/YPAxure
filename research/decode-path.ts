// Decode a rectangle widget's path/ControlPoints encoding.
// Strategy: locate the strref to "ControlPoints" or "Path" in the payload, then dump
// the bytes immediately after to see the structure.
//
// usage: npm exec tsx research/decode-path.ts -- <record.bin>
import { readSample, u32le } from "./lib/io.js";

const path = process.argv[2];
if (!path) {
  console.error("usage: decode-path <record.bin>");
  process.exit(1);
}

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

console.log(`File: ${path}`);
console.log(`Strings: ${strCount}, payload starts at ${payloadStart}, file size ${buf.length}`);

function idxOf(s: string): number {
  return strings.indexOf(s);
}

const target = ["ControlPoints", "Path", "LowerHandle", "HigherHandle", "Shape", "Start", "End", "Width", "Height"];
const indices = new Map<string, number>();
for (const t of target) {
  const i = idxOf(t);
  if (i >= 0) indices.set(t, i);
  console.log(`  ${t.padEnd(20)} -> strref ${i}`);
}

// Find every strref to each target field, in order
interface Strref {
  off: number;
  index: number;
  text: string;
}
const refs: Strref[] = [];
for (let i = payloadStart; i + 8 <= buf.length; i++) {
  if (buf[i] !== 0x08 || buf[i + 1] !== 0 || buf[i + 2] !== 0 || buf[i + 3] !== 0) continue;
  const idx = u32le(buf, i + 4);
  if (idx >= strCount) continue;
  refs.push({ off: i, index: idx, text: strings[idx]! });
}

// Find the "Path" strref and dump bytes after it
function hexDump(start: number, length: number): string {
  const lines: string[] = [];
  for (let i = 0; i < length; i += 16) {
    const slice = buf.subarray(start + i, Math.min(start + i + 16, buf.length));
    const hex = Array.from(slice).map((b) => b.toString(16).padStart(2, "0")).join(" ");
    const ascii = Array.from(slice)
      .map((b) => (b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : "."))
      .join("");
    lines.push(`  ${(start + i).toString().padStart(6)}: ${hex.padEnd(48)}  ${ascii}`);
  }
  return lines.join("\n");
}

// Decode a typed value at a given offset; returns the consumed length and a description.
function decodeOne(at: number): { kind: string; desc: string; len: number } {
  if (at + 4 > buf.length) return { kind: "EOF", desc: "EOF", len: 0 };
  const tag = u32le(buf, at);
  if (tag === 0x01 || tag === 0x02 || tag === 0x03 || tag === 0x05 || tag === 0x09 || tag === 0x11 || tag === 0x12 || tag === 0x19) {
    const v = u32le(buf, at + 4);
    return { kind: `u32(t${tag})`, desc: `tag=${tag.toString(16).padStart(2,"0")} u32=${v} (0x${v.toString(16)})`, len: 8 };
  }
  if (tag === 0x06) {
    const v = buf.readDoubleLE(at + 4);
    return { kind: "f64", desc: `tag=06 f64=${v}`, len: 12 };
  }
  if (tag === 0x08) {
    const idx = u32le(buf, at + 4);
    const s = idx < strings.length ? strings[idx] : "?";
    return { kind: `strref(${idx})`, desc: `tag=08 strref=${idx} "${s}"`, len: 8 };
  }
  if (tag === 0x1a) {
    const count = u32le(buf, at + 4);
    return { kind: `1a_container(${count})`, desc: `tag=1a count=${count}`, len: 8 };
  }
  if (tag === 0x1e) {
    const count = u32le(buf, at + 4);
    return { kind: `1e_guidlist(${count})`, desc: `tag=1e guidcount=${count}`, len: 8 + count * 16 };
  }
  return { kind: `UNKNOWN(${tag.toString(16)})`, desc: `unknown tag=0x${tag.toString(16)}`, len: 4 };
}

// Decode K typed values starting at offset
function dumpTyped(start: number, count: number, label: string) {
  console.log(`\n--- ${label} (typed-value walk starting @${start}, ${count} steps) ---`);
  let cur = start;
  for (let k = 0; k < count; k++) {
    if (cur >= buf.length) {
      console.log(`  [EOF at step ${k}]`);
      break;
    }
    const d = decodeOne(cur);
    console.log(`  @${cur.toString().padStart(6)}  ${d.desc}`);
    cur += d.len;
  }
  console.log(`  [stopped at offset ${cur}]`);
}

// For each interesting field, find all its strref occurrences and dump structure following
for (const field of ["Path", "ControlPoints", "LowerHandle", "HigherHandle", "Shape", "Width", "Height"]) {
  const idx = indices.get(field);
  if (idx === undefined) continue;
  const occurrences = refs.filter((r) => r.index === idx);
  console.log(`\n## ${field} (strref ${idx}) — ${occurrences.length} occurrence(s)`);
  for (const occ of occurrences.slice(0, 3)) {
    console.log(`\n  At offset ${occ.off}:`);
    console.log(hexDump(occ.off, 80));
    dumpTyped(occ.off + 8, 30, `after ${field}@${occ.off}`);
  }
}
