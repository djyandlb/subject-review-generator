---
name: subject-review-generator
description: 学科复习网页生成器（主编排）。输入 /生成复习页 + 资料文件夹 + 学科名，编排 11 个子 skill 产出单文件复习网页。
---

# 学科复习网页生成器（主编排）

## 触发条件

用户说「生成复习页」「/subject-review-generator」「把资料做成复习网页」或**提供了资料文件夹路径/学科名**时启动本编排流程。**优先从用户消息提取已提供的参数**——资料路径（`C:\...`/`D:\...` 盘符路径或文件夹路径）、学科名、风格偏好；**用户已给的直接采用，只缺什么补问什么**

## 输入

- 资料文件夹路径（必填）：含 PDF / Word / PPT / Markdown / 纯文本 任一或混合
- 学科名（必填）

## 输出

- 最终文件生成在**资料文件夹的 `<学科名>/` 子目录**：
  - `index.html`（单文件复习网页，双击即开）
  - `answer-audit.md`（答案审查报告）
  - `polish-report.md`（rv-polisher 优化报告，必做步骤产出）
  - `theme.css`（rv-builder 产出主题变量覆盖段，模板模式亦可用）
- 中间产物按工作目录契约存放（见下）

## 工作目录契约（资料文件夹 xxx 内部结构）

用户拖入的资料文件夹 xxx 即工作根目录，skill 自动在其中创建目录，**所有 skill 严格遵循**：

```
xxx/
├── data/
│   ├── raw/                # 原始数据：解析出的资料文本、题目素材、AI 统筹中间数据
│   ├── processed/          # 处理后数据：data.json（概念卡片 categories + 习题 questions）
│   ├── sample/             # 模板副本：第 1 步初始化时从本 skill 自带 samples/ 预置基础模板，填充/增强都在副本上做
│   └── temporary/          # 临时文件：解析中间产物、子代理输出 JSON、校验报告、脚本运行输出、任何一次性中间数据
├── script/                 # **预留，勿写入**：本家族脚本一律放各 skill 自带 `scripts/`，靠 `__dirname` 定位资源（复制会因路径变化失效）；此处不复制脚本、不写数据/临时文件
└── <学科名>/               # 输出目录，命名为当前学科名
    ├── index.html          # 最终单文件复习网页
    └── answer-audit.md     # 答案审查报告
```

> **产物兜底铁律（skill 运行全程）**：本 skill 家族运行产生的**任何文件**——解析文本、中间数据、子代理输出 JSON、临时脚本、校验/审查报告、最终 index.html/answer-audit.md——**都必须落在 xxx 工作目录内上述对应位置**，禁止在工作目录外或 xxx 根目录散落。
> 执行要点：
> - 派**子代理**提取/生成中间数据时，指令里**显式指定输出路径**（如「写入 `xxx/data/temporary/文件名.json`」）
> - 自己运行脚本产生的临时文件/脚本 → `data/temporary/`；需复制的辅助脚本 → `script/`；最终产物 → `<学科名>/`
> - 阶段结束时检查一次：`xxx` 根目录不应出现 skill 生成的散落文件

## 路径解析约定（相对路径系统，跨 AI 统一）

本家族所有 SKILL.md 内的路径引用按下述规则解析，**任何 AI 都能据此定位资源**：

| 写法 | 含义 | 示例 |
|------|------|------|
| `./xxx` | 当前 skill 目录内自带资源 | `./scripts/fill-template.js`、`./docs/GUARDRAILS.md`、`./samples/` |
| `<同级skill:名称>/xxx` | 与当前 skill **同目录**的兄弟 skill | `<同级skill:rv-data-builder>/scripts/renumber-chapters.js` |
| `<review-page-skill>/xxx` | **家族根** = 名为 `review-page-skill` 的目录（含 docs/ 与 samples/），从当前 skill 目录**向上逐级查找** | `~/.claude/skills/review-page-skill/`（用户级）或 `Desktop/review-page-skill/`（桌面仓库） |
| `xxx/data/sample/` | 学科工作目录内预置的模板副本 | `xxx/data/sample/基础模板-*.html` |

