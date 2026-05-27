import { pasteTemplate } from "./parser/clipboard.js";

const positions: Array<[number, number]> = [
  [800, 500],
  [1100, 500],
  [800, 800],
];
for (const [x, y] of positions) {
  console.log(`Pasting at (${x}, ${y})...`);
  const r = pasteTemplate("rectangle_one", { autoPaste: true, cursorX: x, cursorY: y });
  console.log("  ->", r.autoPaste);
  // Brief delay between
  const end = Date.now() + 700;
  while (Date.now() < end) {}
}
console.log("Done.");
