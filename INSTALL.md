# axure-mcp — 同事安装指南

让 Claude Code 在你的电脑上能"一句话生成 Axure 原型"。一次性配置，5 分钟搞定。

## 你需要先装好的

| 工具 | 版本 | 用途 |
|---|---|---|
| **Axure RP 11** | 任何版本 | 接收 Claude 生成的原型 |
| **Node.js** | ≥ 20 | 运行 MCP 服务 |
| **Claude Code** | 当前版本 | 你已经订阅了 |
| **Git** | 任意 | 拉代码 |

**支持 Windows 和 macOS**。两边走不同的剪贴板路径：

- **Windows**：PowerShell + `System.Windows.Forms.Clipboard` + Win32 API
- **macOS**：bash + Swift（`NSPasteboard`）+ AppleScript（`System Events`）

Mac 用户额外要装一次：

```bash
xcode-select --install
```

（Xcode Command Line Tools 提供 `swift` 解释器；脚本会用它调 NSPasteboard 写自定义剪贴板类型。）

Linux 暂不支持。

## 安装步骤

### 1. 拉代码

Windows：

```bash
git clone <仓库地址>  C:/Users/<你的用户名>/axure-mcp
cd C:/Users/<你的用户名>/axure-mcp
```

macOS：

```bash
git clone <仓库地址> ~/axure-mcp
cd ~/axure-mcp
```

(路径不强制，但下面 `.claude.json` 里要对应改。)

### 2. 装依赖并编译

```bash
npm install
npm run build
```

完成后 `dist/` 目录下会有编译好的 JS。

### 3. 把 MCP 接入 Claude Code

打开你电脑上的 Claude Code 配置文件：

- Windows: `C:\Users\<你的用户名>\.claude.json`
- macOS: `~/.claude.json`

如果文件不存在，先创建一个。在 `mcpServers` 字段里加上 `axure`（**注意把路径改成你 clone 的实际位置**）：

Windows：
```json
{
  "mcpServers": {
    "axure": {
      "command": "node",
      "args": ["C:/Users/<你的用户名>/axure-mcp/dist/mcp-server.js"],
      "env": {},
      "type": "stdio"
    }
  }
}
```

macOS：
```json
{
  "mcpServers": {
    "axure": {
      "command": "node",
      "args": ["/Users/<你的用户名>/axure-mcp/dist/mcp-server.js"],
      "env": {},
      "type": "stdio"
    }
  }
}
```

如果你已经有别的 MCP 配置（比如 figma、pencil），把 `axure` 加进同一个 `mcpServers` 对象里，不要新建一个根字段。

### 4. 重启 Claude Code

完全退出 Claude Code 再打开，让它重新加载 MCP 配置。

### 5. 验证安装

打开 Axure RP 11（任何空白文档都行），然后在 Claude Code 里问：

> axure mcp 都有哪些工具？

Claude 应该列出 13 个工具（`axure_inspect`、`axure_paste_axvg`、`axure_paste_lucide_icon`、`axure_read_selection` 等）。如果只列出了部分或者报错，看下面的"踩坑排查"。

### 6. 试用

> 做一个简单的登录页

Claude 会生成 JSON 设计、自动粘贴到 Axure 画布上。整个过程不超过 5 秒。

## 怎么使用

### 1. 生成原型（最常用）
直接对 Claude 说人话：

```
做一个商品详情页
帮我做个外卖订单跟踪页
把上一个页面改成深色
```

Claude 会自动调 `axure_paste_axvg`，原型出现在 Axure 中。

### 2. 加图标
如果设计里有图标槽位，Claude 会自动调 `axure_paste_lucide_icon` 补图标。1960+ Lucide 图标全部可用。

### 3. 找特定图标
你也可以让 Claude 帮你找图标 slug：

> 帮我找一下 lucide 里和"购物车"相关的图标

Claude 会调 `axure_list_lucide_icons` 模糊搜索。

### 4. 让 Claude 读你在 Axure 里改了什么（双向闭环）

Claude 生成的原型粘到 Axure 后，你想自己调整位置/颜色/文字，再让 Claude 在此基础上继续改？操作：

1. 在 Axure 里改原型
2. **Ctrl+A 全选 → Ctrl+C**（Mac 是 Cmd）
3. 跟 Claude 说"读一下我改了什么" 或 "看一下当前画布"

Claude 会调 `axure_read_selection`，拿到两个信号：
- 所有文字内容的当前状态（从 Axure 的 `Csv` 剪贴板格式来的）
- 一张当前选区的截图（820×N 的 PNG，Claude 能视觉读出来颜色/位置/勾选状态）

然后 Claude 就知道你改了啥，可以接着改下一版。

### 全部 13 个工具

