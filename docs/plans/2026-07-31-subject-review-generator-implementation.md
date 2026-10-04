# 学科复习网页生成器（skill 家族）实施计划

> ⚠️ **状态：已实施完成（2026-08-01）。** 本文为历史实施记录，**部分方案已被后续重构取代**，不反映最新架构。最新事实以 `skills/subject-review-generator/SKILL.md`（主编排）与 `docs/specs/...-design.md`（设计规格）为准。主要偏差：
> - 工位数：计划为 11 工位，实际为 **10 个 skill**（`rv-data-checker`+`rv-page-verifier`→`rv-verifier`；`rv-theme-designer`+`rv-web-builder`→`rv-builder`；新增 `rv-polisher`）
> - 拼接方式：assemble.js 从唯一主拼接器降为**模块化兜底**，默认主方式是 **fill-template.js 模板填充**
> - 模块数：12 → **13**（新增 rv-core.js 运行时基座）
> - 新增资产：`fill-template.js` 填充器、`samples/基础模板-*.html` 模板家族、`generate-template.js` 模板生成器、`rv-verifier` 的 `render-compare.js`/`test-boot.js` 验收脚本

> **给代理工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 来逐任务实施此计划。步骤使用复选框（`- [ ]`）语法进行跟踪。

**目标：** 构建 10 工位 skill 家族 + 13 模块库（含 rv-core 运行时基座）+ **一次性打磨的基础架构母版 + 模板家族**，实现「资料文件夹 → 单文件复习网页」的完整流水线，含必背知识点全覆盖出题与联网答案审查，所有网页共用同一架构、全端适配。

**架构：** 主编排 skill（subject-review-generator）调度 10 个子 skill；基础架构母版（frame.html + theme.css）三栏 Grid + 标题栏 + 移动端抽屉一次性做好、永久复用；12 个原生 JS 模块通过统一接口 `RV.modules[name] = {name, deps, init(ctx), render(ctx)}` 注册，assemble.js 内联拼接生成单文件 HTML；主题由 ui-ux-pro-max 按学科现搓 CSS 变量。

**技术栈：** 原生 JS（模块）、Node.js（拼接器 assemble.js）、HTML+CSS（母版）、Claude Code skill（SKILL.md）。

## 全局约束

- 产物必须是**无外部依赖的单文件 HTML**，双击即开，不需服务器
- **基础架构母版必须一致**：所有生成网页用同一 frame.html + theme.css 骨架，禁止逐次改动整体架构；三栏 Grid + 标题栏 + 移动端抽屉为标准形态
- **全端适配**：桌面（≥1024px 三栏）/ 平板（768-1023px 两栏，detail 覆盖层）/ 手机（<768px 单栏 + 抽屉侧边栏 + 展开式搜索），触控目标 ≥40px
- 模块统一接口：`RV.modules[name] = {name, deps, init(ctx), render(ctx)}`；未选中的模块不进页面
- ctx 共享：`data / state / store / dom / event / utils`
- 数据模型：`subject + categories[](→subcategories[]→concepts[]) + questions[]`，字段全部学科中性，无任何学科术语
- 概念字段：`id / title / subcategory / mastery(掌握|熟悉|了解) / summary / content / tags / isKey`
- 题库字段：`id / chapter / type(single|multi|fill|tf) / stem / options / answer / explanation`
- 出题覆盖：每个 `isKey: true` 必背概念至少被一道题覆盖
- 答案审查：全部 questions 逐题联网检索，与 AI 答案对比取准确率最高者，错误当场改正，出修正报告
- localStorage 键带学科名：`rv_fav_{subject}` / `rv_mastery_{subject}` / `rv_wrong_{subject}`
- 掌握度三档（掌握/熟悉/了解）由资料判断写入、前端只读，答题不影响档位
- 错题本：答错自动收录、答对自动删除、支持手动删除
- 所有代码注释用中文
- SKILL.md 必须含：触发条件 / 输入 / 输出 / 工作流程 / 接口契约 / 质量要求 / 协作

---

### 任务 1：搭建 skill 家族项目骨架

**文件：**
- 创建：`review-page-skill/skills/subject-review-generator/{SKILL.md,modules/,templates/,scripts/}`
- 创建：其余 10 个子 skill 目录（`skills/rv-{data-extractor,data-checker,quiz-designer,answer-verifier,theme-designer,web-builder,module-developer,page-verifier,updater,bundle-export}/`）
- 创建：`review-page-skill/samples/`、`review-page-skill/docs/plans/`

**步骤：**

- [ ] **步骤 1：创建目录树**

```bash
cd /c/Users/19923/Desktop/review-page-skill
mkdir -p skills/subject-review-generator/modules \
         skills/subject-review-generator/templates \
         skills/subject-review-generator/scripts \
         skills/rv-data-extractor/scripts \
         skills/rv-data-checker/rules \
         skills/rv-quiz-designer/rules \
         skills/rv-answer-verifier/rules \
         skills/rv-theme-designer/tokens \
         skills/rv-web-builder/templates \
         skills/rv-module-developer/docs \
         skills/rv-page-verifier/scripts \
         skills/rv-updater/docs \
         skills/rv-bundle-export/scripts \
         samples docs/plans
```

- [ ] **步骤 2：验证目录存在**

运行：`ls -d skills/*/ | wc -l`
预期：输出 `11`。

- [ ] **步骤 3：提交（git 已在 dev/review-generator 分支）**

```bash
git add -A; git commit -m "chore: 搭建 skill 家族骨架" 2>/dev/null || echo "无变更可提交"
```

---

### 任务 2：模块运行时核心 rv-core.js

**文件：**
- 创建：`skills/subject-review-generator/modules/rv-core.js`

**接口：**
- 产生：`RV.modules` 注册表、`RV.boot(data)`、`RV.on/emit(type,payload)`、`ctx`（data/state/store/dom/event/utils）、`ctx.saveAll()`
- 消费：无（一切模块的基座，deps 为空）

**事件契约（后续模块必须遵守）：**
- `RV.emit('answer:wrong', {type:'concept'|'question', id})` — 答题答错
- `RV.emit('answer:correct', {type:'concept'|'question', id})` — 答题答对
- `RV.emit('mastery:change', {id, mastery})` — 掌握度变更
- `RV.emit('fav:toggle', {id, on})` — 收藏变更

