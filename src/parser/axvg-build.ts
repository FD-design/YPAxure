// High-level builders for composing Axvg JSON designs.
//
// The Axvg format requires a lot of boilerplate per widget (default fields, per-character
// text runs, etc.). These builders hide that so the caller can write:
//
//   composeDesign({
//     frame: { name: "Login", w: 375, h: 812, bg: hex("#FAF8F3") },
//     children: [
//       rect({ x: 32, y: 100, w: 311, h: 52, fill: hex("#C25E36"), corners: 26 }),
//       text({ x: 32, y: 116, w: 311, h: 20, content: "登 录", color: hex("#fff"),
//              weight: 700, align: "center", size: 16 }),
//     ],
//   });

import type { AxvgRoot } from "./axvg.js";

export type Color = { r: number; g: number; b: number; a: number };
export type Typeface =
  | "Inter - Regular"
  | "Inter - Bold"
  | "Inter - Medium"
  | "Inter - Semi Bold";
export type Weight = 400 | 500 | 700;
export type HAlign = "left" | "center" | "right";

/** Convert a CSS hex color (`#RRGGBB` or `#RGB`) to the normalized RGBA object Axvg expects. */
export function hex(h: string, a = 1): Color {
  let s = h.replace("#", "");
  if (s.length === 3) s = s.split("").map((c) => c + c).join("");
  const v = parseInt(s, 16);
  return { r: ((v >> 16) & 0xff) / 255, g: ((v >> 8) & 0xff) / 255, b: (v & 0xff) / 255, a };
}
export const rgba = (r: number, g: number, b: number, a = 1): Color => ({ r, g, b, a });

let nextId = 1;
const id = () => `w-${nextId++}`;
/** Reset the auto-increment id counter — call at the start of each compose() to keep ids stable across runs. */
export function resetIds() { nextId = 1; }

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

const halign = (a: HAlign | undefined): 0 | 1 | 2 =>
  a === "center" ? 1 : a === "right" ? 2 : 0;

const xyRect = (x: number, y: number, w: number, h: number) => ({
  location: { x, y },
  size: { width: w, height: h },
});

// --- shape builders -------------------------------------------------------

export interface RectOpts {
  x: number; y: number; w: number; h: number;
  name?: string;
  fill?: Color;
  border?: { color: Color; thickness: number };
  /** Single number = all 4 corners same. Array = [topLeft, topRight, bottomRight, bottomLeft]. */
  corners?: number | [number, number, number, number];
}

export function rect(opts: RectOpts) {
  const corners = typeof opts.corners === "number"
    ? [opts.corners, opts.corners, opts.corners, opts.corners] as [number, number, number, number]
    : opts.corners ?? [0, 0, 0, 0];
  const t = opts.border?.thickness ?? 0;
  return {
    ...widgetDefaults,
    itemType: 1,
    id: id(),
    name: opts.name ?? "Rectangle",
    isNameDynamic: false,
    rect: xyRect(opts.x, opts.y, opts.w, opts.h),
    strokes: opts.border
      ? [{ alignment: 0, fill: { type: 1, enabled: true, color: opts.border.color } }]
      : [],
    strokeThickness: t,
    backgroundFills: opts.fill ? [{ type: 1, enabled: true, color: opts.fill }] : [],
    corners,
    border: [t, t, t, t],
  };
}

/** Convenience: square widget rendered as a circle. `d` = diameter. */
export function circle(opts: { x: number; y: number; d: number; fill?: Color; border?: { color: Color; thickness: number }; name?: string }) {
  return rect({ x: opts.x, y: opts.y, w: opts.d, h: opts.d, fill: opts.fill, border: opts.border, name: opts.name ?? "Circle", corners: 999 });
}

/** Convenience: pill (fully-rounded rectangle, height-aware so corners = h/2). */
export function pill(opts: RectOpts) {
  return rect({ ...opts, corners: Math.round(opts.h / 2) });
}

/** Convenience: a 1px filled rectangle, useful as a divider line. */
export function hLine(opts: { x: number; y: number; w: number; color: Color; thickness?: number; name?: string }) {
  return rect({ x: opts.x, y: opts.y, w: opts.w, h: opts.thickness ?? 1, fill: opts.color, name: opts.name ?? "Divider" });
}

export interface TextOpts {
  x: number; y: number; w: number; h: number;
  content: string;
  size?: number;
  color?: Color;
  typeface?: Typeface;
  weight?: Weight;
  align?: HAlign;
}

export function text(opts: TextOpts) {
  const size = opts.size ?? 14;
  const tcolor = opts.color ?? hex("#1F1714");
  const typeface = opts.typeface ?? "Inter - Regular";
  const weight = opts.weight ?? 400;
  // Axvg emits one inline-run per character. The Figma plugin does it that way and so does
  // every observed paste — sticking with the convention.
  const inlines = Array.from(opts.content).map((ch) => ({
    type: 0,
    text: ch,
    family: "Inter",
    typeface,
    style: 0,
    weight,
    textColor: tcolor,
    size,
    underline: false,
    strikethrough: false,
    superscript: 0,
    baselineOffset: 0,
    highlight: { a: 1, r: 0, g: 0, b: 0 },
    characterSpacing: 0,
    transform: 0,
    stretch: 5,
  }));
  return {
    ...widgetDefaults,
    itemType: 1,
    id: id(),
    name: opts.content,
    isNameDynamic: true,
    rect: xyRect(opts.x, opts.y, opts.w, opts.h),
    strokes: [],
    strokeThickness: 0,
    backgroundFills: [],
    corners: [0, 0, 0, 0],
    border: [0, 0, 0, 0],
    textAlignment: 0,
    text: {
      paragraphs: [{ horizontalAlignment: halign(opts.align), lineSpacing: 0, inlines }],
    },
  };
}

