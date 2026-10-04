#!/usr/bin/env bash
# PDF 提取（pdftotext）：-layout 保留幻灯片布局（PPT 转 PDF 适用）
# 用法: bash extract-pdf-pdftotext.sh <源.pdf> <输出.txt>
set -euo pipefail
pdftotext -layout "$1" "$2"
echo "pdftotext 提取完成 → $2"
