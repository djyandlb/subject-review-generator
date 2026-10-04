#!/usr/bin/env node
/* check-categories.js — 分类质量校验（防「子分类 name=id」类 bug）
 * 用法: node check-categories.js <data.json>
 * 检查：章节 name 非空 / 子分类 name 人类可读（禁 id、禁 s\d 格式）/ 概念 subcategory 引用存在 / mastery 三档
 * 退出码: 0=通过  1=FAIL（打回补正，防侧边栏显示「s1 s2」）
 */
'use strict'
const fs = require('fs')
const path = require('path')
if (process.argv.length < 3) { console.error('用法: node check-categories.js <data.json>'); process.exit(1) }
const d = JSON.parse(fs.readFileSync(path.resolve(process.argv[2]), 'utf8'))
const fails = []
const MASTERY = ['掌握', '熟悉', '了解']
const CHAPTER_RE = /第[一二三四五六七八九十\d]+章|绪论|概论|总论|导论|前言/
;(d.categories || []).forEach(c => {
  if (!c.name || !String(c.name).trim()) fails.push('章节 ' + c.id + ' 的 name 为空')
  else if (!CHAPTER_RE.test(String(c.name))) {
    fails.push('章节 ' + c.id + ' 的 name「' + String(c.name).slice(0, 30) + '」无章号——须跑 renumber-chapters.js 生成「第N章 主题」（或绪论/概论/总论）')
  }
  ;(c.subcategories || []).forEach(s => {
    if (!s.name || !String(s.name).trim()) fails.push('子分类 ' + c.id + '/' + s.id + ' 的 name 为空')
    else if (s.name === s.id || /^s\d/.test(String(s.name))) {
      fails.push('子分类 ' + c.id + '/' + s.id + ' 的 name 用了 id（「' + s.name + '」）——侧边栏显示的就是 name，必须填人类可读小节名（如「第一节 xxx」「1.1 xxx」「xxx概述」）')
    }
  })
  ;(c.concepts || []).forEach(k => {
    if (k.subcategory && !(c.subcategories || []).some(s => s.id === k.subcategory)) {
      fails.push('概念 ' + k.id + ' 的 subcategory 引用不存在: 「' + k.subcategory + '」（章节 ' + c.id + '）')
    }
    if (!MASTERY.includes(k.mastery)) fails.push('概念 ' + k.id + ' 的 mastery 非法: 「' + k.mastery + '」（只取 掌握/熟悉/了解）')
  })
})
/* mastery 分布多样性：全一档 = mastery 判定未执行（AI 全填同档），须按资料逐条裁定 */
const mDist = {}
;(d.categories || []).forEach(c => (c.concepts || []).forEach(k => { mDist[k.mastery] = (mDist[k.mastery] || 0) + 1 }))
const mKeys = Object.keys(mDist)
if (mKeys.length <= 1) {
  fails.push('mastery 全为同一档「' + (mKeys[0] || '空') + '」（' + (mDist[mKeys[0]] || 0) + ' 个概念）——mastery 判定未执行，须通读资料按重要性逐条裁定 掌握/熟悉/了解 三档')
}
const nCat = (d.categories || []).length
const nCon = (d.categories || []).reduce((a, c) => a + (c.concepts || []).length, 0)
console.log('分类校验: ' + nCat + ' 章 / ' + nCon + ' 概念（mastery 分布: ' + JSON.stringify(mDist) + '）')
if (fails.length) {
  console.log('❌ FAIL ' + fails.length + ' 项，打回补正:')
  fails.forEach(f => console.log('  · ' + f))
  process.exit(1)
}
console.log('✅ 分类质量通过（章节/子分类名可读、引用完整、mastery 三档）')