- [ ] **步骤 1：编写 rv-core.js 完整代码**

```js
/* rv-core.js — 模块运行时核心（所有模块的地基，恒选中） */
;(function () {
  'use strict'
  window.RV = window.RV || {}
  RV.modules = {}
  RV._listeners = {}
  RV.ctx = null

  /* ---- 事件总线：模块间通信（错题本靠它监听答题结果） ---- */
  RV.on = function (type, fn) {
    ;(RV._listeners[type] = RV._listeners[type] || []).push(fn)
  }
  RV.emit = function (type, payload) {
    ;(RV._listeners[type] || []).slice().forEach(function (fn) { fn(payload) })
  }

  /* ---- 工具 ---- */
  RV.escHtml = function (str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    })
  }
  RV.el = function (html) {
    var t = document.createElement('template')
    t.innerHTML = html.trim()
    return t.content.firstChild
  }
  RV.fuzzyMatch = function (text, query) {
    if (!query) return true
    var t = String(text).toLowerCase(), q = String(query).toLowerCase(), qi = 0
    for (var i = 0; i < t.length && qi < q.length; i++) if (t[i] === q[qi]) qi++
    return qi === q.length
  }

  /* ---- 构造共享上下文 ctx ---- */
  RV.buildCtx = function (data) {
    var ctx = {
      data: data,
      state: {
        favorites: new Set(),          // conceptId
        mastery: new Map(),            // conceptId -> 掌握|熟悉|了解
        wrong: new Map()               // "type:id" -> {type,id,count}
      },
      store: {
        key: function (suffix) { return 'rv_' + suffix + '_' + data.subject },
        load: function (suffix, def) {
          try { return JSON.parse(localStorage.getItem(this.key(suffix)) || 'null') || def }
          catch (e) { return def }
        },
        save: function (suffix, val) { localStorage.setItem(this.key(suffix), JSON.stringify(val)) }
      },
      dom: {},
      event: { on: RV.on, emit: RV.emit },
      utils: { escHtml: RV.escHtml, el: RV.el, fuzzyMatch: RV.fuzzyMatch }
    }
    ;(ctx.store.load('fav', [])).forEach(function (id) { ctx.state.favorites.add(id) })
    var mast = ctx.store.load('mastery', {})
    Object.keys(mast).forEach(function (id) { ctx.state.mastery.set(id, mast[id]) })
    ctx.store.load('wrong', []).forEach(function (w) {
      ctx.state.wrong.set(w.type + ':' + w.id, w)
    })
    ctx.saveAll = function () {
      ctx.store.save('fav', Array.from(ctx.state.favorites))
      var mo = {}; ctx.state.mastery.forEach(function (v, k) { mo[k] = v })
      ctx.store.save('mastery', mo)
      ctx.store.save('wrong', Array.from(ctx.state.wrong.values()))
    }
    return ctx
  }

  /* ---- boot：deps 拓扑排序 → init → render ---- */
  RV.boot = function (data) {
    var ctx = RV.buildCtx(data)
    var order = [], visiting = {}, done = {}
    function visit(name) {
      if (done[name]) return
      if (visiting[name]) throw new Error('模块循环依赖: ' + name)
      visiting[name] = true
      var m = RV.modules[name]
      if (!m) throw new Error('未知模块: ' + name)
      ;(m.deps || []).forEach(visit)
      delete visiting[name]
      done[name] = true
      order.push(name)
    }
    Object.keys(RV.modules).forEach(visit)
    order.forEach(function (name) { var m = RV.modules[name]; if (m.init) m.init(ctx) })
    order.forEach(function (name) { var m = RV.modules[name]; if (m.render) m.render(ctx) })
    RV.ctx = ctx
    return ctx
  }
})()
```

- [ ] **步骤 2：自测 boot 逻辑（Node 模拟，不依赖浏览器）**

运行：
```bash
node -e "
global.window = { RV: {} }
require('/c/Users/19923/Desktop/review-page-skill/skills/subject-review-generator/modules/rv-core.js')
const RV = window.RV
RV.modules.a = { name:'a', deps:[], init(){}, render(){} }
RV.modules.b = { name:'b', deps:['a'], init(){}, render(){} }
RV.boot({ subject:'test', categories:[], questions:[], config:{} })
console.log('boot OK')
"
```
预期：输出 `boot OK`。

- [ ] **步骤 3：提交**

```bash
git add -A; git commit -m "feat: 模块运行时核心 rv-core"
```

---

### 任务 3：基础架构母版 frame.html + theme.css（核心资产）

**文件：**
- 创建：`skills/subject-review-generator/templates/frame.html`
- 创建：`skills/subject-review-generator/templates/theme.css`

**接口：**
- 产生：页面母版。frame.html 含 4 占位符（`/*__RV_TITLE__*/` / `/*__RV_THEME__*/` / `/*__RV_DATA__*/` / `/*__RV_MODULES__*/`）+ 固定骨架 DOM（`#appHeader / #appSidebar / #appMain / #appDetail / #sidebarMask / #detailFooter`）；theme.css 定义全部 CSS 变量 + 三栏布局 + 移动端抽屉
- 消费：assemble.js 读取替换；模块通过 `ctx.dom.xxx` 挂载到母版容器
- **约束**：母版一次性打磨永久复用，禁止为单个学科改骨架；配色全部走 CSS 变量

**提取源**（桌面 `index.html` 中药学成熟布局）：
| 母版部分 | 提取源行段 |
|---------|-----------|
| 三栏 Grid `.app` / header / sidebar / main / detail | 67-204 行 |
| 滚动条（桌面 + sidebar + detail） | 105-137 行 |
| 标题栏品牌 + 展开式搜索 + 操作区 | 269-472 行 |
| 汉堡菜单 + 移动端断点 | 165-233、421-427 行 |

- [ ] **步骤 1：阅读母版提取源的布局样式**

运行：
```bash
sed -n '67,204p' /c/Users/19923/Desktop/index.html
sed -n '269,472p' /c/Users/19923/Desktop/index.html
```
预期：读到三栏 Grid、标题栏、展开式搜索的完整成熟样式。

