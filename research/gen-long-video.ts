// "长视频播放页" — Netflix/Bilibili 风格的长视频/剧集播放页，黑白灰极简风
// 编辑性优先：纯 Axvg，不掺 Lucide PNG

import {
  composeDesign, frame, rect, pill, hLine, text, hex, circle,
  pasteAxvg, resetIds,
} from "../dist/parser/index.js";

resetIds();

// ── Monochrome palette (Apple TV / Netflix dark)
const C = {
  bg:         hex("#FFFFFF"),
  surface:    hex("#FAFAFA"),
  cardBg:     hex("#F5F5F5"),
  videoBg:    hex("#0A0A0A"),
  textDark:   hex("#0A0A0A"),
  textMid:    hex("#525252"),
  textLight:  hex("#A3A3A3"),
  border:     hex("#E5E5E5"),
  borderDeep: hex("#D4D4D4"),
  primary:    hex("#0A0A0A"),
  primaryText: hex("#FFFFFF"),
  accent:     hex("#262626"),
};

// ── Helpers
function tagChip(x: number, y: number, label: string) {
  return [
    rect({ x, y, w: 56, h: 24, corners: 12,
           fill: hex("#FFFFFF"),
           border: { color: C.borderDeep, thickness: 1 } }),
    text({ x, y: y + 5, w: 56, h: 16, content: label, size: 11,
           color: C.textMid, align: "center" }),
  ];
}

function actionItem(x: number, y: number, glyph: string, count: string) {
  return [
    text({ x, y, w: 78, h: 24, content: glyph, size: 22, color: C.textDark, align: "center" }),
    text({ x, y: y + 30, w: 78, h: 14, content: count, size: 11, color: C.textMid, align: "center" }),
  ];
}

function episodeCard(x: number, y: number, ep: number, title: string, current: boolean) {
  const w = 130, h = 110;
  const thumbH = 74;
  return [
    // Outer card border (active gets primary border)
    rect({ x, y, w, h: thumbH, corners: 6, fill: C.videoBg }),
    // Episode number badge top-left
    rect({ x: x + 6, y: y + 6, w: 22, h: 16, corners: 3,
           fill: hex("#000000", 0.6) }),
    text({ x: x + 6, y: y + 6, w: 22, h: 16, content: String(ep),
           size: 10, color: hex("#FFFFFF"),
           typeface: "Inter - Bold", weight: 700, align: "center" }),
    // ▶ centered
    text({ x, y: y + 28, w, h: 20, content: "▶",
           size: 14, color: hex("#FFFFFF", 0.8), align: "center" }),
    // current playing indicator (top-right red dot)
    ...(current ? [
      circle({ x: x + w - 12, y: y + 8, d: 6, fill: hex("#0A0A0A") }),
      text({ x: x + w - 40, y: y + 3, w: 28, h: 12, content: "正在看",
             size: 9, color: C.textDark, typeface: "Inter - Semi Bold", weight: 500, align: "right" }),
    ] : []),
    // Title below thumbnail
    text({ x, y: y + 80, w, h: 16, content: title,
           size: 12, color: current ? C.textDark : C.textMid,
           typeface: current ? "Inter - Semi Bold" : "Inter - Regular",
           weight: current ? 500 : 400 }),
    text({ x, y: y + 96, w, h: 12, content: `S08E0${ep} · 55分钟`,
           size: 10, color: C.textLight }),
  ];
}

function castMember(x: number, y: number, label: string, role: string) {
  return [
    circle({ x: x + 12, y, d: 56, fill: C.cardBg }),
    // letter inside circle
    text({ x: x + 12, y: y + 18, w: 56, h: 22, content: label.charAt(0),
           size: 20, color: C.textMid, typeface: "Inter - Semi Bold", weight: 500, align: "center" }),
    // name
    text({ x: x - 4, y: y + 64, w: 88, h: 16, content: label,
           size: 12, color: C.textDark, typeface: "Inter - Medium", weight: 500, align: "center" }),
    // role
    text({ x: x - 4, y: y + 80, w: 88, h: 14, content: role,
           size: 10, color: C.textLight, align: "center" }),
  ];
}

