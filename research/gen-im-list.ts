// IM 聊天列表页 (类 微信/Telegram/iMessage)
// 纯 Axvg, 全部可编辑.

import {
  composeDesign, frame, rect, pill, hLine, text, hex, circle,
  pasteAxvg, resetIds,
} from "../dist/parser/index.js";

resetIds();

// ── 配色: 浅色 IM 风格, 一个主色用于强调
const C = {
  bg:         hex("#FFFFFF"),
  surface:    hex("#F9FAFB"),
  cardBg:     hex("#F3F4F6"),
  textDark:   hex("#111827"),
  textMid:    hex("#6B7280"),
  textLight:  hex("#9CA3AF"),
  border:     hex("#F0F2F5"),
  borderDeep: hex("#E5E7EB"),
  primary:    hex("#0066CC"),
  primaryText: hex("#FFFFFF"),
  badgeRed:   hex("#EF4444"),
  badgeMute:  hex("#9CA3AF"),
  online:     hex("#10B981"),
};

// 头像颜色集 - 不同联系人不同色, 视觉区分
const AVATAR_COLORS = [
  hex("#3B82F6"), // blue
  hex("#A855F7"), // purple
  hex("#EC4899"), // pink
  hex("#F59E0B"), // orange
  hex("#10B981"), // green
  hex("#06B6D4"), // cyan
  hex("#6B7280"), // neutral (for muted/system)
  hex("#8B5CF6"), // violet
];

// ── 一条聊天记录
function chatItem(y: number, opts: {
  avatarChar: string;
  avatarColor: typeof AVATAR_COLORS[number];
  name: string;
  msg: string;
  time: string;
  unread?: number;
  pinned?: boolean;
  muted?: boolean;
  online?: boolean;
}) {
  const widgets: any[] = [];

  // 置顶项: 整行浅灰背景
  if (opts.pinned) {
    widgets.push(rect({ x: 0, y, w: 375, h: 76, fill: C.surface }));
  }

  // 头像
  widgets.push(circle({ x: 16, y: y + 12, d: 52, fill: opts.avatarColor }));
  widgets.push(text({
    x: 16, y: y + 26, w: 52, h: 24,
    content: opts.avatarChar, size: 20, color: hex("#FFFFFF"),
    typeface: "Inter - Semi Bold", weight: 500, align: "center",
  }));

  // 在线指示器
  if (opts.online) {
    widgets.push(circle({ x: 53, y: y + 49, d: 14, fill: C.bg }));
    widgets.push(circle({ x: 55, y: y + 51, d: 10, fill: C.online }));
  }

  // 姓名
  widgets.push(text({
    x: 80, y: y + 14, w: 200, h: 20,
    content: opts.name, size: 15, color: C.textDark,
    typeface: "Inter - Semi Bold", weight: 500,
  }));

  // 置顶小标
  if (opts.pinned) {
    widgets.push(text({
      x: 80 + opts.name.length * 16 + 8, y: y + 17, w: 24, h: 16,
      content: "⌃", size: 10, color: C.textLight,
    }));
  }

  // 最后消息预览
  widgets.push(text({
    x: 80, y: y + 38, w: 240, h: 18,
    content: opts.msg, size: 13, color: C.textMid,
  }));

  // 静音图标 (在 name 右侧)
  if (opts.muted) {
    widgets.push(text({
      x: 290, y: y + 38, w: 20, h: 18,
      content: "✕", size: 10, color: C.textLight, align: "center",
    }));
  }

  // 时间
  widgets.push(text({
    x: 270, y: y + 16, w: 90, h: 14,
    content: opts.time, size: 11,
    color: opts.unread ? C.primary : C.textLight, align: "right",
  }));

  // 未读 badge
  if (opts.unread) {
    const w = opts.unread > 99 ? 30 : opts.unread > 9 ? 26 : 22;
    const x = 359 - w;
    widgets.push(rect({
      x, y: y + 42, w, h: 20, corners: 10,
      fill: opts.muted ? C.badgeMute : C.badgeRed,
    }));
    widgets.push(text({
      x, y: y + 45, w, h: 14,
      content: String(opts.unread), size: 11, color: hex("#FFFFFF"),
      typeface: "Inter - Semi Bold", weight: 500, align: "center",
    }));
  }

  // 底部分割线 (在 avatar 列右侧开始, 不贯穿整行)
  widgets.push(hLine({ x: 80, y: y + 76, w: 279, color: C.border }));

  return widgets;
}

