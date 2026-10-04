# 学科复习网页生成器（subject-review-generator）设计规格

- 日期：2026-07-31
- 状态：待用户审查
- 触发需求：创建一个 skill，用于创建学科复习网页。调用时提供资料文件夹，读取资料并照着模板生成复习网页及出题。

## 1. 目标概述

构建一套 **skill 家族（主编排 + 9 个子 skill）+ 共享模块库 + 生成流水线**：用户调用主编排 skill 并提供资料文件夹与学科名，各子 skill 分工协作——解析资料 → 抽取通用数据模型 → 编写扩展题库 → 逐题联网审查答案 → 数据质检 → 调用 ui-ux-pro-max 现搓主题 → **模板填充（默认主方式）或模块化拼接（兜底）产出双击即开、无外部依赖的单文件复习网页**，再经页面验收与最终优化，含阅读、记忆、出题全套功能。每个子 skill 独立可调、互相协作，不搞单 skill 包办。

## 2. 头脑风暴决策汇总

### 第一轮 · 顶层方向
| # | 决策点 | 结论 |
|---|--------|------|
| 1 | 生成方式 | 通用生成器：读任意学科资料 → 抽数据模型 → 套框架生成单文件 |
| 2 | 整合方式 | 内联拼接：生成时把选中模块 JS 嵌入 HTML，产物单文件 |
| 3 | 模块范围 | 全选：阅读三件套 / 搜索+收藏+掌握度 / 出题核心二件套 / 扩展题型组 |
| 4 | 资料格式 | 混合文档（PDF / Word / PPT / Markdown / 纯文本） |
| 5 | 模块底子 | 能提取就提取：模板已验证 JS 提取成模块，扩展题型新写 |
| 6 | 出题方式 | 混合：核心互猜由结构自动生成 + 扩展题型由 AI 从资料编写 |
| 7 | 搜索模块 | 模板搜索框优化 JS 直接保存为 `search.js` |
| 8 | 主题样式 | 结构框架 CSS 变量化，配色/字体调用 ui-ux-pro-max 按学科现搓 |
| 9 | 模块库存放 | skill 目录内 `modules/` |
| 10 | 开发场地 | 桌面 `review-page-skill/`，完成后清理并封装成 skill |

### 第二轮 · 模型与机制
| # | 决策点 | 结论 |
|---|--------|------|
| 11 | 数据模型 | 基于真实模板家族提炼：分类→子分类→概念（title/summary/content/tags/mastery）；题库统一 `questions` 数组，`type` 枚举区分 single/multi/fill/tf |
| 12 | 自动出题 | 概念互猜：Quiz 基于 title↔summary/content 双向随机，无需额外打标字段 |
| 13 | 题目章节关联 | 挂到分类：每题标 `chapter`，可章节过滤也可全局混刷 |
| 14 | 调用参数 | 对话式：skill 启动后逐个确认 |
| 15 | 掌握度 | 三档（掌握/熟悉/了解）由 AI 从资料判断写入概念 `mastery`，**前端只读、用户不可自设**；配色固定 掌握·红 / 熟悉·黄 / 了解·蓝 |
| 16 | 选择题干扰项 | 同类取干扰项：干扰项从同章节其它概念的 title/summary 取 |

### 最后一轮 · 扩展与追问
| # | 决策点 | 结论 |
|---|--------|------|
| 17 | 模块扩展机制 | 自动扫描：`modules/` 下新 JS 遵循接口即自动注册，无需登记 |
| 18 | 掌握度联动 | 无联动：掌握度由资料写入，答题结果不影响，前端不可切换 |
| 19 | Quiz 互猜方向 | 双向随机：给标题考摘要 / 给摘要(或正文)考标题 随机出 |
| 20 | 风格偏好表达 | 自由文本：用户随口描述，ui-ux-pro-max 照着搓 |