- [ ] **步骤 2：编写 frame.html（母版骨架）**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>/*__RV_TITLE__*/</title>
<style>
/*__RV_THEME__*/
</style>
</head>
<body>
<div class="app">
  <header class="app-header" id="appHeader">
    <button class="btn-hamburger" id="btnHamburger" aria-label="菜单">☰</button>
    <div class="header-brand"><span class="brand-icon">📚</span><span class="brand-name" id="brandName"></span></div>
    <div class="header-search-wrap" id="searchWrap"></div>
    <div class="header-actions" id="headerActions"></div>
  </header>
  <nav class="app-sidebar" id="appSidebar"></nav>
  <div class="sidebar-mask" id="sidebarMask"></div>
  <main class="app-main" id="appMain"></main>
  <aside class="app-detail" id="appDetail">
    <div class="app-detail-header" id="detailHeader">
      <div class="app-detail-title" id="detailTitle"></div>
      <div class="app-detail-actions" id="detailActions"></div>
      <button class="app-detail-close" id="detailClose" aria-label="关闭">×</button>
    </div>
    <div class="app-detail-body" id="detailBody"></div>
  </aside>
  <div class="app-detail-footer" id="detailFooter"></div>
</div>
<script>
/*__RV_DATA__*/
</script>
<script>
/*__RV_MODULES__*/
</script>
<script>
document.addEventListener('DOMContentLoaded', function () {
  var data = window.RV_DATA || { subject: '', categories: [], questions: [], config: {} }
  document.getElementById('brandName').textContent = data.subject
  RV.boot(data)
})
</script>
</body>
</html>
```

- [ ] **步骤 3：编写 theme.css（变量 + 三栏 + 响应式 + 移动端抽屉）**

核心结构（组件细节样式参照中药学模板移植，全部走变量）：

```css
/* ===== 主题变量（生成时由 ui-ux-pro-max 填充，勿硬编码学科色） ===== */
:root {
  --bg-page: #f5efe0;  --bg-card: #faf6ed;  --bg-card-hover: #fefcf7;
  --text-main: #3d2b1f; --text-light: #6b5b4f; --text-muted: #9b8b7f;
  --color-accent: #c41e3a; --color-accent-2: #8b5e3c;
  --color-correct: #2d5016; --color-wrong: #c41e3a;
  --color-gold: #d4a853; --color-gold-light: #ede0c8;
  --color-header: #3d2b1f;
  --font-heading: 'Noto Serif SC', 'SimSun', serif;
  --font-body: system-ui, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  --sidebar-w: 280px; --detail-w: 370px; --header-h: 56px;
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: var(--font-body); color: var(--text-main); background: var(--bg-page); line-height: 1.6; }

/* ===== 三栏 Grid 主体 ===== */
.app {
  display: grid;
  grid-template-columns: var(--sidebar-w) 1fr var(--detail-w);
  grid-template-rows: var(--header-h) 1fr;
  grid-template-areas: "header header header" "sidebar main detail";
  height: 100vh; overflow: hidden;
}
.app-header  { grid-area: header; background: var(--color-header); color: var(--bg-card);
               display: flex; align-items: center; padding: 0 16px; gap: 12px;
               box-shadow: 0 2px 8px rgba(0,0,0,.15); z-index: 100; position: relative; }
.app-sidebar { grid-area: sidebar; background: var(--bg-card); border-right: 1px solid var(--text-muted);
               overflow-y: auto; overflow-x: hidden; }
.app-main    { grid-area: main; padding: 24px; overflow-y: auto; }
.app-detail  { grid-area: detail; background: var(--bg-card); border-left: 1px solid var(--text-muted);
               overflow-y: auto; display: flex; flex-direction: column; }

/* ===== 标题栏 ===== */
.header-brand { display: flex; align-items: center; gap: 6px; font-family: var(--font-heading);
                font-weight: 700; font-size: 1.25rem; white-space: nowrap; }
.brand-icon { font-size: 1.5rem; line-height: 1; }
.btn-hamburger { display: none; font-size: 1.3rem; color: var(--bg-card); padding: 6px; border-radius: 6px; }
.header-actions { margin-left: auto; display: flex; align-items: center; gap: 8px; }
/* 展开式搜索（收起=放大镜按钮，展开=输入框滑出） */
.header-search-wrap { position: relative; display: flex; align-items: center; height: 34px; }
.search-trigger { display: flex; align-items: center; gap: 4px; padding: 0 14px; height: 34px;
                  border-radius: 34px; color: rgba(255,255,255,.8); background: rgba(255,255,255,.08);
                  border: 1px solid rgba(255,255,255,.15); cursor: pointer; }
.header-search-wrap input { width: 0; opacity: 0; padding: 0; border: none; outline: none;
                            transition: all .28s cubic-bezier(.4,0,.2,1); }
.header-search-wrap.expanded input { width: 220px; opacity: 1; padding: 0 12px 0 34px;
                                     height: 34px; border-radius: 34px;
                                     background: rgba(255,255,255,.16); color: var(--bg-card); }

/* ===== 滚动条 ===== */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-thumb { background: var(--color-gold); border-radius: 3px; }
* { scrollbar-width: thin; scrollbar-color: var(--color-gold) transparent; }

