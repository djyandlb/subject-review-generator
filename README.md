# 学科复习网页生成器 · Skill 家族

把任意学科资料（PDF / Word / PPT / Markdown / 纯文本）转换为可交互的单文件复习网页。产出物为单个 `index.html`，双击即开、零部署、无外部前端依赖。

本仓库是面向 Claude Code（及兼容 skill 机制的其他 AI 客户端）的一套技能家族，包含 1 个主编排技能、11 个工位子技能、19 个可插拔页面模块，以及运行所需的第三方依赖技能。

---

## 一、工作流

主编排技能按固定顺序调度各工位，从原始资料到成品网页：

```
/subject-review-generator <资料文件夹> <学科名>
```

| 步骤 | 工位 | 职责 |
|------|------|------|
| 0 | 主编排 | 读护栏、收集配置、建目录 |
| 1 | 主编排 | 预置默认模板副本 |
| 2 | `rv-doc-extractor` | 资料解析清洗，产出 `*_clean.txt` + `parse-report.md` |
| 2 | `rv-data-builder` | 建模归类，产出 `data.json` |
| 3 | 主编排 | 模块决策 + 风格偏好（一次性收集） |
| 4 | `rv-content-refiner` | 概念卡内容结构化 + 增强标记 |
| 5 | `rv-quiz-designer` | 出题（必背考点全覆盖 + 实质解析） |
| 6 | `rv-answer-verifier` | 逐题双源验证答案 |
| 7 | `rv-verifier` | 阶段①：`data.json` 结构校验 |
| 8 | `rv-builder` | 主题构建 + 模板填充 |
| 9 | 主编排 | 装配成品网页 |
| 10 | `rv-verifier` | 阶段②：页面验收 |
| 11 | `rv-polisher` | 深度彻查与优化 |
| 12 | 主编排 | 演进记录归档 |

---

## 二、技能清单

### 主编排（1 个）

| 技能 | 职责 |
|------|------|
| `subject-review-generator` | 全流程编排，串联全部子技能，产出单文件复习网页 |

### 工位子技能（11 个）

| 技能 | 职责 |
|------|------|
| `rv-doc-extractor` | 多格式文档解析 → 清洗 → 提取完整性机器校验，产出干净文本 |
| `rv-data-builder` | 通读清洗文本，归类知识点与习题，概念卡提取 → 去重 → 章节编号 → 校验 |
| `rv-content-refiner` | 统筹全部概念卡重排段落结构，识别并添加增强标记（对比表 / 分类树 / 流程 / 速记） |
| `rv-quiz-designer` | 基于必背知识点出题，六类题型，挂章节 |
| `rv-answer-verifier` | 逐题双源对比验证（外部检索 / 资料原文），答案-题干匹配校验 |
| `rv-builder` | 主题构建（CSS 变量）+ 模板 / 母版双模式框架产出 |
| `rv-verifier` | 数据校验 + 页面验收 AC1-AC12，输出 PASS/FAIL 报告 |
| `rv-polisher` | 生成网页后的必做优化：彻查 UI/UX 与 bug，美化打磨 |
| `rv-bundle-export` | 多学科合集导航；错题本 / 知识点清单导出为打印版 HTML 或 PDF |
| `rv-module-developer` | 新模块开发，自动审查并登记进 `manifest.json` 永久入库 |
| `rv-updater` | 资料变更后的增量重建；已生成网页的二次定制 |

---

## 三、页面模块库（19 个）

模块是页面增强能力的最小单元，统一 `RV.modules` 接口 + 事件总线，通过 `manifest.json` 登记，写一次即可跨学科复用。

