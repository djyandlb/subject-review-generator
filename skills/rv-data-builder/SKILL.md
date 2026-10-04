---
name: rv-data-builder
description: 数据建模工位。输入 /rv-data-builder + 已提取清洗的资料，AI 通读 `*_clean.txt` 归类为知识（categories）与习题（questions），概念卡提取（识别信号/粒度锚点/密度自查）→去重→章节编号→质量校验，产出 data.json。本工位只读清洗后的文本，不做提取。
---
> **护栏必读**：执行前读家族根护栏 `<review-page-skill>/docs/GUARDRAILS.md`（13 条必守，向上逐级查找），不读会重蹈历史错误

# 数据建模（rv-data-builder）

> **定位**：与 rv-doc-extractor（提取清洗）**分离**——本工位是 **AI 建模**：只读已提取清洗的 `*_clean.txt`，归类成 `data.json`。分离目的：**建模前必须先确认提取完整**（提取失败由 rv-doc-extractor 的机器关卡拦住），否则拿残缺资料建模 = 卡数偏少（「病理学 42 卡」根因）。
>
> **数据源铁律**：本工位 **AI 阅读的唯一数据源 = `data/raw/*_clean.txt`**（清洗后文件）。提取不完整（parse-report.md 校验未过）→ 退回 rv-doc-extractor，**不建模**。

## 触发条件

- 独立调用：`/rv-data-builder` + 资料工作根 xxx（需已含 `data/raw/*_clean.txt`）
- 由主编排调度（subject-review-generator 第 2 步后半）

## 输入（遵循工作目录契约）

- `xxx/data/raw/*_clean.txt`（rv-doc-extractor 产出，**必须已过提取完整性校验**）
- `xxx/data/temporary/parse-report.md`（核对提取完整性结论）

## 输出

- `xxx/data/processed/data.json`：通用数据模型（分类→子分类→概念 + 统一题库）
- `xxx/data/temporary/parse-report.md`（追加建模统计：概念数/题数/章节数）
- **模板兼容**：`categories` 结构即模板 `KNOWLEDGE_CATEGORIES`（id/name/icon/subcategories/concepts）；`questions` 按 type 六类全映射（single→choice、multi→multi、tf→truefalse、fill→fill、terminology→terminology、essay→essay）

## 工作流程（每步必做 + 验收）

> **流程铁律（防 AI 跳过）**：每步过「验收」不过返工；**先通读全部清洗文本再建模**；卡数从资料裁定不设上下限，但必须对照清洗文本量自查。
>
> **阶段自检（绝对铁律，防带错交付）**：每步「验收」是执行时核对点（**不逐行自检烧 token**）；**流程末尾做一次阶段自检**——按文末「阶段自检」小节核验产物（能跑脚本的跑脚本看退出码，不能的人工抽查）；**自检全部 PASS 才交付 rv-content-refiner**；任一项 FAIL → 返回返工，禁止带错交付。

### 第 0 步 · 核对提取完整性（🔴 必做，防「残缺资料建模」）
**命令**：读 `data/temporary/parse-report.md`，确认 rv-doc-extractor 的「提取完整性校验通过」结论；`ls data/raw/*_clean.txt` 确认全部源文档都有清洗版｜**产物**：确认可建模｜**依赖**：rv-doc-extractor 交付
**验收**：校验结论通过才继续；**不通过 → 退回 rv-doc-extractor 补跑备选**｜**铁律**：残缺资料建模 = 卡数偏少 = 严重错误（42 卡教训）

### 第 1 步 · 通读全部清洗文本（🔴 必做）
**命令**：通读 `data/raw/` 全部 `*_clean.txt`（**AI 阅读唯一数据源**）｜**产物**：对资料全貌的整体认知（章节结构/考点密度/习题分布）｜**依赖**：第0步
**验收**：能说出共几章、每章大致内容密度、哪些章节资料厚/薄｜**铁律**：**禁止未通读就开卡**——资料内容量是卡数多少的唯一依据

### 第 2 步 · 拆知识 / 习题（🔴 必做）
**命令**：把通读结果拆成两类——知识 → `categories[]`（章节→子章节→概念）；习题 → `questions[]`（题干/选项/答案/解析）｜**产物**：分类骨架｜**依赖**：第1步
**验收**：知识/习题界限清晰，不混｜**铁律**：—