/* ===== 移动端抽屉 + 响应式 ===== */
.sidebar-mask { display: none; position: fixed; inset: 0; background: rgba(0,0,0,.4); z-index: 199; }
.app-detail-footer { display: none; }
@media (max-width: 1023px) {
  .app { grid-template-columns: 220px 1fr; grid-template-areas: "header header" "sidebar main"; }
  .app-detail { position: fixed; top: var(--header-h); right: 0; bottom: 0; width: min(400px, 90vw);
                z-index: 300; transform: translateX(100%); transition: transform .3s ease; }
  .app-detail.open { transform: translateX(0); }
}
@media (max-width: 767px) {
  .app { grid-template-columns: 1fr; grid-template-rows: var(--header-h) 1fr; grid-template-areas: "header" "main"; }
  .app-sidebar { position: fixed; top: 0; left: 0; bottom: 0; width: 280px; z-index: 200;
                 transform: translateX(-100%); transition: transform .3s ease; }
  .app-sidebar.open { transform: translateX(0); }
  .sidebar-mask.show { display: block; }
  .btn-hamburger { display: block; }
  .app-main { padding: 14px; padding-bottom: 76px; }
  .app-detail { width: 100%; top: 0; bottom: 0; height: 100vh; border-left: none; }
  .app-detail-footer { display: flex; position: fixed; bottom: 0; left: 0; right: 0; z-index: 305;
                        padding: 10px 16px; background: var(--bg-card); border-top: 1px solid var(--text-muted); }
  .btn-icon, .search-trigger { min-height: 40px; }   /* 触控目标 ≥40px */
}
```

组件样式（卡片 `.concept-card`、侧边栏分类树 `.sidebar-category`、掌握度徽章 `.mastery-badge`、详情内容等）从模板家族移植，统一走变量，不写死色值。

- [ ] **步骤 4：验证占位符 + 骨架结构**

运行：
```bash
grep -c "/\*__RV_" skills/subject-review-generator/templates/frame.html   # 预期 4
grep -c "id=\"appMain\"" skills/subject-review-generator/templates/frame.html  # 预期 1
grep -c "@media" skills/subject-review-generator/templates/theme.css  # 预期 >=2（1023/767 两断点）
```

- [ ] **步骤 5：提交**

```bash
git add -A; git commit -m "feat: 基础架构母版 frame.html + theme.css（三栏+标题栏+移动端抽屉）"
```

---

### 任务 4：提取 search.js + favorites.js + mastery.js

**文件：**
- 创建：`skills/subject-review-generator/modules/search.js`
- 创建：`skills/subject-review-generator/modules/favorites.js`
- 创建：`skills/subject-review-generator/modules/mastery.js`

**接口：**
- 消费：`ctx`（data/state/store/dom/event/utils）
- 产生：search 挂 `ctx.dom.searchWrap`，监听输入实时过滤；favorites 提供收藏切换 + 侧边栏计数；mastery 提供三档切换 + `mastery:change` 事件

**提取源映射表：**

| 模块 | 提取源（文件） | 函数/逻辑 |
|------|--------------|-----------|
| search.js | `index.html` | `fuzzyMatch`(9680)、`expandSearch/collapseSearch/handleSearchInput/handleSearchClear`(10862-10912) |
| favorites.js | `波普解析复习.html` | `getFavorites/isFavorited/toggleFavorite/updateFavCount`(992-1012) |
| mastery.js | `index.html` + 波普 | `masteryBadgeClass`(1038)、三档过滤、`getFilteredHerbs`(9713) masteryOnly 逻辑 |

- [ ] **步骤 1：阅读提取源**

运行：
```bash
sed -n '10862,10912p' /c/Users/19923/Desktop/index.html
sed -n '992,1040p' '/c/Users/19923/Desktop/新建文件夹/波普解析复习.html'
```

- [ ] **步骤 2：改造为接口格式**

模块统一外壳：
```js
;(function () {
  'use strict'
  if (!window.RV) return
  window.RV.modules['search'] = {
    name: 'search',
    deps: [],
    init: function (ctx) { /* 模板搜索逻辑迁入，改走 ctx */ },
    render: function (ctx) { /* 渲染搜索框，绑事件 */ }
  }
})()
```
改造规则：`document.querySelector` → `ctx.dom.xxx`；`HERB_CATEGORIES`/`KNOWLEDGE_CATEGORIES` → `ctx.data.categories`；`localStorage` 直接读写 → `ctx.store.load/save`；状态变更后 `ctx.saveAll()`。

- [ ] **步骤 3：验证注册**

运行：
```bash
node -e "
global.window={RV:null};global.document={createElement:()=>({innerHTML:'',content:{firstChild:null}}),addEventListener:()=>{}}
require('/c/Users/19923/Desktop/review-page-skill/skills/subject-review-generator/modules/rv-core.js')
;['search','favorites','mastery'].forEach(n=>{
  require('/c/Users/19923/Desktop/review-page-skill/skills/subject-review-generator/modules/'+n+'.js')
  console.log(n, window.RV.modules[n]?'registered':'MISSING')
})
"
```
预期：三个模块均 `registered`。

- [ ] **步骤 4：提交**

```bash
git add -A; git commit -m "feat: 提取 search/favorites/mastery 模块"
```

---

### 任务 5：提取 navigation.js + card-browser.js + detail-panel.js

**文件：**
- 创建：`skills/subject-review-generator/modules/navigation.js`
- 创建：`skills/subject-review-generator/modules/card-browser.js`
- 创建：`skills/subject-review-generator/modules/detail-panel.js`

**接口：**
- 产生：navigation → `ctx.dom.appSidebar` 渲染分类树，`emit('nav:select',{catId,subId})`；card-browser → `ctx.dom.appMain` 渲染概念卡，`emit('concept:select',{id})`；detail-panel → `ctx.dom.appDetail` 渲染详情 + 收藏/掌握度按钮
- 依赖：`['favorites','mastery']`

**提取源映射表：**

| 模块 | 提取源 | 函数/逻辑 |
|------|--------|-----------|
| navigation.js | `波普解析复习.html` | `renderSidebar`(1062-1108)、章节树折叠；`index.html` 移动端抽屉 `toggleMobileSidebar`(10939) |
| card-browser.js | `波普解析复习.html` | `renderConcepts`(1120-1154)、`renderMainContent`(1109) |
| detail-panel.js | `波普解析复习.html` | `renderDetail`(1266-1334)、`closeDetail`(1335)；收藏/掌握度按钮 |

- [ ] **步骤 1：阅读提取源**

运行：
```bash
sed -n '1062,1108p' '/c/Users/19923/Desktop/新建文件夹/波普解析复习.html'
sed -n '1266,1343p' '/c/Users/19923/Desktop/新建文件夹/波普解析复习.html'
```

- [ ] **步骤 2：改造为接口格式**（外壳同任务 4，deps `['favorites','mastery']`）
- [ ] **步骤 3：验证注册**（同任务 4 步骤 3 脚本，名单换这 3 个）
- [ ] **步骤 4：提交**

```bash
git add -A; git commit -m "feat: 提取 navigation/card-browser/detail-panel 模块"
```

---

### 任务 6：提取 quiz.js + guess.js（含双向随机改造）

**文件：**
- 创建：`skills/subject-review-generator/modules/quiz.js`
- 创建：`skills/subject-review-generator/modules/guess.js`

**接口：**
- 产生：quiz 基于概念 **title↔summary 双向随机互猜**，可限定章节/掌握度，emit `answer:correct/wrong`；guess 给 title 填 summary 关键词判对错，emit `answer:correct/wrong`
- 依赖：`['card-browser']`

**改造规则（重点）**：模板 `index.html` 的 Quiz 基于 `HERB_CATEGORIES` 字段互猜——**必须改为基于概念 title/summary**；`getRandomQuizHerb`(11116) 改为随机选方向；判定用子串匹配。

- [ ] **步骤 1：阅读模板 Quiz/Guess**

运行：
```bash
sed -n '11116,11478p' /c/Users/19923/Desktop/index.html   # quiz
sed -n '11480,11786p' /c/Users/19923/Desktop/index.html   # guess
```

- [ ] **步骤 2：改造为接口格式 + 双向随机**

核心出题函数：
```js
function pickQuestion(ctx, scope) {
  var cats = ctx.data.categories, pool = []
  cats.forEach(function (c) {
    if (scope && scope.catId && c.id !== scope.catId) return
    c.concepts.forEach(function (k) {
      if (scope && scope.mastery && k.mastery !== scope.mastery) return
      pool.push({ cat: c, concept: k })
    })
  })
  if (!pool.length) return null
  var pick = pool[Math.floor(Math.random() * pool.length)]
  return { cat: pick.cat, concept: pick.concept, backward: Math.random() < 0.5 }
}
```

- [ ] **步骤 3：验证双向随机存在**

运行：`grep -n "backward" skills/subject-review-generator/modules/quiz.js`
预期：≥2 处。

- [ ] **步骤 4：提交**

```bash
git add -A; git commit -m "feat: 提取 quiz/guess 并改为概念双向随机"
```

---

### 任务 7：新写 choice.js + truefalse.js + selfcheck.js

**文件：**
- 创建：`skills/subject-review-generator/modules/choice.js`
- 创建：`skills/subject-review-generator/modules/truefalse.js`
- 创建：`skills/subject-review-generator/modules/selfcheck.js`

**接口：**
- 消费：`ctx.data.questions` 中 `type==='single'|'multi'|'tf'`；按 `chapter` 过滤 + 全局混刷；作答后 emit `answer:correct/wrong`
- 依赖：choice/truefalse `['card-browser']`；selfcheck 无

- [ ] **步骤 1：编写 choice.js**

```js
;(function () {
  'use strict'
  if (!window.RV) return
  window.RV.modules['choice'] = {
    name: 'choice',
    deps: ['card-browser'],
    init: function (ctx) {
      var self = this
      ctx.event.on('view:quiz', function (opts) { self.open(ctx, opts) })
    },
    render: function (ctx) { /* 无固定 DOM，由事件触发 */ },
    open: function (ctx, opts) {
      var pool = ctx.data.questions.filter(function (q) {
        if (q.type !== 'single' && q.type !== 'multi') return false
        if (opts && opts.chapter && q.chapter !== opts.chapter) return false
        return true
      })
      /* 渲染到 ctx.dom.appMain：题干 + 选项按钮 */
    },
    check: function (ctx, q, userAns) {
      var correct = Array.isArray(q.answer)
        ? userAns.length === q.answer.length && q.answer.every(function (a) { return userAns.indexOf(a) >= 0 })
        : userAns === q.answer
      ctx.event.emit(correct ? 'answer:correct' : 'answer:wrong', { type: 'question', id: q.id })
      return correct
    }
  }
})()
```

- [ ] **步骤 2：编写 truefalse.js**（只取 `type==='tf'`，渲染「对/错」两按钮，判 `userAns === q.answer`）
- [ ] **步骤 3：编写 selfcheck.js**（显示问题 → 用户自答 → 点开标准答案对照，不判对错、不进错题本）
- [ ] **步骤 4：验证注册**

运行：
```bash
node -e "
global.window={RV:null};global.document={createElement:()=>({innerHTML:'',content:{firstChild:null}})}
require('/c/Users/19923/Desktop/review-page-skill/skills/subject-review-generator/modules/rv-core.js')
;['choice','truefalse','selfcheck'].forEach(n=>{require('/c/Users/19923/Desktop/review-page-skill/skills/subject-review-generator/modules/'+n+'.js');console.log(n, window.RV.modules[n]?'ok':'MISSING')})
"
```
预期：三个模块 `ok`。

- [ ] **步骤 5：提交**

```bash
git add -A; git commit -m "feat: 新写 choice/truefalse/selfcheck 扩展题型模块"
```

---

### 任务 8：新写 wrongbook.js（错题本）

**文件：**
- 创建：`skills/subject-review-generator/modules/wrongbook.js`

**接口：**
- 消费：`ctx.event.on('answer:wrong'/'answer:correct')`、`ctx.state.wrong`、`ctx.store`
- 产生：侧边栏「错题本」入口 + 主区错题列表（进详情/重做 + 手动删除）

- [ ] **步骤 1：编写 wrongbook.js**

```js
;(function () {
  'use strict'
  if (!window.RV) return
  window.RV.modules['wrongbook'] = {
    name: 'wrongbook',
    deps: ['favorites', 'card-browser'],
    init: function (ctx) {
      var self = this
      ctx.event.on('answer:wrong', function (p) {
        var key = p.type + ':' + p.id
        var w = ctx.state.wrong.get(key)
        if (w) { w.count++ } else { w = { type: p.type, id: p.id, count: 1 } }
        ctx.state.wrong.set(key, w)
        ctx.saveAll()
        self.render(ctx)
      })
      ctx.event.on('answer:correct', function (p) {
        var key = p.type + ':' + p.id
        if (ctx.state.wrong.delete(key)) { ctx.saveAll(); self.render(ctx) }
      })
    },
    render: function (ctx) { /* 更新侧边栏计数徽标；当前视图为错题本则重绘 */ },
    show: function (ctx) { /* 渲染错题列表到 ctx.dom.appMain */ },
    remove: function (ctx, type, id) {
      ctx.state.wrong.delete(type + ':' + id)
      ctx.saveAll()
      this.render(ctx); this.show(ctx)
    }
  }
})()
```

- [ ] **步骤 2：验证事件联动**

运行：`grep -n "answer:wrong\|answer:correct\|state.wrong" skills/subject-review-generator/modules/wrongbook.js`
预期：3 处。

- [ ] **步骤 3：提交**

```bash
git add -A; git commit -m "feat: 新写错题本 wrongbook 模块"
```

---

### 任务 9：内联拼接器 assemble.js

**文件：**
- 创建：`skills/subject-review-generator/scripts/assemble.js`

**接口：**
- 消费：`data.json`（含 `config.modules` 选中列表）、`modules/*.js`、`templates/frame.html` + `theme.css`
- 产生：单文件 `index.html`

- [ ] **步骤 1：编写 assemble.js**

```js
#!/usr/bin/env node
/* assemble.js — 内联拼接器：挑模块 → deps 拓扑排序 → 拼进母版 → 输出单文件 */
'use strict'
const fs = require('fs')
const path = require('path')
if (process.argv.length < 4) {
  console.error('用法: node assemble.js <data.json> <输出.html>')
  process.exit(1)
}
const baseDir = path.join(__dirname, '..')
const data = JSON.parse(fs.readFileSync(path.resolve(process.argv[2]), 'utf8'))
const outPath = path.resolve(process.argv[3])

