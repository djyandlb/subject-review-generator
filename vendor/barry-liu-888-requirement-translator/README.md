# requirement-translator（需求转译器）

将主观模糊的产品需求转换为结构化、可测试的 AI 执行规格。
自动识别缺失信息、隐含假设、约束条件、验收标准、风险和实现顺序。

---

## Skillstore 安装回执

本文件由 Skillstore.io 为可安装构件生成。
技能的运行时指令见 SKILL.md。

技能页面：skillstore.io/skills/barry-liu-888-requirement-translator

## 安装目录结构

通过 Skillstore CLI 安装后，本文件夹为技能的标准副本：

```text
~/.agents/skills/barry-liu-888-requirement-translator/
```

各 Agent 位置应指向该标准副本：

| Agent | 期望位置 |
|-------|----------|
| Codex | `~/.agents/skills/barry-liu-888-requirement-translator/` |
| Claude Code | `~/.claude/skills/barry-liu-888-requirement-translator/`（符号链接至 `~/.agents/skills/barry-liu-888-requirement-translator/`） |

推荐安装命令：

```bash
npx skillstore add barry-liu-888-requirement-translator
```

手动安装时，先将技能文件夹放置于 `~/.agents/skills/barry-liu-888-requirement-translator/`，再将 Agent 专用目录链接至该位置。

## 技能元数据

| 属性 | 值 |
|------|-----|
| **名称** | requirement-translator |
| **标识符** | barry-liu-888-requirement-translator |
| **版本** | 1.0.0 |
| **作者** | Barry-Liu-888 |
| **市场来源** | aiskillstore/marketplace:c4231f0153ccd2a2ed62274c5a372bf8f2386d3f |
| **源路径** | skills/barry-liu-888/requirement-translator |

## 支持的 Agent

- Claude
- Codex
- Claude Code

## 注意事项

- 不要只移动 Claude Code 的符号链接目标；请更新 `~/.agents/skills/barry-liu-888-requirement-translator/` 下的标准文件夹
- 重新安装或更新此技能时，Skillstore 可能会替换本回执文件
- 安装前已通过 Skillstore 清单验证构件完整性

---

由 Skillstore.io 生成。
