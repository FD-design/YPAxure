// Parse the inner format of one decompressed record.
import { u32le } from "./io.js";

export interface RecordHeader {
  /** observed constant 27 */
  w0: number;
  /** major version, matches outer header byte 2 (11 for RP11) */
  majorVersion: number;
  /** observed constant 0xC351 — magic for the inner format */
  magicC351: number;
  /** observed constant 31 */
  w6: number;
  /** string-table entry count */
  stringCount: number;
}

export interface ParsedRecord {
  header: RecordHeader;
  strings: string[];
  /** byte offset where typed-value payload begins */
  payloadStart: number;
  /** total bytes of the record */
  totalSize: number;
}

export function parseRecord(buf: Buffer): ParsedRecord {
  if (buf.length < 32) throw new Error("record too short");
  const header: RecordHeader = {
    w0: u32le(buf, 0),
    majorVersion: u32le(buf, 4),
    magicC351: u32le(buf, 20),
    w6: u32le(buf, 24),
    stringCount: u32le(buf, 28),
  };
  if (header.magicC351 !== 0xc351) {
    throw new Error(`bad inner magic at offset 20: 0x${header.magicC351.toString(16)} (expected C351)`);
  }
  const strings: string[] = [];
  let off = 32;
  for (let i = 0; i < header.stringCount; i++) {
    if (off + 4 > buf.length) throw new Error(`truncated string-table at entry ${i}`);
    const len = u32le(buf, off);
    off += 4;
    if (off + len > buf.length) throw new Error(`truncated string at entry ${i}, claimed length ${len}`);
    strings.push(buf.subarray(off, off + len).toString("utf8"));
    off += len;
  }
  return { header, strings, payloadStart: off, totalSize: buf.length };
}
