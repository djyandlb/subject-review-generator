#!/usr/bin/env node
/* dedup-questions.js — 习题去重（资料重复出现的题合并为一道）
 * 用法: node dedup-questions.js <data.json>
 * 规则:
 *   - 精确重复：题干去空白/标点后相同 → 保留一道（优先 options/explanation 完整者）
 *   - 近似重复：题干实质相同（只改数字/语序/标点/选项顺序）→ 合并取信息最全版本
 *   - 跨章节也去重
 * 幂等：已无重复则不改
 */
'use strict'
const fs = require('fs')
const path = require('path')

if (process.argv.length < 3) { console.error('用法: node dedup-questions.js <data.json>'); process.exit(1) }
const P = path.resolve(process.argv[2])
let d
try { d = JSON.parse(fs.readFileSync(P, 'utf8')) }
catch (e) { console.error('读取/解析 data.json 失败（请确认 UTF-8 JSON）: ' + e.message); process.exit(1) }
const qs = d.questions || []
if (!qs.length) { console.log('题库为空，无需去重'); process.exit(0) }

/* 题干规范化：去空白/标点/全半角统一 + 数字归一（「只改数字」的近似题视为同一道）
 * 注：语序/选项顺序变化等更深层近似由出题后的 AI 人工复核兜底，脚本不做高风险误合并 */
function normStem(s) {
  return String(s || '')
    .replace(/[\s　]/g, '')
    .replace(/[，。；：？！、,.!?;:]/g, '')
    .replace(/[（）()]/g, '')
    .replace(/\d+/g, '#')
    .toLowerCase()
}
/* 信息完整度评分（去重时留更全的） */
function infoScore(q) {
  let score = 0
  if (q.stem) score += 2
  if (q.options && q.options.length >= 2) score += q.options.length
  if (q.explanation && q.explanation.length > 10) score += 3
  if (q.answer !== undefined && q.answer !== null) score += 2
  return score
}

const seen = new Map() // normStem -> best question
const order = new Map() // normStem -> 首现 index
const removed = []
const kept = []
qs.forEach((q, i) => {
  const key = normStem(q.stem)
  if (!key) { kept.push(q); return }
  if (seen.has(key)) {
    const best = seen.get(key)
    if (infoScore(q) > infoScore(best)) {
      /* 新题更全，替换 */
      removed.push(best.id)
      seen.set(key, q)
    } else {
      removed.push(q.id)
    }
  } else {
    seen.set(key, q)
    order.set(key, i)
  }
})

/* 保持题库原顺序（按首现位置排），避免按 id 重排打乱章节/难易语义 */
const result = Array.from(seen.values()).sort((a, b) => (order.get(normStem(a.stem)) || 0) - (order.get(normStem(b.stem)) || 0))
if (removed.length === 0) {
  console.log('题库无重复题，无需去重 ✅（共 ' + qs.length + ' 题）')
  process.exit(0)
}

d.questions = result
fs.writeFileSync(P, JSON.stringify(d, null, 2), 'utf8')
console.log('习题去重完成: ' + qs.length + ' → ' + result.length + '（移除重复 ' + removed.length + ' 道）')
console.log('移除的题: ' + removed.join(', '))