### 补充需求（用户新增）
| # | 决策点 | 结论 |
|---|--------|------|
| 21 | 错题本 | 新增 `wrongbook.js` 模块：任何答题模式答错自动收录，重新答对自动删除，支持手动删除 |
| 22 | 架构形态 | skill 家族：主编排 skill + 5 个子 skill（解析/模块/架构/出题/主题），不搞单 skill 包办 |
| 23 | 子 skill 可调性 | 每个子 skill 独立可调，也可被主编排调用；可调用已有 skill（superpowers、需求转译、ui-ux-pro-max 等）协作 |
| 24 | 补充工位 | 新增 4 个子 skill：数据质检 / 生成验证 / 更新维护 / 合集与导出，家族扩至 10 个 |
| 25 | 出题覆盖 | rv-quiz-designer 基于**必背知识点（isKey=true 概念）**出题，保证每个重要知识点至少一道题练 |
| 26 | 答案审查 | 新增 rv-answer-verifier：**逐题联网检索**验证答案，与 AI 生成答案对比，选准确率最高者，错误当场改正；所有题必须全部检索，不留漏网 |
| 27 | 基础架构模板 | frame.html + theme.css 是**一次性打磨、永久复用**的核心母版：三栏 Grid + 标题栏 + 移动端抽屉全做好，所有生成网页共用，杜绝每次搓网页架构差异；以桌面 index.html 成熟布局为底子提炼 |

## 3. 架构

### 3.1 skill 家族目录结构

```
.claude/skills/
├── subject-review-generator/          # ① 主编排 skill（调度者）
│   ├── SKILL.md                       # 编排流程：对话收集配置 → 调度子 skill → 组装交付
│   ├── modules/                       # 共享模块库（自动扫描，一个功能一个 JS 文件）
│   │   ├── navigation.js              # 分类导航树（模板提取）
│   │   ├── card-browser.js            # 卡片流浏览（模板提取）
│   │   ├── detail-panel.js            # 详情面板（模板提取）
│   │   ├── search.js                  # 搜索框（模板提取）
│   │   ├── favorites.js               # 收藏（模板提取）
│   │   ├── mastery.js                 # 掌握度三档（模板提取）
│   │   ├── quiz.js                    # Quiz 互猜·双向随机（模板提取+改造）
│   │   ├── guess.js                   # Guess 填空（模板提取）
│   │   ├── choice.js                  # 选择题（新写）
│   │   ├── truefalse.js               # 判断题（新写）
│   │   ├── selfcheck.js               # 简答自测（新写）
│   │   ├── wrongbook.js               # 错题本（新写）
│   │   └── rv-core.js                 # 运行时核心：事件总线/boot/ctx/store（恒选中）
│   ├── templates/
│   │   ├── frame.html                 # 页面骨架 + 三栏布局 + CSS 变量框架
│   │   └── theme.css                  # 主题模板（变量留空，生成时填充）
│   └── scripts/
│       └── assemble.js                # 内联拼接器（Node）
├── rv-data-extractor/                 # ② 资料解析分类 skill
│   ├── SKILL.md                       # 读资料 → 知识/习题分类 → data.json
│   └── scripts/                       # 多格式解析工具
├── rv-quiz-designer/                  # ③ 出题 skill
│   ├── SKILL.md                       # 基于必背知识点(isKey)出题保证覆盖；编写扩展题库
│   └── rules/                         # 出题规范
├── rv-answer-verifier/                # ④ 答案审查 skill
│   ├── SKILL.md                       # 逐题联网检索验证答案，与 AI 对比取最优，错误当场改正
│   └── rules/                         # 检索对比规范
├── rv-builder/                        # ⑤ 网页构建 skill（原 theme-designer + web-builder 整合）
│   ├── SKILL.md                       # 调 ui-ux-pro-max 现搓主题 + 检测模板/母版双模式
│   └── templates/                     # 骨架模板
├── rv-module-developer/               # ⑥ 模块开发 skill
│   ├── SKILL.md                       # 维护模块库：提取/新写/重构 JS，遵循统一接口
│   └── docs/                          # 模块接口契约文档
├── rv-verifier/                       # ⑦ 质检验收 skill（原 data-checker + page-verifier 整合）
│   ├── SKILL.md                       # 阶段①数据校验 + 阶段②页面验收 AC1-AC12
│   └── scripts/                       # test-boot.js 验收脚本
├── rv-polisher/                       # ⑧ 最终优化 skill
│   ├── SKILL.md                       # 调 /recheck 彻查 → 优化 UI/UX + 修复 bug
│   └── rules/                         # 优化规范
├── rv-updater/                        # ⑨ 更新维护 skill
│   ├── SKILL.md                       # 资料更新增量重生成 + 已生成网页二次定制
│   └── docs/                          # 更新日志规范
└── rv-bundle-export/                  # ⑩ 合集与导出 skill
    ├── SKILL.md                       # 多学科合集导航 + PDF/打印导出
    └── scripts/                       # 导出工具
```

