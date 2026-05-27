// Generate a polished short-drama video playback page for the "墨阅" novel/drama app.
// Demonstrates the axvg-build pipeline composing a denser layout: video hero + info
// section + action bar + episode grid.
import {
  composeDesign, frame, rect, pill, circle, hLine, text, hex,
  palettes, icons, pasteAxvg, resetIds,
} from "../dist/parser/index.js";

resetIds();

const C = palettes.warm;
const VIDEO_BG = hex("#1A1410");      // near-black warm video background
const OVERLAY = hex("#FFFFFF", 0.9);  // semi-translucent white for play button
const HEART = hex("#E84B47");

// Helper: render a single episode thumbnail card (used 6× in the grid)
function episodeCard(x: number, y: number, episodeNum: number, isCurrent = false) {
  const cardW = 105;
  const cardH = 140;
  return [
    // thumbnail frame (dark for "video preview" feel)
    rect({ name: `EP${episodeNum} thumb`, x, y, w: cardW, h: 80, fill: VIDEO_BG, corners: 8 }),
    // episode badge in top-left of thumb
    rect({ x: x + 6, y: y + 6, w: 28, h: 18, fill: hex("#000000", 0.5), corners: 4 }),
    text({ x: x + 6, y: y + 8, w: 28, h: 14, content: `EP${episodeNum}`,
           size: 10, color: hex("#FFFFFF"), typeface: "Inter - Medium", weight: 500, align: "center" }),
    // play arrow centered on thumb
    text({ x, y: y + 32, w: cardW, h: 20, content: "▶", size: 18,
           color: hex("#FFFFFF", 0.85), align: "center" }),
    // title below
    text({ x, y: y + 88, w: cardW, h: 18, content: `第${episodeNum}集`,
           size: 13, color: isCurrent ? C.primary : C.textDark,
           typeface: isCurrent ? "Inter - Semi Bold" : "Inter - Medium",
           weight: isCurrent ? 500 : 500 }),
    text({ x, y: y + 108, w: cardW, h: 14, content: "23分钟", size: 11, color: C.textLight }),
    // "current" indicator dot
    ...(isCurrent
      ? [circle({ x: x + cardW - 14, y: y + 90, d: 6, fill: C.primary })]
      : []),
  ];
}

