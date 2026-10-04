---
name: rv-doc-extractor
description: 资料提取清洗工位。输入 /rv-doc-extractor + 资料文件夹，逐文档多格式解析→清洗→**提取完整性机器校验**→质检，产出各文档 `*_clean.txt` + `parse-report.md`，交付 rv-data-builder 建模。本工位只做「把源文档变成干净的文本」，不做分类/建模。
---
> **护栏必读**：执行前读家族根护栏 `<review-page-skill>/docs/GUARDRAILS.md`（13 条必守，向上逐级查找），不读会重蹈历史错误

# 资料提取清洗（rv-doc-extractor）

> **定位**：与 rv-data-builder（建模）**分离**——本工位是**纯脚本执行**（提取→清洗→机器校验），不含任何 AI 归类。分离目的：**提取失败必须被机器拦住**，不许残缺资料静默流入 data.json 建模（「病理学.pdf 1.4MB 只提取 20 行、综合.doc 0 行」仍被建模的教训）。
>
> **验收铁律**：本工位产出的 `*_clean.txt` 是 rv-data-builder 建模的**唯一数据源**——提取不完整 → 打回补跑备选，**绝不带病交付**。

## 触发条件

- 独立调用：`/rv-doc-extractor` + 资料文件夹路径
- 由主编排调度（subject-review-generator 第 2 步前半）

## 输入（遵循工作目录契约）

- 资料文件夹路径（含 PDF / Word / PPT / Markdown / 纯文本 任一或混合）

## 输出

- `xxx/data/raw/<文件名>_clean.txt`：每个源文档一份清洗后文本（**命名必须 `<文件名>_clean.txt` 下划线，去源扩展名**；原始提取物清洗成功后**立即删除**，raw 下只留 `_clean.txt`）
- `xxx/data/temporary/parse-report.md`：文件清单、成功/失败、每份行数/有效字符、提取完整性校验结果

## 工作流程（每步必做 + 验收）

> **流程铁律（防 AI 跳过）**：本工位**不做任何分类/建模**——识别到分类需求即停，那是 rv-data-builder 的活；每步过「验收」。
>
> **阶段自检（绝对铁律，防带错交付）**：每步「验收」是执行时核对点（**不逐行自检烧 token**）；**流程末尾做一次阶段自检**——按文末「阶段自检」小节核验产物（能跑脚本的跑脚本看退出码，不能的人工抽查）；**自检全部 PASS 才交付 rv-data-builder**；任一项 FAIL → 返回返工，禁止带错交付。

### 第 1 步 · 列文件（🔴 必做）
**命令**：递归列出资料文件夹全部文件｜**产物**：源文档清单｜**依赖**：—
**验收**：清单含全部 pdf/doc/docx/pptx/txt/md｜**铁律**：— 

### 第 2 步 · 逐文档提取（🔴 必做，含备选方案）
**命令**：`python ./scripts/extract-any.py <文件> xxx/data/raw/`（输出 `<文件名>.txt`，含 `=== PAGE/SLIDE N ===` 页标记，**仅供清洗用，清洗成功后即删**）｜**产物**：每个源文档一份原始提取物｜**依赖**：第1步
- 格式方案：`.pdf`→pymupdf（`extract-any.py` 默认）；`.pptx`→文本框+演讲者备注；`.docx`→段落+表格；`.doc`→antiword；`.txt/.md`→UTF-8/GBK 检测；`.ppt`→提示 LibreOffice
- **异常与备选（🔴 关键）**：**任何文档提取后先自查有效字符量**——PDF/DOC/DOCX/PPTX 提取结果**有效字符 < 500 即视为疑似失败**（扫描版 PDF / antiword 未装 / 格式异常），**不得静默通过**：
  - `.pdf` 异常/字符量低 → 补跑备选 `bash ./scripts/extract-pdf-pdftotext.sh <文件> xxx/data/raw/<文件名>-pdftotext.txt`，再 `python ./scripts/compare-extract.py` 按有效字符/结构线索/行宽对比取「推荐使用」者，落选移 `data/temporary/`
  - `.doc` 异常 → 检查 antiword 是否可用；不可用改用 `libreoffice --headless --convert-to txt` 备选
  - 备选后仍 < 500 有效字符 → 在 parse-report.md 明确标注「该文档疑似扫描版/无法提取文字，已跳过」，**告知用户**，不得假装提取成功