### 第 3 步 · 概念卡提取（🔴 必做，核心动作）
**命令**：按「识别信号」逐段扫描提取概念卡；按章分批写 `data/temporary/cards-part-N.json`（每批 1-2 章）合并｜**产物**：categories[].concepts[]｜**依赖**：第2步
**验收**：每章对照原文回查（见「密度自查」）；识别信号逐条扫过｜**铁律**：识别信号见下，**宁拆细勿并粗**；不设「每章 N 卡」上限，也不注水
- **概念卡最小粒度标准（识别信号清单——遇到任一信号就是一个候选卡）**：
  - 有明确定义的名词 → 「定义卡」（什么是 X）
  - 有分类/分型 → **「分类总卡」+「各类别」独立成子卡**（如「炎症的分类」总卡 + 「渗出性炎」「增生性炎」各一张）
  - 有机制/过程 → 「机制卡」（X 如何发生，按环节拆分）
  - 有特征/表现清单 → 「特征卡」（X 的特点/表现，不同类型/部位可细分多卡）
  - 有对比对象 → 「鉴别卡」（A 与 B 的区别）
  - 有临床意义/结局/危害 → 「意义卡」
  - 有易错点/考点标记 → 独立成卡
  - **拆分铁律**：分类总卡与各类别卡是不同考点必须分开；「特点」与「机制」是不同考点必须分开；「X」与「X 的常见类型」分开。只有同一考点的重复叙述才合并
- **content 粒度（以考点可拆分为准，不以字数为准）**：单卡聚焦一个连贯考点——卡内含多个可独立设问的子考点 → 拆；内容虽长但讲一个连贯整体 → 合理大卡不拆；整节内容拆成多卡而非一张大卡；单一连贯考点不切碎
- **密度自查（每章必做，防提取偏少）**：
  - 该章**黑体标题/小节名/要点列表**逐条核对，是否都有对应卡
  - **对照清洗文本行数**（本次强化）：该章清洗文本行数 ÷ 该章卡数，比值过大（如 > 150 行/卡）→ **疑似并卡过度，回读该章按识别信号重拆**——厚教材（如病理学教材 18000+ 行）提 42 卡是严重遗漏，正常应 200+ 卡
  - 大章节（肿瘤/炎症/消化系统）只提了个位数卡 → **必须**回读核对是否遗漏考点
  - 卡数不设上限（护栏 12 条），**但卡数必须与清洗文本量匹配**——文本量大卡数少 = 必有遗漏
- **章节排序（解析阶段必做）**：`categories[]` 顺序 = 资料章节实际顺序（按文本行号/文件顺序），前端直接按数组渲染不二次排序；章节名从资料提取（没有就自动「第一章/第二章」）；分组重复编号交给第 8 步拉通
- **子分类命名（必做，禁止用 id 当 name）**：`subcategories[].name` 必须**人类可读小节名**（「第一节 xxx」「一、xxx」「1.1 xxx」「xxx概述」）；**禁止 name 填成 id**（s1/s2.1）；资料无小节名时按「第1节」「第2节」编号

### 第 4 步 · 知识点去重（🔴 必做，AI 人工判断，不用脚本）
**命令**：通读后人工判断真正同一知识点才合并（同名重复 / 同知识点异名 / 跨章节重复 / 内容重叠）｜**产物**：去重后的 concepts[]｜**依赖**：第3步
**验收**：合并都有「AI 明确判断是同一知识点」的依据｜**铁律**：**不同考点禁止合并**——「分类总卡」与「各类别卡」即使内容互补也各留一张；「抗原」vs「抗体」内容相关但完全不同，绝不合并；**宁多勿误合**

### 第 5 步 · 概念字段规格（🔴 必做）
**命令**：`id / title / subcategory / mastery(掌握|熟悉|了解) / summary(一句话) / content(保留原义，可含 HTML) / tags[] / isKey(必背标记)`｜**产物**：concepts[] 字段补全｜**依赖**：第4步
- **mastery 判定 = 读资料后的人工裁决，绝不按比例硬凑**：资料标注「重点/必背/掌握/核心/常考」→ 掌握；「熟悉/要求了解/常用」→ 熟悉；一般性提及 → 了解；资料无标注按篇幅/强调/考点频率推断；**禁止用预设比例反推**；**必须逐条对照资料标注裁定，禁止全填同一档**——全「掌握」= 判定未执行（check-categories 会 FAIL 打回）
- **isKey 判定（内部出题覆盖字段，非分级标签）**：必背/必考标注 → `mastery=掌握` 且 `isKey=true`；高频率考点 → `isKey=true`；界面**禁止显示**第四种「必背」标签；凡「必背/必考」标注必须归掌握档
- **概念卡数量铁律**：从资料裁定，不设「每章 N 张」上限/下限；不注水凑数；**卡数对照清洗文本量自查为准**（见第 3 步密度自查 + 第 10 步总自查）

### 第 6 步 · 习题字段规格 + 检索分类（🔴 必做）
**命令**：`id / chapter(挂分类id) / type(single|multi|tf|fill|terminology|essay) / stem / options / answer / explanation`；按检索特征分型｜**产物**：questions[]｜**依赖**：第5步
- **检索分类（AI 手动分类，勿混类）**：挖空题（题干含 `____`）→ `fill`（填空）；术语定义（「名词解释：X」）→ `terminology`（名词解释）；四选一 → `single`；多选 → `multi`；对错判断 → `tf`；简答/论述（试述/简述/谈谈/分析）→ `essay`（简答）。**六类独立题型、各自独立入口**——禁止把填空并进名词解释、把简答并进填空
- `answer` 取值按题型：`single`/`multi` = 正确选项索引(number)或索引数组；`fill` = 填空原词文本；`terminology` = 定义要点文本（stem 为术语名）；`essay` = 要点文本；`tf` = `对|错`

