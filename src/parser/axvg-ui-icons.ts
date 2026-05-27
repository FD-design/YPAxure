// Functional UI icon library — the kind of icons you put inside an app interface
// (search, settings, user, heart, play, etc.) as opposed to brand/logo chips.
//
// Each icon is composed from primitives (rect, circle, line, text-with-BMP-char) so it
// renders as recognizable pixel art in Axure. Rotation IS honored by Axure (verified
// empirically — see research/test-rotation.ts), which unlocks diagonal strokes for
// search-lens handles, send arrows, gear teeth, etc.
//
// Usage:
//   uiIcon("search",   { x: 16, y: 16, size: 24 })
//   uiIcon("settings", { x: 16, y: 16, size: 24, color: hex("#666") })

import { hex, rect, text, type Color } from "./axvg-build.js";

const DEFAULT_SIZE = 24;
const DEFAULT_COLOR = hex("#1F2937"); // gray-800

export interface UIIconOpts {
  x: number;
  y: number;
  /** Side length in px. Default 24 (standard UI icon size). */
  size?: number;
  /** Tint color. Default dark gray. */
  color?: Color;
}

type UIIconRenderer = (opts: Required<UIIconOpts>) => any[];

/** Apply a `rotation` field to a widget — Axure honors this. */
function rotate<T extends { rotation?: number }>(w: T, deg: number): T {
  return { ...w, rotation: deg };
}

/** Render a single BMP character centered in a `size`×`size` box. Used for many simple icons. */
function glyph(ch: string, opts: Required<UIIconOpts>, sizeFactor = 0.9): any[] {
  const fontSize = Math.round(opts.size * sizeFactor);
  return [
    text({
      x: opts.x,
      y: opts.y + Math.round(opts.size / 2 - fontSize * 0.55),
      w: opts.size,
      h: Math.round(fontSize * 1.4),
      content: ch,
      size: fontSize,
      color: opts.color,
      typeface: "Inter - Bold",
      weight: 700,
      align: "center",
    }),
  ];
}

/** Stroke thickness scaled to icon size. */
function stroke(size: number): number {
  return Math.max(1.5, Math.round(size / 12));
}

// ── BMP-character icons (just a centered character — most reliable rendering)
const bmpIcons: Record<string, string> = {
  close:        "✕",
  check:        "✓",
  plus:         "+",
  minus:        "−",
  back:         "‹",
  forward:      "›",
  arrowLeft:    "←",
  arrowRight:   "→",
  arrowUp:      "↑",
  arrowDown:    "↓",
  chevronLeft:  "‹",
  chevronRight: "›",
  chevronUp:    "⌃",
  chevronDown:  "⌄",
  menu:         "☰",
  moreH:        "⋯",
  moreV:        "⋮",
  heart:        "♥",
  star:         "★",
  starOutline:  "☆",
  play:         "▶",
  stop:         "■",
  phone:        "☎",
  mail:         "✉",
  warning:      "⚠",
  info:         "ⓘ",
  refresh:      "↻",
  home:         "⌂",
  sun:          "☀",
  moon:         "☾",
  cloud:        "☁",
  flag:         "⚑",
  bullet:       "•",
};

// ── Composed icons (using rect/circle/line primitives, sometimes with rotation)

const search: UIIconRenderer = (o) => {
  const s = o.size;
  const lensSize = Math.round(s * 0.62);
  const t = stroke(s);
  const lensX = o.x + Math.round(s * 0.08);
  const lensY = o.y + Math.round(s * 0.08);
  // Handle: diagonal line from bottom-right of lens, length ~0.3*size, rotated 45°
  const handleLen = Math.round(s * 0.35);
  const handleX = o.x + Math.round(s * 0.55);
  const handleY = o.y + Math.round(s * 0.55);
  return [
    // Lens (outline circle)
    rect({ x: lensX, y: lensY, w: lensSize, h: lensSize,
           border: { color: o.color, thickness: t }, corners: 999, name: "search-lens" }),
    // Handle (rotated 45°)
    rotate(
      rect({ x: handleX, y: handleY, w: handleLen, h: t, fill: o.color, corners: t / 2, name: "search-handle" }),
      45,
    ),
  ];
};

