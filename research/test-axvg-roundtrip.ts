// End-to-end smoke test: generate a small Axvg design FROM SCRATCH (no Figma involved),
// drop it on the clipboard, and auto-paste into Axure. Verifies the natural-language →
// Axvg JSON → Axure paste pipeline.
import { pasteAxvg } from "../dist/parser/index.js";

const color = (r: number, g: number, b: number, a = 1) => ({ r, g, b, a });
const rect = (x: number, y: number, w: number, h: number) => ({
  location: { x, y },
  size: { width: w, height: h },
});

const widgetDefaults = {
  visible: true,
  isLocked: false,
  rotation: 0,
  opacity: 1,
  type: 0,
  booleanOperation: 0,
  isMask: false,
  flippedHorizontal: false,
  flippedVertical: false,
  strokePattern: [],
  effects: [],
  textPadding: [],
  textShadows: [],
  textRotation: 0,
  textAlignment: 1,
  resizingConstraints: {
    hasFixedLeft: true,
    hasFixedRight: false,
    hasFixedTop: true,
    hasFixedBottom: false,
    hasFixedWidth: true,
    hasFixedHeight: true,
  },
};

// Build a tiny 3-shape composition: a blue rectangle, a red circle (well, fully-rounded rect),
// and a text label below them.
const design = {
  masters: {},
  imageMap: {},
  scene: {
    items: [
      {
        id: "frame-1",
        name: "Test Frame",
        itemType: 2,
        isNameDynamic: false,
        rect: rect(0, 0, 400, 300),
        resizingConstraints: widgetDefaults.resizingConstraints,
        backgroundFill: { type: 1, enabled: true, color: color(1, 1, 1) },
        backgroundShape: {
          ...widgetDefaults,
          itemType: 1,
          id: "frame-1-bg",
          name: "Test Frame",
          isNameDynamic: false,
          rect: rect(0, 0, 400, 300),
          resizingConstraints: { ...widgetDefaults.resizingConstraints, hasFixedRight: true, hasFixedBottom: true, hasFixedWidth: false, hasFixedHeight: false },
          strokes: [],
          strokeThickness: 0,
          backgroundFills: [{ type: 1, enabled: true, color: color(1, 1, 1) }],
          corners: [0, 0, 0, 0],
          border: [0, 0, 0, 0],
        },
        scene: {
          items: [
            // Blue rectangle
            {
              ...widgetDefaults,
              itemType: 1,
              id: "rect-blue",
              name: "Rectangle",
              isNameDynamic: false,
              rect: rect(40, 40, 120, 80),
              strokes: [],
              strokeThickness: 0,
              backgroundFills: [{ type: 1, enabled: true, color: color(0.23, 0.51, 0.96) }],
              corners: [8, 8, 8, 8],
              border: [0, 0, 0, 0],
            },
            // Red "circle" (fully-rounded rect)
            {
              ...widgetDefaults,
              itemType: 1,
              id: "circle-red",
              name: "Rectangle",
              isNameDynamic: false,
              rect: rect(200, 40, 80, 80),
              strokes: [],
              strokeThickness: 0,
              backgroundFills: [{ type: 1, enabled: true, color: color(0.94, 0.27, 0.27) }],
              corners: [999, 999, 999, 999],
              border: [0, 0, 0, 0],
            },
            // Text label below
            {
              ...widgetDefaults,
              itemType: 1,
              id: "text-hello",
              name: "Hello from MCP!",
              isNameDynamic: true,
              rect: rect(40, 160, 320, 24),
              strokes: [],
              strokeThickness: 0,
              backgroundFills: [],
              corners: [0, 0, 0, 0],
              border: [0, 0, 0, 0],
              textAlignment: 0,
              text: {
                paragraphs: [
                  {
                    horizontalAlignment: 0,
                    lineSpacing: 0,
                    inlines: "Hello from MCP!".split("").map((ch) => ({
                      type: 0,
                      text: ch,
                      family: "Inter",
                      typeface: "Inter - Regular",
                      style: 0,
                      weight: 400,
                      textColor: color(0.067, 0.067, 0.067),
                      size: 18,
                      underline: false,
                      strikethrough: false,
                      superscript: 0,
                      baselineOffset: 0,
                      highlight: { a: 1, r: 0, g: 0, b: 0 },
                      characterSpacing: 0,
                      transform: 0,
                      stretch: 5,
                    })),
                  },
                ],
              },
            },
          ],
        },
      },
    ],
  },
};

console.log(`Generating Axvg JSON (${JSON.stringify(design).length} chars)...`);
const result = pasteAxvg(design, { autoPaste: true });
console.log(JSON.stringify(result, null, 2));
