---
name: rv-polisher
description: 最终优化。生成网页后必做步骤：调 /recheck 彻查网页，优化 UI/UX、修复 bug，美化打磨网页。
---
> **护栏必读**：执行前读家族根护栏 `<review-page-skill>/docs/GUARDRAILS.md`（13 条必守，向上逐级查找），不读会重蹈历史错误

# 最终优化（rv-polisher）

> 生成流程的**必做收尾工位**：美化网页、优化 UI/UX、消除 bug。不做这步不算完成。

## 触发条件

- 主编排调度（subject-review-generator 第 11 步，rv-verifier 阶段②之后）——**必做**
- 独立调用：`/rv-polisher` + 目标 index.html

## 输入

- 生成的 `index.html`（单文件复习网页）
- 配套 `data.json`（数据相关 bug 定位用）

## 输出

- 优化后的 `index.html`
- `<学科名>/polish-report.md`：发现 + 修复清单（按 UI / UX / Bug 三类列出），与主编排产物约定一致

## 职责（三件事）

1. **调 /recheck 深度彻查**：对整个网页做 UI/UX/Bug 全面扫描
2. **修复 Bug**：运行错误 / 逻辑错误 / 边界问题，当场修复并重测
3. **优化 UI/UX**：视觉一致性 / 交互流畅 / 响应式细节 / 可达性，**不改变整体架构**

## 工作流程（每步必做 + 验收）

> **流程铁律（防 AI 跳过）**：本工位是**必做收尾**，不做这步不算完成；修复 = **打磨不是重做**，不改变整体架构。
>
> **阶段自检（绝对铁律，防带错交付）**：每步「验收」是执行时核对点（**不逐行自检烧 token**）；**流程末尾做一次阶段自检**——按文末「阶段自检」小节核验产物（能跑脚本的跑脚本看退出码，不能的人工抽查）；**自检全部 PASS 才算本工位完成**；任一项 FAIL → 返回返工，禁止带错交付。

### 第 1 步 · 调 recheck 彻查（🔴 必做）
- **命令**：调 recheck skill，输入「优化整个网页的 UI/UX，修复所有 bug」→ 获得发现清单
- **验收**：获得含「文件:行号 + 证据 + 复现步骤」的发现清单
- **依赖**：主编排第 10 步（页面已生成）

### 第 2 步 · 分类整理发现（🔴 必做）
- **动作**：按 UI 类 / UX 类 / Bug 类三筐整理
- **验收**：每条发现归入一类，无遗漏

### 第 3 步 · 逐项修复（🔴 必做）
- **Bug 类**：修改 JS 逻辑或数据 → 重跑 `<同级skill:rv-verifier>/scripts/test-boot.js` / `<同级skill:subject-review-generator>/samples/test-template.js` 确认修复
- **UI 类**：调整 CSS（间距/层次/配色/字体）→ **走 CSS 变量，不硬编码新色**
- **UX 类**：交互反馈 / 过渡动画 / 可达性（触控目标 ≥40px、正文对比度、aria 标签）
- **验收**：每项修复后页面可运行（boot 无异常）

### 第 4 步 · 回归验证（🔴 必做）
- **命令**：重跑 rv-verifier 阶段② AC1-AC12 清单（含 AC12 模板模式）
- **验收**：AC1-12 全 PASS
- **说明**：第 3 步是**逐项修复后的局部验证**（每改完一类跑 test-boot），第 4 步是**全部修完后的最终回归**——二者不可互相替代

### 第 5 步 · 写 polish-report.md（🔴 必做）
- **产物**：`<学科名>/polish-report.md`（逐项「问题 → 修法 → 结果」）
- **验收**：每个修复可追溯

### 第 6 步 · 上报通用问题（🔴 必做，成长机制）
- **动作**：通用性 bug / 优化 / 模板缺陷（跨学科可复用）→ 追加家族根 `<review-page-skill>/docs/EVOLUTION.md` + 固化进对应 skill/脚本（如 `patch-enhance.js`）；学科特有只留 polish-report
- **验收**：本次发现的通用问题已分层落位（演进/脚本固化各归其位）

## 阶段自检（流程末尾必做，PASS 才算完成）

- **回归**：重跑 rv-verifier 阶段② AC1-12 全 PASS
- **boot**：test-boot.js 无异常
- **报告**：polish-report.md 每个修复可追溯（问题 → 修法 → 结果）
- **FAIL → 返回修复，禁止带病交付**

## 质量要求

- **不改变整体架构**：三栏 Grid / 标题栏 / 移动端抽屉 / 模板骨架原样保留
- **UI 优化走 CSS 变量**：配色只在 `:root` 改，禁止散落硬编码学科色
- 优化是「打磨」不是「重做」：保持原有设计与逻辑，只做增强
- 修复后网页必须可运行（boot 无异常）且通过 rv-verifier（阶段②）验收
- 每个修复可追溯（polish-report 列明）

## 协作

- 必调：`recheck` skill（深度彻查）
- 可调：`frontend-design` / `ui-ux-pro-max`（视觉优化——改配色/字体先 ui-ux-pro-max，布局/细节先 frontend-design）、`code-review`（代码审查）、`superpowers-systematic-debugging`（bug 定位）
- 验证：`rv-verifier`（阶段②页面验收）/ `<同级skill:rv-verifier>/scripts/test-boot.js`/ `<同级skill:subject-review-generator>/samples/test-template.js`