const settings: UIIconRenderer = (o) => {
  const s = o.size;
  const t = stroke(s);
  const cx = o.x + s / 2;
  const cy = o.y + s / 2;
  // Center circle (outline)
  const innerR = Math.round(s * 0.18);
  const widgets: any[] = [
    rect({ x: cx - innerR, y: cy - innerR, w: innerR * 2, h: innerR * 2,
           border: { color: o.color, thickness: t }, corners: 999, name: "settings-center" }),
  ];
  // 8 gear teeth — small rects placed around the circle, each rotated to point outward
  const teethRadius = s * 0.42;
  const toothW = Math.max(2, Math.round(s * 0.1));
  const toothH = Math.max(3, Math.round(s * 0.15));
  for (let i = 0; i < 8; i++) {
    const angle = (i * 45);
    const rad = (angle * Math.PI) / 180;
    const tx = cx + Math.cos(rad) * teethRadius - toothW / 2;
    const ty = cy + Math.sin(rad) * teethRadius - toothH / 2;
    widgets.push(rotate(
      rect({ x: tx, y: ty, w: toothW, h: toothH, fill: o.color, corners: 1, name: `settings-tooth-${i}` }),
      angle + 90, // align tooth radially
    ));
  }
  return widgets;
};

const user: UIIconRenderer = (o) => {
  const s = o.size;
  const t = stroke(s);
  // Head (small circle in upper third)
  const headD = Math.round(s * 0.36);
  const headX = o.x + (s - headD) / 2;
  const headY = o.y + Math.round(s * 0.08);
  // Body (rounded rect below, slightly wider)
  const bodyW = Math.round(s * 0.68);
  const bodyH = Math.round(s * 0.32);
  const bodyX = o.x + (s - bodyW) / 2;
  const bodyY = o.y + Math.round(s * 0.55);
  return [
    rect({ x: headX, y: headY, w: headD, h: headD,
           border: { color: o.color, thickness: t }, corners: 999, name: "user-head" }),
    rect({ x: bodyX, y: bodyY, w: bodyW, h: bodyH,
           border: { color: o.color, thickness: t },
           corners: [bodyH, bodyH, 0, 0], name: "user-body" }),
  ];
};

const camera: UIIconRenderer = (o) => {
  const s = o.size;
  const t = stroke(s);
  // Body
  const bodyY = o.y + Math.round(s * 0.25);
  const bodyH = Math.round(s * 0.6);
  // Small bump on top (lens viewfinder)
  const bumpW = Math.round(s * 0.3);
  const bumpH = Math.round(s * 0.12);
  const bumpX = o.x + (s - bumpW) / 2;
  // Center lens (inner circle)
  const lensD = Math.round(s * 0.32);
  const lensX = o.x + (s - lensD) / 2;
  const lensY = bodyY + (bodyH - lensD) / 2;
  return [
    rect({ x: bumpX, y: bodyY - bumpH, w: bumpW, h: bumpH,
           fill: o.color, corners: 2, name: "camera-bump" }),
    rect({ x: o.x + 1, y: bodyY, w: s - 2, h: bodyH,
           border: { color: o.color, thickness: t }, corners: Math.round(s * 0.1), name: "camera-body" }),
    rect({ x: lensX, y: lensY, w: lensD, h: lensD,
           border: { color: o.color, thickness: t }, corners: 999, name: "camera-lens" }),
  ];
};

const calendar: UIIconRenderer = (o) => {
  const s = o.size;
  const t = stroke(s);
  // Main rectangle
  const bodyY = o.y + Math.round(s * 0.18);
  const bodyH = Math.round(s * 0.72);
  // Two small rings on top (binding)
  const ringW = Math.max(2, Math.round(s * 0.08));
  const ringH = Math.round(s * 0.18);
  const ringY = o.y + Math.round(s * 0.04);
  // Header divider line
  const dividerY = bodyY + Math.round(s * 0.22);
  return [
    rect({ x: o.x + Math.round(s * 0.25), y: ringY, w: ringW, h: ringH,
           fill: o.color, corners: ringW / 2, name: "cal-ring-l" }),
    rect({ x: o.x + Math.round(s * 0.67), y: ringY, w: ringW, h: ringH,
           fill: o.color, corners: ringW / 2, name: "cal-ring-r" }),
    rect({ x: o.x + 1, y: bodyY, w: s - 2, h: bodyH,
           border: { color: o.color, thickness: t }, corners: Math.round(s * 0.1), name: "cal-body" }),
    // Header divider
    rect({ x: o.x + 1, y: dividerY, w: s - 2, h: t, fill: o.color, name: "cal-divider" }),
  ];
};

