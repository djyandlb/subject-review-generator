#!/usr/bin/env python
"""统一提取入口：按扩展名分发到最适方案，支持 pdf/pptx/docx/txt/md
用法: python extract-any.py <源文件> [输出目录]
旧格式 .ppt/.doc：.doc 走 antiword；.ppt 需 LibreOffice（本环境提示安装）
"""
import os
import subprocess
import sys

SCRIPTS = os.path.dirname(os.path.abspath(__file__))


def main():
    if len(sys.argv) < 2:
        print("用法: python extract-any.py <源文件> [输出目录]")
        sys.exit(1)
    src = sys.argv[1]
    outdir = sys.argv[2] if len(sys.argv) > 2 else "."
    ext = os.path.splitext(src)[1].lower()
    base = os.path.splitext(os.path.basename(src))[0]
    out = os.path.join(outdir, base + ".txt")
    cmds = {
        ".pdf": [sys.executable, os.path.join(SCRIPTS, "extract-pdf-pymupdf.py"), src, out],
        ".pptx": [sys.executable, os.path.join(SCRIPTS, "extract-pptx.py"), src, out],
        ".docx": [sys.executable, os.path.join(SCRIPTS, "extract-docx.py"), src, out],
        ".doc": ["bash", os.path.join(SCRIPTS, "extract-doc.sh"), src, out],
        ".txt": [sys.executable, os.path.join(SCRIPTS, "extract-txt.py"), src, out],
        ".md": [sys.executable, os.path.join(SCRIPTS, "extract-txt.py"), src, out],
    }
    if ext == ".ppt":
        print("⚠ .ppt 旧格式需 LibreOffice 转换：soffice --headless --convert-to pptx <文件>")
        sys.exit(1)
    if ext not in cmds:
        print("不支持格式 %s（支持 pdf/pptx/docx/doc/txt/md）" % ext)
        sys.exit(1)
    print("用方案 %s → %s" % (ext, out))
    subprocess.run(cmds[ext], check=True)
    print("完成: %s" % out)


if __name__ == "__main__":
    main()
