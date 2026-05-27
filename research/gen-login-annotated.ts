// 实验: 登录页 + 旁边的功能说明面板
// 左 (0..375): 登录页本体
// 右 (420..820): 编号 + 功能描述

import {
  composeDesign, frame, rect, pill, hLine, text, hex, circle,
  pasteAxvg, resetIds,
} from "../dist/parser/index.js";

resetIds();

const C = {
  bg:        hex("#FFFFFF"),
  panel:     hex("#FAFAFA"),
  cardBg:    hex("#F4F4F5"),
  inputBg:   hex("#F9FAFB"),
  textDark:  hex("#0F172A"),
  textMid:   hex("#475569"),
  textLight: hex("#94A3B8"),
  border:    hex("#E2E8F0"),
  borderDeep:hex("#CBD5E1"),
  primary:   hex("#0F172A"),
  primaryText: hex("#FFFFFF"),
  accent:    hex("#2563EB"),
  divider:   hex("#E5E7EB"),
};

// ── 注释行: 编号圆 + 标题 + 描述 (+ 一条横向连接虚线指向左侧组件)
function annoItem(y: number, n: number, anchorY: number, title: string, desc: string) {
  const widgets: any[] = [];

  // 编号圆 (位置在右栏最左)
  widgets.push(circle({ x: 432, y: y - 2, d: 24, fill: C.primary }));
  widgets.push(text({
    x: 432, y: y + 2, w: 24, h: 18, content: String(n),
    size: 12, color: C.primaryText, align: "center",
    typeface: "Inter - Semi Bold", weight: 500,
  }));

  // 标题
  widgets.push(text({
    x: 466, y: y, w: 320, h: 20, content: title,
    size: 14, color: C.textDark,
    typeface: "Inter - Semi Bold", weight: 500,
  }));
  // 描述 (允许两行宽度)
  widgets.push(text({
    x: 466, y: y + 22, w: 320, h: 36, content: desc,
    size: 12, color: C.textMid,
  }));

  // 连接线: 从编号圆左侧延伸到左面板组件 (短虚线模拟: 5 个小方块)
  const dashCount = 5;
  const dashX0 = 388;   // 起点 (左栏右缘)
  const dashX1 = 428;   // 终点 (编号圆边)
  const step = (dashX1 - dashX0) / (dashCount * 2 - 1);
  for (let i = 0; i < dashCount; i++) {
    const sx = dashX0 + i * step * 2;
    widgets.push(rect({
      x: sx, y: anchorY, w: step * 1.1, h: 1, fill: C.borderDeep,
    }));
  }

  return widgets;
}

