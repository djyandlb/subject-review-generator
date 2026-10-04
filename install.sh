#!/usr/bin/env bash
# install.sh — 安装「学科复习网页生成器」技能家族到 Claude Code 用户级技能目录
#
# 用法：
#   bash install.sh                          # 安装到 ~/.claude/skills
#   SKILL_DIR=/path/to/skills bash install.sh   # 指定安装目标
#
# Windows 请在 Git Bash 中运行本脚本。
#
# 安装内容：
#   ① 家族根 review-page-skill/  （docs 护栏 + samples 模板）——各子技能向上查找的解析锚点
#   ② 12 个技能               → $SKILL_DIR/
#   ③ vendor/ 第三方依赖      → $SKILL_DIR/
#
# 安装后结构：
#   $SKILL_DIR/
#   ├── review-page-skill/          ← 家族根（docs/ 与 samples/）
#   ├── subject-review-generator/   ← 主编排
#   ├── rv-doc-extractor/  rv-data-builder/  ...   ← 10 个工位子技能
#   └── recheck/  ui-ux-pro-max/  ...              ← 第三方依赖

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILL_DIR="${SKILL_DIR:-$HOME/.claude/skills}"

echo "========================================"
echo "  学科复习网页生成器 · 安装器"
echo "  源目录 : $REPO_DIR"
echo "  目标   : $SKILL_DIR"
echo "========================================"

# 0) 校验源完整性
[ -f "$REPO_DIR/docs/GUARDRAILS.md" ] || { echo "错误：缺少 docs/GUARDRAILS.md，源不完整"; exit 1; }
[ -d "$REPO_DIR/samples" ]           || { echo "错误：缺少 samples/ 目录，源不完整"; exit 1; }
[ -d "$REPO_DIR/skills" ]            || { echo "错误：缺少 skills/ 目录，源不完整"; exit 1; }

mkdir -p "$SKILL_DIR"

# 1) 家族根：docs + samples（子技能按目录名 review-page-skill 向上查找，名称不可更改）
mkdir -p "$SKILL_DIR/review-page-skill"
cp -r "$REPO_DIR/docs"    "$SKILL_DIR/review-page-skill/"
cp -r "$REPO_DIR/samples" "$SKILL_DIR/review-page-skill/"
echo "[1/3] 家族根    -> $SKILL_DIR/review-page-skill/  (docs + samples)"

# 2) 12 个技能摊到顶层
cp -r "$REPO_DIR/skills"/* "$SKILL_DIR/"
echo "[2/3] 技能本体  -> $SKILL_DIR/  ($(ls "$REPO_DIR/skills" | wc -l) 个)"

# 3) 第三方依赖技能
if [ -d "$REPO_DIR/vendor" ]; then
  cp -r "$REPO_DIR/vendor"/* "$SKILL_DIR/"
  echo "[3/3] 第三方依赖 -> $SKILL_DIR/  ($(ls "$REPO_DIR/vendor" | wc -l) 个)"
else
  echo "[3/3] 未找到 vendor/ 目录，跳过第三方依赖"
fi

echo ""
echo "安装完成。重新打开 Claude Code 后即可调用 /subject-review-generator"
echo ""
echo "校验点："
echo "  护栏文件   $SKILL_DIR/review-page-skill/docs/GUARDRAILS.md"
echo "  默认模板   $SKILL_DIR/review-page-skill/samples/基础模板-复习页-v3.html"
echo ""
echo "卸载：删除 $SKILL_DIR 下的 review-page-skill/、12 个技能目录及 vendor/ 内的 10 个目录"
