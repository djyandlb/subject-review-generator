#!/usr/bin/env node
/* export-content.js — rv-content-refiner 辅助脚本
 * 用法: node export-content.js <data.json> [--out <输出文件>]
 * 职责: 把 data.json 每个概念的 content 导出为「待重构清单」，供 AI 逐条阅读重写
 *       同时支持 --import <重写结果.json> 把 AI 重构后的 content 写回 data.json
 */
'use strict'
const fs = require('fs')
const path = require('path')

if (process.argv.length < 3) { console.error('用法: node export-content.js <data.json> [--out f] [--import f]'); process.exit(1) }
const P = path.resolve(process.argv[2])
let data
try { data = JSON.parse(fs.readFileSync(P, 'utf8')) }
catch (e) { console.error('读取/解析 data.json 失败（请确认 UTF-8 JSON）: ' + e.message); process.exit(1) }

const modeImport = process.argv.indexOf('--import')
const modeExport = process.argv.indexOf('--out')

if (modeImport >= 0) {
  /* ---- 导入重构结果 ---- */
  const importArg = process.argv[modeImport + 1]
  if (!importArg) { console.error('用法: node export-content.js <data.json> --import <重构结果.json>'); process.exit(1) }
  let refined
  try { refined = JSON.parse(fs.readFileSync(path.resolve(importArg), 'utf8')) }
  catch (e) { console.error('读取/解析 --import 文件失败: ' + e.message); process.exit(1) }
  /* refined: { "k001": "<p>...</p>", "k013": "<p>...</p>", ... } */
  const map = refined.refined || refined
  let count = 0
  ;(data.categories || []).forEach(c => (c.concepts || []).forEach(k => {
    if (map[k.id]) {
      k.content = map[k.id]
      count++
    }
  }))
  fs.writeFileSync(P, JSON.stringify(data, null, 2), 'utf8')
  console.log('已写回重构内容:', count, '个概念 →', P)
  process.exit(0)
}

/* ---- 导出待重构清单 ---- */
const outArg = modeExport >= 0 ? process.argv[modeExport + 1] : null
if (modeExport >= 0 && !outArg) { console.error('用法: node export-content.js <data.json> --out <输出文件>'); process.exit(1) }
const outFile = outArg ? path.resolve(outArg) : path.join(path.dirname(P), 'content-to-refine.json')
const out = { _说明: '每个概念 content 待 rv-content-refiner AI 重构。重构后保持同结构 {"refined": {"概念id": "新content HTML"}} 交给 --import。', refined: {} }
const list = []
;(data.categories || []).forEach(c => (c.concepts || []).forEach(k => {
  out.refined[k.id] = k.content
  list.push({ id: k.id, title: k.title, cat: c.name, len: (k.content || '').length })
}))
fs.writeFileSync(outFile, JSON.stringify(out, null, 2), 'utf8')
console.log('已导出', list.length, '个概念 content →', outFile)
console.log('平均长度:', list.length ? Math.round(list.reduce((s, x) => s + x.len, 0) / list.length) : 0, '字符')
console.log('\n用法: 用 rv-content-refiner skill 逐概念重构 content → node export-content.js <data.json> --import <重构结果.json>')