**协作关系**：
- 主编排 skill：对话收集配置 → 按流程调用子 skill → 最终组装交付
- 子 skill：独立可调（用户可单独 `/rv-data-extractor` 等），也能被其它 skill 引用
- 共享资产（modules/ templates/ scripts/）挂在主编排 skill 下，子 skill 按相对路径读写
- 子 skill 可调用外部已有 skill 辅助：如 rv-data-extractor 调需求转译细化解析规则、rv-builder 调 ui-ux-pro-max、rv-module-developer 完成后调 code-review 审查
- 补充工位职责：rv-verifier 质检数据（不合格打回重抽）并验收页面（跑 AC1-AC12）、rv-answer-verifier 逐题联网验证答案、rv-builder 现搓主题 + 模板/母版双模式构建、rv-polisher 最终优化（调 /recheck）、rv-updater 负责长期维护迭代、rv-bundle-export 负责跨学科合集与导出

### 3.2 生成流水线（主编排 skill 调度子 skill）

```
你：/subject-review-generator  资料=X  学科=Y
 ↓
① 主编排对话收集配置（学科名 / 资料路径 / 风格偏好）
② 调 rv-data-extractor：多格式解析 → 知识/习题分类 → data.json
③ 头脑风暴「模块决策」：读资料后追问是否需新增模块（superpowers-brainstorming）；需要 → rv-module-developer 按需开发
④ 调 rv-quiz-designer：基于必背知识点(isKey)出题，保证每个重点概念有题 → questions
⑤ 调 rv-answer-verifier：逐题联网检索验证答案，与 AI 对比取最优，错误当场改正 → 修正 questions
⑥ 调 rv-verifier（阶段①数据校验）：校验 data.json，不过打回②或④
⑦ 调 rv-builder：ui-ux-pro-max 现搓主题（theme.css）+ 架构（**模板模式为主**）
⑧ 生成网页：fill-template.js（模板填充，默认主方式）→ index.html（单文件）；无模板才 assemble.js 兜底
⑨ 调 rv-verifier（阶段②页面验收）：跑 AC1-AC12 → 输出验证报告
⑩ 调 rv-polisher（必做）：调 /recheck 彻查 → 优化 UI/UX + 修复 bug → 优化后 index.html
（可选）⑪ 调 rv-bundle-export 做合集/导出；后续资料更新走 rv-updater
```

### 3.3 通用数据模型（data.json）

> **模型基准：从模板家族逆向提炼**。模板家族包含 6 份真实学科复习网页（中药学 `index.html`、波普解析、生物化学、病理学、微生物学与免疫学、分子生物学），其数据形态为 **分类→子分类→概念** 与 **统一题库数组**。本模型照此抽象，**字段全部学科中性，不含任何学科专属术语**（如性味、归经、化学位移等均不出现）。

```json
{
  "subject": "学科名",
  "categories": [
    {
      "id": "c1", "name": "章节/分类名", "icon": "📖",
      "subcategories": [
        { "id": "s1", "name": "小节名" }
      ],
      "concepts": [
        {
          "id": "k1", "title": "知识点标题", "subcategory": "s1",
          "mastery": "掌握",
          "summary": "一句话摘要",
          "content": "正文（可含加粗/列表/表格）",
          "tags": ["标签"]
        }
      ]
    }
  ],
  "questions": [
    {
      "id": "q1", "chapter": "c1", "type": "single",
      "stem": "题干",
      "options": ["选项A", "选项B", "选项C", "选项D"],
      "answer": 0,
      "explanation": "解析"
    }
  ]
}
```

**字段规格**

`categories[]`（章节 / 分类）：
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | ✓ | 唯一，如 `c1` / `ch01` |
| name | string | ✓ | 章节名 |
| icon | string | ✗ | 侧边栏图标（emoji） |
| subcategories | array | ✓ | 子分类列表 |
| concepts | array | ✓ | 知识点列表 |

`categories[].subcategories[]`（子分类）：
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | ✓ | 唯一，如 `s1` / `ch01_0` |
| name | string | ✓ | 小节名 |