| 工具 | 干嘛的 |
|---|---|
| `axure_paste_axvg` | **主力**：JSON 设计 → Axure 画布（一句话生原型走这个） |
| `axure_read_selection` | **读**：Ctrl+C 后调一下，Claude 拿到文字 + 截图 |
| `axure_paste_lucide_icon` | 真实 Lucide 图标 → Axure（PNG 形式） |
| `axure_list_lucide_icons` | 搜 1960 个图标 slug |
| `axure_get_window_rect` | 查 Axure 窗口位置（自动粘贴前找画布用） |
| `axure_inspect` | 读 `.rp` 文件的 outline（只读） |
| `axure_dump_record` | 深挖 `.rp` 文件里某条 record（只读） |
| `axure_capture_clipboard` | 把 Axure 复制的二进制存为 `.bin` 模板（遗留） |
| `axure_list_templates` | 列出已存模板（遗留） |
| `axure_paste_template` | 粘贴 `.bin` 模板到 Axure（遗留，仅 Windows） |
| `axure_paste_at` | 把模板粘在指定屏幕坐标（遗留） |
| `axure_paste_layout` | 多模板按相对位置批量粘（遗留） |
| `axure_paste_login_page_scaffold` | 一键生成登录页脚手架（遗留，被 paste_axvg 替代） |

**遗留**那些是早期会话留下的二进制模板路径，仍可用但 `axure_paste_axvg` 几乎能覆盖所有场景。

## 详细文档

- **设计原理 + 完整 API**：`SKILL_AXVG.md`（Claude 在生成原型时会自动参考）
- **逆向工程笔记**：`NOTES.md`（如果你想理解为什么 Axure 接受 Axvg JSON）
- **工具列表**：`README.md`

## 踩坑排查

### 问题：`axure_paste_axvg` 调用成功但 Axure 里没东西

- 确认 Axure RP 11 在运行（必须打开了一个文档，哪怕是空白的）
- 粘贴可能落在画布的其他位置 —— Windows 按 Ctrl+Home，macOS 按 Cmd+Home，或用 Pages 面板找一下
- 检查 Claude 返回里的 `autoPaste` 字段，应该是 `"ok"` 而不是 `"skipped_no_axure"`

### 问题（仅 macOS）：自动粘贴 `autoPaste: "skipped_no_axure"` 但 Axure 明明开着

mac 上自动激活 Axure + 模拟 Cmd+V 需要「辅助功能」权限：

1. 打开 系统设置 → 隐私与安全性 → 辅助功能
2. 把跑 MCP 的进程加进去：通常是 Claude Code.app（如果是 Claude Desktop 启动）或者 Terminal / iTerm（如果你直接命令行测试）
3. 重新触发一次。第一次系统也可能弹个授权对话框，点允许即可。

如果还不行，剪贴板内容其实已经写好了——你手动在 Axure 里 Cmd+V 也能粘出来。

### 问题（仅 macOS）：`swift: command not found`

跑一下：

```bash
xcode-select --install
```

装完再试。

### 问题：Claude Code 看不到 axure mcp

- 检查 `.claude.json` 的路径有没有写错（要用正斜杠 `/` 或者双反斜杠 `\\`）
- 检查 `dist/mcp-server.js` 文件是否真的存在（如果没有，运行 `npm run build`）
- 完全退出 Claude Code（不是最小化）再打开

### 问题：`npm install` 报错

- 升级 Node.js 到 ≥ 20
- 清掉 `node_modules` 和 `package-lock.json` 重装：`rm -rf node_modules package-lock.json && npm install`
- `@resvg/resvg-js` 需要联网下载 WASM，确认网络正常

### 问题：Lucide 图标粘贴后位置奇怪

- 这是已知限制：Axure 在哪里粘贴由它自己决定，不在 MCP 控制内
- 解决：粘贴后手动拖到目标位置；或者粘贴前在 Axure 里点击你想要的位置作为锚点

### 问题：`axure_read_selection` 报"clipboard_empty"或"no_csv_format"

- 你需要先在 Axure 里 **Ctrl+C**（Mac 是 Cmd+C），工具才能读到内容。它不会替你触发复制。
- 如果 Ctrl+C 之后又复制了别的（比如复制了一段文字），剪贴板就被覆盖了，回 Axure 重新 Ctrl+C 即可。

## 更新

Windows：
```bash
cd C:/Users/<你的用户名>/axure-mcp
git pull
npm install   # 如果 package.json 有变化
npm run build
```

macOS：
```bash
cd ~/axure-mcp
git pull
npm install
npm run build
```

重启 Claude Code 让新工具生效。

## 我用了之后想加个工具/改个 builder 怎么办？

源码在 `src/`，编译到 `dist/`。改完跑 `npm run build` 就行。如果是有价值的改进，提个 PR 回主仓库分享给大家。
