// Side-by-side hex+ASCII dump of a byte range.
// Run: npm exec tsx research/hexdump.ts -- <path> [--start=0] [--len=2048] [--width=16]
import { readSample } from "./lib/io.js";

const path = process.argv[2];
if (!path) {
  console.error("usage: hexdump <path> [--start=N] [--len=N] [--width=N]");
  process.exit(1);
}
const startArg = process.argv.find((a) => a.startsWith("--start="));
const lenArg = process.argv.find((a) => a.startsWith("--len="));
const widthArg = process.argv.find((a) => a.startsWith("--width="));
const start = startArg ? parseInt(startArg.split("=")[1]!, 10) : 0;
const len = lenArg ? parseInt(lenArg.split("=")[1]!, 10) : 2048;
const width = widthArg ? parseInt(widthArg.split("=")[1]!, 10) : 16;

const buf = readSample(path);
const end = Math.min(buf.length, start + len);

for (let i = start; i < end; i += width) {
  const slice = buf.subarray(i, Math.min(end, i + width));
  const hex = Array.from(slice, (b) => b.toString(16).padStart(2, "0").toUpperCase()).join(" ").padEnd(width * 3 - 1);
  const ascii = Array.from(slice, (b) => (b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : ".")).join("");
  console.log(`${i.toString(16).padStart(8, "0")}  ${hex}  |${ascii}|`);
}
