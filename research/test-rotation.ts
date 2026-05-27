// Quick test: does Axure honor the `rotation` field on Axvg widgets?
// We paste 4 rectangles at 0°, 45°, 90°, and 135° rotation. If Axure renders them
// rotated, we have a powerful new primitive for icons (search lens handle, send arrows, etc.).
import { composeDesign, frame, rect, text, hex, pasteAxvg, resetIds } from "../dist/parser/index.js";

resetIds();

function rotatedRect(x: number, y: number, rotation: number, color: any) {
  return {
    ...rect({ x, y, w: 80, h: 20, fill: color, corners: 4 }),
    rotation,
  };
}

const page = frame({
  name: "Rotation test",
  w: 400, h: 300,
  bg: hex("#FFFFFF"),
  children: [
    text({ x: 0, y: 20, w: 400, h: 24, content: "Rotation test: 0° 45° 90° 135°",
           size: 14, color: hex("#000"), align: "center" }),
    rotatedRect(40, 100, 0,   hex("#3B82F6")),  // blue, horizontal
    rotatedRect(140, 100, 45, hex("#EF4444")),  // red, 45°
    rotatedRect(240, 100, 90, hex("#10B981")),  // green, vertical
    rotatedRect(340, 100, 135, hex("#A855F7")), // purple, 135°
  ],
});

const result = pasteAxvg(composeDesign(page), { autoPaste: true });
console.log(JSON.stringify(result, null, 2));
