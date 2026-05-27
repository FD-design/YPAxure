import { pasteSequence } from "./parser/synth.js";

const widgets = [
  { cursorX: 760, cursorY: 350 },
  { cursorX: 760, cursorY: 200 },
  { cursorX: 760, cursorY: 290 },
  { cursorX: 760, cursorY: 380 },
  { cursorX: 760, cursorY: 460 },
  { cursorX: 760, cursorY: 540 },
  { cursorX: 760, cursorY: 620 },
];
(async () => {
  const results = await pasteSequence(widgets, { autoPaste: true, delayMs: 600 });
  console.log("done", results.length);
})();
