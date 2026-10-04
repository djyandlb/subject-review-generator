#!/usr/bin/env python
"""TXT/MD 提取：UTF-8 优先，GBK 兜底（自动编码检测）
用法: python extract-txt.py <源.txt> <输出.txt>
"""
import sys


def main():
    if len(sys.argv) < 3:
        print("用法: python extract-txt.py <源.txt> <输出.txt>")
        sys.exit(1)
    src, out = sys.argv[1], sys.argv[2]
    buf = open(src, "rb").read()
    try:
        text = buf.decode("utf-8")
    except UnicodeDecodeError:
        text = buf.decode("gbk", errors="replace")
    with open(out, "w", encoding="utf-8") as f:
        f.write(text)
    print("TXT → %s" % out)


if __name__ == "__main__":
    main()
