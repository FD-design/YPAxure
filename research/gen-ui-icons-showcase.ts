// Showcase every UI icon in the library on a clean grid so we can visually verify
// rendering at multiple sizes and tints.
import {
  composeDesign, frame, rect, text, hLine, hex,
  palettes, uiIcon, listUIIcons, pasteAxvg, resetIds,
} from "../dist/parser/index.js";

resetIds();
const C = palettes.cool;

// Group icons by visual category for the demo (the listUIIcons() order is alphabetical).
const groups: Array<{ title: string; slugs: string[] }> = [
  {
    title: "Navigation",
    slugs: ["back", "forward", "arrowLeft", "arrowRight", "arrowUp", "arrowDown",
            "chevronUp", "chevronDown", "menu", "home"],
  },
  {
    title: "Actions",
    slugs: ["close", "check", "plus", "minus", "moreH", "moreV", "refresh", "share", "send"],
  },
  {
    title: "Content",
    slugs: ["search", "settings", "filter", "grid", "list", "chart", "bookmark"],
  },
  {
    title: "Media",
    slugs: ["play", "pause", "stop"],
  },
  {
    title: "Communication",
    slugs: ["mail", "phone", "chat", "bell"],
  },
  {
    title: "Status & Social",
    slugs: ["heart", "star", "starOutline", "warning", "info", "flag", "bullet"],
  },
  {
    title: "User & Privacy",
    slugs: ["user", "lock", "eye", "eyeOff"],
  },
  {
    title: "Time & Capture",
    slugs: ["calendar", "clock", "camera", "sun", "moon", "cloud"],
  },
  {
    title: "Data Transfer",
    slugs: ["download", "upload"],
  },
];

const SIZE = 32;
const CELL_W = 64;
const CELL_H = 80;
const COLS = 5;
const PADDING_X = 24;

function renderGroup(yStart: number, group: { title: string; slugs: string[] }): { widgets: any[]; yEnd: number } {
  const widgets: any[] = [];
  widgets.push(text({
    x: PADDING_X, y: yStart, w: 400, h: 22,
    content: group.title, size: 13, color: C.textMid,
    typeface: "Inter - Semi Bold", weight: 500,
  }));
  for (let i = 0; i < group.slugs.length; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const cellX = PADDING_X + col * CELL_W;
    const cellY = yStart + 30 + row * CELL_H;
    // Background card for visual separation
    widgets.push(rect({ x: cellX, y: cellY, w: CELL_W - 8, h: CELL_W - 8,
                       fill: C.inputBg, corners: 8, name: `bg-${group.slugs[i]}` }));
    // Icon centered in card
    widgets.push(...uiIcon(group.slugs[i]!, {
      x: cellX + (CELL_W - 8 - SIZE) / 2,
      y: cellY + (CELL_W - 8 - SIZE) / 2,
      size: SIZE,
      color: C.textDark,
    }));
    // Slug label below
    widgets.push(text({
      x: cellX - 4, y: cellY + CELL_W - 4, w: CELL_W, h: 14,
      content: group.slugs[i]!, size: 9, color: C.textLight, align: "center",
    }));
  }
  const rows = Math.ceil(group.slugs.length / COLS);
  return { widgets, yEnd: yStart + 30 + rows * CELL_H + 8 };
}

const PAGE_W = PADDING_X * 2 + COLS * CELL_W;

const children: any[] = [
  text({ x: 0, y: 30, w: PAGE_W, h: 30, content: "UI Icon Library",
         size: 22, color: C.textDark, typeface: "Inter - Bold", weight: 700, align: "center" }),
  text({ x: 0, y: 64, w: PAGE_W, h: 16,
         content: `${listUIIcons().length} icons available · uiIcon("slug", { x, y, size, color })`,
         size: 11, color: C.textLight, align: "center" }),
  hLine({ x: PADDING_X, y: 96, w: PAGE_W - PADDING_X * 2, color: C.border }),
];

let y = 120;
for (const group of groups) {
  const { widgets, yEnd } = renderGroup(y, group);
  children.push(...widgets);
  y = yEnd;
}

// Footer: size-scaling demo (same icon at 16/24/32/48px)
y += 8;
children.push(hLine({ x: PADDING_X, y, w: PAGE_W - PADDING_X * 2, color: C.border }));
y += 16;
children.push(text({ x: PADDING_X, y, w: 400, h: 22, content: "Scaling test (search icon at 16/24/32/48 px)",
                    size: 13, color: C.textMid, typeface: "Inter - Semi Bold", weight: 500 }));
y += 32;
let xCursor = PADDING_X + 8;
for (const s of [16, 24, 32, 48]) {
  children.push(...uiIcon("search", { x: xCursor, y, size: s, color: C.primary }));
  children.push(text({ x: xCursor - 10, y: y + 56, w: 50, h: 14,
                       content: `${s}px`, size: 10, color: C.textLight, align: "center" }));
  xCursor += s + 24;
}

const page = frame({
  name: "UI Icon Showcase",
  w: PAGE_W, h: y + 100,
  bg: C.bg,
  children,
});

const design = composeDesign(page);
console.log(`Generated UI icon showcase: ${listUIIcons().length} icons, JSON ${JSON.stringify(design).length} chars`);
const result = pasteAxvg(design, { autoPaste: true });
console.log(JSON.stringify(result, null, 2));
