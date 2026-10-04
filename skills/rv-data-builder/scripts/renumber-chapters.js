#!/usr/bin/env node
/* renumber-chapters.js — 章节拉通重编号（资料驱动排序，rv-data-builder 建模阶段必跑）
 * 用法: node renumber-chapters.js <data.json>
 * 职责: categories[] 数组顺序 = 资料章节实际顺序（前端直接按数组渲染，不二次排序）；
 *       若出现分组重复编号（如 1,2,4,1,2,3,4,5,7），拉通为全局连续「第一章…第九章」
 * 规则:
 *   - 首章若是「概论/绪论/总论/导论」→ 保留原名（无章号）
 *   - 其余按数组顺序重命名为「第N章 主题」
 *   - 幂等：已是连续编号则不改
 */
'use strict'
const fs = require('fs')
const path = require('path')

if (process.argv.length < 3) { console.error('用法: node renumber-chapters.js <data.json>'); process.exit(1) }
const P = path.resolve(process.argv[2])
let d
try { d = JSON.parse(fs.readFileSync(P, 'utf8')) }
catch (e) { console.error('读取/解析 data.json 失败（请确认 UTF-8 JSON）: ' + e.message); process.exit(1) }

const CN = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
/* 阿拉伯数字 → 中文数字：支持 1-99（十一 / 二十 / 二十一…），避免 13 章以上出现「第13章」与中文数字混排 */
const toCn = n => {
  if (n <= 10) return CN[n]
  if (n < 20) return '十' + CN[n - 10]
  const t = Math.floor(n / 10), r = n % 10
  return CN[t] + '十' + (r ? CN[r] : '')
}
/* 中文数字解析：支持 一…九十九（如 十三 / 二十 / 二十一），超 12 章也能识别 */
function cnToNum(s) {
  if (!s) return null
  const D = { 零: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 }
  if (s in D) return D[s]
  if (s === '十') return 10
  if (s.startsWith('十')) return 10 + (D[s[1]] || 0)
  if (s.endsWith('十')) return (D[s[0]] || 0) * 10
  const i = s.indexOf('十')
  if (i > 0 && i < s.length - 1) return (D[s[0]] || 0) * 10 + (D[s[i + 1]] || 0)
  return null
}
/* 提取中文/数字章号 */
function chapNum(name) {
  const m = name.match(/第([一二三四五六七八九十\d]+)章/)
  if (!m) return null
  if (/^\d+$/.test(m[1])) return parseInt(m[1], 10)
  return cnToNum(m[1])
}
/* 检测是否需要拉通（是否有重复/跳变章号；全无章号也需自动编号「第N章 主题」） */
function needsRenumber(cats) {
  const nums = cats.map(c => chapNum(c.name)).filter(n => n != null)
  if (!nums.length) return true
  const seen = new Set()
  let expected = 1
  for (const n of nums) {
    if (n !== expected) return true
    if (seen.has(n)) return true
    seen.add(n)
    expected++
  }
  return false
}

const cats = d.categories
if (!needsRenumber(cats)) {
  console.log('章节编号已连续，无需重排 ✅')
  process.exit(0)
}
console.log('检测到分组重复/跳变编号 → 拉通重编号')
let chapter = 0
cats.forEach(c => {
  const m = c.name.match(/^(第[一二三四五六七八九十\d]+章)?\s*(.*)$/)
  const body = (m ? m[2] : c.name).trim()
  /* 概论/绪论/总论/导论保留（仅首章）：剥掉「第X章」前缀变无章号章、不计入编号，
   * 后续正式章从「第一章」重新起——避免保留章与第一章撞名产生两个「第一章」 */
  if (/概论|总论|绪论|导论/.test(c.name) && chapter === 0) {
    c.name = body || '概论'
    console.log(`  保持: ${c.name}`)
    return
  }
  chapter++
  c.name = '第' + toCn(chapter) + '章 ' + body
  console.log(`  ${c.id}: → ${c.name}`)
})
fs.writeFileSync(P, JSON.stringify(d, null, 2), 'utf8')
console.log(`\n完成：拉通为连续章节，共 ${chapter} 章`)
