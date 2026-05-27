# Skill: Compose Axure designs from natural language

You have an MCP tool `axure_paste_axvg(axvg_json, auto_paste?)` that delivers a JSON design spec to Axure RP 11 via the clipboard. Axure natively renders the JSON on Ctrl+V. **This is the right tool any time the user asks for an Axure page, screen, mockup, or prototype** — it's faster, more reliable, and more flexible than the older binary-template tools.

## The 3-step recipe

1. **Build the design as a JS object** using the helper builders in `dist/parser/index.js`
2. **Call `pasteAxvg(design, { autoPaste: true })`** — drops JSON on clipboard + sends Ctrl+V to Axure
3. **Tell the user where the design landed** — they may need to scroll to find it (Axure positions pastes near the last-active canvas area; use the Pages panel or Ctrl+Home if it's offscreen)

The builders hide the per-character text-inline boilerplate and the dozens of default fields each widget needs. Use them — don't write raw Axvg JSON by hand.

## Available builders

```ts
import {
  composeDesign,            // wrap frames into the Axvg root
  frame,                    // one page/artboard
  rect,                     // base rectangle, optionally with fill + border + corners
  pill,                     // rect with corners=h/2 (used for buttons)
  circle,                   // square widget rendered fully rounded (corners=999)
  hLine,                    // 1px filled rectangle, useful as divider
  text,                     // a text label or paragraph
  hex,                      // CSS hex → normalized RGBA color object
  rgba,                     // raw 0..1 RGBA color
  palettes,                 // named color schemes (warm/cool/dark/brand)
  icons,                    // BMP-only icon glyphs that render in Axure's Inter font
  pasteAxvg,                // the clipboard delivery + auto-paste call
  resetIds,                 // call once before composing if you want stable ids
} from "../dist/parser/index.js";
```

### Function signatures (the bits worth memorizing)

```ts
rect({ x, y, w, h, fill?, border?, corners?, name? })
  // corners: number (all 4 same) or [tl, tr, br, bl]; 999 = pill
  // border: { color, thickness }

pill({ x, y, w, h, fill?, ... })             // == rect with corners = h/2
circle({ x, y, d, fill?, border?, name? })   // == rect d×d with corners 999
hLine({ x, y, w, color, thickness?, name? }) // 1×w (or thickness) filled rect

text({ x, y, w, h, content, size?, color?, typeface?, weight?, align? })
  // typeface: "Inter - Regular" | "Inter - Bold" | "Inter - Medium" | "Inter - Semi Bold"
  // weight:   400 | 500 | 700  (must match the typeface — Regular=400, Medium=500, Bold=700)
  // align:    "left" | "center" | "right"

frame({ w, h, name, bg?, children, x?, y? })   // x/y default to 0
composeDesign(...frames)                        // → { masters, imageMap, scene: { items: [...] } }
pasteAxvg(design, { autoPaste: true })          // clipboard + Ctrl+V to Axure
```

## Palettes (skip designing your own colors unless asked)

```ts
palettes.warm    // literary cream + coffee-orange — reading/lifestyle apps
palettes.cool    // white + blue — SaaS / productivity
palettes.dark    // navy + violet — gaming / entertainment
palettes.brand   // wechat/qq/weibo/apple/google/facebook brand colors
```

Each palette exposes: `bg, primary, primaryText, textDark, textMid, textLight, inputBg, border`.

## Coordinate conventions

- Pixels, top-left origin, **integer or half-integer values are fine** (the format accepts floats).
- Standard mobile artboard: `w: 375, h: 812` (iPhone-style). Web: `w: 1440, h: 900`. Tablet: `w: 768, h: 1024`.
- Vertical spacing between sections: 16-24px for tight, 32-48px for relaxed.
- Container padding (horizontal): typically 16-32px on each side.

## Functional UI icons (Lucide — preferred path)

**When the design needs a functional UI icon (search, settings, user, heart, mail, calendar, bell, play, etc.), use real Lucide icons via the dedicated MCP tool instead of trying to compose icons from rect/circle/line primitives.** The composition approach is fragile and produces lower quality than the real thing.

Lucide is a 1960-icon library (https://lucide.dev) bundled into this repo via the `lucide-static` npm package. We render the real SVG source to a high-DPI PNG via `@resvg/resvg-js` and paste it as a bitmap image into Axure. Result: pixel-perfect icon matching the standard Lucide design.

### The pattern

When generating a page that has an icon slot:
1. **First** call `axure_paste_axvg(...)` to drop the page layout (frames, rectangles, text, buttons). Leave icon spots empty or use a placeholder rectangle.
2. **Then** for each icon slot, call `axure_paste_lucide_icon({ name, size, color, auto_paste: true })` to drop the icon. The user moves it into the slot afterward.

Why two passes? Lucide icons are bitmap images, not Axvg widgets, so they can't be embedded inside an Axvg JSON. They're a separate clipboard operation.

### Tool reference

```ts
axure_paste_lucide_icon({
  name: "search",           // kebab-case slug (matches https://lucide.dev/icons/)
  size: 48,                 // px, default 48
  color: "#3B82F6",          // CSS hex, default "#1F2937" (gray-800)
  stroke_width: 2,           // SVG stroke width, default 2 (Lucide standard)
  auto_paste: true,          // focus Axure + Ctrl+V, default false
})

axure_list_lucide_icons({
  filter: "arrow",            // optional substring filter
  limit: 50,                  // max results, default 200
})  // → { total, returned, icons: ["arrow-up", "arrow-down", ...] }
```

### Common Lucide slugs cheatsheet

Use the user's natural language → Lucide slug:
| User says | Slug |
|---|---|
| 搜索 / search | `search` |
| 设置 / 齿轮 | `settings` |
| 用户 / 头像 | `user` |
| 主页 / home | `house` |
| 心 / 喜欢 | `heart` |
| 收藏 / 星 | `star` |
| 播放 | `play` |
| 暂停 | `pause` |
| 邮件 | `mail` |
| 电话 | `phone` |
| 铃铛 / 通知 | `bell` |
| 日历 | `calendar` |
| 时钟 | `clock` |
| 相机 | `camera` |
| 视频 | `video` |
| 眼睛 / 显示 | `eye` |
| 隐藏 | `eye-off` |
| 锁 | `lock` |
| 分享 | `share-2` |
| 评论 | `message-circle` |
| 下载 | `download` |
| 上传 | `upload` |
| 关闭 / × | `x` |
| 对勾 / 完成 | `check` |
| 加 / 添加 | `plus` |
| 菜单 | `menu` |
| 更多 / ⋯ | `more-horizontal` or `ellipsis` |
| 返回 / 左箭头 | `arrow-left` or `chevron-left` |
| 筛选 | `filter` |
| 网格 | `grid-3x3` |
| 列表 | `list` |
| 图表 | `bar-chart-3` |
| 购物车 | `shopping-cart` |
| 钱包 | `wallet` |
| 位置 | `map-pin` |
| 退出 | `log-out` |

If you're unsure of the exact slug, call `axure_list_lucide_icons({ filter: "..." })` first.

### Avoid hand-composing UI icons
The `uiIcon()` helper from `axvg-ui-icons.ts` (search/settings/etc. composed from primitives) is kept for backwards-compat but the Lucide path is strictly better quality for the same call effort.

## Brand icons (skill-icons style)

For tech-stack chips and social/brand badges, use the `icon()` / `iconRow()` / `iconGrid()` helpers. The catalog is modeled on [tandpfun/skill-icons](https://github.com/tandpfun/skill-icons) — same slug names, same brand colors, but rendered as a colored chip with a short text label (since we can't embed SVG paths in Axvg).

```ts
import { icon, iconRow, iconGrid, listIcons } from "../dist/parser/index.js";

icon("react", { x: 16, y: 32 })                  // default 48×48, rounded corners
icon("github", { x: 16, y: 32, rounded: "circle" })

// A row of language chips
iconRow(["ts", "js", "py", "go", "rust"], { x: 16, y: 100, size: 44, spacing: 12 })

// A 6-column grid
iconGrid(["react","vue","svelte","nextjs","tailwind","vite",
          "nodejs","fastapi","spring","django","rails","nestjs"],
         { x: 16, y: 200, columns: 6, size: 44, spacing: 12, rowSpacing: 16 })
```

**`rounded` options**: `"square"` (4px corners) · `"rounded"` (default, ~size/8 corners — matches skillicons.dev) · `"circle"` (fully rounded — best for social profile chips).

**Catalog (~80 slugs)** organized by category — pick what you need:

| Category | Slugs |
|---|---|
| Languages | `c` `cpp` `cs` `js` `ts` `py` `java` `kotlin` `go` `rust` `ruby` `php` `swift` `dart` `scala` `r` `bash` `powershell` `html` `css` `sass` `graphql` `wasm` `md` `latex` `solidity` |
| Frontend | `react` `vue` `angular` `svelte` `solidjs` `nextjs` `nuxtjs` `remix` `astro` `gatsby` `tailwind` `bootstrap` `materialui` `redux` `threejs` `vite` |
| Backend | `nodejs` `deno` `bun` `express` `nestjs` `fastapi` `flask` `django` `rails` `laravel` `spring` `dotnet` `flutter` |
| Design | `figma` `ps` `ai` `xd` `blender` `unity` `unreal` |
| Tools / IDE | `vscode` `idea` `vim` `obsidian` `notion` `postman` `git` `github` `gitlab` `docker` `kubernetes` |
| Cloud | `aws` `gcp` `azure` `cloudflare` `vercel` `netlify` `firebase` `supabase` `mongodb` `postgres` `mysql` `redis` `nginx` `linux` `ubuntu` |
| Social | `discord` `twitter` `instagram` `linkedin` `gmail` `stackoverflow` `devto` `mastodon` `wechat` `qq` `weibo` |

Unknown slugs render as a **neutral gray placeholder chip** with the first 2 chars of the slug — won't break the page, but you'll see it clearly during development. Call `listIcons()` to enumerate all supported slugs at runtime.

### When you want a real-logo look (rare)
The chip approach is fine for 95% of mockups. If a stakeholder demands pixel-perfect brand marks:
1. Render the chip first to fill the layout slot
2. Tell the user to swap in a real PNG/SVG via Axure's `Insert → Image` after pasting

Future work could explore Axvg's `imageMap` field for embedded image assets — not yet decoded.

## Icon glyphs that actually render

Axure's default Inter font supports BMP (U+0000–U+FFFF) only. Emoji codepoints (📱🔒👁🔍) appear as empty boxes. Use:

| Use case | Glyph | Codepoint |
|---|---|---|
| Close | ✕ | U+2715 |
| Back / Forward | ‹ › | U+2039/203A |
| Arrows | ← → ↑ ↓ | U+2190..2193 |
| Check | ✓ | U+2713 |
| Heart / Star | ♥ ★ | U+2665, U+2605 |
| Warning | ⚠ | U+26A0 |
| Phone | ☎ | U+260E |
| Mail | ✉ | U+2709 |
| Menu | ☰ | U+2630 |
| Bullet | • | U+2022 |

For complex icons (apps, settings, profile), draw them as **small colored rect/circle widgets with a single character overlay** instead of using emoji.

## Canonical patterns

### Input field (with label + placeholder)

```ts
rect({ x: 32, y: 350, w: 311, h: 52, fill: C.inputBg, corners: 12 }),
text({ x: 52, y: 367, w: 200, h: 18, content: "请输入手机号",
       size: 15, color: C.textLight }),
```

### Primary button

```ts
pill({ x: 32, y: 490, w: 311, h: 52, fill: C.primary }),
text({ x: 32, y: 506, w: 311, h: 20, content: "登 录",
       size: 16, color: C.primaryText, typeface: "Inter - Semi Bold", weight: 500,
       align: "center" }),
```

### Section divider with center label

```ts
hLine({ x: 80, y: 633, w: 100, color: C.border }),
text({ x: 175, y: 624, w: 25, h: 16, content: "或",
       size: 12, color: C.textLight, align: "center" }),
hLine({ x: 195, y: 633, w: 100, color: C.border }),
```

### Social/brand chip (circle with single-char label)

```ts
circle({ x: 119, y: 668, d: 48, fill: palettes.brand.wechat }),
text({ x: 119, y: 681, w: 48, h: 24, content: "微",
       size: 18, color: hex("#FFFFFF"), typeface: "Inter - Bold", weight: 700,
       align: "center" }),
```

### Horizontal nav / tab strip

```ts
// container
rect({ x: 0, y: 0, w: 375, h: 56, fill: C.bg }),
// tabs (evenly spaced)
text({ x: 0,   y: 18, w: 125, h: 20, content: "首页", color: C.primary, weight: 700, align: "center" }),
text({ x: 125, y: 18, w: 125, h: 20, content: "书架", color: C.textMid, align: "center" }),
text({ x: 250, y: 18, w: 125, h: 20, content: "我的", color: C.textMid, align: "center" }),
// active indicator
hLine({ x: 50, y: 50, w: 25, color: C.primary, thickness: 3 }),
```

## Full working example

```ts
import {
  composeDesign, frame, rect, pill, circle, hLine, text, hex, palettes, pasteAxvg, resetIds,
} from "../dist/parser/index.js";

resetIds();
const C = palettes.warm;

const page = frame({
  name: "Login",
  w: 375, h: 812,
  bg: C.bg,
  children: [
    // ... use rect/pill/circle/text/hLine to assemble the design ...
  ],
});

const design = composeDesign(page);
await pasteAxvg(design, { autoPaste: true });
```

See `research/gen-novel-login.ts` for a complete 25-widget login page in ~50 lines of design code.

## When to use the older tools (rare)

The pre-Session-4 binary-clipboard tools (`axure_paste_template`, `axure_paste_layout`, `axure_capture_clipboard`) are still around but they're harder to control (no per-widget sizing, no color override). Reach for them ONLY if:

- The user has a specific captured `.bin` template they want to reuse pixel-perfectly
- The Axvg path produces something wrong (e.g., an unsupported widget kind)

For 99% of "design me a page" tasks, **use the Axvg path**.

## Known limitations / things to set user expectation about

1. **Paste position drift** — Axure pastes near the last-active canvas area, not always near (0, 0). The frame's `rect.location` is respected but Axure may offset it. Tell the user to scroll/zoom to find the new content if it's not in view.
2. **Emoji don't render** — use BMP characters only. See the icons table above.
3. **Fonts are limited** — only Inter Regular/Medium/Semi Bold/Bold are reliable. Other typefaces in the JSON likely fall back to Inter or Axure's default.
4. **No images yet** — the `imageMap` field exists in the schema but we haven't explored how to embed image assets. For now, represent images as placeholder rectangles.
5. **No master components yet** — same story for `masters`. To repeat a widget cluster, just duplicate the JSON.

When in doubt, **just generate the design, paste it, and ask the user what looks off**. It's faster to iterate than to over-think.
