// Lightweight payload-level extraction: scan for `08 XX XX XX XX` string-table references.
import { u32le } from "./io.js";

export interface Strref {
  offset: number;
  index: number;
  text: string;
}

export function scanStrrefs(payload: Buffer, payloadStart: number, strings: string[]): Strref[] {
  const out: Strref[] = [];
  for (let i = payloadStart; i + 8 <= payload.length; i++) {
    if (payload[i] !== 0x08 || payload[i + 1] !== 0 || payload[i + 2] !== 0 || payload[i + 3] !== 0) continue;
    const idx = u32le(payload, i + 4);
    if (idx >= strings.length) continue;
    out.push({ offset: i, index: idx, text: strings[idx]! });
  }
  return out;
}

/** Strings whose name matches `Axure:DiagramObject:*` — these are the widget class identifiers
 * baked into the schema of a Page record. Their presence proves a Page contains widgets of that kind. */
export function widgetClassesFromSchema(strings: string[]): string[] {
  const kinds = new Set<string>();
  for (const s of strings) {
    if (s.startsWith("Axure:DiagramObject:")) kinds.add(s.slice("Axure:DiagramObject:".length));
  }
  return [...kinds].sort();
}

/** Strings that look like user-supplied content (Chinese / non-ASCII / quoted text / multi-word
 * English not matching field-name shapes). Heuristic, not authoritative. */
export function userStringsFromSchema(strings: string[]): string[] {
  const out: string[] = [];
  for (const s of strings) {
    if (s.length === 0) continue;
    if (s.startsWith("Axure:")) continue;
    if (/^[A-Za-z][A-Za-z0-9]*$/.test(s)) continue; // CamelCase or PascalCase field name
    if (/^[a-z][a-z0-9-]*$/.test(s)) continue; // kebab-case field name
    if (s.startsWith("*")) continue; // *type style field
    if (/^[A-Z][a-z]+(?:\s[A-Z][a-z]+)*$/.test(s)) continue; // "Arial Normal" font-spec-ish
    // common ASCII-only multi-token system labels we want to filter
    if (/^[A-Z][A-Za-z]+ [A-Z][A-Za-z]+$/.test(s)) continue;
    out.push(s);
  }
  return out;
}
