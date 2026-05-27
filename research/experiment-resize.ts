// Experiment: patch the rectangle_one.bin clipboard template's path control points
// from (0,0)(0,1)(1,1)(1,0) [unit square] to (0,0)(0,H)(W,H)(W,0) [actual size],
// write to clipboard, optionally auto-paste.
//
// Hypothesis (to verify): the widget's rendered size comes from the path control points
// in absolute pixels, NOT the strref "Width"/"Y" values we see in the schema cache.
//
// Usage:
//   npx tsx research/experiment-resize.ts <width> <height> [--paste]
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const args = process.argv.slice(2);
const widthArg = args[0];
const heightArg = args[1];
const doPaste = args.includes("--paste");
if (!widthArg || !heightArg) {
  console.error("usage: experiment-resize <width> <height> [--paste]");
  process.exit(1);
}
const W = parseFloat(widthArg);
const H = parseFloat(heightArg);

const tpl = "samples/clipboard/rectangle_one.bin";
const buf = Buffer.from(readFileSync(tpl));

// Locations from the prior decode (rectangle_one.bin):
//   LH strref starts at:  9301, 9490, 9679, 9868
//   f64 Y at i+28:        9329, 9518, 9707, 9896
//   f64 Width at i+48:    9349, 9538, 9727, 9916
//
// In Axure encoding (Y, Width) = (y_coord, x_coord) so the unit square goes
// clockwise from top-left: (x=0,y=0) (x=0,y=1) (x=1,y=1) (x=1,y=0).
// Scale to (W, H):
//   LH1: x=0, y=0       → Y=0, Width=0
//   LH2: x=0, y=H       → Y=H, Width=0
//   LH3: x=W, y=H       → Y=H, Width=W
//   LH4: x=W, y=0       → Y=0, Width=W
const patches: Array<{ offset: number; from: number; to: number; label: string }> = [
  { offset: 9329, from: buf.readDoubleLE(9329), to: 0, label: "LH1.Y" },
  { offset: 9349, from: buf.readDoubleLE(9349), to: 0, label: "LH1.Width" },
  { offset: 9518, from: buf.readDoubleLE(9518), to: H, label: "LH2.Y" },
  { offset: 9538, from: buf.readDoubleLE(9538), to: 0, label: "LH2.Width" },
  { offset: 9707, from: buf.readDoubleLE(9707), to: H, label: "LH3.Y" },
  { offset: 9727, from: buf.readDoubleLE(9727), to: W, label: "LH3.Width" },
  { offset: 9896, from: buf.readDoubleLE(9896), to: 0, label: "LH4.Y" },
  { offset: 9916, from: buf.readDoubleLE(9916), to: W, label: "LH4.Width" },
];

console.log(`Patching for ${W}×${H} rectangle:`);
for (const p of patches) {
  buf.writeDoubleLE(p.to, p.offset);
  console.log(`  @${p.offset}  ${p.label.padEnd(12)} ${p.from} → ${p.to}`);
}

const outPath = "research/_resize_test.bin";
writeFileSync(outPath, buf);
console.log(`\nWrote ${outPath}, ${buf.length} bytes`);

if (doPaste) {
  console.log("\nPasting...");
  const psArgs = [
    "-ExecutionPolicy", "Bypass",
    "-NoProfile",
    "-File", "research/set-clipboard.ps1",
    "-Path", outPath,
    "-AutoPaste",
  ];
  const r = spawnSync("powershell", psArgs, { encoding: "utf8" });
  console.log(r.stdout);
  if (r.stderr) console.error("STDERR:", r.stderr);
}
