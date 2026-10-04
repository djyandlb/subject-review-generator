---
name: rv-updater
description: 更新维护。输入 /rv-updater + 资料变更，增量重新生成复习网页；也支持对已生成网页二次定制（换主题/加减模块/改数据）。
---
> **护栏必读**：执行前读家族根护栏 `<review-page-skill>/docs/GUARDRAILS.md`（13 条必守，向上逐级查找），不读会重蹈历史错误

# 更新维护（rv-updater）

## 触发条件

- 用户说「资料更新了」「重新生成」「改一下网页」「换主题」「加个功能」
- 由主编排交付时提醒使用

## 输入（遵循工作目录契约）

- 变更后的资料文件夹 xxx / 变更描述
- `xxx/data/processed/data.json`（旧版，用于复用未变部分）

## 工作流程（增量更新）

1. **diff 识别变化**：对比新旧资料（比对新旧 `*_clean.txt`，或复用 rv-doc-extractor 的提取脚本重跑变化文件），定位变化的章节/知识点/题目
2. **只重抽变化部分**：仅对变化章节重新提取（rv-doc-extractor）+ 建模（rv-data-builder），复用未变的 data.json 内容
3. **新题重审**：变化产生的**新题目**必须重新走 rv-answer-verifier 联网审查
4. **重新质检**：rv-verifier（阶段①数据校验）校验合并后的 data.json
5. **重新拼接**：按原生成模式重拼——模板模式 `node <同级skill:subject-review-generator>/scripts/fill-template.js <xxx/data/sample/副本> xxx/data/processed/data.json xxx/<学科名>/index.html`；模块化 `node <同级skill:subject-review-generator>/scripts/assemble.js xxx/data/processed/data.json xxx/<学科名>/index.html`（脚本留在主编排 skill 自带 `scripts/` 靠 `__dirname` 定位资源，**禁止复制**）

## 增量合并契约（与 rv-data-builder 对齐）

extractor 全量解析产出完整 data.json；增量更新时**复用未变部分、重抽变化部分**，按以下规则合并：
1. 章节级变化：整章重抽 → 按 `categories[].id` 替换整段（含其 concepts 与 `chapter` 关联的 questions）
2. 未变章节：原样保留（concepts/questions 全部不动）
3. 已删除章节：从 categories 与关联 questions 一并移除
4. 章节内局部变化：按 `concept.id` / `question.id` 精确替换；无匹配 id 的视为新增追加
5. 合并后必须过 rv-verifier 阶段①（id 唯一性 / subcategory·chapter 引用完整性 / isKey 覆盖），不过则回滚保留旧版

## 工作流程（二次定制）

- **换主题**：改风格偏好 → 重跑 rv-builder（主题部分）→ 重拼——**模板模式**：`patch-enhance.js <副本> --theme <新theme.css>` 注入后重拼；**模块化模式**：把新 theme.css 内容写入 data.json 的 `config.themeCss`（**仅 assemble.js 读取，模板模式不认**）
- **加减模块**：编辑 `config.modules` 数组 → 重拼（未选模块自动不进页面）
- **改数据**：直接编辑 data.json（概念/题目/掌握度默认值）→ 重拼
- **加新功能**：走 rv-module-developer 开发模块 → 加入 config.modules → 重拼

## 阶段自检（流程末尾必做，PASS 才交付）

- **数据**：增量合并不丢旧数据（复用部分 + 重抽部分正确合并，过 rv-verifier 阶段①）
- **新题**：变化产生的新题过答案审查（报告注明哪些重审）
- **产物**：重拼后过 rv-verifier 阶段② AC1-12
- **FAIL → 回滚保留旧版，禁止带病交付**

## 质量要求

- 增量更新不丢旧数据：复用部分与重抽部分正确合并
- 新题必须过答案审查，旧题未变可不重审（报告注明）
- 重拼后产物仍通过 rv-verifier 阶段②的 AC1-AC12

## 协作

- 复用：rv-doc-extractor（提取）/ rv-data-builder（建模）/ rv-answer-verifier / rv-builder / rv-module-developer / rv-verifier / assemble.js / fill-template.js
- 可调 `需求转译` 明确变更需求