`categories[].concepts[]`（知识点）：
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | ✓ | 全局唯一，如 `k001` |
| title | string | ✓ | 知识点标题（卡片名 / Quiz 正向题干） |
| subcategory | string | ✓ | 所属子分类 id（关联 subcategories[].id） |
| mastery | string | ✓ | 三档之一：`掌握` / `熟悉` / `了解` |
| summary | string | ✓ | 一句话摘要（卡片摘要 / Quiz 反向题干） |
| content | string | ✓ | 正文，可含格式（加粗、列表、表格） |
| tags | string[] | ✗ | 检索标签，可空 |
| isKey | boolean | ✗ | 是否重点概念，可空 |

`questions[]`（题库，统一数组，`type` 区分题型）：
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | ✓ | 全局唯一，如 `q001` |
| chapter | string | ✓ | 所属分类 id（关联 categories[].id） |
| type | string | ✓ | 题型枚举：`single`单选 / `multi`多选 / `fill`填空 / `tf`判断 |
| stem | string | ✓ | 题干 |
| options | string[] | type∈single/multi 时必填 | 选项列表；fill/tf 为空数组 |
| answer | number / number[] / string | ✓ | single: 正确选项索引；multi: 正确索引数组；fill: 答案文本；tf: `对`或`错` |
| explanation | string | ✓ | 解析 |

**要点**：
- 全部字段学科中性，概念用 title/summary/content 承载内容，任意学科可装
- 题库统一数组，`type` 枚举区分题型，`chapter` 关联章节
- `mastery` 三档：掌握 / 熟悉 / 了解，挂概念
- **不设「可考字段」机制**——互猜对象天然为 title↔summary/content，无需额外打标

### 3.4 模块接口契约

```js
window.RV = { modules: {}, ctx: {}, boot() {} }

// 每个模块文件只做一件事：注册自己
RV.modules['search'] = {
  name: 'search',
  deps: [],            // 依赖的模块名数组
  init(ctx) {},        // 挂载共享状态、事件监听
  render(ctx) {}       // 渲染 DOM
}
```

- **boot()**：按 deps 拓扑排序 → 逐个 `init` + `render` → 完成装配
- **ctx 共享上下文**：
  ```js
  ctx = {
    data:  { subject, categories, questions, config },
    state: { favorites: Set, mastery: Map, wrong: Map },  // wrong: 错题本
    store: { load(), save() },        // localStorage，键带学科名
    dom:   { header, sidebar, main, detail },
    utils: { escHtml, fuzzyMatch, renderCard, ... }
  }
  ```
- **未选中的模块不进页面** → 体积小、无冲突
- **自动扫描**：拼接器读 `modules/` 目录，凡遵循 `{name, deps, init, render}` 结构的文件自动注册

### 3.5 出题机制

| 题型 | 来源 | 规则 |
|------|------|------|
| Quiz 互猜 | 结构自动生成 | 双向随机：给 title 考 summary / 给 summary(或 content) 考 title；可限定章节/掌握度 |
| Guess 填空 | 结构自动生成 | 给 title 让用户填 summary 关键词，判对错 |
| 选择题 | AI 编写 | type=single/multi；题干 AI 编；干扰项从同章节其它概念 title/summary 取；`chapter` 关联。**注意：模板填充模式仅支持单选，multi 题会被丢弃**（填充时对仅配 multi 的必背概念告警）；模块化模式才支持 multi |
| 判断题 | AI 编写 | type=tf；基于资料改写正确/错误陈述 |
| 简答自测 | AI 编写 | 基于 concepts content 提炼问答，展开折叠自测 |

**覆盖规则（必背知识点全覆盖）**：
- rv-quiz-designer 必须保证**每个 `isKey: true` 的必背概念至少被一道题覆盖**（出题时以 isKey 概念为出题源，遍历不漏）
- 非必背概念不强制覆盖，可按需补充

**答案审查规则（rv-answer-verifier）**：
- 遍历 data.json 中**全部 questions**，逐题审查，不留漏网
- 每题流程：AI 自审 → 联网检索（WebSearch/WebFetch，可调 research skill）→ 双答案对比 → 采纳准确率最高者
- 若 AI 答案与检索结果冲突 → 以检索为准并当场改正，记录修正日志
- 审查输出：修正报告（题号 / 原答案 / 新答案 / 检索来源 / 修正原因）

### 3.6 主题机制

