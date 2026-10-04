# RV-TEMPLATE v3 Soft UI · 契约说明

> 主模板文件：`samples/基础模板-复习页-v3.html`  
> 识别标记：`<!-- RV-TEMPLATE: ... v3 Soft UI ... -->`  
> 填充脚本：`scripts/fill-template.js`  
> **铁律：模板是空壳，不含任何学科知识点/题库数据**（仅注释示例 + 空数组）。真实数据只由 `fill-template.js` 注入产物。

## 何时使用

主编排第 1 步预置、第 8–9 步增强与填充时，**优先且默认**使用本模板。  
旧版 `基础模板-微生物学.html`（v1）仅作兼容回退，新学科不要再预置 v1。

## 数据契约（与 fill-template 对齐）

| 占位 | 说明 |
|------|------|
| `KNOWLEDGE_CATEGORIES` | **模板内 = `[]`（仅结构注释）**；填充后：章节 → 子分类 → 概念；`concept.subcategory` = 子分类 **id** |
| `QUESTION_BANK` | **模板内六键皆 `[]`**；填充后：`choice/multi/truefalse/fill/terminology/essay`（空数组自动隐藏入口） |
| `{{学科名}}` / `{{副标题}}` / `{{学科图标}}` | 品牌占位（产物不得残留 `{{`） |
| `STORAGE_FAV` / `STORAGE_WRONG` / `STORAGE_PROGRESS` | 填充时按学科 slug 隔离 |

`fill-template.js` 会为概念补 `subcategoryKey`（`章节id/子分类id`）与 `subcategoryName`。

### 禁止写入模板的内容

- 真实章节/概念/题干/选项/解析
- 某学科专属文案
- 已填充演示数据集（演示用独立 `*-演示预览.html`）
- 预置 `btnEnhance` / 速览（由 `patch-enhance.js` 注入）

## 视觉 / 交互契约（打磨与主题覆盖时勿破坏）

1. **Soft UI elevation**：保留 `--elev-1..4`、`--elev-card`、`--elev-card-hover`
2. **8pt 间距**：保留 `--space-1..5`
3. **掌握度线条语言**：卡片右上 3/2/1 竖线淡出；筛选轨同构竖线
4. **筛选轨**：`.mastery-filters` + `.mastery-pill` 滑块
5. **列表过渡**：`transitionKnowledgeList` — `.is-leaving` → `.is-entering` **25ms** 错峰；禁止无过渡整栏重渲
6. **收藏**：局部 `syncFavoriteStars`；收藏按钮 toggle
7. **选中态**：描边 + 顶边色条 + 标题色
8. **章节默认折叠** + `STORAGE_PROGRESS`
9. **侧栏**：知识点 `#sidebarTree` 与题目 `.sidebar-question-tabs` **同缩进**（`padding:0 var(--space-4)`）；`.app` 用 `grid-template-rows: var(--header-height) minmax(0,1fr)`；`.app-sidebar` 设 `min-height:0; overflow-y:auto`（**侧栏自身滚动**；列表勿再套 overflow 掐死）；章节展开 `max-height:2400px`（禁 `none`）；点小节点保持展开并高亮
10. **卡片网格**：最多 4 列；`grid-auto-rows:168px`；卡片 `grid-template-rows:auto minmax(0,1fr) auto`；概述**禁止滚动条**；超长 `overflow:hidden` + **末行末尾数个字渐隐**（右下角窄条 `::after`，禁止整行 fade）
11. **知识壳检测**：`hasShell` = `.main-header` **且** `.mastery-filters`
12. **增强 CSS 双轨**：`.enh-cmp*` + `.cmp-*` 必须同时有样式

## 增强注入（patch-enhance，非模板本体）

- Header「🎯 速览」由 `patch-enhance.js` 注入，勿手写进空模板
- 速览与收藏同构：点一次进入 / 再点返回（`_enhanceReturnMode` + `.btn-enhance.active`）
- 点收藏、切模式、点章节/小节点时退出速览
- 速览卡片同样用 header/summary/footer 三行结构

## 主题覆盖（rv-builder）

- 覆盖 `:root` 前扫全量 `var(--*)`，保留 elev/space/ease
- 禁止删 elev、改三栏骨架、去掉 RV-TEMPLATE 标记、往模板塞学科数据

## 验收速查

```bash
node samples/test-template.js samples/基础模板-复习页-v3.html
node scripts/fill-template.js samples/基础模板-复习页-v3.html <data.json> <out.html>
```

- 模板：无真实对象；六键 `[]`；无 `btnEnhance`；含 `minmax(0,1fr)`、`.app-sidebar` overflow-y:auto、卡片末字渐隐
- 产物无 `{{`；含 `--elev-card`、`transitionKnowledgeList`
