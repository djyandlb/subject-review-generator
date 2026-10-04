---
name: rv-module-developer
description: 模块开发（成长型）。输入 /rv-module-developer + 模块需求，新模块自动审查+自动登记进 manifest.json 永久入库，之后自动可被调用。
---
> **护栏必读**：执行前读家族根护栏 `<review-page-skill>/docs/GUARDRAILS.md`（13 条必守，向上逐级查找），不读会重蹈历史错误

# 模块开发（rv-module-developer）

> **定位**：模块是「按需新增的增强能力」——读用户资料后，经头脑风暴「模块决策」决定是否需要新增模块；**不是生成网页时从头拼装**。模块库预置能力为底，按需扩展。
>
> **成长型机制（本 skill 的灵魂）**：模块库「自己记住自己」——每个新模块写入 `modules/` 后，**自动过审查、自动登记进 `modules/manifest.json`**，永久入库。以后任何 skill 生成网页时，assemble.js 按注册表自动校验并调用它。**无需手工维护清单**，写一次、永远在。

## 触发条件

- 由主编排调度（subject-review-generator 第 3 步头脑风暴「模块决策」之后）——**主要入口**
- 独立调用：`/rv-module-developer` + 模块需求描述
- 用户资料有现有模块未覆盖的特殊需求时

## 输入

- 模块需求描述（做什么、放哪、依赖谁）
- 参考：模块库现有模块 + `<同级skill:subject-review-generator>/modules/manifest.json`（注册表：每个模块的 name/desc/deps/events/added）+ 家族根 `<review-page-skill>/samples/` 模板家族网页（`基础模板-*.html` 等，最大代码来源）

## 输出

- 新增/修改的模块 JS 文件（遵循统一接口）
- 自动更新 `<同级skill:subject-review-generator>/modules/manifest.json`（注册表，本 skill 或 assemble.js 触发）

## 工作流程

0. **决策先查库（头脑风暴「模块决策」时）**：`node <同级skill:subject-review-generator>/scripts/list-modules.js` 输出注册表全清单 → 对照需求：
   - **需求已被现有模块覆盖 → 直接启用，不新写**（选中写入 `data.json` 的 `config.modules` → assemble.js 自动应用）
   - 仅当需求**任何模块都覆盖不了** → 才进入下面的开发流程（写一次入库，以后直接复用）
   - **本 skill 的工作模式是「决策→复用」**：库里有就用库里的，永远不重复造轮子
1. **先查复用**：读 `<同级skill:subject-review-generator>/modules/manifest.json` 注册表 + 家族根 `<review-page-skill>/samples/` 下的基础模板与成品网页（当前含 `基础模板-复习页-v3.html`，含 `RV-TEMPLATE`/数据占位结构，是最大代码来源）是否已有可提取/改造的实现；能提取就不新写
2. **新写规范**：严格遵循接口
   ```js
   ;(function () {
     'use strict'
     var RV = window.RV = window.RV || {}
     RV.modules = RV.modules || {}
     RV.modules['模块名'] = {
       name: '模块名',
       deps: ['依赖模块'],      // 必须在模块库存在
       init: function (ctx) { /* 挂 API、监听事件 */ },
       render: function (ctx) { /* 渲染 DOM 到 ctx.dom.xxx */ }
     }
   })()
   ```
3. **接口约定**：
   - DOM 一律经 `ctx.dom.xxx` 操作。**ctx.dom 由 rv-core 的 buildCtx 启动时自动填充母版容器**（`headerActions / searchWrap / appSidebar / sidebarMask / appMain / appDetail / detailTitle / detailActions / detailBody / detailFooter / detailClose / hamburger / brandName`），模块**禁止自行 `document.getElementById`**。新增容器时需在 frame.html 与 rv-core 的 dom 映射两处同步登记
   - 数据经 `ctx.data`；状态经 `ctx.state`；持久化经 `ctx.store` / `ctx.saveAll()`
   - 模块间通信经 `ctx.event.emit/on`（事件契约：answer:wrong / answer:correct / **mastery:change** / fav:toggle / fav:change / nav:select / concept:select / view:change / search:change / wrong:change / quiz:launch；**完整契约以 `<同级skill:subject-review-generator>/scripts/check-module.js` 的 CONTRACT 数组为准，此处为速览**）
   - **self 声明规则**：方法内引用模块自身（`self.xxx`）时，必须在**该方法体开头**第一行声明 `var self = this`——init 里的 self 不会泄漏到 render/open/next，漏声明会抛 `ReferenceError: self is not defined`
   - 禁止循环依赖