// --- frame & compose ------------------------------------------------------

export interface FrameOpts {
  /** Frame's screen origin. Default (0, 0) — Axure will paste with this as offset. */
  x?: number;
  y?: number;
  w: number;
  h: number;
  name?: string;
  /** Background color of the frame. Default white. */
  bg?: Color;
  children: any[];
}

export function frame(opts: FrameOpts) {
  const x = opts.x ?? 0;
  const y = opts.y ?? 0;
  const bg = opts.bg ?? hex("#FFFFFF");
  const name = opts.name ?? "Frame";
  return {
    id: "frame-" + id(),
    name,
    itemType: 2,
    isNameDynamic: false,
    rect: xyRect(x, y, opts.w, opts.h),
    resizingConstraints: widgetDefaults.resizingConstraints,
    backgroundFill: { type: 1, enabled: true, color: bg },
    backgroundShape: {
      ...widgetDefaults,
      itemType: 1,
      id: id(),
      name,
      isNameDynamic: false,
      rect: xyRect(0, 0, opts.w, opts.h),
      resizingConstraints: {
        hasFixedLeft: true, hasFixedRight: true, hasFixedTop: true, hasFixedBottom: true,
        hasFixedWidth: false, hasFixedHeight: false,
      },
      strokes: [],
      strokeThickness: 0,
      backgroundFills: [{ type: 1, enabled: true, color: bg }],
      corners: [0, 0, 0, 0],
      border: [0, 0, 0, 0],
    },
    scene: { items: opts.children },
  };
}

/** Wrap one or more frames into a complete Axvg root. */
export function composeDesign(...frames: ReturnType<typeof frame>[]): AxvgRoot {
  return { masters: {}, imageMap: {}, scene: { items: frames } };
}

// --- common UI patterns ---------------------------------------------------

/** Common color palettes for quick app theming. */
export const palettes = {
  /** Warm cream/coffee — literary/reading apps. */
  warm: {
    bg: hex("#FBF7F0"),
    primary: hex("#C25E36"),
    primaryText: hex("#FFFFFF"),
    textDark: hex("#1F1714"),
    textMid: hex("#5C4F47"),
    textLight: hex("#8B7D72"),
    inputBg: hex("#F2EDE5"),
    border: hex("#E5DDD0"),
  },
  /** Cool blue — typical SaaS/productivity. */
  cool: {
    bg: hex("#FFFFFF"),
    primary: hex("#3B82F6"),
    primaryText: hex("#FFFFFF"),
    textDark: hex("#111827"),
    textMid: hex("#4B5563"),
    textLight: hex("#9CA3AF"),
    inputBg: hex("#F9FAFB"),
    border: hex("#E5E7EB"),
  },
  /** Dark — gaming/entertainment. */
  dark: {
    bg: hex("#0F172A"),
    primary: hex("#A78BFA"),
    primaryText: hex("#FFFFFF"),
    textDark: hex("#F1F5F9"),
    textMid: hex("#94A3B8"),
    textLight: hex("#64748B"),
    inputBg: hex("#1E293B"),
    border: hex("#334155"),
  },
  /** Brand colors for social logins / brand chips. */
  brand: {
    wechat: hex("#07C160"),
    qq: hex("#1E9DEC"),
    weibo: hex("#E84B47"),
    apple: hex("#000000"),
    google: hex("#FFFFFF"),
    facebook: hex("#1877F2"),
  },
} as const;

/**
 * Icon glyphs that render reliably inside Axvg text widgets in Axure RP.
 *
 * IMPORTANT: only BMP (U+0000..U+FFFF) characters are listed here. Emoji-plane codepoints
 * (📱🔒👁🔔🙈🔍, U+1F000+) DO NOT render in Axure's default Inter font — they appear as
 * empty boxes. If you want emoji-style icons, draw them as colored rectangles/circles
 * instead, or place a small `rect` with a single-character text overlay using one of the
 * BMP glyphs below.
 */
export const icons = {
  close: "✕",       // U+2715  X-shape close
  back: "‹",        // U+2039
  forward: "›",     // U+203A
  arrowLeft: "←",   // U+2190
  arrowRight: "→",  // U+2192
  arrowUp: "↑",     // U+2191
  arrowDown: "↓",   // U+2193
  chevronUp: "⌃",   // U+2303
  chevronDown: "⌄", // U+2304
  heart: "♥",       // U+2665
  star: "★",        // U+2605
  starOpen: "☆",   // U+2606
  check: "✓",       // U+2713
  cross: "✗",       // U+2717
  warning: "⚠",     // U+26A0
  info: "ⓘ",        // U+24D8
  phone: "☎",       // U+260E
  mail: "✉",        // U+2709
  bell: "🔔",       // U+1F514 — emoji plane, may not render. Prefer `★` as fallback.
  menu: "☰",        // U+2630
  plus: "+",
  minus: "−",       // U+2212
  bulletDot: "•",   // U+2022
  bulletRing: "◦",  // U+25E6
  circleFilled: "●",
  circleOpen: "○",
};
