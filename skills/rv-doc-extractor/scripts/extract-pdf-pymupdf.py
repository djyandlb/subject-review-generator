#!/usr/bin/env python
"""PDF 高精度提取（PyMuPDF）：分页保留文本布局，含页眉标记
用法: python extract-pdf-pymupdf.py <源.pdf> <输出.txt>
依赖: pip install pymupdf
"""
import sys
import fitz


def main():
    if len(sys.argv) < 3:
        print("用法: python extract-pdf-pymupdf.py <源.pdf> <输出.txt>")
        sys.exit(1)
    src, out = sys.argv[1], sys.argv[2]
    doc = fitz.open(src)
    parts = []
    for i, page in enumerate(doc):
        parts.append("=== PAGE %d ===\n%s" % (i + 1, page.get_text("text")))
    with open(out, "w", encoding="utf-8") as f:
        f.write("\n".join(parts))
    print("PyMuPDF 提取 %d 页 → %s" % (len(doc), out))


if __name__ == "__main__":
    main()
