// 长视频播放器 App 页面 — 强调播放器 UI 本身
// 包含: 视频区+全套控件 / 弹幕 / 倍速面板 / 选集横滑 / 评论入口

import {
  composeDesign, frame, rect, pill, hLine, text, hex, circle,
  pasteAxvg, resetIds,
} from "../dist/parser/index.js";

resetIds();

// ── B 站/爱奇艺风格的克制配色
const C = {
  bg:         hex("#FFFFFF"),
  cardBg:     hex("#F5F6F8"),
  videoBg:    hex("#000000"),
  textDark:   hex("#18181B"),
  textMid:    hex("#52525B"),
  textLight:  hex("#A1A1AA"),
  border:     hex("#EEEEF0"),
  borderDeep: hex("#D4D4D8"),
  primary:    hex("#FB7299"),   // B 站粉
  primaryText: hex("#FFFFFF"),
  liked:      hex("#FB7299"),
  // 视频上的半透明覆盖层
  ovDark:     hex("#000000", 0.45),
  ovLite:     hex("#FFFFFF", 0.85),
  white:      hex("#FFFFFF"),
  whiteMid:   hex("#FFFFFF", 0.7),
  whiteLite:  hex("#FFFFFF", 0.3),
};

// ── 小弹幕 (浮在视频上)
function danmaku(x: number, y: number, content: string, size = 11) {
  return text({ x, y, w: 200, h: 16, content, size,
                color: hex("#FFFFFF", 0.92),
                typeface: "Inter - Medium", weight: 500 });
}

// ── 圆形带边的小图标按钮 (视频上)
function vidIconBtn(x: number, y: number, glyph: string, size = 18) {
  return [
    circle({ x, y, d: 32, fill: hex("#000000", 0.35) }),
    text({ x, y: y + 6, w: 32, h: 22, content: glyph,
           size, color: C.white, align: "center" }),
  ];
}

// ── 底部 tab 文字
function tabLabel(x: number, y: number, label: string, active = false, badge?: string) {
  const children = [
    text({ x, y, w: 70, h: 22, content: label,
           size: 14, color: active ? C.textDark : C.textMid,
           typeface: active ? "Inter - Semi Bold" : "Inter - Regular",
           weight: active ? 500 : 400, align: "center" }),
  ];
  if (badge) {
    children.push(text({ x: x + 50, y: y - 4, w: 30, h: 14, content: badge,
                         size: 10, color: C.textLight, align: "left" }));
  }
  if (active) {
    children.push(rect({ x: x + 26, y: y + 26, w: 18, h: 3, corners: 1.5, fill: C.primary }));
  }
  return children;
}

// ── 选集小卡 (横向)
function epCard(x: number, y: number, ep: number, dur: string, active = false) {
  const w = 110, h = 64;
  return [
    rect({ x, y, w, h, corners: 8,
           fill: active ? hex("#FFE4ED") : C.cardBg,
           border: active ? { color: C.primary, thickness: 1.5 } : undefined }),
    // 缩略小图
    rect({ x: x + 8, y: y + 8, w: 44, h: 48, corners: 4, fill: hex("#1F1F23") }),
    text({ x: x + 8, y: y + 24, w: 44, h: 16, content: "▶",
           size: 14, color: hex("#FFFFFF", 0.6), align: "center" }),
    // 集数 + 时长
    text({ x: x + 60, y: y + 10, w: 50, h: 18, content: `第${ep}集`,
           size: 12, color: active ? C.primary : C.textDark,
           typeface: "Inter - Semi Bold", weight: 500 }),
    text({ x: x + 60, y: y + 30, w: 50, h: 14, content: dur,
           size: 10, color: C.textLight }),
    // 正在播放的小波浪/指示
    ...(active ? [
      text({ x: x + 60, y: y + 44, w: 50, h: 14, content: "正在播放",
             size: 9, color: C.primary, typeface: "Inter - Medium", weight: 500 }),
    ] : []),
  ];
}

// ── 简介区下方的小操作
function actionBig(x: number, glyph: string, count: string, active = false) {
  const color = active ? C.primary : C.textDark;
  return [
    text({ x, y: 540, w: 50, h: 26, content: glyph,
           size: 22, color, align: "center" }),
    text({ x, y: 568, w: 50, h: 14, content: count,
           size: 10, color: active ? C.primary : C.textMid, align: "center" }),
  ];
}