const modules = {}
fs.readdirSync(path.join(baseDir, 'modules')).filter(f => f.endsWith('.js')).forEach(f => {
  modules[f.replace(/\.js$/, '')] = fs.readFileSync(path.join(baseDir, 'modules', f), 'utf8')
})
function parseDeps(src) {
  const m = src.match(/deps\s*:\s*\[([^\]]*)\]/)
  if (!m) return []
  return m[1].split(',').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean)
}
const selected = (data.config && data.config.modules) || Object.keys(modules)
const needed = new Set()
function addWithDeps(name) {
  if (needed.has(name)) return
  if (!modules[name]) throw new Error('选中模块不存在: ' + name)
  needed.add(name)
  parseDeps(modules[name]).forEach(addWithDeps)
}
selected.forEach(addWithDeps)
const order = [], visited = new Set()
function visit(name) {
  if (visited.has(name)) return
  visited.add(name)
  parseDeps(modules[name]).forEach(visit)
  order.push(name)
}
needed.forEach(visit)

let frame = fs.readFileSync(path.join(baseDir, 'templates', 'frame.html'), 'utf8')
let css = fs.readFileSync(path.join(baseDir, 'templates', 'theme.css'), 'utf8')
if (data.config && data.config.themeCss) css += '\n' + data.config.themeCss

