# Miao Pack

本地 **HTML 设计资产包** 的浏览器，外加一个给 Agent 用的 MCP 服务。人和 Agent 读写同一套目录。预览只有可点击的 HTML，没有 PNG 管线。

交付形态是 npm 包，不是原生应用。界面里的红绿灯只是 Web 壳的示意。

## 资产包

```
pack/
  pack.json          # name、displayName、version、themes、screens、docs、generator
  README.md
  FEATURE_MAP.md     # 可选
  STYLE_GUIDE.md     # 可选
  light/*.html
  dark/*.html
  tools/gen.py       # 可选。regenerate 默认跑 python3 tools/gen.py
```

`screens` 里每一项有 `id`、`path`、`title`、`group`。同一 `id` 可以各有一份 light 和 dark。没有 `pack.json` 时，只要目录里有 README，并且有 `light/` 或 `dark/`，也会被索引。

浏览主题（包里的 light/dark）和应用主题（Miao Pack 自己的浅色/深色）是两件事，互不影响。

## 脚本

```bash
npm install
npm test
npm start              # 构建后打开 Web UI，默认 http://127.0.0.1:4173
npm run dev            # 不经构建，直接用 tsx 看 samples/
npm run validate       # 校验 samples/
```

`npm start` 会先编译。资产根目录按这个顺序决定：

1. `--root`
2. `~/.miao-pack/config.json` 里保存过的路径（也可用 `MIAO_PACK_CONFIG` 换位置）
3. 当前目录本身是包，或它的子目录里有包
4. 否则用仓库里的 `samples/`

```bash
npm start -- --root /path/to/packs --port 4173 --open
npx miao-pack validate /path/to/one-pack
```

仓库自带三个样例包，打开就是资产库，不用先导入：

| 包 | 页面 |
|---|---|
| `samples/miao-pi-ui` | 主界面、设置、弹出层，light/dark |
| `samples/miao-agent-design` | 组件与状态 |
| `samples/oneoffice-home` | 首页、编辑壳、设置 |

## Web UI

- **资产库**：包卡片、导入绝对路径、刷新索引
- **包浏览**：主题 → 分组 → 页面；中间是 iframe 里的 HTML；右侧是路径和操作
- **文档 / 页面编辑**：保存 Markdown、`pack.json`、HTML，或 `tools/` 里的脚本
- **重新生成**：跑包里声明的生成器，只重写 HTML
- **设置**：资产根目录、应用外观、MCP 配置、关于

导入不会复制文件。目录已经在资产根下就直接索引；否则记入配置里的额外包。

## MCP

```bash
node dist/cli.js mcp --root /absolute/path/to/packs
```

工具：

| 工具 | 作用 |
|---|---|
| `list` | 已索引的包、主题、页面、文档 |
| `get` | 读一个文件。传 `path`，或 `screenId` + `theme` |
| `update` | 写 Markdown、`pack.json`、主题 HTML 或 `tools/` 脚本 |
| `regenerate` | 跑生成器。`scope` 为 `all` 或某个屏幕 id |
| `validate` | 检查清单、缺页和生成器 |

生成器只接受 `python3`、`python` 或 `node`，并且参数里要有包内的 `.py` / `.js` / `.mjs`。样例脚本认 `--screen <id>`，会把这个 id 的 light 和 dark 一起重写。

Cursor 里可以这样接（先 `npm run build`）：

```json
{
  "mcpServers": {
    "miao-pack": {
      "command": "node",
      "args": ["/absolute/path/to/miao-pack/dist/cli.js", "mcp", "--root", "/absolute/path/to/packs"]
    }
  }
}
```

设置页里有一段可复制的配置，路径会按当前资产根填好。

## 开发

```bash
npm run dev
npm run typecheck
npm test
```

Web 静态文件在 `web/`，改完刷新即可。`src/` 改完需要重启进程。