// ── 主页面
const page = frame({
  name: "长视频播放器",
  w: 375, h: 1180,
  bg: C.bg,
  children: [
    // ─── 状态栏区
    text({ x: 16, y: 16, w: 60, h: 16, content: "9:41",
           size: 13, color: C.textDark,
           typeface: "Inter - Semi Bold", weight: 500 }),
    text({ x: 315, y: 16, w: 50, h: 16, content: "● ● ●",
           size: 8, color: C.textDark, align: "right" }),

    // ─── 视频区 (0, 44, 375, 211)
    rect({ x: 0, y: 44, w: 375, h: 211, fill: C.videoBg }),

    // 飘过的弹幕示意 (3 条)
    danmaku(40,  62, "这里 BGM 绝了 ♪", 12),
    danmaku(160, 78, "雪诺 yyds", 11),
    danmaku(230, 100, "前方高能", 11),

    // ── 顶部覆盖层 (返回 / 标题 / 投屏 / 分享 / 更多)
    rect({ x: 0, y: 44, w: 375, h: 56, fill: hex("#000000", 0.28) }),
    text({ x: 12, y: 62, w: 28, h: 28, content: "‹",
           size: 28, color: C.white, align: "center" }),
    text({ x: 40, y: 60, w: 210, h: 18, content: "权力的游戏",
           size: 12, color: C.whiteMid }),
    text({ x: 40, y: 78, w: 210, h: 20, content: "S8 E02 · 凛冬中的骑士",
           size: 13, color: C.white,
           typeface: "Inter - Semi Bold", weight: 500 }),
    // 投屏 / 分享 / 更多
    text({ x: 285, y: 64, w: 22, h: 22, content: "⌂", size: 16, color: C.white, align: "center" }),
    text({ x: 312, y: 64, w: 22, h: 22, content: "↗", size: 16, color: C.white, align: "center" }),
    text({ x: 339, y: 64, w: 22, h: 22, content: "⋯", size: 18, color: C.white, align: "center" }),

    // ── 中央控制区
    // 左侧锁屏
    circle({ x: 16, y: 134, d: 32, fill: hex("#000000", 0.35) }),
    text({ x: 16, y: 140, w: 32, h: 22, content: "🔒", size: 13, color: C.white, align: "center" }),
    // -10s
    text({ x: 96, y: 138, w: 36, h: 26, content: "«", size: 22, color: C.white, align: "center" }),
    text({ x: 96, y: 162, w: 36, h: 12, content: "10s", size: 9, color: C.whiteMid, align: "center" }),
    // 中央暂停按钮
    circle({ x: 155.5, y: 124, d: 64, fill: hex("#FFFFFF", 0.18) }),
    rect({ x: 174, y: 138, w: 6, h: 36, corners: 2, fill: C.white }),
    rect({ x: 188, y: 138, w: 6, h: 36, corners: 2, fill: C.white }),
    // +10s
    text({ x: 244, y: 138, w: 36, h: 26, content: "»", size: 22, color: C.white, align: "center" }),
    text({ x: 244, y: 162, w: 36, h: 12, content: "10s", size: 9, color: C.whiteMid, align: "center" }),
    // 下一集
    circle({ x: 327, y: 134, d: 32, fill: hex("#000000", 0.35) }),
    text({ x: 327, y: 140, w: 32, h: 22, content: "⏭", size: 14, color: C.white, align: "center" }),

    // ── 右上 倍速指示器
    pill({ x: 308, y: 110, w: 52, h: 22, fill: hex("#000000", 0.55) }),
    text({ x: 308, y: 114, w: 52, h: 16, content: "2.0X",
           size: 11, color: C.white, align: "center",
           typeface: "Inter - Semi Bold", weight: 500 }),

    // ── 底部覆盖层 (进度 / 时间 / 清晰度 / 全屏)
    rect({ x: 0, y: 207, w: 375, h: 48, fill: hex("#000000", 0.3) }),

    // 进度条背景
    hLine({ x: 16, y: 224, w: 280, color: C.whiteLite, thickness: 3 }),
    // 进度条已播
    hLine({ x: 16, y: 224, w: 95, color: C.primary, thickness: 3 }),
    // 章节标记 3 个
    circle({ x: 70, y: 220, d: 6, fill: hex("#FFFFFF", 0.6) }),
    circle({ x: 140, y: 220, d: 6, fill: hex("#FFFFFF", 0.6) }),
    circle({ x: 210, y: 220, d: 6, fill: hex("#FFFFFF", 0.6) }),
    // 拖动 handle
    circle({ x: 105, y: 217, d: 14, fill: C.white }),
    circle({ x: 109, y: 221, d: 6, fill: C.primary }),
    // 时间
    text({ x: 16, y: 238, w: 50, h: 14, content: "18:42",
           size: 10, color: C.white,
           typeface: "Inter - Medium", weight: 500 }),
    text({ x: 60, y: 238, w: 50, h: 14, content: "/ 55:30",
           size: 10, color: C.whiteMid }),
    // 清晰度
    text({ x: 308, y: 234, w: 28, h: 16, content: "高清",
           size: 11, color: C.white, align: "center" }),
    // 全屏图标
    text({ x: 344, y: 230, w: 20, h: 24, content: "⛶",
           size: 16, color: C.white, align: "center" }),

    // ─── 视频下方: 标题块
    text({ x: 16, y: 274, w: 343, h: 24, content: "权力的游戏 S8E02 · 凛冬中的骑士",
           size: 16, color: C.textDark,
           typeface: "Inter - Bold", weight: 700 }),
    text({ x: 16, y: 302, w: 14, h: 16, content: "★", size: 12, color: hex("#F59E0B") }),
    text({ x: 32, y: 303, w: 30, h: 16, content: "9.2",
           size: 11, color: C.textDark,
           typeface: "Inter - Semi Bold", weight: 500 }),
    text({ x: 62, y: 303, w: 120, h: 16, content: "· 2.3 亿次播放",
           size: 11, color: C.textMid }),
    text({ x: 182, y: 303, w: 100, h: 16, content: "· 2023 · 美剧",
           size: 11, color: C.textMid }),

    // ─── 控制 chips 行 (倍速 / 清晰度 / 选集 / 投屏 / 定时)
    rect({ x: 16, y: 332, w: 64, h: 30, corners: 15,
           fill: C.cardBg, border: { color: C.border, thickness: 1 } }),
    text({ x: 16, y: 339, w: 64, h: 16, content: "倍速 2.0X",
           size: 10, color: C.textDark, align: "center",
           typeface: "Inter - Medium", weight: 500 }),

    rect({ x: 86, y: 332, w: 56, h: 30, corners: 15,
           fill: C.cardBg, border: { color: C.border, thickness: 1 } }),
    text({ x: 86, y: 339, w: 56, h: 16, content: "高清 ⌄",
           size: 10, color: C.textDark, align: "center",
           typeface: "Inter - Medium", weight: 500 }),

    rect({ x: 148, y: 332, w: 56, h: 30, corners: 15,
           fill: C.cardBg, border: { color: C.border, thickness: 1 } }),
    text({ x: 148, y: 339, w: 56, h: 16, content: "选集 ›",
           size: 10, color: C.textDark, align: "center",
           typeface: "Inter - Medium", weight: 500 }),

    rect({ x: 210, y: 332, w: 56, h: 30, corners: 15,
           fill: C.cardBg, border: { color: C.border, thickness: 1 } }),
    text({ x: 210, y: 339, w: 56, h: 16, content: "投屏 ⌂",
           size: 10, color: C.textDark, align: "center",
           typeface: "Inter - Medium", weight: 500 }),

    rect({ x: 272, y: 332, w: 56, h: 30, corners: 15,
           fill: C.cardBg, border: { color: C.border, thickness: 1 } }),
    text({ x: 272, y: 339, w: 56, h: 16, content: "定时 ⏰",
           size: 10, color: C.textDark, align: "center",
           typeface: "Inter - Medium", weight: 500 }),

    text({ x: 332, y: 339, w: 30, h: 16, content: "···",
           size: 14, color: C.textLight, align: "center" }),

    // ─── 弹幕输入栏 (单独一行)
    rect({ x: 16, y: 378, w: 230, h: 38, corners: 19,
           fill: C.cardBg }),
    text({ x: 32, y: 387, w: 18, h: 18, content: "▤",
           size: 13, color: C.textMid, align: "center" }),
    text({ x: 54, y: 388, w: 160, h: 18, content: "发个友善的弹幕…",
           size: 12, color: C.textLight }),
    // 弹幕开关 / 字幕 / 发送
    circle({ x: 256, y: 380, d: 34, fill: C.cardBg }),
    text({ x: 256, y: 388, w: 34, h: 18, content: "弹",
           size: 12, color: C.textDark, align: "center",
           typeface: "Inter - Semi Bold", weight: 500 }),
    circle({ x: 296, y: 380, d: 34, fill: C.cardBg }),
    text({ x: 296, y: 388, w: 34, h: 18, content: "字",
           size: 12, color: C.textMid, align: "center" }),
    pill({ x: 334, y: 380, w: 34, h: 34, fill: C.primary }),
    text({ x: 334, y: 388, w: 34, h: 18, content: "↗",
           size: 14, color: C.primaryText, align: "center" }),

    // ─── 操作大按钮行 (赞 / 投币 / 收藏 / 转发 / 缓存)
    hLine({ x: 16, y: 524, w: 343, color: C.border }),
    ...actionBig(20,  "♥", "12.3万", true),
    ...actionBig(84,  "◈", "5.1万"),
    ...actionBig(148, "★", "8.2万"),
    ...actionBig(212, "↗", "分享"),
    ...actionBig(276, "↓", "缓存"),
    hLine({ x: 16, y: 600, w: 343, color: C.border }),

    // ─── Tab 切换 (简介 / 评论 / 选集)
    ...tabLabel(16,   620, "简介"),
    ...tabLabel(112,  620, "评论", false, "1.2万"),
    ...tabLabel(216,  620, "选集", true),
    hLine({ x: 0, y: 664, w: 375, color: C.border }),

    // ─── 选集面板
    text({ x: 16, y: 680, w: 200, h: 22, content: "选集",
           size: 15, color: C.textDark,
           typeface: "Inter - Bold", weight: 700 }),
    text({ x: 60, y: 685, w: 100, h: 16, content: "共 6 季 73 集",
           size: 11, color: C.textLight }),
    text({ x: 305, y: 685, w: 54, h: 16, content: "倒序 ⇅",
           size: 11, color: C.textDark, align: "right",
           typeface: "Inter - Medium", weight: 500 }),

    // 季度 pills
    pill({ x: 16, y: 716, w: 56, h: 26, fill: C.textDark }),
    text({ x: 16, y: 722, w: 56, h: 14, content: "第八季",
           size: 11, color: C.primaryText, align: "center",
           typeface: "Inter - Semi Bold", weight: 500 }),
    rect({ x: 80, y: 716, w: 56, h: 26, corners: 13,
           fill: C.cardBg, border: { color: C.border, thickness: 1 } }),
    text({ x: 80, y: 722, w: 56, h: 14, content: "第七季",
           size: 11, color: C.textMid, align: "center" }),
    rect({ x: 144, y: 716, w: 56, h: 26, corners: 13,
           fill: C.cardBg, border: { color: C.border, thickness: 1 } }),
    text({ x: 144, y: 722, w: 56, h: 14, content: "第六季",
           size: 11, color: C.textMid, align: "center" }),
    rect({ x: 208, y: 716, w: 56, h: 26, corners: 13,
           fill: C.cardBg, border: { color: C.border, thickness: 1 } }),
    text({ x: 208, y: 722, w: 56, h: 14, content: "第五季",
           size: 11, color: C.textMid, align: "center" }),
    text({ x: 280, y: 722, w: 60, h: 14, content: "···",
           size: 12, color: C.textLight }),

    // 选集卡 (3 张可见 + 1 张露半边)
    ...epCard(16,  762, 1, "55:12"),
    ...epCard(134, 762, 2, "53:48", true),
    ...epCard(252, 762, 3, "57:30"),
    rect({ x: 370, y: 762, w: 110, h: 64, corners: 8, fill: C.cardBg }),

    // ─── 你可能也喜欢
    hLine({ x: 16, y: 854, w: 343, color: C.border }),
    text({ x: 16, y: 874, w: 200, h: 22, content: "你可能也喜欢",
           size: 15, color: C.textDark,
           typeface: "Inter - Bold", weight: 700 }),
    text({ x: 305, y: 879, w: 54, h: 16, content: "换一批 ⟳",
           size: 11, color: C.textDark, align: "right",
           typeface: "Inter - Medium", weight: 500 }),

    // 推荐卡 3 张
    rect({ x: 16,  y: 910, w: 105, h: 140, corners: 8, fill: C.cardBg }),
    rect({ x: 16,  y: 910, w: 105, h: 100, corners: 8, fill: hex("#1F1F23") }),
    text({ x: 16,  y: 940, w: 105, h: 20, content: "▶",
           size: 20, color: hex("#FFFFFF", 0.7), align: "center" }),
    rect({ x: 22,  y: 914, w: 36, h: 16, corners: 3, fill: hex("#FB7299") }),
    text({ x: 22,  y: 915, w: 36, h: 14, content: "9.5",
           size: 10, color: C.white, align: "center",
           typeface: "Inter - Semi Bold", weight: 500 }),
    text({ x: 22,  y: 1014, w: 95, h: 16, content: "黑客帝国",
           size: 12, color: C.textDark,
           typeface: "Inter - Semi Bold", weight: 500 }),
    text({ x: 22,  y: 1030, w: 95, h: 14, content: "科幻 · 1999",
           size: 10, color: C.textLight }),

    rect({ x: 135, y: 910, w: 105, h: 140, corners: 8, fill: C.cardBg }),
    rect({ x: 135, y: 910, w: 105, h: 100, corners: 8, fill: hex("#2A2730") }),
    text({ x: 135, y: 940, w: 105, h: 20, content: "▶",
           size: 20, color: hex("#FFFFFF", 0.7), align: "center" }),
    rect({ x: 141, y: 914, w: 36, h: 16, corners: 3, fill: hex("#FB7299") }),
    text({ x: 141, y: 915, w: 36, h: 14, content: "8.9",
           size: 10, color: C.white, align: "center",
           typeface: "Inter - Semi Bold", weight: 500 }),
    text({ x: 141, y: 1014, w: 95, h: 16, content: "异星灾变",
           size: 12, color: C.textDark,
           typeface: "Inter - Semi Bold", weight: 500 }),
    text({ x: 141, y: 1030, w: 95, h: 14, content: "科幻 · HBO",
           size: 10, color: C.textLight }),

    rect({ x: 254, y: 910, w: 105, h: 140, corners: 8, fill: C.cardBg }),
    rect({ x: 254, y: 910, w: 105, h: 100, corners: 8, fill: hex("#1E2230") }),
    text({ x: 254, y: 940, w: 105, h: 20, content: "▶",
           size: 20, color: hex("#FFFFFF", 0.7), align: "center" }),
    rect({ x: 260, y: 914, w: 36, h: 16, corners: 3, fill: hex("#FB7299") }),
    text({ x: 260, y: 915, w: 36, h: 14, content: "9.0",
           size: 10, color: C.white, align: "center",
           typeface: "Inter - Semi Bold", weight: 500 }),
    text({ x: 260, y: 1014, w: 95, h: 16, content: "西部世界",
           size: 12, color: C.textDark,
           typeface: "Inter - Semi Bold", weight: 500 }),
    text({ x: 260, y: 1030, w: 95, h: 14, content: "科幻 · HBO",
           size: 10, color: C.textLight }),

    // ─── 底部播放浮窗 (悬浮在最底, 下一集预告)
    rect({ x: 12, y: 1090, w: 351, h: 68, corners: 14, fill: hex("#FFFFFF") }),
    rect({ x: 12, y: 1094, w: 351, h: 68, corners: 14, fill: hex("#FFFFFF"),
           border: { color: C.borderDeep, thickness: 1 } }),
    // 缩略图
    rect({ x: 24, y: 1102, w: 80, h: 52, corners: 6, fill: hex("#1F1F23") }),
    text({ x: 24, y: 1118, w: 80, h: 20, content: "▶",
           size: 14, color: hex("#FFFFFF", 0.7), align: "center" }),
    rect({ x: 28, y: 1142, w: 30, h: 14, corners: 2, fill: hex("#000000", 0.55) }),
    text({ x: 28, y: 1143, w: 30, h: 12, content: "57:30",
           size: 9, color: C.white, align: "center" }),
    // 文案
    text({ x: 114, y: 1102, w: 60, h: 14, content: "即将播放",
           size: 10, color: C.primary,
           typeface: "Inter - Semi Bold", weight: 500 }),
    text({ x: 114, y: 1118, w: 200, h: 18, content: "第3集 · 长夜将至",
           size: 13, color: C.textDark,
           typeface: "Inter - Semi Bold", weight: 500 }),
    text({ x: 114, y: 1138, w: 220, h: 16, content: "5 秒后自动播放",
           size: 11, color: C.textLight }),
    // 关闭 / 立即播放按钮
    pill({ x: 296, y: 1116, w: 56, h: 30, fill: C.primary }),
    text({ x: 296, y: 1122, w: 56, h: 18, content: "播放",
           size: 11, color: C.primaryText, align: "center",
           typeface: "Inter - Semi Bold", weight: 500 }),
  ],
});

const design = composeDesign(page);
const json = JSON.stringify(design);
console.log(`Generated video player app page: ${json.length} chars`);
const result = pasteAxvg(design, { autoPaste: true });
console.log(`autoPaste: ${result.autoPaste}`);