frame = frame.replace('/*__RV_TITLE__*/', (data.subject || '复习') + ' 复习')
frame = frame.replace('/*__RV_THEME__*/', css)
frame = frame.replace('/*__RV_MODULES__*/', order.map(n => modules[n]).join('\n\n'))
frame = frame.replace('/*__RV_DATA__*/', 'window.RV_DATA = ' + JSON.stringify(data) + ';')

fs.writeFileSync(outPath, frame, 'utf8')
console.log('已生成: ' + outPath + ' (' + (fs.statSync(outPath).size / 1024).toFixed(1) + ' KB)')
console.log('包含模块: ' + order.join(', '))
```

- [ ] **步骤 2：最小样例测拼接**

运行：
```bash
node -e "const fs=require('fs');fs.writeFileSync('samples/min-data.json',JSON.stringify({subject:'测试',categories:[{id:'c1',name:'章',subcategories:[{id:'s1',name:'节'}],concepts:[{id:'k1',title:'概念',subcategory:'s1',mastery:'掌握',summary:'摘要',content:'正文',tags:[]}]}],questions:[],config:{modules:['card-browser']}}))"
node skills/subject-review-generator/scripts/assemble.js samples/min-data.json samples/min.html
grep -c "card-browser" samples/min.html
```
预期：输出 `已生成: samples/min.html`，grep ≥1。

- [ ] **步骤 3：验证未选模块不进页面**

运行：`grep -c "wrongbook" samples/min.html`
预期：`0`。

- [ ] **步骤 4：提交**

```bash
git add -A; git commit -m "feat: 内联拼接器 assemble.js"
```

---

### 任务 10：主编排 skill SKILL.md

**文件：**
- 创建：`skills/subject-review-generator/SKILL.md`

- [ ] **步骤 1：编写 SKILL.md**

```markdown
---
name: subject-review-generator
description: 学科复习网页生成器（主编排）。输入 /生成复习页 + 资料文件夹 + 学科名，编排 10 个子 skill 产出单文件复习网页。
---

# 学科复习网页生成器（主编排）

## 触发条件
用户说「生成复习页」「/subject-review-generator」「把资料做成复习网页」时启动。

## 输入
- 资料文件夹路径（必填）
- 学科名（必填）

## 输出
- 单文件 `index.html`（双击即开）+ 中间产物 `data.json` + `theme.css` + 答案修正报告

## 工作流程（严格按序）
1. 对话收集配置：学科名 / 资料路径 / 模块选择（默认全选，列出 12 模块勾选）/ 风格偏好（自由文本）
2. 调 rv-data-extractor：读资料 → 知识/习题分类 → data.json
3. 调 rv-quiz-designer：基于 isKey 必背概念出题 → questions
4. 调 rv-answer-verifier：逐题联网检索验证答案 → 修正报告
5. 调 rv-data-checker：校验 data.json，不过打回
6. 调 rv-theme-designer：调 ui-ux-pro-max → theme.css
7. 调 rv-web-builder：确认母版 + 填占位符
8. 调 rv-module-developer（按需）：提取/新写/校验模块
9. 运行 assemble.js 内联拼接 → index.html
10. 调 rv-page-verifier：跑 AC 清单 → 验证报告
11. （可选）调 rv-bundle-export 合集/导出；交付后提醒走 rv-updater

## 质量要求
- 产物必须通过 AC1-AC11 全部验收
- 每个 isKey 必背概念至少一题（AC10）
- 全部题目经联网审查、答案全对（AC11）
- 未选模块代码不出现在产物中（AC5）
- 整体架构与基础母版一致，禁止改动骨架