const clock: UIIconRenderer = (o) => {
  const s = o.size;
  const t = stroke(s);
  const cx = o.x + s / 2;
  const cy = o.y + s / 2;
  // Outer circle
  // Hour hand (pointing up, length ~ s*0.25)
  const hourLen = Math.round(s * 0.25);
  const minLen = Math.round(s * 0.35);
  return [
    rect({ x: o.x + 1, y: o.y + 1, w: s - 2, h: s - 2,
           border: { color: o.color, thickness: t }, corners: 999, name: "clock-rim" }),
    // Hour hand (vertical up)
    rect({ x: cx - t / 2, y: cy - hourLen, w: t, h: hourLen, fill: o.color, name: "clock-hour" }),
    // Minute hand (rotated 90° to point right)
    rotate(
      rect({ x: cx, y: cy - t / 2, w: minLen, h: t, fill: o.color, name: "clock-min" }),
      0, // already horizontal pointing right
    ),
  ];
};

const eye: UIIconRenderer = (o) => {
  const s = o.size;
  const t = stroke(s);
  // Outer "almond" shape — approximated as a wide ellipse (rect with high corners)
  const w = s - 2;
  const h = Math.round(s * 0.55);
  const oy = o.y + (s - h) / 2;
  // Inner pupil
  const pD = Math.round(s * 0.28);
  const pX = o.x + (s - pD) / 2;
  const pY = o.y + (s - pD) / 2;
  return [
    rect({ x: o.x + 1, y: oy, w, h, border: { color: o.color, thickness: t },
           corners: [h / 2, h / 2, h / 2, h / 2], name: "eye-outline" }),
    rect({ x: pX, y: pY, w: pD, h: pD, fill: o.color, corners: 999, name: "eye-pupil" }),
  ];
};

const eyeOff: UIIconRenderer = (o) => {
  const widgets = eye(o);
  // Slash diagonal across (rotated 45°)
  const len = Math.round(o.size * 1.1);
  const t = stroke(o.size);
  widgets.push(rotate(
    rect({ x: o.x + (o.size - len) / 2, y: o.y + o.size / 2 - t / 2,
           w: len, h: t, fill: o.color, corners: t / 2, name: "eye-slash" }),
    -45,
  ));
  return widgets;
};

const pause: UIIconRenderer = (o) => {
  const s = o.size;
  const barW = Math.round(s * 0.22);
  const barH = Math.round(s * 0.7);
  const gap = Math.round(s * 0.12);
  const total = barW * 2 + gap;
  const x0 = o.x + (s - total) / 2;
  const y0 = o.y + (s - barH) / 2;
  return [
    rect({ x: x0, y: y0, w: barW, h: barH, fill: o.color, corners: 1, name: "pause-l" }),
    rect({ x: x0 + barW + gap, y: y0, w: barW, h: barH, fill: o.color, corners: 1, name: "pause-r" }),
  ];
};

const grid: UIIconRenderer = (o) => {
  const s = o.size;
  const cellSize = Math.round(s * 0.4);
  const gap = Math.round(s * 0.08);
  const total = cellSize * 2 + gap;
  const x0 = o.x + (s - total) / 2;
  const y0 = o.y + (s - total) / 2;
  return [
    rect({ x: x0, y: y0, w: cellSize, h: cellSize, fill: o.color, corners: 2 }),
    rect({ x: x0 + cellSize + gap, y: y0, w: cellSize, h: cellSize, fill: o.color, corners: 2 }),
    rect({ x: x0, y: y0 + cellSize + gap, w: cellSize, h: cellSize, fill: o.color, corners: 2 }),
    rect({ x: x0 + cellSize + gap, y: y0 + cellSize + gap, w: cellSize, h: cellSize, fill: o.color, corners: 2 }),
  ];
};

