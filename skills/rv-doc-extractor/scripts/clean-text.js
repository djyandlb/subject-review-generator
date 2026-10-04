/* 文本清洗：去 PPT 水印/URL 噪音、页码、换页符、目录条目（点线引导符+页码）、多余空行
 * 用法: node clean-text.js <输入.txt> <输出.txt>
 */
'use strict'
const fs = require('fs')

if (process.argv.length < 4) {
  console.error('用法: node clean-text.js <输入.txt> <输出.txt>')
  process.exit(1)
}
const src = process.argv[2]
const out = process.argv[3]
const lines = fs.readFileSync(src, 'utf8').split('\n')
/* 目录条目特征：标题 + 点线引导符（≥3 个点/全角点，点可夹空格）+ 行尾页码（1-4 位）
 * 例1「第一节　适应......... . . . 5」 例2「二、　出血的病理变化.. . . . 44」
 * \s* 容忍行尾 CRLF(\r)；命中即整行删除（PDF 目录页内容，不得混入正文章节——否则章节切分把目录条目当正文） */
const TOC_LINE = /^[^\n]*?(?:[\.．][\.．\s]*){3,}\d{1,4}\s*$/
const clean = lines
  .map(l => l
    /* 统一水印格式：PPT/Word/Excel 与 www 之间有无空格都清（常见「PPT www.1ppt.com」带空格） */
    .replace(/(?:PPT|Word|Excel)\s*www\.1ppt\.[^\s]*/gi, '')
    /* 去页/幻灯片标记（=== PAGE N === 来自 PDF、=== SLIDE N === 来自 PPTX）——必须清，否则残留进提取文本/出题 */
    .replace(/^\s*=== (?:PAGE|SLIDE) \d+ ===\s*$/, '')
    /* 目录条目（标题 + 点线 + 页码）→ 整行置空，交给 filter 删除 */
    .replace(TOC_LINE, '')
    .trim())
  /* 纯数字行只删 1-2 位（页码特征）；3 位以上（年份 2024 / 数值 100+）保留，避免误删正文 */
  .filter(l => l && l !== '-' && !/^-\d+-$/.test(l) && !/^\d{1,2}$/.test(l) && l.charCodeAt(0) !== 12)
fs.writeFileSync(out, clean.join('\n'), 'utf8')
console.log('清洗 %d → %d 行 → %s', lines.length, clean.length, out)