## 协作
- 必调子 skill：rv-data-extractor / rv-quiz-designer / rv-answer-verifier / rv-data-checker / rv-theme-designer / rv-web-builder / rv-module-developer / rv-page-verifier
- 可调：rv-bundle-export / rv-updater / superpowers-writing-plans / 需求转译
```

- [ ] **步骤 2：验证 frontmatter**

运行：`head -6 skills/subject-review-generator/SKILL.md`
预期：显示 `---` 包裹的 name + description。

- [ ] **步骤 3：提交**

```bash
git add -A; git commit -m "feat: 主编排 skill SKILL.md"
```

---

### 任务 11：SKILL.md 统一模板 + 资料类子 skill（extractor / data-checker）

**文件：**
- 创建：`skills/rv-data-extractor/SKILL.md`
- 创建：`skills/rv-data-checker/SKILL.md`

- [ ] **步骤 1：SKILL.md 统一骨架**

```markdown
---
name: rv-xxx
description: 触发词 + 一句话功能描述
---

# 技能名

## 触发条件
（独立被 /rv-xxx 调用，或由主编排调度时）

## 输入
（文件路径 / 数据格式，明确到什么字段）

## 输出
（产物文件 + 结构 + 验收点）

## 工作流程
（步骤编号，每步一个可操作动作）

## 接口契约
（data.json / 模块 / 报告 的精确字段格式）

## 质量要求
（可核验的验收点）

