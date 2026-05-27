# axure-mcp

Axure RP 11 的 MCP 服务。读 `.rp` 文件、通过剪贴板把设计写进 Axure。

**核心能力: Figma MCP 等价的原型生成。** Axure RP 11 原生接受 `Axvg` 格式的 JSON 粘贴（和 Figma "Axure - Copy Selection for RP" 插件用的是同一格式）。这意味着 LLM 可以直接写出结构化 JSON 描述一个设计，调 `axure_paste_axvg(json, auto_paste=true)` 就能把这个设计粘到 Axure 画布上，位置 / 尺寸 / 颜色 / 文字全对——不用碰底层二进制格式。

早期会话里做的二进制解码工作（只读 `.rp` 解析、字节级剪贴板写入）还在仓库里也能用，但绝大多数生成场景已经被 Axvg 路径替代。

## 我能用 MCP 做什么

对任何 `.rp` 文件（RP 11 / RP 9）:

- **文件级**: Axure 版本号（如 `11.0.0.4137`）、文件大小、外层 header、record 总数。
- **每条 record**: 类名（`Axure:Page`、`Axure:Master`、`Axure:DesignDocument`、`Axure:DocumentSettings`、多个 `*GeneratorConfiguration` 类，以及一个内联 XML 守卫 record）、解压后大小、schema 字符串数。
- **Page / Master record**: 包含哪些 widget 类型（如 `VectorShape`），以及一个启发式列出的用户字符串列表（中文 widget 名、自定义文本、页面标题）。
- **深挖一条 record**: 完整字符串表 + payload 里 string reference 的时序。

**目前还做不到**:
- 把 widget 的 位置 / 尺寸 / 颜色 还原成结构化值（typed-value payload walker 在 ~70 条 record 后会漂）
- 解 LZ 压缩的前置 manifest
- 反向写回 `.rp`（Axure 的序列化格式还不能由我们生成）

## 目录结构

- `src/` — TypeScript 源码（parser 库 + MCP 服务）
- `src/parser/` — 复用 parser 库（`openAxureFile`、`parseRecord`、`scanStrrefs`、`inspect`、`dumpRecord` 等）
- `src/mcp-server.ts` — MCP stdio 服务入口
- `dist/` — 编译后的 JS（跑过 `npm run build` 之后才有）
- `research/` — 探索性脚本，`npm run <name>` 跑
- `samples/` — 测试用的 `.rp` 文件（部分 gitignored）
- `INSTALL.md` — **给同事看的安装指南**（推荐先从这里读起）
- `NOTES.md` — 持续更新的逆向工程笔记，是格式确认的事实来源
- `SKILL_AXVG.md` — 给 Claude 看的 Axvg 生成速查表（Claude 生成时会自动参考）

## 接入 Claude Code

详细装法看 [`INSTALL.md`](./INSTALL.md)（中文 5 分钟流程，Win + Mac 都有）。简要版:

1. 编译:
   ```
   npm install
   npm run build
   ```

2. 在 `~/.claude.json` 的 `mcpServers` 里加（路径改成你自己的 clone 位置）:
   ```json
   {
     "mcpServers": {
       "axure": {
         "command": "node",
         "args": ["C:/Users/<你的用户名>/axure-mcp/dist/mcp-server.js"]
       }
     }
   }
   ```

3. 重启 Claude Code，跑 `/mcp` 确认 `axure` 已连接。

4. 试试看:
   > 做一个简单的登录页

## 暴露的 MCP 工具（共 13 个）

**主力 写工具（突破口——做设计生成走这个）:**
- `axure_paste_axvg(axvg_json, auto_paste?)` — 把 Axvg 格式 JSON 写到系统剪贴板（格式名字面就叫 `Axvg`）。Axure RP 11 原生支持 Ctrl+V 接收。开 `auto_paste: true` 还会自动激活 Axure 并模拟 Ctrl+V。JSON 描述一个 frame 及其子 widget，含 `rect`、`corners`、`border`、`strokes`、`backgroundFills`，文字 widget 用按字符 `inlines` 数组。完整示例见 `samples/axvg/login_page_email_error.axvg.json`，schema 见 `NOTES.md → Session 4`。