// ── Page
const page = frame({
  name: "长视频播放页",
  w: 375, h: 1280,
  bg: C.bg,
  children: [
    // ─────────── Video area (16:9 ≈ 375 × 211)
    rect({ x: 0, y: 44, w: 375, h: 211, fill: C.videoBg }),

    // Video top overlay
    text({ x: 16, y: 60, w: 24, h: 24, content: "‹", size: 28, color: hex("#FFFFFF") }),
    text({ x: 335, y: 64, w: 24, h: 20, content: "⋯", size: 22, color: hex("#FFFFFF"), align: "center" }),

    // Center play button (large translucent circle + ▶)
    circle({ x: 159.5, y: 124, d: 56, fill: hex("#FFFFFF", 0.92) }),
    text({ x: 159.5, y: 138, w: 56, h: 28, content: "▶", size: 22, color: C.videoBg, align: "center" }),

    // Video bottom overlay (progress + time + fullscreen)
    hLine({ x: 16, y: 228, w: 280, color: hex("#FFFFFF", 0.25), thickness: 3 }),
    hLine({ x: 16, y: 228, w: 95, color: hex("#FFFFFF"), thickness: 3 }),
    circle({ x: 107, y: 224, d: 10, fill: hex("#FFFFFF") }),
    text({ x: 304, y: 224, w: 50, h: 14, content: "18:42",
           size: 10, color: hex("#FFFFFF") }),
    text({ x: 355, y: 222, w: 16, h: 20, content: "⛶", size: 14, color: hex("#FFFFFF"), align: "center" }),

    // ─────────── Title block
    text({ x: 16, y: 274, w: 343, h: 28, content: "权力的游戏 第八季",
           size: 20, color: C.textDark, typeface: "Inter - Bold", weight: 700 }),
    text({ x: 16, y: 308, w: 14, h: 18, content: "★", size: 13, color: C.textDark }),
    text({ x: 32, y: 309, w: 60, h: 16, content: "9.2",
           size: 12, color: C.textDark, typeface: "Inter - Semi Bold", weight: 500 }),
    text({ x: 70, y: 310, w: 8, h: 16, content: "·", size: 12, color: C.textLight }),
    text({ x: 82, y: 310, w: 100, h: 16, content: "2.3亿次播放", size: 12, color: C.textMid }),
    text({ x: 188, y: 310, w: 8, h: 16, content: "·", size: 12, color: C.textLight }),
    text({ x: 200, y: 310, w: 40, h: 16, content: "2023", size: 12, color: C.textMid }),
    text({ x: 240, y: 310, w: 8, h: 16, content: "·", size: 12, color: C.textLight }),
    text({ x: 252, y: 310, w: 60, h: 16, content: "美国/HBO", size: 12, color: C.textMid }),

    // Tag chips
    ...tagChip(16, 340, "奇幻"),
    ...tagChip(80, 340, "美剧"),
    ...tagChip(144, 340, "完结"),
    ...tagChip(208, 340, "4K HDR"),

    // ─────────── Action bar (4 cols, 343/4 = 85.75)
    hLine({ x: 16, y: 388, w: 343, color: C.border }),
    ...actionItem(16,    402, "♥",  "12.3万"),
    ...actionItem(101.75,402, "✉",  "3.4k"),
    ...actionItem(187.5, 402, "↗",  "分享"),
    ...actionItem(273.25,402, "↓",  "下载"),
    hLine({ x: 16, y: 468, w: 343, color: C.border }),

    // ─────────── Season tabs
    text({ x: 16, y: 488, w: 200, h: 22, content: "选集",
           size: 16, color: C.textDark, typeface: "Inter - Bold", weight: 700 }),
    text({ x: 16, y: 514, w: 200, h: 16, content: "共 6 季 73 集",
           size: 11, color: C.textLight }),
    text({ x: 305, y: 514, w: 54, h: 16, content: "全部 ›",
           size: 11, color: C.textDark, align: "right",
           typeface: "Inter - Medium", weight: 500 }),

    // Horizontal season pills
    pill({ x: 16, y: 542, w: 60, h: 28, fill: C.primary }),
    text({ x: 16, y: 548, w: 60, h: 16, content: "第八季",
           size: 11, color: C.primaryText, align: "center",
           typeface: "Inter - Semi Bold", weight: 500 }),
    rect({ x: 84, y: 542, w: 60, h: 28, corners: 14,
           fill: C.cardBg, border: { color: C.border, thickness: 1 } }),
    text({ x: 84, y: 548, w: 60, h: 16, content: "第七季",
           size: 11, color: C.textMid, align: "center" }),
    rect({ x: 152, y: 542, w: 60, h: 28, corners: 14,
           fill: C.cardBg, border: { color: C.border, thickness: 1 } }),
    text({ x: 152, y: 548, w: 60, h: 16, content: "第六季",
           size: 11, color: C.textMid, align: "center" }),
    rect({ x: 220, y: 542, w: 60, h: 28, corners: 14,
           fill: C.cardBg, border: { color: C.border, thickness: 1 } }),
    text({ x: 220, y: 548, w: 60, h: 16, content: "第五季",
           size: 11, color: C.textMid, align: "center" }),
    text({ x: 288, y: 548, w: 70, h: 16, content: "···", size: 12, color: C.textLight }),

    // Episode cards (3 visible, 4-5th peeking off-screen)
    ...episodeCard(16, 590, 1, "凛冬已至", false),
    ...episodeCard(154, 590, 2, "凛冬中的骑士", true),
    ...episodeCard(292, 590, 3, "长夜将至", false),

    // ─────────── Description
    hLine({ x: 16, y: 728, w: 343, color: C.border }),
    text({ x: 16, y: 748, w: 200, h: 22, content: "简介",
           size: 16, color: C.textDark, typeface: "Inter - Bold", weight: 700 }),
    text({ x: 16, y: 776, w: 343, h: 18, content: "维斯特洛大陆上，七大王国之间的权力争夺。",
           size: 13, color: C.textMid }),
    text({ x: 16, y: 798, w: 343, h: 18, content: "异鬼的威胁来临，铁王座之争进入白热化阶段，",
           size: 13, color: C.textMid }),
    text({ x: 16, y: 820, w: 343, h: 18, content: "守夜人、龙母、雪诺等关键角色将面临最终抉择。",
           size: 13, color: C.textMid }),
    text({ x: 16, y: 846, w: 60, h: 16, content: "展开 ⌄", size: 12, color: C.textDark,
           typeface: "Inter - Medium", weight: 500 }),

    // ─────────── Cast
    hLine({ x: 16, y: 880, w: 343, color: C.border }),
    text({ x: 16, y: 900, w: 200, h: 22, content: "主演",
           size: 16, color: C.textDark, typeface: "Inter - Bold", weight: 700 }),
    text({ x: 305, y: 904, w: 54, h: 16, content: "全部 ›",
           size: 11, color: C.textDark, align: "right",
           typeface: "Inter - Medium", weight: 500 }),

    ...castMember(20, 932, "Kit", "雪诺"),
    ...castMember(100, 932, "Emilia", "龙母"),
    ...castMember(190, 932, "Peter", "小恶魔"),
    ...castMember(280, 932, "Lena", "瑟曦"),

    // ─────────── Comments preview
    hLine({ x: 16, y: 1046, w: 343, color: C.border }),
    text({ x: 16, y: 1066, w: 200, h: 22, content: "评论",
           size: 16, color: C.textDark, typeface: "Inter - Bold", weight: 700 }),
    text({ x: 60, y: 1071, w: 80, h: 16, content: "1.2万",
           size: 12, color: C.textLight }),
    text({ x: 305, y: 1070, w: 54, h: 16, content: "查看 ›",
           size: 11, color: C.textDark, align: "right",
           typeface: "Inter - Medium", weight: 500 }),

    // First comment
    circle({ x: 16, y: 1100, d: 36, fill: C.cardBg }),
    text({ x: 16, y: 1109, w: 36, h: 20, content: "M",
           size: 16, color: C.textMid, typeface: "Inter - Semi Bold", weight: 500, align: "center" }),
    text({ x: 60, y: 1100, w: 200, h: 18, content: "Maester_Of_Light",
           size: 13, color: C.textDark, typeface: "Inter - Medium", weight: 500 }),
    text({ x: 60, y: 1118, w: 280, h: 16, content: "完美收官，雪诺的选择让人心碎也意料之中。",
           size: 12, color: C.textMid }),
    text({ x: 60, y: 1140, w: 50, h: 14, content: "♥ 348",
           size: 10, color: C.textLight }),
    text({ x: 116, y: 1140, w: 60, h: 14, content: "回复",
           size: 10, color: C.textLight }),
    text({ x: 300, y: 1140, w: 50, h: 14, content: "2天前",
           size: 10, color: C.textLight, align: "right" }),

    // Comment input row
    rect({ x: 16, y: 1180, w: 343, h: 44, corners: 22,
           fill: C.cardBg, border: { color: C.border, thickness: 1 } }),
    text({ x: 32, y: 1192, w: 240, h: 20, content: "发条友善的评论…",
           size: 13, color: C.textLight }),
    pill({ x: 295, y: 1188, w: 56, h: 28, fill: C.primary }),
    text({ x: 295, y: 1193, w: 56, h: 16, content: "发送",
           size: 12, color: C.primaryText, align: "center",
           typeface: "Inter - Semi Bold", weight: 500 }),
  ],
});

const design = composeDesign(page);
const json = JSON.stringify(design);
console.log(`Generated long-video page: ${json.length} chars`);
const result = pasteAxvg(design, { autoPaste: true });
console.log(`autoPaste: ${result.autoPaste}`);
