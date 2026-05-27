// Smoke test: call inspect() and dumpRecord() on a sample, print results.
// Run: npx tsx src/smoke-test.ts
import { inspect, dumpRecord } from "./parser/index.js";

const path = process.argv[2] ?? "samples/blank.rp";

console.log(`\n===== inspect("${path}") =====\n`);
const ins = inspect(path);
// Truncate the long arrays for readability in the smoke test
const insSummary = {
  ...ins,
  records: ins.records.map((r) => ({
    ...r,
    inner: r.inner
      ? {
          ...r.inner,
          userStrings: r.inner.userStrings.length > 8
            ? [...r.inner.userStrings.slice(0, 8), `… (${r.inner.userStrings.length - 8} more)`]
            : r.inner.userStrings,
        }
      : undefined,
  })),
};
console.log(JSON.stringify(insSummary, null, 2));

const firstPage = ins.records.find((r) => r.className === "Axure:Page");
if (firstPage) {
  console.log(`\n===== dumpRecord("${path}", ${firstPage.index}) — first 10 strrefs =====\n`);
  const dump = dumpRecord(path, firstPage.index, { strrefLimit: 10 });
  console.log(
    JSON.stringify(
      {
        index: dump.index,
        className: dump.className,
        inflatedSize: dump.inflatedSize,
        innerHeader: dump.inner?.header,
        stringTableSize: dump.inner?.strings.length,
        firstStrings: dump.inner?.strings.slice(0, 8),
        strrefSampleCount: dump.inner?.strrefSequence.length,
        firstStrrefs: dump.inner?.strrefSequence,
      },
      null,
      2,
    ),
  );
}