**验收**：每个源文档都有提取结果或「明确标注不可提取」｜**铁律**：**禁止**把 < 500 字符的失败提取物当正常结果继续走

### 第 3 步 · 清洗（🔴 必做，不可跳过）
**命令**：`node ./scripts/clean-text.js xxx/data/raw/<文件名>.txt xxx/data/raw/<文件名>_clean.txt`——**输出命名必须 `<文件名>_clean.txt`（下划线，去源扩展名）**；**清洗成功后立即删除未清洗原文件 `<文件名>.txt`**（只留清洗版，不保留原始提取物）；去 `www.1ppt` 水印 / `=== PAGE/SLIDE ===` 页标记 / 纯数字页码 / 换页符｜**产物**：每文档一份 `*_clean.txt`｜**依赖**：第2步
**验收**：清洗后原文件已删，raw 下只有 `*_clean.txt`｜**铁律**：清洗后才可交付；不清洗 `=== PAGE 18 ===` 残留进答题卡（历史教训）

### 第 4 步 · 提取完整性机器校验（🔴 必做，新增防呆关卡）
**命令**：`node ./scripts/check-extraction.js <资料文件夹> xxx/data/raw/`——对每个源文档核对对应 `*_clean.txt`，PDF/DOC/DOCX/PPTX 源有效字符 < 500 → FAIL；无清洗文件 → FAIL｜**产物**：校验输出（逐文件行数/有效字符/判定）｜**依赖**：第3步
**验收**：**退出码 0（全部源文档提取完整）才可进入质检与交付**；退出码 1 → 按报告打回补跑备选方案，**不许带病建模**｜**铁律**：提取完整性是机器判定，不靠 AI 目测——「病理学.pdf 只提取 20 行」这种失败必须被此关卡拦住

### 第 5 步 · 质检 + 产出报告（🔴 必做）
**命令**：`grep -c "=== PAGE\|=== SLIDE\|www\.1ppt" <文件名>_clean.txt` 应 0（残留返工）；记 `data/temporary/parse-report.md`（源文档清单、每份行数/有效字符、成功/失败、备选补跑记录、提取完整性校验结论）｜**产物**：`data/temporary/parse-report.md`｜**依赖**：第4步
**验收**：全部 `*_clean.txt` 残留=0；parse-report.md 含完整性校验通过结论｜**铁律**：报告如实记录——扫描版文档无法提取就写明，不得谎称成功

## 交付契约（与 rv-data-builder 对齐）

- **产出物**：`xxx/data/raw/*_clean.txt`（**AI 建模阅读的唯一数据源**）+ `xxx/data/temporary/parse-report.md`
- **建模前置**：rv-data-builder 第 0 步必须核对本工位 parse-report.md 的「提取完整性校验通过」结论，不通过不建模
- 本工位**不产出 data.json**——那属于 rv-data-builder

## 阶段自检（流程末尾必做，PASS 才交付 rv-data-builder）

- **提取完整性**：`node ./scripts/check-extraction.js <资料文件夹> xxx/data/raw/` 退出码 0
- **残留**：`grep -c "=== PAGE\|=== SLIDE\|www\.1ppt" xxx/data/raw/*_clean.txt` 全为 0
- **对账**：每个源文档都有对应 `*_clean.txt`，未清洗原文件已删
- **FAIL → 返回补跑备选，禁止带病交付建模**

## 质量要求

- 每个源文档都有 `*_clean.txt` 或明确标注不可提取
- **提取完整性机器校验必须通过（check-extraction.js 退出码 0）**——残缺资料是建模卡数偏少的头号根因
- 清洗命名统一 `<文件名>_clean.txt`；原文件删除；残留为 0
- 不编造提取内容：无法提取的文档如实标注，不得用其它文档内容顶替

## 协作

- 下游：**`rv-data-builder`**（必交付：全部 `*_clean.txt` + parse-report.md）
- 解析失败可调 `research` skill 辅助理解文档结构
- 可调 `需求转译`（barry-liu-888-requirement-translator）复核提取方案
