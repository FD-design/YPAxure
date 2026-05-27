// Find every `(strref "fill-color" or "Color")(tag 0x05)(u32)` occurrence in a record.
// Identifies which u32 ARGB values are fill colors, border colors, text colors.
import { readSample, u32le } from "./lib/io.js";

const buf = readSample(process.argv[2]!);
const strCount = u32le(buf, 28);
const strings: string[] = [];
let off = 32;
for (let i = 0; i < strCount; i++) {
  const len = u32le(buf, off);
  off += 4;
  strings.push(buf.subarray(off, off + len).toString("utf8"));
  off += len;
}

function findRefs(field: string) {
  const idx = strings.indexOf(field);
  if (idx < 0) {
    console.log(`(no strref for ${field})`);
    return;
  }
  console.log(`\n${field} (strref ${idx}):`);
  for (let i = 32; i + 16 <= buf.length; i++) {
    if (buf[i] !== 0x08 || u32le(buf, i + 4) !== idx) continue;
    const tag = u32le(buf, i + 8);
    // tag 05 = u32; tag 08 = strref-to-string
    if (tag === 0x05) {
      const v = u32le(buf, i + 12) >>> 0;
      const hex = "0x" + v.toString(16).padStart(8, "0");
      console.log(`  @${i.toString().padStart(6)}  ARGB=${hex} (A=${(v >>> 24) & 0xff}, R=${(v >>> 16) & 0xff}, G=${(v >>> 8) & 0xff}, B=${v & 0xff})`);
    } else if (tag === 0x08) {
      const refIdx = u32le(buf, i + 12);
      console.log(`  @${i.toString().padStart(6)}  -> strref(${refIdx}) "${strings[refIdx]}"`);
    }
  }
}

findRefs("fill-color");
findRefs("Color");
findRefs("line-color");
findRefs("text-color");
findRefs("font-color");
findRefs("FillColor");
findRefs("LineColor");
