// Walk a .rp file: validate header, extract all gzip records.
import { gunzipSync } from "node:zlib";
import { readFile, u32le } from "./io.js";

export interface OuterHeader {
  magic: string; // "ACEF"
  majorVersion: number; // 0x0B = RP11, 0x09 = RP9
  /** raw 15-byte header bytes for reference */
  rawHex: string;
}

export interface ExtractedRecord {
  index: number;
  /** byte offset of the gzip stream's start in the outer file */
  offset: number;
  /** class name detected by latin1 regex on the first 256 bytes of the decompressed payload */
  className: string;
  /** decompressed bytes */
  payload: Buffer;
}

export interface OuterFile {
  path: string;
  fileSize: number;
  header: OuterHeader;
  records: ExtractedRecord[];
}

export function openAxureFile(path: string): OuterFile {
  const buf = readFile(path);
  if (buf.length < 15) throw new Error("file too small to be .rp");
  if (buf[0] !== 0xac || buf[1] !== 0xef) {
    throw new Error(`bad magic: got ${buf[0]!.toString(16)} ${buf[1]!.toString(16)}, expected AC EF`);
  }
  const header: OuterHeader = {
    magic: "ACEF",
    majorVersion: buf[2]!,
    rawHex: Array.from(buf.subarray(0, 15), (b) => b.toString(16).padStart(2, "0").toUpperCase()).join(" "),
  };

  const records: ExtractedRecord[] = [];
  let i = 0;
  while (i < buf.length - 10) {
    if (buf[i] !== 0x1f || buf[i + 1] !== 0x8b || buf[i + 2] !== 0x08) {
      i++;
      continue;
    }
    let payload: Buffer;
    try {
      payload = gunzipSync(buf.subarray(i));
    } catch {
      i++;
      continue;
    }
    const preview = payload.subarray(0, Math.min(256, payload.length)).toString("latin1");
    const m = preview.match(/Axure:[A-Za-z0-9_]+/);
    const className = m ? m[0] : detectXmlRoot(payload) ?? "unknown";
    records.push({ index: records.length, offset: i, className, payload });
    i++;
  }
  return { path, fileSize: buf.length, header, records };
}

function detectXmlRoot(buf: Buffer): string | null {
  const head = buf.subarray(0, Math.min(64, buf.length)).toString("latin1").trimStart();
  const m = head.match(/^<([A-Za-z][A-Za-z0-9]*)/);
  return m ? `xml:${m[1]}` : null;
}