const page = frame({
  name: "墨阅短剧 - 视频播放",
  w: 375, h: 812,
  bg: C.bg,
  children: [

    // ── Video hero area (16:9 = 375×211, sits below 44px status bar)
    rect({ name: "Video Area", x: 0, y: 44, w: 375, h: 211, fill: VIDEO_BG }),

    // Top overlay: back / title / more
    text({ x: 16, y: 60, w: 24, h: 24, content: "‹", size: 26, color: hex("#FFFFFF") }),
    text({ x: 60, y: 64, w: 255, h: 20, content: "霸道总裁的小娇妻", size: 15,
           color: hex("#FFFFFF"), typeface: "Inter - Medium", weight: 500 }),
    text({ x: 335, y: 64, w: 24, h: 20, content: "⋯", size: 22,
           color: hex("#FFFFFF"), align: "center" }),

    // Center play button (semi-transparent white circle with ▶)
    circle({ x: 159.5, y: 124, d: 56, fill: OVERLAY }),
    text({ x: 159.5, y: 138, w: 56, h: 28, content: "▶", size: 22,
           color: VIDEO_BG, align: "center" }),

    // Bottom overlay: progress bar + time + fullscreen
    hLine({ x: 16, y: 230, w: 270, color: hex("#FFFFFF", 0.3), thickness: 3 }),
    hLine({ x: 16, y: 230, w: 80, color: C.primary, thickness: 3 }),  // played portion
    circle({ x: 92, y: 226, d: 10, fill: C.primary }),                 // progress thumb
    text({ x: 292, y: 226, w: 60, h: 14, content: "07:32 / 23:15",
           size: 10, color: hex("#FFFFFF") }),
    text({ x: 355, y: 222, w: 16, h: 20, content: "⛶", size: 14,
           color: hex("#FFFFFF"), align: "center" }),

    // ── Info section (below video)
    text({ x: 16, y: 274, w: 343, h: 28, content: "霸道总裁的小娇妻 · 第3集",
           size: 18, color: C.textDark, typeface: "Inter - Bold", weight: 700 }),

    // Stats row
    text({ x: 16, y: 310, w: 30, h: 16, content: "▶", size: 12, color: C.textLight }),
    text({ x: 36, y: 310, w: 120, h: 16, content: "1.2万次播放", size: 12, color: C.textLight }),
    text({ x: 160, y: 310, w: 8, h: 16, content: "·", size: 12, color: C.textLight }),
    text({ x: 172, y: 310, w: 80, h: 16, content: "更新于 02-15", size: 12, color: C.textLight }),

    // Author row
    circle({ name: "Author Avatar", x: 16, y: 340, d: 40, fill: C.primary }),
    text({ x: 16, y: 350, w: 40, h: 20, content: "墨", size: 18,
           color: hex("#FFFFFF"), typeface: "Inter - Bold", weight: 700, align: "center" }),
    text({ x: 64, y: 344, w: 200, h: 18, content: "墨阅短剧",
           size: 14, color: C.textDark, typeface: "Inter - Semi Bold", weight: 500 }),
    text({ x: 64, y: 364, w: 200, h: 16, content: "12.3万粉丝 · 共23部作品",
           size: 11, color: C.textLight }),
    pill({ name: "Follow Button", x: 287, y: 348, w: 72, h: 28, fill: C.primary }),
    text({ x: 287, y: 354, w: 72, h: 16, content: "+ 关注",
           size: 12, color: hex("#FFFFFF"), typeface: "Inter - Medium", weight: 500,
           align: "center" }),

    // Divider
    hLine({ x: 16, y: 396, w: 343, color: C.border }),

    // ── Action bar (4 columns: Like / Comment / Share / Collect)
    // 4 cells of 343/4 ≈ 85.75 wide, starting at x=16
    text({ x: 16,    y: 416, w: 85.75, h: 20, content: "♥",     size: 20, color: HEART,        align: "center" }),
    text({ x: 16,    y: 442, w: 85.75, h: 14, content: "1.2k",  size: 11, color: C.textMid,    align: "center" }),
    text({ x: 101.75,y: 416, w: 85.75, h: 20, content: "✉",     size: 20, color: C.textMid,    align: "center" }),
    text({ x: 101.75,y: 442, w: 85.75, h: 14, content: "234",   size: 11, color: C.textMid,    align: "center" }),
    text({ x: 187.5, y: 416, w: 85.75, h: 20, content: "↗",     size: 20, color: C.textMid,    align: "center" }),
    text({ x: 187.5, y: 442, w: 85.75, h: 14, content: "分享",   size: 11, color: C.textMid,    align: "center" }),
    text({ x: 273.25,y: 416, w: 85.75, h: 20, content: "★",     size: 20, color: C.textMid,    align: "center" }),
    text({ x: 273.25,y: 442, w: 85.75, h: 14, content: "收藏",   size: 11, color: C.textMid,    align: "center" }),

    // Divider
    hLine({ x: 16, y: 476, w: 343, color: C.border }),

    // ── Episode grid section header
    text({ x: 16, y: 496, w: 200, h: 22, content: "选集",
           size: 16, color: C.textDark, typeface: "Inter - Bold", weight: 700 }),
    text({ x: 220, y: 500, w: 80, h: 18, content: "共23集", size: 12, color: C.textLight }),
    text({ x: 320, y: 500, w: 40, h: 18, content: "全部 ›", size: 12, color: C.primary, align: "right" }),

    // ── Episode grid (3 columns × 2 rows = 6 cards; middle EP3 is "current")
    ...episodeCard(16,    532, 1, false),
    ...episodeCard(135,   532, 2, false),
    ...episodeCard(254,   532, 3, true),       // current episode
    ...episodeCard(16,    700, 4, false),
    ...episodeCard(135,   700, 5, false),
    ...episodeCard(254,   700, 6, false),
  ],
});

const design = composeDesign(page);
console.log(`Generated video playback page: JSON ${JSON.stringify(design).length} chars`);
const result = pasteAxvg(design, { autoPaste: true });
console.log(JSON.stringify(result, null, 2));
