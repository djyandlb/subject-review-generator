---
name: slides
description: "创建战略性的 HTML 演示文稿。集成 Chart.js 图表、设计 Token 和响应式布局。"
argument-hint: "[topic] [slide-count]"
metadata:
  author: claudekit
  version: "1.0.0"
---

# 演示文稿

带数据可视化的战略性 HTML 演示文稿设计。

## 使用时机

- 营销演示和路演文稿
- 基于 Chart.js 的数据驱动演示
- 战略性幻灯片设计与布局模式
- 优化文案的演示文稿内容

## 子命令

| 子命令 | 说明 | 参考 |
|--------|------|------|
| `create` | 创建战略性演示文稿 | `references/create.md` |

## 参考资料（知识库）

| 主题 | 文件 |
|------|------|
| 布局模式 | `references/layout-patterns.md` |
| HTML 模板 | `references/html-template.md` |
| 文案公式 | `references/copywriting-formulas.md` |
| 幻灯片策略 | `references/slide-strategies.md` |

## 路由

1. 从 `$ARGUMENTS` 解析子命令（第一个单词）
2. 加载对应的 `references/{subcommand}.md`
3. 使用剩余参数执行
