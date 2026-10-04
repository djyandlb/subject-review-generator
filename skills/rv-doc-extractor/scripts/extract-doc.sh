#!/usr/bin/env bash
# DOC 旧格式（.doc）提取：antiword 优先，失败提示装 LibreOffice
# 用法: bash extract-doc.sh <源.doc> <输出.txt>
set -u
if antiword "$1" > "$2" 2>/dev/null; then
  echo "antiword 提取 → $2"
else
  echo "⚠ antiword 失败（加密或新版 doc），建议装 LibreOffice: soffice --headless --convert-to txt"
  exit 1
fi