- `frame.html` 中所有颜色/字体走 CSS 变量：`--bg-page / --bg-card / --accent / --font-heading / ...`
- 生成流程第④步：读取用户**自由文本风格偏好** → 调用 ui-ux-pro-max → 产出 `theme.css` 填充变量
- 布局框架（三栏 Grid）固定，不随主题变化
- 模板中药学古风配色仅是案例之一，不硬编码

### 3.7 持久化

- localStorage 键带学科名，多学科网页并存互不串数据（参照真实模板 `spec_fav_*` / `biochem_favorites` 模式）：
  - `rv_fav_{subject}`：收藏 concept id 数组
  - `rv_wrong_{subject}`：错题本，`[{ type: "concept"|"question", id, count }]`
- 掌握度由资料判断写入数据，前端只读展示、不可切换（mastery.js 只读，不写回 state.mastery；`saveAll` 仍会顺带保存恒空 `rv_mastery_{subject}` 键，保留历史兼容，无实际影响）

### 3.9 错题本机制（wrongbook.js）

- **收录**：任何答题模式（Quiz 互猜 / Guess 填空 / 选择 / 判断）答错 → 自动收录
  - Quiz/Guess 答错 → 记录对应知识点概念（`type: "concept"`）
  - 选择/判断题答错 → 记录对应题目（`type: "question"`）
- **自动删除**：重新答对同一对象 → 自动移除（答对一次即删）
- **手动删除**：错题本列表中提供删除按钮
- **展示**：侧边栏提供「错题本」入口，主区渲染错题列表，可点击进入详情/重做
- `count` 记录该对象累计答错次数，供界面展示薄弱程度

### 3.10 基础架构模板（核心资产）

**定位**：一次性打磨、永久复用的**页面母版**，所有生成网页共用同一套整体架构，杜绝逐次搓网页的架构差异。以桌面 `index.html`（中药学，11878 行成熟实现）的布局为底子提炼，**不含学科配色**。

**母版四件套**：

1. **标题栏 header**（高 56px，sticky 顶部）
   - 品牌区：图标 + 学科名（`#brandName`，用 data.subject 填充）
   - 搜索框：展开式（收起为放大镜按钮，点击滑出输入框）
   - 操作区：收藏计数、错题本计数、汉堡菜单（移动端）
2. **三栏 Grid 主体**：`grid-template-areas: "header header header" "sidebar main detail"`
   - 侧边栏 sidebar：280px，分类树 + 独立滚动条 + 可折叠
   - 主区 main：自适应，过滤栏 + 卡片流 / 刷题视图
   - 详情面板 detail：370px，标题/标签/正文 + 收藏/掌握度按钮 + 关闭按钮
3. **移动端适配（<768px）**：
   - 单栏布局，主区全宽，详情面板全宽
   - 侧边栏 → 汉堡菜单 → 左侧抽屉滑出 + 半透明遮罩
   - 搜索框 → 展开式覆盖输入
   - 触控目标 ≥ 40px，`viewport-fit=cover` 适配刘海屏
4. **CSS 变量主题**：全部颜色/字体走变量，配色留白给 ui-ux-pro-max 填充

**响应式断点**：
| 断点 | 布局 | 侧边栏形态 |
|------|------|-----------|
| ≥1024px | 三栏（280 / 1fr / 370） | 常驻 |
| 768-1023px | 两栏（220 / 1fr），detail 变覆盖层 | 常驻（窄） |
| <768px | 单栏，detail 全宽 | 汉堡菜单抽屉 |

**CSS 变量清单**（theme.css，值由 ui-ux-pro-max 填充）：
`--bg-page --bg-card --bg-card-hover --text-main --text-light --text-muted --color-accent --color-accent-2 --color-correct --color-wrong --color-gold --color-gold-light --color-header --font-heading --font-body`

**验收**：
- 母版自身过三档断点响应式验收（桌面 / 平板 / 手机）
- 任意学科生成后整体架构一致：骨架 DOM 结构相同，仅主题变量与内容变化