4. **自动审查（必做，入库关卡）**：`node <同级skill:subject-review-generator>/scripts/check-module.js <新模块.js>`——自动校验语法 / IIFE+RV.modules 注册名与文件名一致 / deps 存在 / 无 getElementById / 无学科术语 / 无外部资源 / **无硬编码 #hex 色值**（FAIL 级）。**FAIL 则拒绝入库，修到 PASS 为止**（事件契约/数据契约注释缺失为软警告）
5. **自动登记（必做，永久入库）**：`node <同级skill:subject-review-generator>/scripts/gen-manifest.js`——扫描模块库自动把新模块写进 `manifest.json`（desc/deps/events/added 日期），幂等、旧登记日期保留。**此后任何 skill 生成网页时，assemble.js 自动按注册表校验并调用它**
6. **注册冒烟**：`node -e "global.window=global;require('<同级skill:subject-review-generator>/modules/rv-core.js');require('./新模块.js');console.log(Object.keys(RV.modules))"`——验收：RV.modules 含该模块名，且其 deps 全部已注册（无 undefined）
7. **（可选）** 调 `code-review` 审查代码质量

> **成长闭环**：以上 4→5 步即「自动审查 + 自动保存」。模块一经入库，永久存在于 `modules/` + `manifest.json`，跨会话、跨学科可复用；即使某次组装没选中它，注册表里也始终记得它。

## 阶段自检（流程末尾必做，PASS 才入库）

- **审查**：check-module.js 退出码 0（FAIL 不入库）
- **登记**：manifest.json 已含新模块（gen-manifest.js 幂等，旧登记日期保留）
- **冒烟**：RV.modules 含该模块名且 deps 全部已注册（无 undefined）
- **FAIL → 修到 PASS 为止，禁止带病入库**

## 质量要求

- 无外部依赖（CDN/框架一概不用）
- **无学科术语硬编码**（性味/归经等禁止出现），全部走通用概念
- 注释用中文
- 与现有模块代码风格一致（IIFE + RV.modules + 事件驱动）
- **必须通过 check-module.js 全部检查**（FAIL 不入库）
- **模块数据契约规范（跨模块共享数据必定义）**：新模块若产生**跨模块共享数据**（如进错题本的条目、供其他模块识别的状态对象），必须在模块 JS **头部注释**定义统一数据格式（字段名/类型/用途/消费方），字段全通用（无学科术语）；示例：duel 模块的「鉴别题」`{type:'duel', id, conceptA, conceptB}` 供错题本渲染识别。**禁止**在模块里默默产生其他模块不认识的散格式数据（会导致错题本等不识别）
- **联动同步更新铁律（防「只改一方」bug）**：开发/修改模块 JS 时，**凡是与之联动的 JS 必须同步更新**，禁止单独改一方——
  - 模块产生共享数据 → **消费方同步改**（如 duel 改鉴别题格式，错题本渲染/识别必须同轮更新）
  - 模块改样式 → **渲染逻辑同步改**（CSS 与 JS 一起；UI 全部走主题变量，禁硬编码色值）
  - 模块有模块化版 + 模板版 → **两套实现同步改**（ctx 版 + 模板版行为一致）
  - **验证**：改完跑 check-module + 渲染测试，确认消费方能识别新数据/样式生效；联动方未更新 = 未完成
- **UI/UX 统一规范（新模块必守）**：新模块视觉统一走主题 `:root` 变量（色值/圆角/阴影/字体），**禁止在 JS 里硬编码 `#hex` 色**；交互优化——触控目标 ≥40px、清晰入口/退出按钮、状态反馈（进度/选中态）、空状态占位提示

## 协作

- 可调 `code-review` / `superpowers-systematic-debugging`（遇 bug）
- 提取来源模板家族：家族根 `<review-page-skill>/samples/` 下的基础模板与成品网页（如 `基础模板-*.html` 及含 `RV-TEMPLATE` 标记的单文件页面）
- 审查/登记：`<同级skill:subject-review-generator>/scripts/check-module.js` + `<同级skill:subject-review-generator>/scripts/gen-manifest.js`（本 skill 与 assemble.js 共用）
