// 聊天/动态时间线页 — 基于用户截图重建并优化
// 内容: 文字 / 图片 / 视频 三种 post 类型, 含未读分割、跳转浮窗、底部搜索

import {
  composeDesign, frame, rect, pill, hLine, text, hex, circle,
  pasteAxvg, resetIds,
} from "../dist/parser/index.js";

resetIds();

// ── 黑白灰为主, 极克制的色彩点缀
const C = {
  bg:         hex("#FFFFFF"),
  cardBg:     hex("#F2F2F2"),
  cardUnread: hex("#F7F7F7"),     // 未读: 稍亮一点
  imgBg:      hex("#DDDDDD"),     // 图片/视频占位
  textDark:   hex("#1A1A1A"),
  textMid:    hex("#6B6B6B"),
  textLight:  hex("#A0A0A0"),
  textVLight: hex("#C8C8C8"),
  border:     hex("#E8E8E8"),
  borderDeep: hex("#D6D6D6"),
  divider:    hex("#ECECEC"),
  // 克制的强调色
  accentBlue: hex("#5A7BA8"),  // 喜欢/赞
  accentGold: hex("#C9A24E"),  // 收藏星
  accentDot:  hex("#3B82F6"),  // 未读指示
  primary:    hex("#262626"),  // 跳转浮窗
  primaryText: hex("#FFFFFF"),
};

// ── 小眼睛图标 (2-shape composed)
function eyeIcon(x: number, y: number, color = C.textLight) {
  return [
    rect({ x, y, w: 16, h: 8, corners: 4,
           border: { color, thickness: 1 } }),
    circle({ x: x + 6, y: y + 2, d: 4, fill: color }),
  ];
}

// ── 操作行 (♥ 赞 · ★ 收藏 · 👁 浏览 · 时间)
function actionRow(y: number, opts: { likes: string; stars: string; views: string; time: string }) {
  return [
    // 心 + 数字
    text({ x: 28, y: y - 2, w: 14, h: 18, content: "♥", size: 13, color: C.accentBlue }),
    text({ x: 44, y, w: 30, h: 16, content: opts.likes, size: 12, color: C.textMid }),
    // 星 + 数字
    text({ x: 80, y: y - 1, w: 14, h: 18, content: "★", size: 13, color: C.accentGold }),
    text({ x: 96, y, w: 30, h: 16, content: opts.stars, size: 12, color: C.textMid }),
    // 浏览数
    ...eyeIcon(220, y + 4),
    text({ x: 240, y, w: 60, h: 16, content: opts.views, size: 12, color: C.textMid }),
    // 时间
    text({ x: 300, y, w: 60, h: 16, content: opts.time, size: 12, color: C.textLight, align: "right" }),
  ];
}

// ── 评论按钮行 (底部, 带 ›)
function commentRow(y: number, count?: string) {
  return [
    hLine({ x: 16, y, w: 343, color: C.divider }),
    rect({ x: 28, y: y + 10, w: 18, h: 18, corners: 4,
           border: { color: C.textLight, thickness: 1 } }),
    text({ x: 28, y: y + 12, w: 18, h: 14, content: "○", size: 8, color: C.textLight, align: "center" }),
    text({ x: 52, y: y + 12, w: 80, h: 16,
           content: count ? `${count} 评论` : "评论",
           size: 12, color: C.textMid }),
    text({ x: 320, y: y + 12, w: 30, h: 16, content: "›",
           size: 14, color: C.textLight, align: "right" }),
  ];
}

// ── 日期分隔
function dateHeader(y: number, label: string) {
  return text({ x: 0, y, w: 375, h: 18, content: label,
                size: 11, color: C.textLight, align: "center" });
}

// ── "未读消息" 分割线
function unreadDivider(y: number) {
  return [
    hLine({ x: 16, y: y + 9, w: 130, color: C.borderDeep }),
    text({ x: 146, y, w: 80, h: 18, content: "未读消息",
           size: 11, color: C.textMid, align: "center" }),
    hLine({ x: 226, y: y + 9, w: 130, color: C.borderDeep }),
  ];
}

