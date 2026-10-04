#!/usr/bin/env node
/* check-extraction.js — 提取完整性机器关卡（防「PDF 解析失败却静默通过」）
 * 用法: node check-extraction.js <源文档目录> <clean目录>
 * 职责:
 *   1. 对每个源文档（pdf/doc/docx/pptx/txt/md），确认存在对应清洗文件 <去扩展名>_clean.txt
 *   2. 统计 clean 文件有效字符量（去空白），PDF/DOC/DOCX/PPTX 源低于阈值 → FAIL（疑似解析失败/扫描版）
 *      ——防止「病理学.pdf 1.4MB 只提取 20 行、病理 综合.doc 0 行」这类静默失败
 *   3. 输出逐文件报告 + 汇总，AI 据此决定是否补跑备选方案
 * 退出码: 0=全部通过  1=有 FAIL（打回补跑备选，不许带病进入 data.json 建模）
 */
'use strict'
const fs = require('fs')
const path = require('path')

if (process.argv.length < 4) {
  console.error('用法: node check-extraction.js <源文档目录> <clean目录>')
  process.exit(1)
}
const SRC = path.resolve(process.argv[2])
const CLEAN = path.resolve(process.argv[3])
if (!fs.existsSync(SRC)) { console.error('源文档目录不存在: ' + SRC); process.exit(1) }
if (!fs.existsSync(CLEAN)) { console.error('clean 目录不存在: ' + CLEAN); process.exit(1) }

/* 二进制型大文档（易解析失败），有效字符量低于阈值判 FAIL */
const THRESHOLD = 500
const BINARY_EXT = /\.(pdf|doc|docx|pptx|ppt)$/i

/* 递归收集源文档 */
const sources = []
;(function walk(dir) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (e) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p)
    else if (/\.(pdf|doc|docx|pptx|ppt|txt|md)$/i.test(e.name)) sources.push(p)
  })
})(SRC)

if (!sources.length) { console.log('⚠ 源文档目录无受支持文件（pdf/doc/docx/pptx/txt/md）'); process.exit(1) }

const fails = []
let nOk = 0, nFail = 0, nMiss = 0
console.log('提取完整性校验（源 ' + sources.length + ' 个文档 → clean 对照）')
console.log('── 逐文件报告 ──')
sources.forEach(function (src) {
  const base = path.basename(src).replace(/\.[^.]+$/, '')
  const cleanPath = path.join(CLEAN, base + '_clean.txt')
  const isBinary = BINARY_EXT.test(src)
  if (!fs.existsSync(cleanPath)) {
    nMiss++
    console.log('  ⚠ ' + path.basename(src) + ' → 无清洗文件 ' + base + '_clean.txt（未清洗/未提取）')
    if (isBinary) { fails.push(path.basename(src) + ' 无清洗文件'); nFail++ }
    return
  }
  const raw = fs.readFileSync(cleanPath, 'utf8')
  const lines = raw.split(/\r?\n/).filter(l => l.trim()).length
  const chars = raw.replace(/\s/g, '').length
  let verdict = '✅'
  if (isBinary && chars < THRESHOLD) {
    verdict = '❌ FAIL'
    fails.push(path.basename(src) + ' 有效字符仅 ' + chars + '（<' + THRESHOLD + '）疑似解析失败/扫描版，补跑备选方案')
    nFail++
  } else nOk++
  console.log('  ' + verdict + ' ' + path.basename(src) + ' → ' + lines + ' 行 / ' + chars + ' 有效字符')
})
console.log('── 汇总 ──')
console.log('通过 ' + nOk + ' | FAIL ' + nFail + ' | 未找到清洗文件 ' + nMiss)
if (fails.length) {
  console.log('❌ 提取不完整，打回补跑备选方案:')
  fails.forEach(f => console.log('  · ' + f))
  console.log('  备选：extract-pdf-pdftotext.sh（PDF）/ LibreOffice（.ppt）等，见 rv-doc-extractor 步骤 2')
  process.exit(1)
}
console.log('✅ 全部源文档提取完整（二进制文档有效字符 ≥ ' + THRESHOLD + '）')
