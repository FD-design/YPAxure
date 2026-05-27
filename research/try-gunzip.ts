// Try gunzip at every 1F 8B 08 occurrence, plus at u32-length-prefixed offsets.
// Run: npm exec tsx research/try-gunzip.ts -- <path> [--limit=20]
import { gunzipSync } from "node:zlib";
import { readSample } from "./lib/io.js";

const path = process.argv[2];
if (!path) {
  console.error("usage: try-gunzip <path> [--limit=N]");
  process.exit(1);
}
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const limit = limitArg ? parseInt(limitArg.split("=")[1]!, 10) : 20;

const buf = readSample(path);

interface Hit {
  offset: number;
  outBytes: number;
  outPreview: string;
}
const hits: Hit[] = [];

for (let i = 0; i < buf.length - 10 && hits.length < limit; i++) {
  if (buf[i] !== 0x1f || buf[i + 1] !== 0x8b || buf[i + 2] !== 0x08) continue;
  try {
    const out = gunzipSync(buf.subarray(i));
    if (out.length > 0) {
      hits.push({
        offset: i,
        outBytes: out.length,
        outPreview: out
          .subarray(0, Math.min(200, out.length))
          .toString("utf8")
          .replace(/\s+/g, " ")
          .replace(/[^\x20-\x7e一-鿿]/g, "."),
      });
    }
  } catch {
    /* nope */
  }
}

console.log(`Found ${hits.length} gunzip-able streams (limit=${limit})\n`);
for (const h of hits) {
  console.log(`@${h.offset.toString().padStart(8)} (0x${h.offset.toString(16)})  out=${h.outBytes} bytes`);
  console.log(`  preview: ${h.outPreview}`);
  console.log();
}
