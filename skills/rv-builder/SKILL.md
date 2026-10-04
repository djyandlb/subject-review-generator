---
name: rv-builder
description: 网页构建。整合主题与架构：①调 ui-ux-pro-max 现搓主题（CSS 变量）②检测基础模板/母版双模式产出网页框架，一次调用完成。
---
> **护栏必读**：执行前先读家族根护栏 `<review-page-skill>/docs/GUARDRAILS.md`——**家族根 = 名为 `review-page-skill` 的目录（含 docs/ 与 samples/），从当前 skill 目录向上逐级查找**（用户级安装：`~/.claude/skills/review-page-skill/`；桌面仓库：`Desktop/review-page-skill/`）——≤12 条精炼规则快速过一遍，成长内容（护栏/演进）靠它生效，不读会重蹈历史错误

# 网页构建（rv-builder）

> 由原 `rv-theme-designer`（主题配色）与 `rv-web-builder`（骨架/模板架构）**整合**而成：一次调用同时产出主题与网页框架，减少一次调度。

## 触发条件

- 主编排第 8 步（数据校验通过后）
- 独立调用：`/rv-builder` + 学科名 + 风格偏好 + data.json

## 输入（遵循工作目录契约）

- 学科名 + 自由文本风格偏好（如「清爽现代」「古籍质感」）
- `data.json`（subject 用于标题；categories 用于识别模板兼容性）

## 输出

- `xxx/<学科名>/theme.css`（主题变量覆盖段）
- 网页框架（模式 A 模板路径 / 模式 B 母版骨架）

## 工作流程

### ① 主题（原 rv-theme-designer）

1. **调 ui-ux-pro-max**：输入学科 + 风格偏好 → 配色方案（主/辅/文字/背景/强调色）+ 字体搭配
2. **映射 CSS 变量**：逐一填充 `--bg-page / --bg-card / --text-main / --text-light / --color-accent / --color-master / --color-familiar / --color-understand / --color-header / --font-heading / --font-body` 等
3. **自检对比度**：正文/背景 ≥4.5:1（WCAG AA）
4. 写 `xxx/<学科名>/theme.css`（变量覆盖段）

### ② 架构（原 rv-web-builder）—— 模板为主

**模式 A · 模板填充（编译网页的主方式，默认）**：
1. 检测基础模板——**优先用主编排第 1 步已预置的 `xxx/data/sample/基础模板-复习页-v3.html`**（确认含 `<!-- RV-TEMPLATE -->` 且为 **v3 Soft UI**：`--elev-card` / `QUESTION_BANK` 六键）；若缺失，从家族根 `<review-page-skill>/samples/基础模板-复习页-v3.html`（或主编排 `./samples/`）复制；v3 缺失即视为技能安装不完整，应重新执行 `install.sh` 恢复
2. 识别结构：`KNOWLEDGE_CATEGORIES` + `QUESTION_BANK`（六键）、`:root` Soft UI elev/8pt、品牌占位 `{{学科名}}/{{副标题}}/{{学科图标}}`、交互契约见 `samples/TEMPLATE-v3.md`
3. **确认 v3 副本已就位**；若不存在才从家族根/主编排 samples 复制
4. **在副本上按需应用增强**（见下方「模板增强流程」）——**总体模板 `samples/` 永不改动**，保持干净 v3 骨架
5. 返回副本模板路径 → 主编排第 9 步用 `fill-template.js` 注入数据
6. **无模板时**：提示用户重新执行 `install.sh` 恢复 v3 模板；确认模板确实不可用时才走模式 B（模块化装配）

