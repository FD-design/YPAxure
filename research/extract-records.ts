// Walk a .rp file, locate every gzip record, and dump each decompressed payload to disk.
// Run: npm exec tsx research/extract-records.ts -- <path> [--out=samples/extracted]
import { gunzipSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { readSample } from "./lib/io.js";

const path = process.argv[2];
if (!path) {
  console.error("usage: extract-records <path> [--out=DIR]");
  process.exit(1);
}
const outArg = process.argv.find((a) => a.startsWith("--out="));
const outDir = resolve(outArg ? outArg.split("=")[1]! : `samples/extracted/${basename(path, ".rp")}`);
mkdirSync(outDir, { recursive: true });

const buf = readSample(path);

interface Record {
  index: number;
  offset: number;
  inflatedSize: number;
  className: string;
  outPath: string;
}
const records: Record[] = [];

let i = 0;
let index = 0;
while (i < buf.length - 10) {
  if (buf[i] !== 0x1f || buf[i + 1] !== 0x8b || buf[i + 2] !== 0x08) {
    i++;
    continue;
  }
  try {
    const out = gunzipSync(buf.subarray(i));
    // Pull class name from the decompressed payload.
    // .NET-style serialized records start with some header bytes,
    // then a length-prefixed class-name string like "Axure:Page".
    const previewBuf = out.subarray(0, Math.min(256, out.length));
    const m = previewBuf.toString("latin1").match(/Axure:[A-Za-z0-9_]+/);
    const className = m ? m[0] : "unknown";
    const safeName = className.replace(/[^A-Za-z0-9_]/g, "_");
    const outName = `${String(index).padStart(3, "0")}_${i.toString(16)}_${safeName}.bin`;
    const outPath = join(outDir, outName);
    writeFileSync(outPath, out);
    records.push({ index, offset: i, inflatedSize: out.length, className, outPath });
    index++;
    // Skip past the gzip stream. The simplest way: jump forward by 1 and let the scanner find the next 1F 8B 08.
    // (We could compute exact gzip length from the decompressed stream, but +1 is enough to make progress.)
    i++;
  } catch {
    i++;
  }
}

console.log(`Extracted ${records.length} records to ${outDir}\n`);
console.log("idx  offset(hex)   size       class                                            file");
for (const r of records) {
  console.log(
    `${r.index.toString().padStart(3)}  ${r.offset.toString(16).padStart(10)}   ${r.inflatedSize.toString().padStart(8)}  ${r.className.padEnd(48)} ${basename(r.outPath)}`,
  );
}