const list: UIIconRenderer = (o) => {
  const s = o.size;
  const t = stroke(s);
  const lineH = Math.max(2, Math.round(s * 0.1));
  const bulletD = Math.max(3, Math.round(s * 0.12));
  const rowH = Math.round(s * 0.22);
  const lineX = o.x + bulletD + Math.round(s * 0.12);
  const lineW = s - (bulletD + Math.round(s * 0.12)) - Math.round(s * 0.05);
  const widgets: any[] = [];
  for (let i = 0; i < 3; i++) {
    const y = o.y + Math.round(s * 0.2) + i * rowH;
    widgets.push(
      rect({ x: o.x + Math.round(s * 0.05), y: y + (lineH - bulletD) / 2,
             w: bulletD, h: bulletD, fill: o.color, corners: 999 }),
      rect({ x: lineX, y, w: lineW, h: lineH, fill: o.color, corners: 1 }),
    );
  }
  return widgets;
};

const chartBar: UIIconRenderer = (o) => {
  const s = o.size;
  const barW = Math.round(s * 0.18);
  const gap = Math.round(s * 0.1);
  const baseY = o.y + s - Math.round(s * 0.1);
  const heights = [0.4, 0.7, 0.55].map((f) => Math.round(s * f));
  const totalW = barW * 3 + gap * 2;
  const x0 = o.x + (s - totalW) / 2;
  return heights.map((h, i) =>
    rect({ x: x0 + i * (barW + gap), y: baseY - h, w: barW, h, fill: o.color, corners: 2 }),
  );
};

const bookmark: UIIconRenderer = (o) => {
  const s = o.size;
  const t = stroke(s);
  const bodyW = Math.round(s * 0.65);
  const bodyH = Math.round(s * 0.8);
  const bx = o.x + (s - bodyW) / 2;
  const by = o.y + Math.round(s * 0.1);
  // V-notch at bottom: two rotated rectangles creating an inverted V cutout
  const notchW = Math.round(bodyW * 0.5);
  const notchH = Math.round(s * 0.2);
  return [
    rect({ x: bx, y: by, w: bodyW, h: bodyH,
           border: { color: o.color, thickness: t },
           corners: [Math.round(s * 0.08), Math.round(s * 0.08), 0, 0], name: "bookmark-body" }),
    // White cover the bottom V (gives illusion of notch) — uses bg-color overlay
    // Simpler approach: 2 diagonal rects forming the V
    rotate(
      rect({ x: bx + bodyW / 2 - notchW / 2, y: by + bodyH - notchH,
             w: notchW / 2 + 4, h: t, fill: o.color, name: "bookmark-notch-l" }),
      -25,
    ),
    rotate(
      rect({ x: bx + bodyW / 2 - 2, y: by + bodyH - notchH,
             w: notchW / 2 + 4, h: t, fill: o.color, name: "bookmark-notch-r" }),
      25,
    ),
  ];
};

const send: UIIconRenderer = (o) => {
  const s = o.size;
  const t = stroke(s);
  // Paper-plane: composed of 2 rotated triangles approximated by rotated rects
  const len = Math.round(s * 0.7);
  return [
    // Main body (rotated rect that looks like a paper plane)
    rotate(
      rect({ x: o.x + Math.round(s * 0.1), y: o.y + Math.round(s * 0.45),
             w: len, h: t * 2, fill: o.color, corners: 1, name: "send-body" }),
      -25,
    ),
    // Tail line
    rotate(
      rect({ x: o.x + Math.round(s * 0.18), y: o.y + Math.round(s * 0.6),
             w: Math.round(s * 0.4), h: t, fill: o.color, corners: 1, name: "send-tail" }),
      -15,
    ),
  ];
};

