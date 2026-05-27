// Full demo: build a settings page layout in Axvg, then drop 6 real Lucide icons
// into the icon slots. Shows the two-pass pattern the SKILL.md describes.
import {
  composeDesign, frame, rect, pill, hLine, text, hex,
  palettes, pasteAxvg, pasteLucideIcon, resetIds,
} from "../dist/parser/index.js";

resetIds();
const C = palettes.cool;

// Row spec: each settings menu row has an icon slot + label + chevron
function settingsRow(y: number, label: string, sub?: string, danger = false) {
  const labelColor = danger ? hex("#DC2626") : C.textDark;
  return [
    // Icon slot placeholder (Lucide icon will be pasted here in pass 2)
    rect({ name: `icon-slot-${label}`, x: 24, y: y + 12, w: 28, h: 28,
           fill: hex("#F3F4F6"), corners: 6 }),
    // Main label
    text({ x: 64, y: y + (sub ? 10 : 18), w: 250, h: 18,
           content: label, size: 15, color: labelColor,
           typeface: "Inter - Medium", weight: 500 }),
    // Optional sub-label
    ...(sub ? [
      text({ x: 64, y: y + 30, w: 250, h: 14, content: sub, size: 12, color: C.textLight }),
    ] : []),
    // Chevron-right hint on the right edge
    text({ x: 343, y: y + 18, w: 16, h: 18, content: "›",
           size: 18, color: C.textLight, align: "center" }),
    // Bottom divider
    hLine({ x: 64, y: y + 52, w: 311, color: C.border }),
  ];
}

const rows = [
  { y: 130, label: "账户设置",   sub: "个人资料、头像、密码",  icon: "user",       color: "#3B82F6" },
  { y: 188, label: "通知",       sub: "推送、邮件、消息提醒",  icon: "bell",       color: "#F59E0B" },
  { y: 246, label: "隐私",       sub: "数据、权限、可见性",    icon: "lock",       color: "#10B981" },
  { y: 304, label: "外观",       sub: "主题、字体、深色模式",  icon: "palette",    color: "#A855F7" },
  { y: 362, label: "下载管理",   sub: "已下载内容、自动下载",  icon: "download",   color: "#6366F1" },
  { y: 420, label: "关于",       sub: "版本 1.2.0",          icon: "info",       color: "#6B7280" },
  { y: 478, label: "退出登录",   icon: "log-out",  color: "#DC2626", danger: true },
];

const page = frame({
  name: "设置页",
  w: 400, h: 600,
  bg: C.bg,
  children: [
    // Header
    text({ x: 24, y: 28, w: 200, h: 30, content: "设置",
           size: 22, color: C.textDark, typeface: "Inter - Bold", weight: 700 }),
    hLine({ x: 0, y: 100, w: 400, color: C.border, thickness: 2 }),

    // Settings rows
    ...rows.flatMap(r => settingsRow(r.y, r.label, r.sub, !!r.danger)),
  ],
});

console.log("--- Pass 1: laying out the page via Axvg ---");
const layoutResult = pasteAxvg(composeDesign(page), { autoPaste: true });
console.log("Layout pasted:", layoutResult.autoPaste);

console.log("\n--- Pass 2: dropping each Lucide icon ---");
console.log("(In production these would land in the icon slots; here they stack near canvas center)");
// Sleep briefly so each paste lands distinctly
await new Promise(r => setTimeout(r, 1200));
for (const r of rows) {
  const result = await pasteLucideIcon(r.icon, {
    size: 28,
    color: r.color,
    strokeWidth: 2,
    autoPaste: true,
  });
  console.log(`  ${r.icon.padEnd(16)} (${r.color})  →  ${result.autoPaste}`);
  await new Promise(rs => setTimeout(rs, 700));
}

console.log("\nDone. 1 Axvg page + 7 Lucide icons delivered to Axure.");