**读工具:**
- `axure_inspect(rp_path)` — `.rp` 文件的总览。
- `axure_dump_record(rp_path, record_index, strref_limit?)` — 深挖一条 record。
- `axure_read_selection(out_dir?)` — **读你在 Axure 里的当前选区**。你先在 Axure Ctrl+A → Ctrl+C，然后调这个，能拿到所有文字内容 + 一张 PNG 截图（LLM 直接 vision 看图)。用来同步你在 Axure 里改了什么。
- `axure_list_templates(dir?)` — 列出捕获过的 `samples/clipboard/*.bin` widget 模板（二进制格式，已被 `axure_paste_axvg` 取代）。
- `axure_get_window_rect()` — Win32 `GetWindowRect` 拿到 Axure 主窗口屏幕坐标，外加推断出的画布绘图区。会把 Axure 最大化并置前作为副作用。

**图标工具:**
- `axure_paste_lucide_icon(name, size?, color?, stroke_width?, auto_paste?)` — 真实的 Lucide 图标 (1960+) 渲染成 PNG 粘到 Axure。生成的原型里有图标槽位时，会自动调这个补图标。
- `axure_list_lucide_icons(filter?, limit?)` — 搜 Lucide 图标的 slug 名。

**遗留 写工具（Session 4 之前的，留着兜底）:**
- `axure_paste_template(template, auto_paste?)` — 把二进制 `AxureClipboardDocument11.0.0.0` 模板丢上剪贴板。如果你捕获了某个 Axure widget 想像素级复刻，用这个。
- `axure_paste_at(cursor_x, cursor_y, width?)` — 把内置矩形模板粘到指定屏幕坐标。
- `axure_paste_layout(widgets, delay_ms?)` — 多个二进制模板按 `(dx, dy)` 相对画布中心的偏移批量粘。
- `axure_paste_login_page_scaffold(delay_ms?)` — 在一列里粘 7 个默认矩形作为登录页脚手架。已被 `axure_paste_axvg` 取代（后者能一次生成位置 / 颜色 / 文字都对的完整登录页）。
- `axure_capture_clipboard(name, dir?)` — 把当前 Windows 剪贴板内容存为 `.bin` 模板。`AxureClipboardDocument11.0.0.0` 等多种格式都能存。

## 研究脚本（仍然有用）

- `npm run analyze -- <file.rp>`
- `npm run extract-records -- <file.rp>` — 把每条 gzip record 解到 `samples/extracted/<name>/`
- `npm run dump-schema -- <record.bin>` — 打印一条 record 的字符串表
- `npm run scan-strefs -- <record.bin>` — payload 中所有 `08 XX XX XX XX` 的 strref
- `npm run parse-payload -- <record.bin>` — typed-value walker（~70 步后会漂）
- `npm run diff-schemas -- <a.bin> <b.bin>` — 两条 record 的 schema 差异
- `npm run diff-files -- <a.rp> <b.rp>` — 字节级 diff
- `npm run find-u32 -- <file> <decimal>` — 在文件里搜 u32 LE 值
- `npm run hexdump -- <file> [--start=N] [--len=N]`

## 跨平台

| 平台 | 剪贴板路径 |
|---|---|
| Windows | PowerShell + `System.Windows.Forms.Clipboard` + Win32 |
| macOS | bash + Swift (`NSPasteboard`) + AppleScript (`System Events`) |

Mac 用户需要装一次 `xcode-select --install` 拿到 swift 解释器，外加把 Claude Code 加进系统的「辅助功能」权限（自动粘贴用）。详见 [`INSTALL.md`](./INSTALL.md)。

Linux 暂不支持。

## 烟雾测试

```
npm run smoke -- samples/rect_with_text.rp
```

打印 inspect 输出和第一个 Page record 的前 10 个 strref。改了 parser 之后跑一下回归。