const page = frame({
  name: "登录页+功能说明",
  w: 820, h: 760,
  bg: C.panel,
  children: [
    // ════════════════════════════════════════════════
    // 左栏: 登录页本体 (居中在 0..400 内, 实际页面 24..399 留 1px 分隔)
    // ════════════════════════════════════════════════
    rect({ x: 0, y: 0, w: 400, h: 760, fill: C.bg }),
    // 设备外框 (375x720 居中, 模拟手机原型)
    rect({ x: 12, y: 20, w: 376, h: 720, corners: 18,
           fill: C.bg, border: { color: C.border, thickness: 1 } }),

    // ── 1. 标题区
    circle({ x: 178, y: 56, d: 44, fill: C.primary }),
    text({ x: 178, y: 70, w: 44, h: 18, content: "A",
           size: 18, color: C.primaryText, align: "center",
           typeface: "Inter - Bold", weight: 700 }),
    text({ x: 36, y: 118, w: 328, h: 28, content: "登录 Acme",
           size: 22, color: C.textDark, align: "center",
           typeface: "Inter - Bold", weight: 700 }),
    text({ x: 36, y: 150, w: 328, h: 18, content: "欢迎回来, 请用账号登录",
           size: 12, color: C.textMid, align: "center" }),

    // ── 2. 邮箱输入
    text({ x: 36, y: 198, w: 200, h: 16, content: "邮箱",
           size: 12, color: C.textMid,
           typeface: "Inter - Medium", weight: 500 }),
    rect({ x: 36, y: 220, w: 328, h: 44, corners: 8,
           fill: C.inputBg, border: { color: C.border, thickness: 1 } }),
    text({ x: 50, y: 232, w: 280, h: 20, content: "you@example.com",
           size: 13, color: C.textLight }),

    // ── 3. 密码输入 (含眼睛 toggle)
    text({ x: 36, y: 282, w: 200, h: 16, content: "密码",
           size: 12, color: C.textMid,
           typeface: "Inter - Medium", weight: 500 }),
    rect({ x: 36, y: 304, w: 328, h: 44, corners: 8,
           fill: C.inputBg, border: { color: C.border, thickness: 1 } }),
    text({ x: 50, y: 316, w: 240, h: 20, content: "••••••••",
           size: 14, color: C.textDark }),
    // 眼睛 icon (椭圆 + 内圆)
    rect({ x: 322, y: 320, w: 24, h: 12, corners: 6,
           border: { color: C.textMid, thickness: 1.2 } }),
    circle({ x: 330, y: 322, d: 8, fill: C.textMid }),

    // ── 4. 记住我 + 忘记密码
    rect({ x: 36, y: 366, w: 16, h: 16, corners: 3,
           fill: C.primary }),
    text({ x: 36, y: 366, w: 16, h: 16, content: "✓",
           size: 11, color: C.primaryText, align: "center",
           typeface: "Inter - Bold", weight: 700 }),
    text({ x: 58, y: 367, w: 100, h: 16, content: "记住我",
           size: 12, color: C.textDark }),
    text({ x: 254, y: 367, w: 110, h: 16, content: "忘记密码？",
           size: 12, color: C.accent, align: "right",
           typeface: "Inter - Medium", weight: 500 }),

    // ── 5. 主登录按钮
    rect({ x: 36, y: 402, w: 328, h: 48, corners: 10, fill: C.primary }),
    text({ x: 36, y: 415, w: 328, h: 20, content: "登录",
           size: 15, color: C.primaryText, align: "center",
           typeface: "Inter - Semi Bold", weight: 500 }),

    // ── 分隔线 with "或"
    hLine({ x: 36, y: 488, w: 140, color: C.divider }),
    hLine({ x: 224, y: 488, w: 140, color: C.divider }),
    text({ x: 176, y: 480, w: 48, h: 16, content: "或",
           size: 11, color: C.textLight, align: "center" }),

    // ── 6. 第三方登录 (Google + Apple)
    rect({ x: 36, y: 514, w: 156, h: 44, corners: 8,
           fill: C.bg, border: { color: C.border, thickness: 1 } }),
    circle({ x: 60, y: 524, d: 18, fill: C.cardBg }),
    text({ x: 60, y: 527, w: 18, h: 14, content: "G",
           size: 11, color: C.textDark, align: "center",
           typeface: "Inter - Bold", weight: 700 }),
    text({ x: 82, y: 526, w: 100, h: 18, content: "Google",
           size: 12, color: C.textDark,
           typeface: "Inter - Medium", weight: 500 }),

    rect({ x: 208, y: 514, w: 156, h: 44, corners: 8,
           fill: C.bg, border: { color: C.border, thickness: 1 } }),
    text({ x: 232, y: 521, w: 18, h: 24, content: "",
           size: 16, color: C.textDark, align: "center" }),
    circle({ x: 230, y: 525, d: 16, fill: C.textDark }),
    text({ x: 254, y: 526, w: 100, h: 18, content: "Apple",
           size: 12, color: C.textDark,
           typeface: "Inter - Medium", weight: 500 }),

    // ── 7. 注册入口
    text({ x: 36, y: 598, w: 200, h: 16, content: "还没有账号？",
           size: 12, color: C.textMid, align: "right" }),
    text({ x: 240, y: 598, w: 80, h: 16, content: "立即注册",
           size: 12, color: C.accent,
           typeface: "Inter - Semi Bold", weight: 500 }),

    // ── 8. 条款 (小字)
    text({ x: 36, y: 690, w: 328, h: 16, content: "继续即表示同意 服务条款 与 隐私政策",
           size: 10, color: C.textLight, align: "center" }),

    // ════════════════════════════════════════════════
    // 中间分隔 (柔和的竖线)
    // ════════════════════════════════════════════════
    rect({ x: 400, y: 0, w: 420, h: 760, fill: C.panel }),

    // ════════════════════════════════════════════════
    // 右栏: 功能说明面板
    // ════════════════════════════════════════════════
    text({ x: 432, y: 32, w: 360, h: 26, content: "页面功能说明",
           size: 17, color: C.textDark,
           typeface: "Inter - Bold", weight: 700 }),
    text({ x: 432, y: 60, w: 360, h: 16, content: "Login Page — 各组件的功能与交互",
           size: 11, color: C.textLight }),
    hLine({ x: 432, y: 92, w: 360, color: C.border }),

    // 8 条注释, anchorY = 左侧对应组件的中心 y
    ...annoItem(110, 1, 78,  "标题区 (Logo + 欢迎语)",
                "品牌标识与欢迎文案，无交互。"),
    ...annoItem(174, 2, 242, "邮箱输入",
                "失焦时校验 RFC 5322 邮箱格式；不通过则在输入框下方红色提示。"),
    ...annoItem(238, 3, 326, "密码输入 + 眼睛切换",
                "默认掩码显示；右侧眼睛点击切换明文/掩码。"),
    ...annoItem(302, 4, 374, "记住我 + 忘记密码",
                "勾选后写 30 天 long-lived cookie；右侧跳转邮箱验证码重置流程。"),
    ...annoItem(366, 5, 426, "主登录按钮",
                "提交表单走 /api/auth/login；成功跳首页，失败按错误码就地提示。"),
    ...annoItem(430, 6, 536, "第三方登录",
                "Google / Apple OAuth；点击跳 OAuth 授权页，回调后自动跳首页。"),
    ...annoItem(494, 7, 598, "注册入口",
                "右侧「立即注册」是文字链接，跳 /signup 页面。"),
    ...annoItem(558, 8, 690, "条款与隐私 (页脚)",
                "灰色小字静态文案；点击关键词跳对应法律页面 (新标签)。"),

    // 右栏底部备注
    hLine({ x: 432, y: 632, w: 360, color: C.border }),
    text({ x: 432, y: 648, w: 360, h: 16, content: "状态机",
           size: 12, color: C.textDark,
           typeface: "Inter - Semi Bold", weight: 500 }),
    text({ x: 432, y: 668, w: 360, h: 16, content: "idle → validating → submitting → success | error",
           size: 11, color: C.textMid }),
    text({ x: 432, y: 690, w: 360, h: 16, content: "无障碍",
           size: 12, color: C.textDark,
           typeface: "Inter - Semi Bold", weight: 500 }),
    text({ x: 432, y: 710, w: 360, h: 16, content: "Tab 顺序: 邮箱 → 密码 → 记住我 → 登录 → Google → Apple",
           size: 11, color: C.textMid }),
  ],
});

const design = composeDesign(page);
const json = JSON.stringify(design);
console.log(`Generated annotated login page: ${json.length} chars`);
const result = pasteAxvg(design, { autoPaste: true });
console.log(`autoPaste: ${result.autoPaste}`);