**资源查找顺序**：① skill 自带 `./` → ② 家族根 `<review-page-skill>/` → ③ 同级 skill → ④ 项目内 `xxx/data/sample/`

## 工作流程（严格按序，每步必做 + 验收）

> **触发即执行（防「贴说明不干活」）**：收到触发指令后**直接进入流程**——**禁止向用户复述/展示本 skill 内容**（SKILL.md 是执行者的操作手册，不是念给用户听的材料）；第一步从用户消息**提取资料路径与学科名**（用户已给即直接用），**能提取到就直接开工**（建目录/预置模板/启动 data-extractor）；**执行本 skill 期间对话保持中性指令式**——不扮演任何人格角色、不用非技术口吻拖延正事（即使执行者基座配置有人格，执行本 skill 时正事优先）。
>
> **开场零提问（绝对铁律）**：从触发到**第 3 步**之前，**禁止向用户提任何「风格偏好 / 配色 / 布局 / 确认一下 / 要不要…」类问题**——直接开工产出数据；**唯一允许的提问**是「学科名从文件夹/资料推断不到时补问一句」；**风格偏好只允许出现在第 3 步头脑风暴**（与模块决策一起，一次问清后不再问）。
>
> **流程铁律（防跳过）**：上一步产物 = 下一步输入（缺了卡住）；每步过「验收」不过返工；必做步不可跳过。
>
> **阶段自检（绝对铁律，防带错交付）**：每步「验收」是执行时核对点（**不逐行自检烧 token**）；**每个子 skill 流程末尾做一次阶段自检**——按该 skill 文末「阶段自检」小节核验产物（能跑脚本的跑脚本看退出码，不能的人工抽查）；**阶段自检全部 PASS 才进入下一步/交付**；任一项 FAIL → 返回返工，禁止带错交付。

### 第 0 步 · 读护栏（🔴必做）
**命令**：读 `./docs/GUARDRAILS.md`（13 条）｜**依赖**：—
**验收**：能复述核心约束（三档分级/增强标记/模板唯一主方式/卡片数量）｜**铁律**：不读=重蹈历史错误（EVOLUTION 不需每次全读）

### 第 1 步 · 确定资料路径 + 学科名 + 初始化 + 模板预置（🔴必做）
**命令**：**资料路径**从用户消息提取（已给即用，`C:\...`/`D:\...` 盘符路径）；**学科名**优先从用户消息/资料文件夹名/资料文件名**推断**（文件夹装病理学 → 学科名「病理学」），推断得到直接采用，推断不到才补问一句；**风格偏好（配色/布局）不在本步收集——留到第 3 步头脑风暴一起讨论**；随后 mkdir `data/{raw,processed,sample,temporary}` `<学科名>/`；**预置默认模板** `cp ./samples/基础模板-复习页-v3.html xxx/data/sample/`（契约见 `./samples/TEMPLATE-v3.md`；仅当 v3 缺失时才回退 `基础模板-*.html`）｜**产物**：`xxx/data/sample/基础模板-复习页-v3.html`｜**依赖**：第0步
**验收**：资料路径 + 学科名已确定；`xxx/data/sample/` 含 **v3 Soft UI**（`RV-TEMPLATE` + `--elev-card` + 六键 `QUESTION_BANK`）｜**铁律**：**开场不打断——路径/学科名就绪即开工**；模板第1步必须预置 v3，禁从零手搓页面；禁预置过时 v1 当默认