| 模块 | 用途 | 模块 | 用途 |
|------|------|------|------|
| `rv-core` | 核心运行时 | `duel` | 鉴别挑战 |
| `navigation` | 章节导航 | `wrongbook` | 错题本 |
| `detail-panel` | 详情面板 | `flashcard` | 速记卡 |
| `card-browser` | 卡片流浏览 | `comparison` | 对比速查表 |
| `search` | 全文检索 | `tree` | 分类树 / 流程 |
| `mastery` | 掌握度分级 | `favorites` | 收藏 |
| `choice` | 单选题 | `truefalse` | 判断题 |
| `guess` | 猜词题 | `selfcheck` | 自测 |
| `quiz` | 综合测验 | `lesion-card` | 病变卡片 |
| `stage-timeline` | 分期时间轴 | — | — |

---

## 四、目录结构

```
subject-review-generator/
├── README.md                # 项目说明
├── install.sh               # 一键安装脚本
├── .gitignore
├── .gitattributes
├── skills/                  # 12 个技能本体
│   ├── subject-review-generator/     # 主编排
│   │   ├── SKILL.md
│   │   ├── modules/         #   19 个模块 + manifest.json
│   │   ├── scripts/         #   assemble / fill-template / check-module / gen-manifest / list-modules
│   │   ├── templates/       #   母版 frame.html + theme.css
│   │   ├── docs/            #   家族根数据源：GUARDRAILS / EVOLUTION / plans / specs
│   │   └── samples/         #   家族根数据源：v3 模板 + 模板契约 + 示例数据 + 测试脚本
│   ├── rv-doc-extractor/    #   含 scripts/：extract-any.py / clean-text.js / check-extraction.js 等
│   ├── rv-data-builder/     #   含 scripts/：check-categories / check-enhance / check-explanation / dedup-questions / renumber-chapters
│   ├── rv-content-refiner/  #   含 scripts/：export-content.js
│   ├── rv-builder/          #   含 scripts/：patch-enhance.js
│   ├── rv-verifier/         #   含 scripts/：test-boot.js / render-compare.js
│   └── rv-quiz-designer/ rv-answer-verifier/ rv-polisher/ \
│       rv-bundle-export/ rv-module-developer/ rv-updater/
└── vendor/                  # 10 个第三方依赖技能
```

> `docs/` 与 `samples/` 在仓库内只保留一份，位于主编排技能目录下。安装时由 `install.sh` 复制为家族根 `~/.claude/skills/review-page-skill/`，仓库中不另存副本。

---

## 五、第三方依赖（vendor/）

以下技能为家族运行所需，已随仓库打包。安装时与自有技能一同铺入技能目录。

| 技能 | 用途 | 使用方 |
|------|------|--------|
| `ui-ux-pro-max` | 配色与字体方案生成 | `rv-builder`（必调） |
| `recheck` | 网页 UI/UX/Bug 深度彻查 | `rv-polisher`（必调） |
| `frontend-design` | 视觉细节复核 | `rv-builder`、`rv-polisher` |
| `research` | 领域概念辅助理解 | 多个工位（可选） |
| `barry-liu-888-requirement-translator` | 需求规格化转译 | `rv-data-builder`、`rv-doc-extractor`、主编排 |
| `superpowers-systematic-debugging` | Bug 系统化定位 | `rv-module-developer`、`rv-polisher` |
| `superpowers-writing-plans` | 实现计划编写 | 主编排 |
| `slides` | 排版辅助 | `rv-bundle-export` |
| `doc-writer` | 文档排版辅助 | `rv-bundle-export` |
| `code-review` | 代码审查 | `rv-module-developer`、`rv-polisher` |

> `ui-ux-pro-max` 内含本地检索数据库（约 3.5 MB），为仓库体积的主要来源。其上游包镜像目录 `src/` 与测试套件 `scripts/tests/` 已移除——运行时数据由 `scripts/core.py` 的 `DATA_DIR = Path(__file__).parent.parent / "data"` 指向顶层 `data/`，与 `src/` 无关。

---

## 六、安装

### 1. 运行安装脚本

```bash
# Windows 请在 Git Bash 中运行
bash install.sh
```

脚本执行三件事，保证技能内的相对路径锚点全部可解析：

1. 家族根 → `~/.claude/skills/review-page-skill/`（放置 `docs/` 与 `samples/`）
2. 12 个技能 → `~/.claude/skills/` 顶层
3. 第三方依赖 → `~/.claude/skills/` 顶层