## 协作
（可调用的 skill/工具）
```

- [ ] **步骤 2：编写 rv-data-extractor/SKILL.md**

必含：
- 输入：资料文件夹路径
- 流程：① 递归列文件 → ② 按扩展名分发（`.pdf` 文字层抽取失败降级、`.docx` 解包 word/document.xml、`.pptx` 解包、`.md/.txt` 直读）→ ③ AI 归类「知识」→categories[]、「习题」→questions[] → ④ 概念字段严格按规格（id/title/subcategory/mastery/summary/content/tags/isKey，summary 一句话）→ ⑤ 习题字段严格按规格（id/chapter/type∈single|multi|fill|tf/stem/options/answer/explanation）→ ⑥ 输出 data.json + 解析报告
- 质量：字段无学科术语泄漏、id 全局唯一、chapter 引用存在、summary 非空
- 协作：可调 research skill / 需求转译

- [ ] **步骤 3：编写 rv-data-checker/SKILL.md**

必含校验清单：
1. 结构：subject/categories/questions 存在，categories 非空
2. 概念：id 唯一；title/summary/content 非空；subcategory 引用存在；mastery∈{掌握,熟悉,了解}；tags 数组
3. 章节引用：questions.chapter ∈ categories[].id；concept.subcategory ∈ 子分类 id
4. 题库：type∈{single,multi,fill,tf}；single/multi 有 options 且 answer 为索引(数组)；fill/tf 的 options 为空；answer 类型匹配；explanation 非空
5. 覆盖：每个 isKey:true 概念至少被一道题 chapter 关联
- 输出：校验报告，任一不过报「FAIL+原因」，打回重抽

- [ ] **步骤 4：验证两个 SKILL.md 存在**

运行：`grep -l "工作流程\|质量要求" skills/rv-data-extractor/SKILL.md skills/rv-data-checker/SKILL.md`
预期：两文件都匹配。

- [ ] **步骤 5：提交**

```bash
git add -A; git commit -m "feat: 资料解析与质检子 skill"
```

---

### 任务 12：出题与答案审查子 skill（quiz-designer / answer-verifier）

**文件：**
- 创建：`skills/rv-quiz-designer/SKILL.md`
- 创建：`skills/rv-answer-verifier/SKILL.md`

- [ ] **步骤 1：编写 rv-quiz-designer/SKILL.md**

必含：
- 输入：data.json（含 isKey 必背概念）
- 流程：① 遍历所有 isKey:true 概念建「必背清单」→ ② 每个必背概念至少一道题（优先客观题，难出则简答）→ ③ 选择题干扰项取同章节其它概念 title/summary，不重复不歧义 → ④ 判断题基于 content 改写，不篡改核心事实 → ⑤ 填空挖 summary/content 关键词 → ⑥ 每题挂 chapter
- 质量：必背覆盖率 100%（对照清单核验）；题目不造事实（内容全源自资料）
- 协作：可调 research skill 理解资料

- [ ] **步骤 2：编写 rv-answer-verifier/SKILL.md**

必含：
- 输入：data.json 的 questions 数组
- 流程（**每道题都执行，不漏一题**）：① AI 自审 → ② WebSearch 检索（取 2-3 高相关来源，复杂题 WebFetch 读原文）→ ③ 双答案对比（一致→通过；冲突→以检索为准当场改正+记录）→ ④ 客观题逐题检索，简答核对要点
- 输出：data.json 修正版 + `answer-audit.md`（题号/原答案/新答案/检索来源/修正原因）
- 质量：**全部题目被检索**（报告逐题列出状态，0 漏网）；修正后答案准确率 100%（复核抽查）
- 协作：必须用 WebSearch/WebFetch；可调 research skill / 需求转译

- [ ] **步骤 3：验证关键指令**

运行：`grep -l "WebSearch\|联网" skills/rv-answer-verifier/SKILL.md`
预期：匹配。

- [ ] **步骤 4：提交**

```bash
git add -A; git commit -m "feat: 出题与答案审查子 skill"
```

---

### 任务 13：构建类子 skill（theme-designer / web-builder / module-developer）

**文件：**
- 创建：`skills/rv-theme-designer/SKILL.md`
- 创建：`skills/rv-web-builder/SKILL.md`
- 创建：`skills/rv-module-developer/SKILL.md`

- [ ] **步骤 1：编写 rv-theme-designer/SKILL.md**

必含：输入学科名 + 自由文本风格偏好 → 调 ui-ux-pro-max → 映射到 theme.css 的 16 个 CSS 变量；约束：只填变量值不改布局骨架，正文可读性（对比度）达标；输出 theme.css 变量覆盖段。

- [ ] **步骤 2：编写 rv-web-builder/SKILL.md**

必含：输入 data.json + theme.css → 读母版 frame.html + theme.css 填占位符 → 输出骨架产物；约束：**不得改动母版骨架结构**，只替换占位符与变量值。

- [ ] **步骤 3：编写 rv-module-developer/SKILL.md**

必含：① 先查模块库可复用/提取（模板家族 7 份为最大来源）→ ② 新写遵循接口 `{name,deps,init,render}` → ③ deps 必须在模块库存在、禁循环 → ④ 跑 node 注册冒烟 → ⑤ 可调 code-review；质量：无外部依赖、无学科术语硬编码、注释中文。

- [ ] **步骤 4：验证存在**

运行：`ls skills/rv-{theme-designer,web-builder,module-developer}/SKILL.md`
预期：3 文件都在。

- [ ] **步骤 5：提交**

```bash
git add -A; git commit -m "feat: 构建类子 skill（主题/架构/模块）"
```

---

### 任务 14：验证维护导出类子 skill（page-verifier / updater / bundle-export）

**文件：**
- 创建：`skills/rv-page-verifier/SKILL.md`
- 创建：`skills/rv-updater/SKILL.md`
- 创建：`skills/rv-bundle-export/SKILL.md`

- [ ] **步骤 1：编写 rv-page-verifier/SKILL.md**

必含 AC1-AC11 全项验收清单（每项 PASS/FAIL）：
AC1 三栏布局正常渲染 / AC2 全模块功能可用 / AC3 两学科主题不同 / AC4 localStorage 不串 / AC5 未选模块不进产物 / AC6 移动端抽屉 / AC7 题库 type 枚举 + answer 类型匹配 / AC8 选择题干扰项同章节 / AC9 错题本收录删除手动删 / AC10 必背概念全覆盖 / AC11 答案审查全过+报告在
输出：验证报告 PASS/FAIL 清单。

- [ ] **步骤 2：编写 rv-updater/SKILL.md**

必含：diff 新旧资料 → 只重抽变化章节 → 复用未变部分 → 新题重跑答案审查 → 重拼；二次定制：改主题重跑 theme-designer / 加减模块改 config.modules 重拼 / 改数据直接编辑 data.json 重拼。

- [ ] **步骤 3：编写 rv-bundle-export/SKILL.md**

必含：多学科合集导航（读多份 data.json 生成入口页）；导出：打印样式（@media print）导错题本/知识点清单，引导浏览器打印为 PDF。

- [ ] **步骤 4：验证 + 提交**

运行：`ls skills/rv-{page-verifier,updater,bundle-export}/SKILL.md && git add -A && git commit -m "feat: 验证/维护/导出子 skill"`

---

### 任务 15：样例资料跑通流水线 + 验证

**文件：**
- 创建：`samples/样例资料.md`（真实学科资料：3 章 × 每章 3-4 个 isKey 知识点 + 5 道以上客观题素材）
- 创建：`samples/data.json`、`samples/index.html`、`samples/answer-audit.md`

- [ ] **步骤 1：编写样例资料**
`samples/样例资料.md`：真实学科（如「计算机基础」），含 title/summary/content 素材 + 可转客观题的习题素材。

- [ ] **步骤 2：跑完整流水线**（模拟主编排：extractor → quiz-designer → answer-verifier → data-checker → 拼接）
运行：`node skills/subject-review-generator/scripts/assemble.js samples/data.json samples/index.html`

- [ ] **步骤 3：脚本类验收**

运行：
```bash
grep -c "window.RV_DATA" samples/index.html          # ≥1
grep -c "wrongbook" samples/index.html                # ≥1
node -e "
const d=require('./samples/data.json')
const types={}; d.questions.forEach(q=>types[q.type]=(types[q.type]||0)+1)
console.log('题型分布', types)
const keys=new Set()
d.categories.forEach(c=>c.concepts.filter(k=>k.isKey).forEach(k=>keys.add(k.id)))
const covered=new Set()
d.questions.forEach(q=>{const c=d.categories.find(x=>x.id===q.chapter); if(c)c.concepts.forEach(k=>{if(k.isKey)covered.add(k.id)})})
console.log('必背概念', keys.size, '被章节覆盖', covered.size)
"
```
预期：题型分布含 ≥3 种；必背概念全覆盖（AC10）。

- [ ] **步骤 4：浏览器人工核验**
双击 `samples/index.html`：三栏渲染、导航、搜索、收藏、掌握度、错题本（故意答错再重刷答对验证自动删除）、移动端缩放抽屉。

- [ ] **步骤 5：修复并回归**
发现问题 → 修对应模块 → 重跑 assemble → 重验 → 提交：
```bash
git add -A; git commit -m "fix: 流水线验证修复"
```

---

### 任务 16：部署 11 个 skill 到 .claude/skills/ + 清理

- [ ] **步骤 1：复制 11 个 skill**

```bash
cd /c/Users/19923/Desktop/review-page-skill
for d in skills/*/; do
  cp -r "$d" /c/Users/19923/.claude/skills/$(basename "$d")/
done
```

- [ ] **步骤 2：验证部署**

运行：`ls /c/Users/19923/.claude/skills/ | grep -E "subject-review-generator|rv-" | sort`
预期：11 个 skill 目录都在。

- [ ] **步骤 3：清理与归档**
- 保留 `samples/index.html` 作样例，其余临时文件归档到 `review-page-skill/archive/`
- 桌面 `review-page-skill` 是否删除由用户决定；删除前确认所有 skill 已部署
- 提交最终 commit：
```bash
git add -A; git commit -m "feat: 部署 11 工位 skill 家族并清理"
```

---

## 自检

- **规范覆盖**：设计文档 3.1 目录 → 任务 1/10-14；3.2 流水线 → 任务 15；3.3 数据模型 → 任务 2/7；3.4 接口 → 任务 2；3.5 出题与审查 → 任务 6/7/12；3.7 持久化 → 任务 2；3.9 错题本 → 任务 8；**3.10 基础架构母版 → 任务 3**；验收 AC1-AC11 → 任务 15
- **占位符扫描**：无 TBD/TODO/「类似任务 N」；提取类任务给明确源文件与行号
- **类型一致性**：统一 `concept`（非 item/条目）、`questions[]`（非 questionBanks）、`chapter`（非 catId）、`type ∈ single/multi/fill/tf`；`ctx` 签名全程一致