const download: UIIconRenderer = (o) => {
  const s = o.size;
  const t = stroke(s);
  const cx = o.x + s / 2;
  const arrowLen = Math.round(s * 0.55);
  const arrowTop = o.y + Math.round(s * 0.1);
  // Arrow stem (vertical)
  // Arrow head (2 diagonal rects forming V at bottom)
  const arrowHeadLen = Math.round(s * 0.28);
  const arrowHeadY = arrowTop + arrowLen - t;
  // Base line
  const baseY = o.y + s - Math.round(s * 0.1);
  return [
    rect({ x: cx - t / 2, y: arrowTop, w: t, h: arrowLen, fill: o.color, name: "dl-stem" }),
    rotate(
      rect({ x: cx - arrowHeadLen / 2 - Math.round(s * 0.12), y: arrowHeadY,
             w: arrowHeadLen, h: t, fill: o.color, name: "dl-head-l" }),
      45,
    ),
    rotate(
      rect({ x: cx - arrowHeadLen / 2 + Math.round(s * 0.12), y: arrowHeadY,
             w: arrowHeadLen, h: t, fill: o.color, name: "dl-head-r" }),
      -45,
    ),
    // Base line at bottom
    rect({ x: o.x + Math.round(s * 0.15), y: baseY, w: s - Math.round(s * 0.3), h: t,
           fill: o.color, name: "dl-base" }),
  ];
};

const upload: UIIconRenderer = (o) => {
  // Same as download but arrow head at TOP and arrow points up
  const s = o.size;
  const t = stroke(s);
  const cx = o.x + s / 2;
  const arrowLen = Math.round(s * 0.55);
  const arrowTop = o.y + Math.round(s * 0.1);
  const arrowHeadLen = Math.round(s * 0.28);
  const baseY = o.y + s - Math.round(s * 0.1);
  return [
    rect({ x: cx - t / 2, y: arrowTop, w: t, h: arrowLen, fill: o.color, name: "up-stem" }),
    rotate(
      rect({ x: cx - arrowHeadLen / 2 - Math.round(s * 0.12), y: arrowTop + t,
             w: arrowHeadLen, h: t, fill: o.color, name: "up-head-l" }),
      -45,
    ),
    rotate(
      rect({ x: cx - arrowHeadLen / 2 + Math.round(s * 0.12), y: arrowTop + t,
             w: arrowHeadLen, h: t, fill: o.color, name: "up-head-r" }),
      45,
    ),
    rect({ x: o.x + Math.round(s * 0.15), y: baseY, w: s - Math.round(s * 0.3), h: t,
           fill: o.color, name: "up-base" }),
  ];
};

const filter: UIIconRenderer = (o) => {
  const s = o.size;
  const t = stroke(s);
  // 3 horizontal lines, decreasing width, centered
  const widths = [0.85, 0.55, 0.25];
  const gap = Math.round(s * 0.18);
  const y0 = o.y + Math.round(s * 0.25);
  return widths.map((wf, i) => {
    const w = Math.round(s * wf);
    return rect({ x: o.x + (s - w) / 2, y: y0 + i * gap, w, h: t,
                  fill: o.color, corners: t / 2 });
  });
};

const share: UIIconRenderer = (o) => {
  const s = o.size;
  const t = stroke(s);
  const dotD = Math.round(s * 0.18);
  // 3 dots: top-right, mid-left, bottom-right
  const positions = [
    { x: o.x + s - dotD - 2, y: o.y + 2 },                      // top-right
    { x: o.x + 2, y: o.y + (s - dotD) / 2 },                    // mid-left
    { x: o.x + s - dotD - 2, y: o.y + s - dotD - 2 },           // bottom-right
  ];
  return [
    // Connecting lines (2 rotated rects)
    rotate(
      rect({ x: o.x + 4, y: o.y + s / 2, w: Math.round(s * 0.7), h: t, fill: o.color }),
      -35,
    ),
    rotate(
      rect({ x: o.x + 4, y: o.y + s / 2, w: Math.round(s * 0.7), h: t, fill: o.color }),
      35,
    ),
    // 3 dots on top
    ...positions.map((p) =>
      rect({ x: p.x, y: p.y, w: dotD, h: dotD, fill: o.color, corners: 999 }),
    ),
  ];
};

const chat: UIIconRenderer = (o) => {
  const s = o.size;
  const t = stroke(s);
  const bubbleW = s - Math.round(s * 0.1);
  const bubbleH = Math.round(s * 0.65);
  const bx = o.x + Math.round(s * 0.05);
  const by = o.y + Math.round(s * 0.1);
  // Tail at bottom-left
  const tailSize = Math.round(s * 0.18);
  return [
    rect({ x: bx, y: by, w: bubbleW, h: bubbleH,
           border: { color: o.color, thickness: t }, corners: Math.round(s * 0.15), name: "chat-bubble" }),
    rotate(
      rect({ x: bx + tailSize, y: by + bubbleH - 2, w: tailSize, h: tailSize,
             fill: o.color, corners: 1 }),
      45,
    ),
  ];
};

