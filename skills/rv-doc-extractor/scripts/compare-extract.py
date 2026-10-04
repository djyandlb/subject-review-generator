#!/usr/bin/env python
"""对比多方案提取质量，选取准确率最高者
用法: python compare-extract.py <提取1.txt> <提取2.txt> ...
质量指标：
  - 有效字符：去掉 PPT 水印/URL 噪音后的正文量
  - 结构线索：章节词/学科关键词出现数（内容真实度）
  - 平均行宽：合理的段落/要点宽度
推荐：有效字符 × (1 + 线索/1000) 最高者
"""
import os
import re
import sys

NOISE = re.compile(r"1ppt|www\.|PPT|Excel|Word|模板|素材|背景|图表")
CLUES = re.compile(r"第[一二三四五六七八九十]+[章节篇]|微生物|免疫|细菌|病毒|细胞|抗体|抗原|真菌|球菌|杆菌")


def score(path):
    txt = open(path, encoding="utf-8", errors="ignore").read()
    total = len(txt)
    if not total:
        return 0, "空文件"
    noise = len(NOISE.findall(txt))
    effective = total - noise * 8  # 每条噪音约 8 字符
    clues = len(CLUES.findall(txt))
    lines = [l for l in txt.split("\n") if l.strip()]
    avg = sum(len(l) for l in lines) / max(len(lines), 1)
    quality = max(effective, 0) * (1 + clues / 1000)
    return quality, "字符=%d 有效=%d 噪音=%d 线索=%d 均行宽=%.0f" % (total, max(effective, 0), noise, clues, avg)


def main():
    files = sys.argv[1:]
    if not files:
        print("用法: python compare-extract.py <提取1.txt> <提取2.txt> ...")
        sys.exit(1)
    results = [(score(f)[0], f, score(f)[1]) for f in files]
    results.sort(key=lambda x: x[0], reverse=True)
    print("=== 提取质量对比 ===")
    for q, f, info in results:
        print("%10.0f  %-30s %s" % (q, os.path.basename(f), info))
    best = results[0][1]
    print("推荐使用: %s" % best)
    return 0 if results[0][0] > 0 else 1


if __name__ == "__main__":
    sys.exit(main())
