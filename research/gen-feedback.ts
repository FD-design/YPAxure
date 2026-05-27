// "意见反馈" page — fully Axvg, end-to-end editable in Axure.
// Uses only the existing builders; no Lucide PNG involved → every element stays as
// an editable Axure widget.

import {
  composeDesign, frame, rect, pill, hLine, text, hex,
  palettes, pasteAxvg, resetIds,
} from "../dist/parser/index.js";

resetIds();

const C = palettes.warm;
const GOLD = hex("#F59E0B");

// ── Component helpers ────────────────────────────────────────────────────

function chip(x: number, y: number, label: string, selected = false) {
  return [
    rect({
      x, y, w: 78, h: 32, corners: 16,
      fill: selected ? C.primary : C.inputBg,
      border: selected ? undefined : { color: C.border, thickness: 1 },
    }),
    text({
      x, y: y + 8, w: 78, h: 18,
      content: label, size: 12,
      color: selected ? C.primaryText : C.textMid,
      typeface: selected ? "Inter - Semi Bold" : "Inter - Medium",
      weight: 500,
      align: "center",
    }),
  ];
}

function star(x: number, y: number, filled: boolean) {
  return text({
    x, y, w: 32, h: 32,
    content: filled ? "★" : "☆",
    size: 28,
    color: filled ? GOLD : hex("#D6CCBC"),
    align: "center",
  });
}

function uploadSlot(x: number, y: number) {
  return [
    rect({
      x, y, w: 72, h: 72, corners: 8,
      fill: C.inputBg,
      border: { color: C.border, thickness: 1.5 },
    }),
    text({ x, y: y + 14, w: 72, h: 36, content: "+", size: 32, color: hex("#B5A89A"), align: "center" }),
    text({ x, y: y + 48, w: 72, h: 14, content: "添加图片", size: 10, color: C.textLight, align: "center" }),
  ];
}

function sectionLabel(x: number, y: number, title: string, hintRightOf?: string) {
  return [
    text({
      x, y, w: 200, h: 22, content: title, size: 14,
      color: C.textDark, typeface: "Inter - Semi Bold", weight: 500,
    }),
    ...(hintRightOf
      ? [text({ x: 0, y: y + 2, w: 355, h: 18, content: hintRightOf,
                size: 11, color: C.textLight, align: "right" })]
      : []),
  ];
}

// ── Page ─────────────────────────────────────────────────────────────────

const page = frame({
  name: "意见反馈",
  w: 375, h: 880,
  bg: C.bg,
  children: [

    // ── Top nav
    text({ x: 16, y: 56, w: 24, h: 28, content: "‹", size: 28, color: C.textDark }),
    text({
      x: 0, y: 62, w: 375, h: 24,
      content: "意见反馈", size: 17, color: C.textDark,
      typeface: "Inter - Semi Bold", weight: 500, align: "center",
    }),
    text({ x: 339, y: 64, w: 24, h: 20, content: "?", size: 16, color: C.textLight, align: "center" }),
    hLine({ x: 0, y: 100, w: 375, color: C.border }),

    // ── Section 1: overall rating
    ...sectionLabel(20, 124, "整体评分", "4.0 / 5.0"),
    star(20, 156, true),
    star(60, 156, true),
    star(100, 156, true),
    star(140, 156, true),
    star(180, 156, false),

    hLine({ x: 20, y: 212, w: 335, color: C.border }),

    // ── Section 2: feedback type
    ...sectionLabel(20, 232, "问题类型", "必填"),
    ...chip(20, 264, "功能建议", true),
    ...chip(102, 264, "Bug反馈"),
    ...chip(184, 264, "体验问题"),
    ...chip(266, 264, "其他"),

    hLine({ x: 20, y: 316, w: 335, color: C.border }),

    // ── Section 3: detailed description
    ...sectionLabel(20, 336, "详细描述", "0 / 500"),
    rect({ x: 20, y: 368, w: 335, h: 140, corners: 12, fill: C.inputBg }),
    text({
      x: 32, y: 382, w: 311, h: 18,
      content: "请详细描述您遇到的问题或建议……",
      size: 13, color: hex("#B5A89A"),
    }),
    text({
      x: 32, y: 410, w: 311, h: 18,
      content: "（例如：在哪个页面、什么操作下发生）",
      size: 12, color: hex("#C9BDB0"),
    }),

    hLine({ x: 20, y: 528, w: 335, color: C.border }),

    // ── Section 4: image upload (3 slots)
    ...sectionLabel(20, 548, "上传截图", "选填，最多 3 张"),
    ...uploadSlot(20, 580),
    ...uploadSlot(108, 580),
    ...uploadSlot(196, 580),

    hLine({ x: 20, y: 676, w: 335, color: C.border }),

    // ── Section 5: contact info
    ...sectionLabel(20, 696, "联系方式", "选填"),
    rect({ x: 20, y: 728, w: 335, h: 48, corners: 12, fill: C.inputBg }),
    text({
      x: 32, y: 742, w: 280, h: 18,
      content: "请输入邮箱或手机号", size: 13, color: hex("#B5A89A"),
    }),

    // ── Submit button
    pill({ x: 20, y: 800, w: 335, h: 52, fill: C.primary }),
    text({
      x: 20, y: 816, w: 335, h: 20,
      content: "提交反馈", size: 16, color: C.primaryText,
      typeface: "Inter - Semi Bold", weight: 500, align: "center",
    }),

    // ── Footer link
    text({
      x: 0, y: 866, w: 375, h: 16,
      content: "查看我的反馈记录 ›", size: 13, color: C.primary, align: "center",
    }),
  ],
});

const design = composeDesign(page);
console.log(`Generated feedback page: JSON ${JSON.stringify(design).length} chars`);
const result = pasteAxvg(design, { autoPaste: true });
console.log(JSON.stringify(result, null, 2));