### 第 2 步 · rv-doc-extractor + rv-data-builder（提取清洗 → 建模，🔴必做）
**命令**：**rv-doc-extractor**（纯脚本）：`extract-any.py` 逐份提取（**异常/字符量低补跑备选方案**）→ `clean-text.js` 每份清洗（**输出 `<文件名>_clean.txt`，清洗成功后删原文件**）→ `grep -c "=== PAGE\|=== SLIDE\|www\.1ppt"` 质检（应0）→ **`check-extraction.js` 提取完整性机器校验（退出码 0 才可进入建模）** → **rv-data-builder**（AI 建模）：核对 parse-report 提取完整 → AI 只读 `*_clean.txt` 归类 → 概念卡提取（识别信号/粒度锚点/密度自查）→ 知识点去重 → `renumber-chapters.js` 拉通编号 → `check-categories.js` 校验 → **卡数对照清洗文本量总自查**｜**产物**：`data/raw/*_clean.txt` + `data/temporary/parse-report.md` + `data/processed/data.json`｜**依赖**：第1步
**验收**：clean 质检残留=0；**未清洗原文件已删**；**提取完整性校验通过（防「PDF 只提 20 行」静默失败）**；data.json 完整；**卡数与文本量匹配（厚教材必须多卡，病理学 42 卡教训）**｜**铁律**：禁跳过清洗（`=== PAGE 18 ===` 残留进答题卡教训）；**提取不完整 → 补跑备选，残缺资料建模 = 卡数偏少 = 严重错误**

### 第 3 步 · 头脑风暴模块决策 + 风格偏好（🔴必做，AI主动，**须先通读资料**）
**命令**：**先通读第 2 步产出的 data.json / `*_clean.txt`**（基于资料**实际内容**审视高频结构/易混点/学科特殊需求）→ `node ./scripts/list-modules.js` 拉清单 → AI 提候选（**引用资料具体章节/概念**）、用户确认 → **同时收集风格偏好**（配色/布局等自由文本，向用户确认一次，写入 `config.theme`）｜**产物**：`config.modules` + `config.theme`（风格偏好）写入 data.json｜**依赖**：第2步 data.json（**未产出则不可脑暴**）
**验收**：候选每项含「资料哪块（引用具体章节/概念）+为何现有不够+做成啥样」；**风格偏好已收集（用户确认过）**｜**铁律**：AI 主动提（禁推给用户）；**必须先读完资料再脑暴，禁止资料未读时凭空提候选**；库里有直接启用；新模块 check-module+gen-manifest 入库；**风格偏好与模块决策同属头脑风暴，一并在第 3 步问清，后续构建直接采用不再重复问**

### 第 4 步 · rv-content-refiner（内容结构化，🔴必做，不可跳过后补）
**命令**：`export-content.js` 导出 → AI **按章分批**重构（子 agent 固定提示词，每章写 `refine-part-N.json`）→ `--import` 合并｜**产物**：data.json 全部 content → **三段结构**「概念名标题段 + 空行 + `概述：`一句话 + 分点正文」（考点保真、表达重构）+ 增强标记｜**依赖**：第2步
**验收**：N卡→N份重构；标记格式过解析器契约｜**铁律**：出题前完成；先优化后标记；逐卡不许漏

### 第 5 步 · rv-quiz-designer（出题，🔴必做）
**命令**：AI 逐概念生成（isKey 全覆盖，**按章分批**写回）｜**产物**：data.json questions[] 完整｜**依赖**：第4步
**验收**：每 isKey 概念≥1题（AC10）；题型多样化；每题实质解析｜**铁律**：题型按性质多样化；解析禁「答案：X」空转；**六类题型（single/multi/tf/fill/terminology/essay）模板模式与模块化模式均支持——fill-template.js 六键全映射不跳题，入口由题库动态生成（有几种题几个入口，0 题自动隐藏）**

### 第 6 步 · rv-answer-verifier（答案双源对比，🔴必做）
**命令**：逐题 AI 自审 vs 资料原文（联网可用追加 WebSearch）+ 匹配校验防错位｜**产物**：修正 data.json + `<学科名>/answer-audit.md`｜**依赖**：第5步
**验收**：N题→N条记录；每题有证据来源；无错位｜**铁律**：联网非必须、对比是必须；证据来源如实标注

