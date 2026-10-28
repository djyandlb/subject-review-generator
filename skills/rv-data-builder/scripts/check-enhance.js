#!/usr/bin/env node
/* check-enhance.js — 增强标记格式机器关卡（防「标记不渲染」）
 * 用法: node check-enhance.js <data.json>
 * 职责: 校验每个概念 content 里的增强标记【对比表/树/流程/速记】格式是否合规：
 *   1. 标记必须带标题（「【树】」无标题 = FAIL；应为「【树:标题】」）
 *   2. 标记块内必须用真换行 \n，禁止 <br> 连接（<br> 被前端剥成空格 → 整块压成一行 → 不渲染）
 *   3. 树必须用连字符层级（-/--/---），禁止空格前缀层级（「  - xxx」= FAIL）
 * 前端已对旧数据容错（<br>→\n、无标题可渲染），但新生成数据必须合规——FAIL 打回 content-refiner 重写标记
 * 退出码: 0=通过  1=有 FAIL
 */
'use strict'
const fs = require('fs')
const path = require('path')

if (process.argv.length < 3) {
  console.error('用法: node check-enhance.js <data.json>')
  process.exit(1)
}
const d = JSON.parse(fs.readFileSync(path.resolve(process.argv[2]), 'utf8'))
const fails = []
let total = 0

;(d.categories || []).forEach(function (c) {
  ;(c.concepts || []).forEach(function (k) {
    const s = String(k.content || '')
    /* 找所有增强标记 */
    const re = /【(对比表|树|流程|速记)([^】]*)】/g
    let m
    while ((m = re.exec(s))) {
      total++
      const tag = m[1]
      const title = m[2].replace(/^[\s:：]+/, '').trim()
      const idx = m.index
      /* 1. 无标题 */
      if (!title) {
        fails.push({ k: k.id, tag: tag, why: '标记无标题（「【' + tag + '】」应为「【' + tag + ':标题】」）' })
      }
      /* 2. 标记后紧跟 <br> 而非换行 */
      const after = s.slice(idx + m[0].length, idx + m[0].length + 40)
      if (/<br\s*\/?>/i.test(after) && !/\r?\n/.test(after.slice(0, after.indexOf('<br')))) {
        fails.push({ k: k.id, tag: tag, why: '标记后用 <br> 连接内容（应为真换行 \n，否则整块被压成一行不渲染）' })
      }
      /* 3. 树行空格前缀层级 */
      if (tag === '树') {
        const block = s.slice(idx)
        if (/<br>\s*\s*-/.test(block) || /\r?\n\s{2,}-/.test(block)) {
          fails.push({ k: k.id, tag: '树', why: '树行用空格+连字符（「  - xxx」）——层级应靠连字符数量（-/--/---）而非空格前缀' })
        }
      }
      /* 4. 空标记：标记后无实际内容（AI 占位只写了标记头没填内容）——增强卡不渲染 */
      const blockEnd = s.indexOf('【', idx + m[0].length)
      const block = blockEnd >= 0 ? s.slice(idx + m[0].length, blockEnd) : s.slice(idx + m[0].length)
      const hasContent = block.replace(/<[^>]+>/g, '').replace(/[\s　]/g, '').length > 0
      if (!hasContent) {
        fails.push({ k: k.id, tag: tag, why: '空标记（「' + m[0] + '」后无内容）——只写了标记头没填实际内容' })
      }
      /* 5. 对比表标题：解析器按 vs / 与 切列名，标题里不能混进说明性括号，
       *    且列名段数必须与数据列数一致（含首列「对比项」），否则表头错列。 */
      if (tag === '对比表') {
        const parenBad = /[（(]/.test(title)
        if (parenBad) {
          fails.push({
            k: k.id, tag: '对比表',
            why: '标题含括号（「' + title + '」）——列名按 vs/与 切分，括号里的 vs/与 会被当成列名来源，表头会错列。标题只写「甲 vs 乙」，说明并进正文'
          })
        }
        const sides = title.split(/\s*(?:vs\.?|VS|与)\s*/).map(x => x.trim()).filter(Boolean)
        let maxCols = 0
        block.split(/\r?\n/).forEach(line => {
          const t = line.trim()
          if (!t) return
          const cols = t.replace(/^[-*]\s*/, '').split('|').length
          if (cols > maxCols) maxCols = cols
        })
        /* 标题带括号时切分结果本身不可信，列名比对不再重复报一次 */
        if (!parenBad) {
          if (maxCols > 1 && sides.length < 2) {
            fails.push({
              k: k.id, tag: '对比表',
              why: '标题切不出两段对象（当前「' + title + '」）——列名只能兜底成「对象1/对象2」'
            })
          } else if (maxCols > 1 && sides.length > 1 && maxCols !== sides.length + 1) {
            fails.push({
              k: k.id, tag: '对比表',
              why: '列名与数据列不匹配：标题切成 ' + sides.length + ' 段（' + sides.join(' / ') + '），数据行却是 ' + maxCols + ' 列（应为 ' + (sides.length + 1) + ' 列，含「对比项」）'
            })
          }
        }
      }
    }
  })
})

console.log('增强标记格式校验: 共 ' + total + ' 处标记')
if (fails.length) {
  console.log('❌ FAIL ' + fails.length + ' 处标记格式不合规，打回 content-refiner 重写:')
  fails.forEach(f => console.log('  · ' + f.k + ' [' + f.tag + '] ' + f.why))
  process.exit(1)
}
console.log('✅ 全部增强标记合规（带标题 / 真换行 / 连字符层级）')