**模板增强流程（防遗忘铁律）**：
- **总体模板 = 永久干净空壳骨架**（无学科数据、无 btnEnhance）：默认 `samples/基础模板-复习页-v3.html`（v3 Soft UI）只含基础能力，**任何头脑风暴新增强都不许直接改它**，否则 JS 越积越多、模板越来越臃肿，其他学科被迫背上全部历史代码
- **增强发生在学科副本**：复制模板到 `xxx/data/sample/`，在该副本上改，产物从副本生成
- **一键应用增强**：`node <同级skill:rv-builder>/scripts/patch-enhance.js <副本路径> [--theme <css>]`（patch-enhance.js 在本 skill 自带 `./scripts/` 内）
  - 自动应用：①修掌握度徽章 bug ②动态题型入口（0 题隐藏）③增强解析（对比表/树/流程/速记卡 + **stripEnhanceMarkers 去重**）④增强入口按钮（header「🎯速览」）⑤增强聚合视图（renderMainEnhance）⑥移动端触控优化（≥40px）
  - 可选 `--theme`：覆盖 `:root` 主题（配色走 CSS 变量）
  - **幂等**：有 `<!-- ENH-* -->` 标记守卫，重复运行不重复注入
- **数据约定**（增强解析识别，写入 concept.content；**硬性规范——生成方 rv-content-refiner 必须严格按此格式，格式不符则不渲染**）：
  - `【对比表:甲 vs 乙】` + `- 键 | 左值 | 右值` 行 → 对比表
  - `【树:标题】` + `- 根` / `-- 子` 缩进 → 分类树（**禁箭头式 `- 根 → 子`**，解析器按连字符层级读）
  - `【流程:标题】` + `步骤1 → 步骤2` → 流程链
  - `【速记:标题】` + `- 问题 → 答案` 分行问答 → 速记卡（**禁单句无分隔**，否则行被丢弃）
  - **块内分隔必须真换行 `\n`，禁 `<br>`**（剥标签成空格 → 行被压成单行）；流程标题后须换行 `】\n`
  - **标记原文会被 stripEnhanceMarkers 从正文剥离**，只由增强卡渲染一次（不重复显示）
- **章节排序在数据层完成**（解析阶段 `<同级skill:rv-data-extractor>/scripts/renumber-chapters.js` 拉通连续编号）：`categories[]` 数组顺序 = 资料章节实际顺序，前端 renderKnowledgeSidebar **直接按数组渲染，不二次排序**（sortCategoriesByOrder 已废弃移除）
- **主题覆盖必须保留全部变量**：覆盖 `:root` 时若省掉某变量会静默失效（漏 `--transition-*` → 动画失效；漏 `--elev-*`/`--space-*` → v3 Soft UI 塌陷）。覆盖前核对模板全部 `var(--*)`；契约见 `samples/TEMPLATE-v3.md`

**模式 B · 模块化（仅无模板时的兜底）**：
1. 读母版 `<同级skill:subject-review-generator>/templates/frame.html` + `<同级skill:subject-review-generator>/templates/theme.css`（主编排 skill 自带母版，一次性打磨、永久复用）
2. 确认 4 个占位符 `/*__RV_TITLE__*/` `/*__RV_THEME__*/` `/*__RV_DATA__*/` `/*__RV_MODULES__*/`
3. 合并主题（母版默认 + ①覆盖段，覆盖段在后）→ 返回骨架

## 质量要求

- **模板/母版结构禁止改动**：三栏 Grid / 标题栏 / 移动端抽屉 / v3 筛选轨与卡片过渡 / RV-TEMPLATE 标记原样保留；勿把掌握度竖线改回圆点药丸
- **总体模板 `samples/` 永不改**：默认骨架 `基础模板-复习页-v3.html`；所有增强只在 `xxx/data/sample/` 副本上做（防臃肿铁律）
- **主题走 CSS 变量**，不硬编码学科色；覆盖 `:root` 保留模板全部变量（含 elev/space）
- 模式 A 产物无占位残留且仍含 `--elev-card`；模式 B 骨架占位符完整

## 协作

- 主题：必调 `ui-ux-pro-max`
- 产出交给主编排第 9 步（模式 A → fill-template.js；模式 B → assemble.js）
- 可调 `frontend-design` 做细节视觉复核
