// High-level inspection that combines outer + record + payload analysis.
import { readFileSync } from "node:fs";
import { openAxureFile, type OuterFile } from "./outer.js";
import { parseRecord } from "./record.js";
import { scanStrrefs, userStringsFromSchema, widgetClassesFromSchema, type Strref } from "./payload.js";

export interface RecordSummary {
  index: number;
  offsetHex: string;
  className: string;
  inflatedSize: number;
  /** if successfully parsed as an inner record: extra info */
  inner?: {
    stringCount: number;
    payloadStart: number;
    widgetKinds: string[]; // empty unless Page/Master
    userStrings: string[]; // heuristically chosen
  };
  /** populated only when the record is just raw XML (no inner format) */
  xmlPreview?: string;
}

export interface InspectResult {
  path: string;
  fileSize: number;
  outerHeaderHex: string;
  majorVersion: number;
  recordCount: number;
  pageCount: number;
  masterCount: number;
  /** the literal "11.0.0.4137"-style version string mined from any record that contains it; null if not found */
  axureVersionString: string | null;
  records: RecordSummary[];
}

export function inspect(rpPath: string): InspectResult {
  const outer = openAxureFile(rpPath);
  let axureVersionString: string | null = null;
  const records: RecordSummary[] = [];
  for (const rec of outer.records) {
    const summary: RecordSummary = {
      index: rec.index,
      offsetHex: rec.offset.toString(16),
      className: rec.className,
      inflatedSize: rec.payload.length,
    };
    if (rec.className.startsWith("xml:")) {
      summary.xmlPreview = rec.payload
        .subarray(0, Math.min(rec.payload.length, 240))
        .toString("utf8");
      records.push(summary);
      continue;
    }
    try {
      const parsed = parseRecord(rec.payload);
      summary.inner = {
        stringCount: parsed.strings.length,
        payloadStart: parsed.payloadStart,
        widgetKinds: widgetClassesFromSchema(parsed.strings),
        userStrings: userStringsFromSchema(parsed.strings),
      };
      if (!axureVersionString) {
        for (const s of parsed.strings) {
          if (/^\d+\.\d+\.\d+\.\d+$/.test(s)) {
            axureVersionString = s;
            break;
          }
        }
      }
    } catch {
      // leave inner undefined
    }
    records.push(summary);
  }
  // Fallback: mine the version from the outer manifest's plaintext fragments.
  // The version lives near the front (offset 15..~1200) in plaintext like ".version" with the number
  // a few bytes away. A loose regex on the first 4 KB catches it.
  if (!axureVersionString) {
    try {
      const raw = readFileSync(rpPath);
      const head = raw.subarray(0, Math.min(4096, raw.length)).toString("latin1");
      const m = head.match(/(\d+\.\d+\.\d+\.\d+)/);
      if (m) axureVersionString = m[1]!;
    } catch {
      // ignore
    }
  }
  return {
    path: rpPath,
    fileSize: outer.fileSize,
    outerHeaderHex: outer.header.rawHex,
    majorVersion: outer.header.majorVersion,
    recordCount: outer.records.length,
    pageCount: records.filter((r) => r.className === "Axure:Page").length,
    masterCount: records.filter((r) => r.className === "Axure:Master").length,
    axureVersionString,
    records,
  };
}

export interface DumpRecordResult {
  index: number;
  className: string;
  inflatedSize: number;
  inner?: {
    header: {
      w0: number;
      majorVersion: number;
      magicC351Hex: string;
      w6: number;
      stringCount: number;
    };
    strings: { index: number; text: string }[];
    payloadStart: number;
    strrefSequence: Strref[];
  };
  xmlContent?: string;
}

export function dumpRecord(rpPath: string, recordIndex: number, opts?: { strrefLimit?: number }): DumpRecordResult {
  const outer = openAxureFile(rpPath);
  const rec = outer.records[recordIndex];
  if (!rec) throw new Error(`recordIndex ${recordIndex} out of range (have ${outer.records.length})`);
  const result: DumpRecordResult = {
    index: rec.index,
    className: rec.className,
    inflatedSize: rec.payload.length,
  };
  if (rec.className.startsWith("xml:")) {
    result.xmlContent = rec.payload.toString("utf8");
    return result;
  }
  const parsed = parseRecord(rec.payload);
  let strrefs = scanStrrefs(rec.payload, parsed.payloadStart, parsed.strings);
  const limit = opts?.strrefLimit ?? 2000;
  if (strrefs.length > limit) strrefs = strrefs.slice(0, limit);
  result.inner = {
    header: {
      w0: parsed.header.w0,
      majorVersion: parsed.header.majorVersion,
      magicC351Hex: parsed.header.magicC351.toString(16).toUpperCase(),
      w6: parsed.header.w6,
      stringCount: parsed.header.stringCount,
    },
    strings: parsed.strings.map((text, index) => ({ index, text })),
    payloadStart: parsed.payloadStart,
    strrefSequence: strrefs,
  };
  return result;
}