const bell: UIIconRenderer = (o) => {
  const s = o.size;
  const t = stroke(s);
  // Bell body: rounded triangle approximated by rect with rounded top
  const bw = Math.round(s * 0.7);
  const bh = Math.round(s * 0.55);
  const bx = o.x + (s - bw) / 2;
  const by = o.y + Math.round(s * 0.15);
  // Clapper at bottom: small circle
  const cD = Math.round(s * 0.15);
  // Top knob: small rect/circle on top
  const knobD = Math.round(s * 0.15);
  return [
    rect({ x: o.x + (s - knobD) / 2, y: o.y + 2, w: knobD, h: knobD,
           fill: o.color, corners: 999, name: "bell-knob" }),
    rect({ x: bx, y: by, w: bw, h: bh,
           border: { color: o.color, thickness: t },
           corners: [bw / 2, bw / 2, 4, 4], name: "bell-body" }),
    // Base line at bottom (clapper rim)
    rect({ x: bx - 2, y: by + bh, w: bw + 4, h: t, fill: o.color }),
    // Clapper ball
    rect({ x: o.x + (s - cD) / 2, y: by + bh + 2, w: cD, h: cD,
           fill: o.color, corners: 999, name: "bell-clapper" }),
  ];
};

const lock: UIIconRenderer = (o) => {
  const s = o.size;
  const t = stroke(s);
  // Shackle (arch on top): outline rect with high corners + bottom-cut
  const arcW = Math.round(s * 0.5);
  const arcH = Math.round(s * 0.35);
  const arcX = o.x + (s - arcW) / 2;
  const arcY = o.y + Math.round(s * 0.08);
  // Body (rounded rect bottom)
  const bw = Math.round(s * 0.75);
  const bh = Math.round(s * 0.45);
  const bx = o.x + (s - bw) / 2;
  const by = o.y + s - bh - Math.round(s * 0.05);
  return [
    rect({ x: arcX, y: arcY, w: arcW, h: arcH,
           border: { color: o.color, thickness: t },
           corners: [arcW / 2, arcW / 2, 0, 0], name: "lock-shackle" }),
    rect({ x: bx, y: by, w: bw, h: bh, fill: o.color,
           corners: Math.round(s * 0.08), name: "lock-body" }),
  ];
};

// ── Registry
const composedIcons: Record<string, UIIconRenderer> = {
  search, settings, user, camera, calendar, clock,
  eye, eyeOff, "eye-off": eyeOff,
  pause, grid, list, chart: chartBar, "chart-bar": chartBar,
  bookmark, send, download, upload, filter, share, chat, comment: chat,
  bell, notification: bell, lock,
  profile: user,
  trash: (o) => glyph("✕", o, 0.7), // fallback — TODO real trash composition
};

/** Render a functional UI icon. Returns widgets to spread into a frame's children. */
export function uiIcon(slug: string, opts: UIIconOpts): any[] {
  const full: Required<UIIconOpts> = {
    x: opts.x,
    y: opts.y,
    size: opts.size ?? DEFAULT_SIZE,
    color: opts.color ?? DEFAULT_COLOR,
  };
  // Composed icon takes priority over BMP fallback when both exist
  if (composedIcons[slug]) return composedIcons[slug](full);
  if (bmpIcons[slug]) return glyph(bmpIcons[slug], full);
  // Unknown — render a placeholder square
  return [
    rect({ x: full.x, y: full.y, w: full.size, h: full.size,
           border: { color: full.color, thickness: stroke(full.size) },
           corners: 2, name: `ui-icon-${slug}-missing` }),
    text({ x: full.x, y: full.y + full.size / 2 - 6,
           w: full.size, h: 12, content: "?", size: 10, color: full.color, align: "center" }),
  ];
}

/** Enumerate all supported UI icon slugs. */
export function listUIIcons(): string[] {
  return [...new Set([...Object.keys(bmpIcons), ...Object.keys(composedIcons)])].sort();
}
