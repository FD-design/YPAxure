import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export function readSample(path: string): Buffer {
  const abs = resolve(path);
  return readFileSync(abs);
}

export function hex(buf: Buffer, max = buf.length): string {
  const out: string[] = [];
  const n = Math.min(max, buf.length);
  for (let i = 0; i < n; i++) out.push(buf[i]!.toString(16).padStart(2, "0").toUpperCase());
  return out.join(" ");
}

export function asciiPreview(buf: Buffer, max = buf.length): string {
  let out = "";
  const n = Math.min(max, buf.length);
  for (let i = 0; i < n; i++) {
    const b = buf[i]!;
    out += b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : ".";
  }
  return out;
}

export function u32le(buf: Buffer, offset: number): number {
  return buf.readUInt32LE(offset);
}

export function u16le(buf: Buffer, offset: number): number {
  return buf.readUInt16LE(offset);
}

export function getArgFile(): string {
  const path = process.argv[2];
  if (!path) {
    console.error("usage: <script> <path-to-.rp-file>");
    process.exit(1);
  }
  return path;
}

export function entropy(buf: Buffer, start = 0, len = buf.length - start): number {
  const counts = new Array<number>(256).fill(0);
  const end = Math.min(buf.length, start + len);
  for (let i = start; i < end; i++) counts[buf[i]!]!++;
  const n = end - start;
  let h = 0;
  for (const c of counts) {
    if (c === 0) continue;
    const p = c / n;
    h -= p * Math.log2(p);
  }
  return h;
}