// ── 底部 Tab Bar (4 列等宽)
function bottomTab(x: number, label: string, glyph: string, active = false) {
  const W = 93.75;
  return [
    // active 指示器: 上方一个圆点
    ...(active ? [
      circle({ x: x + W / 2 - 3, y: 754, d: 6, fill: C.primary }),
    ] : []),
    // 图标 (一个 BMP 字符 + 大字号)
    text({
      x, y: 762, w: W, h: 24, content: glyph,
      size: 20, color: active ? C.primary : C.textLight, align: "center",
    }),
    // 文字
    text({
      x, y: 790, w: W, h: 14, content: label,
      size: 10, color: active ? C.primary : C.textLight,
      typeface: active ? "Inter - Semi Bold" : "Inter - Regular",
      weight: active ? 500 : 400, align: "center",
    }),
  ];
}

// ── 完整页面
const page = frame({
  name: "消息列表",
  w: 375, h: 812,
  bg: C.bg,
  children: [
    // ─── 顶栏
    text({
      x: 16, y: 56, w: 200, h: 32, content: "消息",
      size: 24, color: C.textDark,
      typeface: "Inter - Bold", weight: 700,
    }),
    // 右上角 compose / + 新建对话
    circle({ x: 327, y: 57, d: 30, fill: C.cardBg }),
    text({ x: 327, y: 60, w: 30, h: 24, content: "+", size: 20, color: C.textDark, align: "center" }),

    // ─── 搜索栏
    rect({ x: 16, y: 104, w: 343, h: 38, corners: 19, fill: C.cardBg }),
    text({ x: 32, y: 116, w: 16, h: 16, content: "○", size: 12, color: C.textLight }),
    text({ x: 50, y: 116, w: 200, h: 16, content: "搜索", size: 13, color: C.textLight }),

    // ─── 列表 (8 项, 每项 76px, 从 y=156 开始 → 156+8*76 = 764, 距 bottom tab 748 还差 16, ok)
    // 实际从 y=158 开始, 留多一点缓冲
    ...chatItem(158, {
      avatarChar: "设", avatarColor: AVATAR_COLORS[1]!,
      name: "设计评审组", msg: "李四：方案已发您查收",
      time: "13:45", unread: 12, pinned: true,
    }),
    ...chatItem(234, {
      avatarChar: "张", avatarColor: AVATAR_COLORS[0]!,
      name: "张伟", msg: "[图片]",
      time: "13:32", unread: 3, online: true,
    }),
    ...chatItem(310, {
      avatarChar: "妈", avatarColor: AVATAR_COLORS[2]!,
      name: "妈妈", msg: "今晚回家吃饭吗？记得带伞",
      time: "12:20", unread: 1,
    }),
    ...chatItem(386, {
      avatarChar: "S", avatarColor: AVATAR_COLORS[3]!,
      name: "Sarah Chen", msg: "Thanks for the help today! ♥",
      time: "11:08", online: true,
    }),
    ...chatItem(462, {
      avatarChar: "王", avatarColor: AVATAR_COLORS[4]!,
      name: "王经理", msg: "[语音 0:15]",
      time: "10:30",
    }),
    ...chatItem(538, {
      avatarChar: "健", avatarColor: AVATAR_COLORS[5]!,
      name: "健身房通知", msg: "新课程上线啦，扫码预约",
      time: "昨天",
    }),
    ...chatItem(614, {
      avatarChar: "客", avatarColor: AVATAR_COLORS[6]!,
      name: "客服小助手", msg: "您的快递 SF1234567890 已签收",
      time: "昨天", unread: 28, muted: true,
    }),
    ...chatItem(690, {
      avatarChar: "Z", avatarColor: AVATAR_COLORS[7]!,
      name: "张三", msg: "好的，明天见",
      time: "周一",
    }),

    // ─── 底部 tab bar 分割线
    hLine({ x: 0, y: 748, w: 375, color: C.borderDeep }),

    // ─── 底部 tab bar (4 列等宽, 每列 93.75)
    ...bottomTab(0,      "消息",   "✉", true),
    ...bottomTab(93.75,  "通讯录", "○"),
    ...bottomTab(187.5,  "发现",   "◐"),
    ...bottomTab(281.25, "我的",   "☺"),
  ],
});

const design = composeDesign(page);
const json = JSON.stringify(design);
console.log(`Generated IM list page: ${json.length} chars`);
const result = pasteAxvg(design, { autoPaste: true });
console.log(`autoPaste: ${result.autoPaste}`);
