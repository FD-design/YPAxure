import { readFileSync } from "node:fs";

export function readFile(path: string): Buffer {
  return readFileSync(path);
}

export function u32le(buf: Buffer, offset: number): number {
  return buf.readUInt32LE(offset);
}

export function u16le(buf: Buffer, offset: number): number {
  return buf.readUInt16LE(offset);
}