### 第 7 步 · rv-verifier 阶段①（数据校验，🔴必做）
**命令**：校验 结构/概念/章节引用/题库/覆盖 5 项｜**产物**：`data/temporary/check-report.md`｜**依赖**：第6步
**验收**：5 项全过才 OK；不过打回第2/4步｜**铁律**：FAIL 不静默通过

### 第 8 步 · rv-builder（主题+架构，🔴必做）
**命令**：**风格偏好已在第 3 步头脑风暴收集（`config.theme`）**，此处直接用 → ui-ux-pro-max 现搓主题（**须贴合 v3 Soft UI**：改色不删 `--elev-*`/`--space-*`；勿把筛选改回圆药丸、勿拆卡片竖线语言）→ `patch-enhance.js <v3副本> [--theme] --modules <config.modules>`｜**产物**：`<学科名>/theme.css` + 增强副本｜**依赖**：第1步副本+第3步 modules + config.theme
**验收**：patch 各注入点全✅；副本仍含 `--elev-card` / `transitionKnowledgeList` / `.mastery-pill`；新模块模板版 test-boot 验证｜**铁律**：模板填充=唯一主方式，禁手搓；主题覆盖全量保留 v3 token（见 `TEMPLATE-v3.md`）；**风格偏好第 3 步已定，此处不重复问**

### 第 9 步 · 生成网页（🔴必做）
**命令**：`node ./scripts/fill-template.js xxx/data/sample/基础模板-复习页-v3.html xxx/data/processed/data.json xxx/<学科名>/index.html`（若第8步已在副本上 patch，则填**增强后的副本路径**）｜**产物**：`<学科名>/index.html`｜**依赖**：第2步+第8步
**验收**：无占位符残留（无 `{{`）；`QUESTION_BANK` 六键在；填充报告含 `[v3 Soft UI]`｜**铁律**：用 data/sample/ v3 副本，禁手搓；禁回填 v1 骨架

### 第 10 步 · rv-verifier 阶段②（页面验收，🔴必做）
**命令**：`test-boot.js` + `render-compare.js` 跑 AC1-12｜**产物**：`data/temporary/verify-report.md`｜**依赖**：第9步
**验收**：AC1-12 全 PASS｜**铁律**：FAIL 报出交 polisher 修复复验

### 第 11 步 · rv-polisher（最终优化，🔴必做）
**命令**：调 /recheck 彻查 → 修复（走 CSS 变量）→ 回归｜**产物**：优化 index.html + `<学科名>/polish-report.md`｜**依赖**：第10步
**验收**：重跑 test-boot + 阶段② 全 PASS｜**铁律**：打磨非重做，不改整体架构

### 第 12 步 · rv-bundle-export（⚪可选）
**命令**：合集/导出；交付后提醒走 rv-updater｜**依赖**：第11步

### 第 13 步 · 演进记录（🔴必做，成长机制）
**命令**：回顾全程，通用问题分层固化（脚本自检/护栏/演进/学科特有）｜**产物**：GUARDRAILS.md 或 EVOLUTION.md 更新｜**依赖**：全程
**验收**：本次通用问题已分层落位｜**铁律**：错误固化成机制，不靠每次重读历史

## 接口契约

- **数据模型**：`{ subject, categories:[{id,name,icon,subcategories:[{id,name}],concepts:[{id,title,subcategory,mastery(掌握|熟悉|了解),summary,content,tags,isKey}]}], questions:[{id,chapter,type(single|multi|tf|fill|terminology|essay),stem,options,answer,explanation}], config }`，字段全部学科中性
  - `config.modules`：模块选中列表（数组或逗号分隔字符串，缺省全选；assemble.js 按它装配，填 `rv-core` 强制恒选）
  - `answer` 取值按题型分化：`single`/`multi` = 正确选项索引(number)或索引数组；`fill`/`essay` = 文本；`terminology` = 定义要点文本；`tf` = `对|错`
  - `content` 为**可信富文本**（允许 `<p>/<b>/<ul>` 等简单标签，前端按白名单渲染，禁止含脚本/事件属性）
