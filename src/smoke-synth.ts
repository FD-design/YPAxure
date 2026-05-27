import { synthesizeWidget, findF64Sites, synthesizeAndPaste } from "./parser/synth.js";
import { readFileSync } from "node:fs";

const buf = readFileSync("samples/clipboard/rectangle_one.bin");

console.log("Width patch sites:");
for (const s of findF64Sites(buf, "Width")) {
  console.log(`  @${s.offset}  current=${s.currentValue}`);
}
console.log("");
console.log("Height patch sites:");
for (const s of findF64Sites(buf, "Height")) {
  console.log(`  @${s.offset}  current=${s.currentValue}`);
}
console.log("");

const result = synthesizeWidget({ width: 350, height: 200 });
console.log("Synth with width=350 height=200:", result.patched);

const doPaste = process.argv.includes("--paste");
if (doPaste) {
  const r = synthesizeAndPaste({ width: 350, height: 200, autoPaste: true });
  console.log("\nPaste result:", { autoPaste: r.autoPaste, patched: r.patched });
}