**模板家族与模板填充模式（当前核心资产，编译网页的默认主方式）**：
- 基础模板：`samples/基础模板-*.html`（如 `基础模板-微生物学.html`），头部含 `<!-- RV-TEMPLATE -->` 标记，由 `samples/generate-template.js` 从成品网页一比一参数化生成——配色走 `:root` 变量、品牌走 `{{学科名}}/{{副标题}}/{{学科图标}}` 占位、数据走 `KNOWLEDGE_CATEGORIES`（分类→子分类→概念）+ `QUESTION_BANK`（choice/truefalse/terminology）占位
- 填充器 `fill-template.js`：注入 data.json → 输出成品单文件。题型映射：`questions[type=single]→choice`、`type=tf→truefalse`、`type=fill→terminology`、`type=multi→跳过`（模板单选结构不支持；填充时对「仅配了 multi 题的 isKey 必背概念」输出告警防 AC10 静默失守）
- 子分类引用：data.json 概念 `subcategory` 存子分类 **id**，填充时按模板 `getFilteredConcepts` 的「名称过滤」语义转成**名称**（git `55efdfa` 修复章节导航子章无内容）；模块化模式则直接用 id——两种模式下 subcategory 语义不同，消费方需注意
- localStorage 前缀学科化：填充时把模板 `STORAGE_FAV/STORAGE_WRONG` 前缀替换为学科名 slug，避免多学科数据串用
- 占位残留验收：AC12 校验产物无 `{{`、无空 `KNOWLEDGE_CATEGORIES` 占位

### 3.11 工作目录契约

用户拖入的资料文件夹 xxx 即工作根目录，skill 家族自动创建并严格遵循：

```
xxx/
├── data/
│   ├── raw/                # 原始数据：解析出的资料文本、题目素材、AI 统筹中间数据
│   ├── processed/          # 处理后数据：data.json（概念卡片 categories + 习题 questions）
│   └── temporary/          # 临时文件：校验/验证报告、运行临时输出
├── script/                 # 复制的辅助脚本（assemble.js）与缓存
└── <学科名>/               # 输出目录，命名为当前学科名
    ├── index.html          # 最终单文件复习网页（核心产物）
    └── answer-audit.md     # 答案审查报告
```

- 各子 skill 输入/输出路径严格遵循（见各自 SKILL.md）
- 各工位落盘位置：extractor→raw+processed；quiz-designer→processed；answer-verifier→processed+学科名/；rv-builder→学科名/（theme.css）；rv-verifier 阶段①→temporary（check-report.md）；rv-verifier 阶段②→temporary（verify-report.md）；rv-polisher→学科名/（polish-report.md）
- 最终产物 `index.html` 位于 `xxx/<学科名>/`

### 3.8 交互配置（对话式）

skill 启动后按序确认：
1. 学科名
2. 资料文件夹路径
3. 模块选择（默认全选）
4. 风格偏好（自由文本，如"清爽现代""古籍质感"）

## 4. 功能需求

- F1: 多格式解析资料文件夹（PDF/Word/PPT/MD/TXT），混合并存
- F2: AI 抽取「分类→子分类→概念」数据模型 + 统一题库（single/multi/fill/tf）
- F3: AI 编写扩展题库（选择/判断/简答），挂 `chapter`
- F4: 分类导航树（可折叠、移动端抽屉）
- F5: 卡片流浏览（按分类/子分类过滤、视图切换）
- F6: 详情面板（标题/摘要/正文/标签、收藏按钮、掌握度切换）
- F7: 顶部展开式搜索（模糊匹配）
- F8: 收藏 + 三档掌握度，localStorage 持久化
- F9: Quiz 双向随机互猜（title↔summary，可限定章节/掌握度）
- F10: Guess 填空判对错
- F11: 选择题/判断题/简答自测（按章节过滤 + 全局混刷）
- F12: ui-ux-pro-max 按自由文本偏好现搓主题
- F13: 内联拼接产出单文件，未选模块不进页面
- F14: 错题本：答题答错自动收录、重新答对自动删除、支持手动删除、侧边栏入口展示
- F15: 出题覆盖保证：每个 `isKey: true` 必背概念至少被一道题覆盖
- F16: 答案审查：逐题联网检索验证，与 AI 答案对比取准确率最高者，错误当场改正并输出修正报告

## 5. 技术约束

- T1: 产物为**无外部依赖的单文件 HTML**，双击即开，不需服务器
- T2: 模块库为原生 JS（无框架），遵循统一接口
- T3: 拼接器用 Node.js 编写
- T4: 兼容主流浏览器（Chrome/Edge/Firefox/Safari）及移动端响应式
- T5: 解析支持 PDF/Word/PPT/MD/TXT 混合格式