### 第 7 步 · 习题去重（🔴 必做）
**命令**：`node ./scripts/dedup-questions.js xxx/data/processed/data.json`——精确/近似重复合并（题干规范化后比对，只改数字的近似题合并，取信息最全版本，跨章节也去重）｜**产物**：去重后 questions[]｜**依赖**：第6步
**验收**：无重复题；同考点多题答案冲突则保留标记供 answer-verifier 复核｜**铁律**：—

### 第 8 步 · 章节拉通编号（🔴 必做）
**命令**：`node ./scripts/renumber-chapters.js xxx/data/processed/data.json`——`categories[]` 顺序 = 资料章节实际顺序，分组重复/跳变编号（1,2,4,1,2,3,4,5,7）拉通为全局连续「第一章…第九章」｜**产物**：连续编号 categories[]｜**依赖**：第7步
**验收**：编号连续无跳变｜**铁律**：前端按数组渲染不二次排序

### 第 9 步 · 分类质量校验（🔴 必做，机器关卡）
**命令**：`node ./scripts/check-categories.js xxx/data/processed/data.json`——章节/子分类 name 人类可读（**禁 id、禁 s\d 格式当 name**）、概念 subcategory 引用存在、mastery 三档｜**产物**：校验结论｜**依赖**：第8步
**验收**：退出码 0 才可产出；FAIL 打回补正（子分类名从资料小节提取）｜**铁律**：防「子分类 name=id」类 bug

### 第 10 步 · 卡数合理性总自查 + 产出（🔴 必做）
**命令**：汇总清洗文本总量 vs 卡数——总卡数 vs 全部清洗文本行数：**清洗总行数 ÷ 总卡数 > 150** → 疑似整体并卡过度，回查重拆；单章「清洗行数 ÷ 卡数」异常大的逐个回查；记录 `data/temporary/parse-report.md`（章节数/概念数/题数/各章卡数）｜**产物**：`data/processed/data.json` 定稿 + parse-report.md 统计｜**依赖**：第9步
**验收**：卡数与清洗文本量匹配（无「厚教材 42 卡」类遗漏）；校验全过｜**铁律**：**卡数偏少是错误**——文本量大的资料卡数必须大，这是「提取/建模是否完整」的最终体检

## 接口契约

```json
{
  "subject": "学科名",
  "categories": [{ "id": "c1", "name": "章节名", "icon": "📖",
    "subcategories": [{ "id": "s1", "name": "小节名" }],
    "concepts": [{ "id": "k1", "title": "知识点", "subcategory": "s1",
      "mastery": "掌握", "summary": "摘要", "content": "正文", "tags": [], "isKey": true }] }],
  "questions": [{ "id": "q1", "chapter": "c1", "type": "single",
    "stem": "题干", "options": ["A","B"], "answer": 0, "explanation": "解析" }]
}
```

**增量模式**：接收旧 data.json 时可只重抽变化的章节/知识点——按 `categories[].id`、`concept.id`、`question.id` 与旧数据合并（合并契约见 rv-updater「增量合并契约」），未变部分原样复用；缺省为全量建模。

## 阶段自检（流程末尾必做，PASS 才交付 rv-content-refiner）

- **分类校验**：`node ./scripts/check-categories.js xxx/data/processed/data.json` 退出码 0
- **标记格式**：`node ./scripts/check-enhance.js xxx/data/processed/data.json` 退出码 0（含增强标记时）
- **卡数自查**：清洗总行数 ÷ 总卡数 > 150 → 回查重拆；与 parse-report 行数对得上
- **对账**：id 唯一 / subcategory·chapter 引用完整 / mastery 三档 / type 六类
- **FAIL → 返回返工，禁止带病交付内容结构化**

## 质量要求

- **建模前置**：rv-doc-extractor 提取完整性校验通过（parse-report.md 确认）
- 概念字段不得含学科专属术语作字段名；`id` 全局唯一；`subcategory` 引用存在；`summary` 非空一句话；`chapter` 引用存在
- 掌握度三档仅取 掌握/熟悉/了解；`type` 仅取 single/multi/tf/fill/terminology/essay（六类独立）
- 习题答案须来自资料原文，禁止凭空捏造

## 协作

- 上游：`rv-doc-extractor`（必交付 `*_clean.txt` + parse-report.md；提取不完整退回）
- 下游：`rv-content-refiner`（内容结构化）
- 解析失败可调 `research` skill；产出前可调 `需求转译`（barry-liu-888-requirement-translator）复核分类规则
- 产出后必须交给 `rv-verifier`（阶段①数据校验）
