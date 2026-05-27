// Try zlib.inflate at every plausible candidate offset to find real compressed streams.
// Run: npm run try-inflate -- <path> [--limit=20]
import { inflateRawSync, inflateSync } from "node:zlib";
import { readSample } from "./lib/io.js";

const path = process.argv[2];
if (!path) {
  console.error("usage: try-inflate <path-to-.rp> [--limit=N]");
  process.exit(1);
}
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const limit = limitArg ? parseInt(limitArg.split("=")[1]!, 10) : 20;

const buf = readSample(path);

interface Success {
  offset: number;
  method: "zlib" | "raw";
  inputBytes: number; // we won't easily know exact length, so approximate
  outputBytes: number;
  preview: string;
}

const successes: Success[] = [];

function tryAt(offset: number) {
  if (successes.length >= limit) return;
  const b0 = buf[offset]!;
  const b1 = offset + 1 < buf.length ? buf[offset + 1]! : 0;
  // Only attempt at typical zlib headers
  const looksZlib = b0 === 0x78 && (b1 === 0x9c || b1 === 0xda || b1 === 0x5e || b1 === 0x01);
  if (!looksZlib) return;
  const slice = buf.subarray(offset);
  try {
    const out = inflateSync(slice);
    if (out.length > 16) {
      successes.push({
        offset,
        method: "zlib",
        inputBytes: slice.length,
        outputBytes: out.length,
        preview: out.subarray(0, Math.min(120, out.length)).toString("ascii").replace(/[^\x20-\x7e]/g, "."),
      });
    }
  } catch {
    // ignore — most candidate offsets will not be real streams
  }
}

// Also try raw deflate at every offset where the next byte's low nibble looks like a deflate block type
// (this is more speculative; keep disabled by default to avoid noise)

for (let i = 15; i < buf.length - 2; i++) tryAt(i);

console.log(`Found ${successes.length} inflate-able offsets (limit=${limit})\n`);
for (const s of successes) {
  console.log(`@${s.offset.toString().padStart(8)}  ${s.method}  out=${s.outputBytes} bytes`);
  console.log(`  preview: ${s.preview}`);
  console.log();
}