## 6. 设计约束

- D1: 三栏 Grid 布局（header + sidebar + main + detail）为固定骨架
- D2: 所有颜色/字体经 CSS 变量，主题由 ui-ux-pro-max 现场生成
- D3: 视觉风格不固定，按学科与用户自由文本偏好变化
- D4: 中文优先界面（模板为中文语境）

## 7. 验收标准

- AC1: 用样例资料调用生成，产出单文件 index.html，双击浏览器打开，三栏布局正常渲染
- AC2: 所有选中模块功能可用：导航/浏览/详情/搜索/收藏/掌握度/Quiz/Guess/选择/判断/简答
- AC3: 两个不同学科生成，主题配色明显不同（证明 ui-ux-pro-max 现搓生效）
- AC4: 两个学科网页的 localStorage 键互不干扰，数据不串
- AC5: 未选模块的代码不出现在生成 HTML 中（grep 确认）
- AC6: 移动端宽度下侧边栏变为抽屉，功能可用
- AC7: 题库 `type` 字段只取 single/multi/fill/tf 四种枚举，answer 类型与题型匹配（校验规则验证）
- AC8: 选择题干扰项来自同章节其它概念 title/summary（抽查数据验证）
- AC9: 错题本可用：答错自动收录、重新答对自动删除、手动删除有效，且两学科错题数据不串
- AC10: 每个 `isKey: true` 必背概念至少被一道题覆盖（脚本核验）
- AC11: 答案审查通过：全部题目均被检索，错误答案已改正，修正报告完整可查（抽查 + 报告核验）
- AC12: 模板模式产物无占位残留（无 `{{`、无空 `KNOWLEDGE_CATEGORIES` 数组，grep 确认）——模板填充默认主方式的专属验收

## 8. 边界条件与异常处理

- E1: 某个文档格式解析失败 → 跳过并在报告中列出，其余继续
- E2: 资料文件夹为空或不可读 → 报错提示，终止生成
- E3: 资料中无法提取出有效概念 → 报告并建议人工整理
- E4: 模块 deps 存在循环依赖 → 拼接器报错并终止
- E5: 同名模块重复注册 → 后者覆盖（assemble.js 直接覆盖；模块命名唯一性由 rv-module-developer 开发规范约束，拼接器不告警）
- E6: localStorage 数据损坏/格式不符 → 清空重置该学科键
- E7: 单选只选部分模块 → 页面隐藏未选模块入口，不残留死链

## 9. 优先级

- **P0 必须**：生成流水线、数据模型抽取、核心提取模块（nav/browser/detail/search/fav/mastery/quiz/guess）、错题本模块（wrongbook）、答案审查 skill（rv-answer-verifier）、内联拼接器
- **P1 应该**：扩展题型模块（choice/truefalse/selfcheck）、ui-ux-pro-max 主题接入
- **P2 可选**：长文概念卡渲染打磨、移动端动效优化、出题章节统计

## 10. 实施顺序

1. 在桌面 review-page-skill/ 搭建 skill 家族骨架（10 个 skill 目录 + 共享 modules/templates/scripts）
2. 从模板家族提取已验证 JS → 模块库（search.js 等，13 个模块含 rv-core 运行时基座）
3. 新写扩展题型/错题本模块 + 通用接口（ctx/boot/自动扫描）
4. 编写各子 skill 的 SKILL.md、frame.html/theme.css、assemble.js 拼接器、fill-template.js 填充器、generate-template.js 模板生成器
5. 用样例资料跑通主编排流水线 → 生成演示页 → 验证 AC
6. 修复问题 → 清理临时文件 → 把 10 个 skill 复制到 `.claude/skills/`
7. 归档/删除桌面项目文件夹

## 11. 执行建议与风险提示

- **推荐路线**：先提取后新写。模板已验证代码是最大资产，提取保证稳定性
- **风险1**：PDF/PPT 解析质量不稳定 → 解析层做"提取失败降级为文件名+文本抽取"兜底
- **风险2**：Quiz 反向出题（给 summary 考 title）需额外设计提示/干扰策略，避免一句话对应多个概念造成歧义
- **风险3**：data.json 体量随资料增长 → 概念多时卡片流考虑分批渲染
- **风险4**：ui-ux-pro-max 产出样式与 frame 骨架冲突 → theme.css 严格限定变量命名空间