**家族根目录名必须为 `review-page-skill`**：各子技能通过逐级向上查找该名称的目录来定位护栏与模板。

可用环境变量覆盖安装目标：

```bash
SKILL_DIR=/path/to/skills bash install.sh
```

### 2. 安装环境依赖

| 依赖 | 版本 | 用途 | 检查命令 |
|------|------|------|----------|
| Node.js | ≥ 14 | 全部 JS 脚本（组装 / 填充 / 校验 / 去重） | `node -v` |
| Python 3 | ≥ 3.8 | 资料解析脚本 | `python --version` |
| pymupdf | 较新版本 | PDF 主解析 | `pip show pymupdf` |
| python-docx | 任意 | Word `.docx` 解析 | `pip show python-docx` |
| python-pptx | 任意 | PPT `.pptx` 解析 | `pip show python-pptx` |
| pdftotext | 任意 | PDF 备选解析（poppler-utils） | `pdftotext -v` |
| antiword | 任意 | 老式 `.doc` 解析 | `antiword` |

```bash
pip install pymupdf python-docx python-pptx
```

所有 JS 脚本仅使用 Node 内置模块（`fs` / `path` / `vm` / `child_process`），无 npm 依赖。

### 3. 卸载

删除 `~/.claude/skills/` 下的 `review-page-skill/`、12 个技能目录与 `vendor/` 内的 10 个目录即可。

---

## 七、使用

```
/subject-review-generator <资料文件夹绝对路径> <学科名>
```

示例：

```
/subject-review-generator D:\病理学资料 病理学
```

产物结构：

```
D:\病理学资料\
├── data/                    # 中间数据（raw / processed / sample / temporary）
└── 病理学\
    ├── index.html           # 成品：双击即开的复习网页
    ├── answer-audit.md      # 答案审查报告
    └── polish-report.md     # 优化报告
```

---

## 八、数据模型

```json
{
  "subject": "学科名",
  "categories": [{
    "id": "c1", "name": "章节",
    "subcategories": [{ "id": "s1", "name": "小节" }],
    "concepts": [{
      "id": "k1", "title": "知识点",
      "mastery": "掌握|熟悉|了解",
      "summary": "一句话摘要",
      "content": "结构化 HTML",
      "isKey": true
    }]
  }],
  "questions": [{
    "id": "q1", "type": "single|multi|fill|tf",
    "stem": "题干", "options": [], "answer": 0, "explanation": "解析"
  }],
  "config": { "modules": ["rv-core", "duel", "wrongbook"] }
}
```

### 模块接口

```js
RV.modules['模块名'] = { name, deps: [...], init(ctx), render(ctx) }
// ctx 提供 data / state / store / dom / event / utils
// DOM 操作一律经 ctx.dom，禁止直接 getElementById
// 模块间通信走事件总线：answer:wrong / concept:select / quiz:launch 等
```

---

## 九、成长机制

- **`docs/GUARDRAILS.md`**：当前生效的护栏清单（≤12 条），执行前必读，防止历史错误复发。
- **`docs/EVOLUTION.md`**：演进档案。每次使用发现的问题按分层策略沉淀——可机器校验的固化进脚本，可提炼的更新护栏，其余归档。

---

## 十、文件索引

| 路径 | 内容 |
|------|------|
| `skills/subject-review-generator/docs/GUARDRAILS.md` | 护栏清单 |
| `skills/subject-review-generator/docs/EVOLUTION.md` | 演进档案 |
| `skills/subject-review-generator/docs/specs/2026-07-31-subject-review-generator-design.md` | 设计规格 |
| `skills/subject-review-generator/docs/plans/2026-07-31-subject-review-generator-implementation.md` | 实现计划 |
| `skills/subject-review-generator/SKILL.md` | 主编排技能定义 |
| `skills/subject-review-generator/samples/TEMPLATE-v3.md` | v3 模板契约 |
