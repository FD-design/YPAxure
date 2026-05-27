import { pasteSequence } from "./parser/synth.js";

const widgets = [
  { width: 320, height: 600, cursorX: 700, cursorY: 350 },
  { width: 60,  height: 60,  cursorX: 700, cursorY: 180 },
  { width: 180, height: 24,  cursorX: 700, cursorY: 260 },
  { width: 280, height: 44,  cursorX: 700, cursorY: 330 },
  { width: 280, height: 40,  cursorX: 700, cursorY: 400 },
  { width: 280, height: 44,  cursorX: 700, cursorY: 470 },
  { width: 280, height: 44,  cursorX: 700, cursorY: 560 },
];
(async () => {
  const results = await pasteSequence(widgets, { autoPaste: true, delayMs: 500 });
  console.log(`Stamped ${results.length}`);
})();