- **模块接口**：`RV.modules[name] = {name, deps, init(ctx), render(ctx)}`；ctx 共享 data/state/store/dom/event/utils
- **ctx.dom 自动填充**：buildCtx 启动时自动填充母版容器（headerActions/searchWrap/appSidebar/sidebarMask/appMain/appDetail/detailTitle/detailActions/detailBody/detailFooter/detailClose/hamburger/brandName），模块一律经 ctx.dom 操作、禁止自行 getElementById；方法内用 self 须先 `var self = this`
- **占位符**：frame.html 含 4 个 `/*__RV_TITLE__*/` `/*__RV_THEME__*/` `/*__RV_DATA__*/` `/*__RV_MODULES__*/`
- **基础模板识别（默认 v3 Soft UI）**：`./samples/基础模板-复习页-v3.html`（家族根 `<review-page-skill>/samples/` 同步）；头部 `<!-- RV-TEMPLATE: ... v3 Soft UI ... -->`；数据占位 `KNOWLEDGE_CATEGORIES` + `QUESTION_BANK` 六键；品牌 `{{学科名}}/{{副标题}}/{{学科图标}}`；localStorage `STORAGE_FAV`/`STORAGE_WRONG`/`STORAGE_PROGRESS`；视觉契约见 `./samples/TEMPLATE-v3.md`（elev 分层、掌握度竖线、筛选轨滑块、卡片渐隐错峰 25ms）。由 `fill-template.js` 注入数据
- **数据兼容**：data.json 的 `categories` 与模板 `KNOWLEDGE_CATEGORIES` 结构一致；`questions` **六类全映射**：single→choice、multi→multi、tf→truefalse、fill→fill、terminology→terminology、essay→essay（题型入口由 `Object.keys(bank)` 动态生成，0 题自动隐藏）
- **交互契约（v3）**：章节/筛选切换必须走列表过渡（离开渐隐→进入错峰淡入），禁止无动画整栏重渲；收藏局部更新；章节默认折叠并由 `STORAGE_PROGRESS` 恢复

## 阶段自检（全流程末尾必做，PASS 才算完成）

- **最终验收**：rv-verifier 阶段② AC1-12 全 PASS
- **产物**：index.html 无占位残留（无 `{{`、无空 QUESTION_BANK）
- **文档**：answer-audit.md / polish-report.md 存在且完整
- **演进**：本次通用问题已分层落位（GUARDRAILS / EVOLUTION / 脚本固化）
- **FAIL → 返回对应工位修复，禁止带病交付**

## 质量要求（最终验收总纲，执行细节在各子 skill）

- **整体架构与 v3 Soft UI 母版一致**：禁止改动三栏 Grid / 标题栏 / 移动端抽屉骨架；只换主题变量与内容；保留 elev/竖线筛选/卡片过渡等 v3 契约（`TEMPLATE-v3.md`）
- **未选模块代码不出现在产物中**（AC5）
- **全部题目经联网审查、答案全对**（AC11）
- 最终验收 = 阶段自检（AC1-12 全 PASS、无占位残留、文档完整）

## 协作

- 必调子 skill：rv-doc-extractor（提取清洗）/ rv-data-builder（建模）/ rv-content-refiner / rv-quiz-designer / rv-answer-verifier / rv-builder / rv-verifier / rv-polisher
- 按需调：rv-module-developer（仅第 3 步头脑风暴确认有新增模块需求时）/ rv-bundle-export / rv-updater / superpowers-writing-plans / 需求转译（barry-liu-888-requirement-translator）
