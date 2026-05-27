// Generate a polished novel-reading-app login page using the high-level builders.
// Shows how concise design code becomes once the boilerplate is hidden.
import {
  composeDesign, frame, rect, pill, circle, hLine, text, hex,
  palettes, icons, pasteAxvg, resetIds,
} from "../dist/parser/index.js";

resetIds();

const C = palettes.warm; // literary cream + coffee-orange
const B = palettes.brand;

const page = frame({
  name: "墨阅 - 登录页",
  w: 375, h: 812,
  bg: C.bg,
  children: [
    // Top bar — close button
    text({ x: 327, y: 28, w: 24, h: 24, content: icons.close, size: 18, color: C.textLight, align: "center" }),

    // Logo
    rect({ name: "Logo", x: 151.5, y: 130, w: 72, h: 72, fill: C.primary, corners: 18 }),
    text({ x: 151.5, y: 145, w: 72, h: 42, content: "墨", size: 36, color: C.primaryText, typeface: "Inter - Bold", weight: 700, align: "center" }),

    // App name + tagline
    text({ x: 0, y: 226, w: 375, h: 38, content: "墨 阅", size: 30, color: C.textDark, typeface: "Inter - Bold", weight: 700, align: "center" }),
    text({ x: 0, y: 274, w: 375, h: 20, content: "读尽天下好书", size: 14, color: C.textLight, align: "center" }),

    // Phone input
    rect({ name: "Phone Input", x: 32, y: 350, w: 311, h: 52, fill: C.inputBg, corners: 12 }),
    text({ x: 52, y: 367, w: 40, h: 18, content: "+86", size: 15, color: C.textDark, typeface: "Inter - Medium", weight: 500 }),
    hLine({ x: 96, y: 364, w: 1, color: C.border, thickness: 24 }),
    text({ x: 112, y: 367, w: 200, h: 18, content: "请输入手机号", size: 15, color: C.textLight }),

    // Password input — eye-toggle as text label (BMP-safe) instead of emoji
    rect({ name: "Password Input", x: 32, y: 414, w: 311, h: 52, fill: C.inputBg, corners: 12 }),
    text({ x: 52, y: 431, w: 200, h: 18, content: "请输入密码", size: 15, color: C.textLight }),
    text({ x: 290, y: 431, w: 40, h: 18, content: "显示", size: 13, color: C.textMid, align: "right" }),

    // Login button
    pill({ name: "Login Button", x: 32, y: 490, w: 311, h: 52, fill: C.primary }),
    text({ x: 32, y: 506, w: 311, h: 20, content: "登  录", size: 16, color: C.primaryText, typeface: "Inter - Semi Bold", weight: 500, align: "center" }),

    // Forgot link
    text({ x: 0, y: 560, w: 375, h: 18, content: "忘记密码？", size: 13, color: C.textLight, align: "center" }),

    // "Or" divider
    hLine({ x: 80, y: 633, w: 100, color: C.border }),
    text({ x: 175, y: 624, w: 25, h: 16, content: "或", size: 12, color: C.textLight, align: "center" }),
    hLine({ x: 195, y: 633, w: 100, color: C.border }),

    // Social logins — circles + labels
    circle({ name: "WeChat", x: 119, y: 668, d: 48, fill: B.wechat }),
    text({ x: 119, y: 681, w: 48, h: 24, content: "微", size: 18, color: hex("#FFFFFF"), typeface: "Inter - Bold", weight: 700, align: "center" }),

    circle({ name: "QQ", x: 175.5, y: 668, d: 48, fill: B.qq }),
    text({ x: 175.5, y: 681, w: 48, h: 24, content: "Q", size: 18, color: hex("#FFFFFF"), typeface: "Inter - Bold", weight: 700, align: "center" }),

    circle({ name: "Weibo", x: 232, y: 668, d: 48, fill: B.weibo }),
    text({ x: 232, y: 681, w: 48, h: 24, content: "博", size: 18, color: hex("#FFFFFF"), typeface: "Inter - Bold", weight: 700, align: "center" }),

    // Terms
    text({ x: 0, y: 760, w: 375, h: 16, content: "登录即代表同意《用户协议》和《隐私政策》", size: 11, color: C.textLight, align: "center" }),
  ],
});

const design = composeDesign(page);
console.log(`Generated novel login: JSON ${JSON.stringify(design).length} chars`);
const result = pasteAxvg(design, { autoPaste: true });
console.log(JSON.stringify(result, null, 2));
