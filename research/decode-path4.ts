// Dump bytes between Height / Y / Width occurrences to reveal the full widget
// position+size container.
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

function dumpRange(start: number, end: number) {
  console.log(`\nRange @${start}..${end} (${end - start} bytes)`);
  // Walk all strrefs and tag05/06 in range
  const items: { off: number; desc: string }[] = [];
  for (let i = start; i + 4 <= end; i++) {
    if (buf[i] === 0x08 && buf[i + 1] === 0 && buf[i + 2] === 0 && buf[i + 3] === 0) {
      const idx = u32le(buf, i + 4);
      if (idx < strings.length) {
        items.push({ off: i, desc: `strref(${idx}) "${strings[idx]}"` });
      }
    }
  }
  for (const it of items) {
    // What value is after the strref?
    const afterTag = u32le(buf, it.off + 8);
    let valDesc = "";
    if (afterTag === 0x06) {
      const v = buf.readDoubleLE(it.off + 12);
      valDesc = `  → f64=${v}`;
    } else if (afterTag === 0x05 || afterTag === 0x01 || afterTag === 0x02 || afterTag === 0x03) {
      const v = u32le(buf, it.off + 12);
      valDesc = `  → u32=${v}`;
    } else if (afterTag === 0x08) {
      const idx2 = u32le(buf, it.off + 12);
      if (idx2 < strings.length) valDesc = `  → strref(${idx2}) "${strings[idx2]}"`;
    }
    console.log(`  @${it.off.toString().padStart(6)}  ${it.desc.padEnd(40)}${valDesc}`);
  }
}

// Multiple Styles widget 1: Height=268.8 @10509, Width=100.4 @10609
// Show the full widget instance container — search backward for class name
const args = process.argv.slice(3).map((s) => parseInt(s, 10));
if (args.length === 2) {
  dumpRange(args[0]!, args[1]!);
} else {
  console.error("usage: decode-path4 <bin> <startOffset> <endOffset>");
}
