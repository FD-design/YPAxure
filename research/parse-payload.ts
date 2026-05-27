// Walk a record's payload as a stream of typed values, using the string table for refs.
// Run: npm exec tsx research/parse-payload.ts -- <record.bin> [--max=400]
import { readSample, u32le } from "./lib/io.js";

const path = process.argv[2];
if (!path) {
  console.error("usage: parse-payload <record.bin> [--max=N]");
  process.exit(1);
}
const maxArg = process.argv.find((a) => a.startsWith("--max="));
const max = maxArg ? parseInt(maxArg.split("=")[1]!, 10) : 400;

const buf = readSample(path);

// --- Parse string table (same as dump-schema) ---
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

console.log(`String table: ${strCount} entries, payload starts at offset ${payloadStart}`);
console.log(`Payload size: ${buf.length - payloadStart} bytes\n`);

// --- Type-tag definitions (hypothesized; extend as discovered) ---
// Each handler returns the number of bytes consumed AFTER the 4-byte tag.
interface TagSpec {
  name: string;
  decode: (buf: Buffer, off: number) => { repr: string; consumed: number };
}
const TAGS: Record<number, TagSpec> = {
  0x01: {
    name: "u32(t1)",
    decode: (b, o) => ({ repr: `${u32le(b, o)}`, consumed: 4 }),
  },
  0x02: {
    name: "u32(t2)",
    decode: (b, o) => ({ repr: `${u32le(b, o)}`, consumed: 4 }),
  },
  0x03: {
    name: "u32(t3)",
    decode: (b, o) => ({ repr: `${u32le(b, o)}`, consumed: 4 }),
  },
  0x05: {
    name: "u32(t5)",
    decode: (b, o) => {
      const v = u32le(b, o);
      const hex = v.toString(16).toUpperCase().padStart(8, "0");
      return { repr: `${v}  (0x${hex})`, consumed: 4 };
    },
  },
  0x06: {
    name: "f64",
    decode: (b, o) => ({ repr: `${b.readDoubleLE(o)}`, consumed: 8 }),
  },
  0x08: {
    name: "strref",
    decode: (b, o) => {
      const idx = u32le(b, o);
      const s = idx < strings.length ? JSON.stringify(strings[idx]) : "<out-of-range>";
      return { repr: `#${idx} = ${s}`, consumed: 4 };
    },
  },
  0x09: {
    name: "u32(t9)",
    decode: (b, o) => ({ repr: `${u32le(b, o)}`, consumed: 4 }),
  },
  0x11: {
    name: "u32(t17)",
    decode: (b, o) => ({ repr: `${u32le(b, o)}`, consumed: 4 }),
  },
  0x12: {
    name: "u32(t18)",
    decode: (b, o) => ({ repr: `${u32le(b, o)}`, consumed: 4 }),
  },
  0x19: {
    name: "u32(t25)",
    decode: (b, o) => ({ repr: `${u32le(b, o)}`, consumed: 4 }),
  },
  0x1a: {
    name: "container",
    decode: (b, o) => ({ repr: `count=${u32le(b, o)}`, consumed: 4 }),
  },
  0x1e: {
    name: "guidlist",
    decode: (b, o) => {
      const n = u32le(b, o);
      return { repr: `count=${n}, ${n} × 16-byte GUIDs follow`, consumed: 4 + n * 16 };
    },
  },
};

// Permissive fallback: if a tag is unknown but the next u32 looks like a sane scalar,
// treat it as "u32(t?)" and keep walking, while still flagging it.
const ALLOW_FALLBACK = true;

// --- Walk payload ---
let p = payloadStart;
let step = 0;
const unknownTags = new Map<number, number>();
while (p + 4 <= buf.length && step < max) {
  const tag = u32le(buf, p);
  let spec = TAGS[tag];
  let fallbackUsed = false;
  if (!spec) {
    unknownTags.set(tag, (unknownTags.get(tag) ?? 0) + 1);
    if (!ALLOW_FALLBACK || tag > 0xff) {
      console.log(`@${p.toString().padStart(6)}  ?? unknown tag 0x${tag.toString(16).toUpperCase()} (=${tag})  — stopping`);
      break;
    }
    spec = {
      name: `u32(t${tag}?)`,
      decode: (b, o) => ({ repr: `${u32le(b, o)}  [unknown tag]`, consumed: 4 }),
    };
    fallbackUsed = true;
  }
  const tagOff = p;
  p += 4;
  if (p + 4 > buf.length) break;
  let result;
  try {
    result = spec.decode(buf, p);
  } catch (e) {
    console.log(`@${tagOff.toString().padStart(6)}  decode failed for ${spec.name}: ${e}`);
    break;
  }
  const flag = fallbackUsed ? " !" : "  ";
  console.log(`@${tagOff.toString().padStart(6)} ${flag} ${spec.name.padEnd(10)} ${result.repr}`);
  p += result.consumed;
  step++;
}
console.log(`\nWalked ${step} typed values, stopped at offset ${p} of ${buf.length}`);
if (unknownTags.size > 0) {
  console.log(`Unknown tags encountered: ${[...unknownTags.entries()].map(([t, c]) => `0x${t.toString(16)} ×${c}`).join(", ")}`);
}
