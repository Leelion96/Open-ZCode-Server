# ZCode 的 Obsidian 插件

[English](./README.md)

本插件将 [kepano/obsidian-skills](https://github.com/kepano/obsidian-skills) 的六个 agent 技能与 [axtonliu/axton-obsidian-visual-skills](https://github.com/axtonliu/axton-obsidian-visual-skills) 的可视化技能(Mermaid/Excalidraw 图表生成,以及并入 `json-canvas` 的文本转画布布局算法)打包为 ZCode 插件,并附带一个本地 `setup` 技能,可通过 ZCode 插件市场安装。这些技能教 agent 使用 Obsidian 的文件格式与配套 CLI——插件本身不包含 MCP 服务或 hooks。

## 前置条件

插件中的技能依赖外部 CLI，运行时会自行检查：

- [Obsidian CLI](https://help.obsidian.md/cli)（`obsidian`）——`obsidian-cli` 技能需要，且要求 Obsidian 正在运行
- [Defuddle](https://github.com/kepano/defuddle)（`npm install -g defuddle`）——`defuddle` 技能需要
- [Knap](https://github.com/obsidianmd/knap)（`npm install -g knap`，需 Node.js 20+）——`knap` 技能需要

- [Excalidraw 插件](https://github.com/zsviczian/obsidian-excalidraw-plugin)（社区插件，在 Obsidian 内安装）——`excalidraw-diagram` 技能的 Obsidian `.md` 输出模式需要；标准 `.excalidraw` 输出可直接在 excalidraw.com 打开，无此依赖

其余技能（`obsidian-markdown`、`obsidian-bases`、`json-canvas`、`mermaid-visualizer`）只读写 vault 中的文件，无任何依赖。

在新机器上运行 `/obsidian:setup` 可检测这些工具并引导安装（`/obsidian:setup obsidian` 只检查单个组件）。

安装或修改环境前——无论是 setup 流程，还是 `defuddle`、`knap` 技能发现工具缺失时——插件都会展示具体操作，并通过 Ask User 请求确认（工具不可用时在对话中询问并等待答复）。你可以选择手动安装或跳过；只读检测无需确认。

## 技能列表

| 技能 | 说明 |
|------|------|
| setup | 检测并安装插件的 CLI 依赖：Obsidian CLI 官方注册流程、defuddle、knap |
| obsidian-markdown | 创建和编辑 Obsidian 风格 Markdown：双链、嵌入、callout、属性 |
| obsidian-bases | 创建和编辑 `.base` 文件：视图、筛选、公式、汇总 |
| json-canvas | 创建和编辑 `.canvas` 白板文件：节点、连线、分组；支持从文本内容生成 MindMap/自由布局画布 |
| mermaid-visualizer | 把文本转为专业 Mermaid 图（流程、思维导图、时序、状态），内置语法防错规则 |
| excalidraw-diagram | 生成手绘风格 Excalidraw 图，三种模式：Obsidian `.md`、标准 `.excalidraw`、动画 |
| obsidian-cli | 读写、搜索、管理运行中 Obsidian 库的笔记；支持插件/主题开发调试 |
| defuddle | 从网页提取干净正文为 Markdown，去掉导航广告等杂质以节省 token |
| knap | 用模板和 JSON/CSV 数据渲染 Markdown 笔记，支持批量生成 |

技能会在相关场景自动触发（例如编辑 `.base` 文件、把网页文章存入 vault），也可以显式调用，例如 `/obsidian:obsidian-markdown`、`/obsidian:knap`。

## 使用示例

```text
# 把一篇网页文章提取成干净笔记存入 vault
读取 https://example.com/article 并保存为我 vault 里的笔记

# 给 vault 建一个文献数据库
创建一个 .base 文件，展示所有带 #book 标签的笔记，按 status 分组，用卡片视图显示评分

# 用结构化数据批量生成笔记
用 knap 按 books.csv 的每一行数据、套用我的图书模板批量生成笔记

# 把内容可视化成图
把这篇文章整理成 Excalidraw 思维导图
画一个 CI/CD 流水线的 Mermaid 流程图，存到我的 vault 里
```

## 署名

六个核心技能作者为 [Steph Ango](https://github.com/kepano)；`mermaid-visualizer`、`excalidraw-diagram` 两个技能以及并入 `json-canvas` 的布局算法来自 [Axton Liu](https://github.com/axtonliu)。两组技能均从各自上游仓库导入——导入的 commit、许可证与适配差异见 [UPSTREAM.md](./UPSTREAM.md)。本次适配增加了 ZCode 插件清单、市场注册、本文档与一个本地 `setup` 技能；其余技能内容均来自上游。