// ── 标签 chip (#标签)
function hashTag(x: number, y: number, label: string) {
  // 估算宽度
  const w = label.length * 12 + 16;
  return [
    rect({ x, y, w, h: 22, corners: 11, fill: hex("#FFFFFF"),
           border: { color: C.borderDeep, thickness: 1 } }),
    text({ x, y: y + 4, w, h: 14, content: label,
           size: 11, color: C.textMid, align: "center" }),
  ];
}

// ── 筛选 chip (底部搜索栏上方)
function filterChip(x: number, y: number, label: string, active = false) {
  const w = label.length * 12 + 20;
  return [
    rect({ x, y, w, h: 26, corners: 13,
           fill: active ? C.primary : hex("#FFFFFF"),
           border: active ? undefined : { color: C.borderDeep, thickness: 1 } }),
    text({ x, y: y + 5, w, h: 16, content: label,
           size: 11, color: active ? C.primaryText : C.textMid,
           typeface: active ? "Inter - Semi Bold" : "Inter - Regular",
           weight: active ? 500 : 400, align: "center" }),
  ];
}

// ── 主页面
const page = frame({
  name: "聊天时间线",
  w: 375, h: 1100,
  bg: C.bg,
  children: [
    // ─── 顶部导航
    text({ x: 16, y: 56, w: 24, h: 28, content: "‹", size: 28, color: C.textDark }),
    circle({ x: 54, y: 60, d: 32, fill: C.cardBg }),
    text({ x: 54, y: 70, w: 32, h: 20, content: "👤",
           size: 14, color: C.textLight, align: "center" }),
    text({ x: 96, y: 66, w: 180, h: 22, content: "人名XXX",
           size: 16, color: C.textDark, typeface: "Inter - Semi Bold", weight: 500 }),
    pill({ x: 304, y: 62, w: 55, h: 30, fill: hex("#FFFFFF"),
           border: { color: C.borderDeep, thickness: 1 } }),
    text({ x: 304, y: 69, w: 55, h: 16, content: "+ 关注",
           size: 11, color: C.textDark, align: "center",
           typeface: "Inter - Medium", weight: 500 }),
    hLine({ x: 0, y: 100, w: 375, color: C.border }),

    // ─── 日期 1
    dateHeader(122, "2025 年 3 月 5 日"),

    // ─── Card 1: 纯文字
    rect({ x: 16, y: 150, w: 343, h: 128, corners: 10, fill: C.cardBg }),
    text({ x: 28, y: 166, w: 319, h: 18, content: "文字文字文字文字文字文字文字。",
           size: 13, color: C.textDark }),
    text({ x: 28, y: 188, w: 319, h: 18, content: "文字文字文字文字文字文字。",
           size: 13, color: C.textDark }),
    ...actionRow(218, { likes: "赞", stars: "5", views: "2845", time: "17:11" }),
    ...commentRow(250),

    // ─── 未读消息分割
    ...unreadDivider(298),

    // ─── Card 2: 图片 (双图), 未读
    rect({ x: 16, y: 332, w: 343, h: 248, corners: 10, fill: C.cardUnread,
           border: { color: hex("#E0E8F0"), thickness: 1 } }),
    // 右上角未读小蓝点
    circle({ x: 339, y: 344, d: 8, fill: C.accentDot }),

    // 两张图片占位
    rect({ x: 28, y: 348, w: 156, h: 116, corners: 8, fill: C.imgBg }),
    rect({ x: 192, y: 348, w: 155, h: 116, corners: 8, fill: C.imgBg }),
    // 小图标提示这是图片
    text({ x: 28, y: 396, w: 156, h: 22, content: "◯ 图片",
           size: 10, color: hex("#FFFFFF", 0.7), align: "center" }),
    text({ x: 192, y: 396, w: 155, h: 22, content: "◯ 图片",
           size: 10, color: hex("#FFFFFF", 0.7), align: "center" }),

    text({ x: 28, y: 480, w: 319, h: 18, content: "文字文字文字文字文字文字文字。",
           size: 13, color: C.textDark }),
    ...actionRow(518, { likes: "5", stars: "5", views: "2845", time: "17:11" }),
    ...commentRow(550, "2845"),

    // ─── 日期 2
    dateHeader(602, "3 月 9 日"),

    // ─── Card 3: 视频
    rect({ x: 16, y: 630, w: 343, h: 272, corners: 10, fill: C.cardBg }),

    // 视频缩略图
    rect({ x: 28, y: 646, w: 319, h: 158, corners: 8, fill: C.imgBg }),
    // 视频时长 + 大小 overlay (左上)
    rect({ x: 40, y: 658, w: 86, h: 22, corners: 11, fill: hex("#000000", 0.55) }),
    text({ x: 40, y: 661, w: 86, h: 16, content: "17:11 · 32.5M",
           size: 10, color: hex("#FFFFFF"), align: "center" }),
    // 中央播放按钮
    circle({ x: 167.5, y: 705, d: 44, fill: hex("#FFFFFF", 0.92) }),
    text({ x: 167.5, y: 715, w: 44, h: 24, content: "▶",
           size: 16, color: C.textDark, align: "center" }),
    // 右下角小数字 "5" (互动数)
    circle({ x: 320, y: 780, d: 20, fill: hex("#000000", 0.55) }),
    text({ x: 320, y: 782, w: 20, h: 16, content: "5",
           size: 11, color: hex("#FFFFFF"),
           typeface: "Inter - Semi Bold", weight: 500, align: "center" }),

    // 文字
    text({ x: 28, y: 818, w: 319, h: 18, content: "文字文字文字文字文字文字。",
           size: 13, color: C.textDark }),
    // tag chips
    ...hashTag(28, 842, "#标签1"),
    ...hashTag(82, 842, "#标签2"),

    ...actionRow(880, { likes: "5", stars: "5", views: "2845", time: "17:11" }),
    ...commentRow(912, "2845"),

    // ─── 跳转浮窗 (右侧, 浮在 Card 3 上)
    // 阴影层 (轻微偏移再叠一层做阴影感)
    rect({ x: 308, y: 858, w: 52, h: 64, corners: 26, fill: hex("#000000", 0.08) }),
    // 主按钮
    rect({ x: 308, y: 854, w: 52, h: 64, corners: 26, fill: hex("#FFFFFF"),
           border: { color: C.borderDeep, thickness: 1 } }),
    text({ x: 308, y: 866, w: 52, h: 18, content: "2584",
           size: 12, color: C.textDark,
           typeface: "Inter - Semi Bold", weight: 500, align: "center" }),
    text({ x: 308, y: 895, w: 52, h: 16, content: "⌄",
           size: 14, color: C.textMid, align: "center" }),

    // ─── 筛选 chips (搜索栏上方)
    ...filterChip(16, 968, "全部", true),
    ...filterChip(72, 968, "图片"),
    ...filterChip(128, 968, "视频"),
    ...filterChip(184, 968, "链接"),
    ...filterChip(240, 968, "文件"),

    // ─── 底部搜索栏
    rect({ x: 16, y: 1010, w: 343, h: 48, corners: 24, fill: C.cardBg }),
    // 放大镜 (composed: 小圆 + 小斜线)
    rect({ x: 36, y: 1026, w: 14, h: 14, corners: 999,
           border: { color: C.textMid, thickness: 1.5 } }),
    rect({ x: 47, y: 1037, w: 8, h: 1.5, fill: C.textMid, rotation: 45 } as any),
    text({ x: 64, y: 1024, w: 200, h: 18, content: "聊天内搜索",
           size: 13, color: C.textLight }),
  ],
});

const design = composeDesign(page);
const json = JSON.stringify(design);
console.log(`Generated chat timeline page: ${json.length} chars`);
const result = pasteAxvg(design, { autoPaste: true });
console.log(`autoPaste: ${result.autoPaste}`);
