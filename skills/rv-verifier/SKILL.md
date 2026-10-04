---
name: rv-verifier
description: 质检验收。整合数据校验与页面验收：阶段①校验 data.json（结构/概念/章节引用/题库/覆盖）阶段②验收页面 AC1-AC12，输出 PASS/FAIL 报告。
---
> **护栏必读**：执行前读家族根护栏 `<review-page-skill>/docs/GUARDRAILS.md`（13 条必守，向上逐级查找），不读会重蹈历史错误

# 质检验收（rv-verifier）

> 由原 `rv-data-checker`（数据校验）与 `rv-page-verifier`（页面验收）**整合**而成：数据校验在生成前，页面验收在生成后，同一工位两阶段执行，减少一次调度。

## 触发条件

- **阶段 ①（数据校验）**：主编排第 7 步（出题与答案审查之后）
- **阶段 ②（页面验收）**：主编排第 10 步（生成之后、rv-polisher 之前）
- 独立调用：`/rv-verifier` + data.json 或 index.html

## 输入（遵循工作目录契约）

- 阶段 ①：`xxx/data/processed/data.json`
- 阶段 ②：`xxx/<学科名>/index.html` + `data/processed/data.json` + `xxx/<学科名>/answer-audit.md`（AC11 核验答案审查报告存在）

## 输出

- 阶段 ①：`xxx/data/temporary/check-report.md`
- 阶段 ②：`xxx/data/temporary/verify-report.md`

## 工作流程（两阶段，每步必做 + 验收）

> **流程铁律（防 AI 跳过）**：任何一项不过 → 明确报 `FAIL + 原因 + 涉及 id`，**不静默通过**；「全部通过才返回 OK」。
>
> **阶段自检（绝对铁律，防带错交付）**：每步「验收」是执行时核对点（**不逐行自检烧 token**）；**流程末尾做一次阶段自检**——按文末「阶段自检」小节核验报告完整性；**自检全部 PASS 才交付**；任一项 FAIL → 明确报 FAIL + 原因 + 涉及 id 打回。

### 阶段 ① · 数据校验（🔴 必做，主编排第 7 步）
- **动作**：逐项校验 data.json（5 项）
- **命令**：核验结构 / 概念 / 章节引用 / 题库 / 覆盖
- **产物**：`xxx/data/temporary/check-report.md`
- **验收**：5 项全通过才 OK；任一不过 → 报 FAIL + 原因 + 涉及 id，**打回重抽**（结构/概念 → rv-data-builder；题库 → quiz-designer）
- **依赖**：主编排第 6 步（答案审查后）

**6 项校验（必查，不可抽查）**：
1. **结构**：subject / categories / questions 存在，categories 非空
2. **概念**：id 全局唯一；title / summary / content 非空；subcategory 引用存在；mastery ∈ {掌握, 熟悉, 了解}；tags 为数组；**mastery 分布非全一档**（跑 `check-categories.js`——全「掌握」= mastery 判定未执行，须逐条对照资料裁定三档）
3. **章节引用**：questions.chapter ∈ categories[].id；concept.subcategory ∈ 对应子分类；**subcategories[].name 非空且 ≠ id（禁止 `s1`/`s2.1`/`s1-1` 当 name）**——侧边栏显示 name，name=id 会显示「s1 s2」
4. **题库**：type ∈ {single, multi, tf, fill, terminology, essay}（六类）；single/multi 有 options 且 answer 为索引(数组)；tf/fill/terminology/essay 的 options 空；terminology 的 stem 为术语名；**explanation 非空且非空转**（跑 `<同级skill:rv-data-builder>/scripts/check-explanation.js`——纯答案字母「A/ABD」、纯对错词「正确/错误」、通用套话「本题考查…」、≤4 字过短 = FAIL，打回 quiz-designer 补写实质解析）；**options 纯文本**（禁「A. xxx」序号前缀——模板再拼序号变「A. A.」双序号）
5. **覆盖**：每个 isKey:true 概念至少被一道题 chapter 关联覆盖
6. **增强标记**：跑 `<同级skill:rv-data-builder>/scripts/check-enhance.js`——空标记（标记后无内容）/无标题/<br>连接/树空格层级 = FAIL，打回 content-refiner 重写（否则详情增强卡不渲染）

### 阶段 ② · 页面验收（🔴 必做，主编排第 10 步）
- **动作**：跑 AC1-AC12 清单 + 端到端运行验证 + 模板一致性
- **命令**：`node ./scripts/test-boot.js <index.html>`（boot 无异常/主区渲染/搜索匹配）+ `node ./scripts/render-compare.js <成品> <原模板>`（CSS 行数 / JS 函数数 / 渲染类名 / **CSS 变量完整性**——四指标全过才 PASS，差异仅允许数据量；**`<原模板>` = 增强前的模板副本 `xxx/data/sample/基础模板-*.html`，不是增强后的成品**）
- **产物**：`xxx/data/temporary/verify-report.md`
- **验收**：AC1-AC14 全 PASS
- **依赖**：主编排第 9 步（生成后）

**AC1-AC12 清单（逐项 PASS/FAIL，不可抽查；标注验证方式：🛠脚本自动 / 👁人工核验）**：
- AC1 三栏 Grid 正常渲染（🛠render-compare 类名比对 + 👁目测） / AC2 全部选中模块功能可用（👁逐模块点击） / AC3 两学科主题不同（多学科场景；单学科可跳过）（👁） / AC4 localStorage 键带学科名不串（👁查 `STORAGE_FAV/WRONG` 前缀） / AC5 未选模块代码不进页面（🛠`grep` 未选模块名应无命中）
- AC6 移动端 <768px 抽屉可用（👁） / AC7 题库 type 枚举 + answer 类型匹配（🛠阶段①已验 + 👁） / AC8 选择题干扰项同章节（👁抽验） / AC9 错题本收录/删除（👁交互） / AC10 必背概念全覆盖（🛠阶段①覆盖校验）
- AC11 答案审查报告存在且全检（👁`<学科名>/answer-audit.md` 存在 + N题N条） / AC12 模板模式产物无占位残留（🛠`grep '{{'` 与空 `KNOWLEDGE_CATEGORIES` 应无命中） / AC13 **详情增强渲染**：含【树】/【流程】/【对比表】/【速记】标记的概念，详情面板能渲染增强卡（🛠产物含 `parseContentEnhancements` + 👁抽查 3 卡有 🌳/🔀/⚖️/🎴） / AC14 **multi 判题**：勾选错误选项提交 → 选错的红（selected-wrong）、选对+正确答案绿（selected-correct），不是全绿（👁交互验证）

**铁律**：任何 AC 不过 → 报 FAIL，交给 rv-polisher / rv-module-developer 修复后复验

## 阶段自检（流程末尾必做，PASS 才交付）

- **阶段①**：check-report.md 含 6 项全部 PASS 结论（不静默通过）
- **阶段②**：verify-report.md 含 AC1-14 全部 PASS
- **对账**：报告含 FAIL + 原因 + 涉及 id（如有 FAIL）
- **FAIL → 明确打回，禁止静默通过**

## 质量要求

- 任何一项不过 → 明确报 FAIL，**不静默通过**
- 数据校验打回 extractor/quiz-designer；页面验收不过交给 rv-polisher / rv-module-developer 修复后复验

## 协作

- 打回：rv-doc-extractor（提取不完整）/ rv-data-builder（结构/概念归类问题）/ rv-quiz-designer（题库）
- 修复：rv-polisher / rv-module-developer
- 工具：`./scripts/test-boot.js` / `./scripts/render-compare.js`
