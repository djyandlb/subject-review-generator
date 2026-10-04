#!/usr/bin/env node
/* list-modules.js — 模块库清单速览（头脑风暴「模块决策」时的参考底稿）
 * 用法: node list-modules.js
 * 职责: 读 modules/manifest.json，按依赖拓扑排序列出全部已入库模块，
 *       供「模块决策」阶段对照：需求是否已有模块覆盖 → 有则直接启用（不重写），无则开发
 */
'use strict'
const fs = require('fs')
const path = require('path')

const manifestPath = path.join(__dirname, '..', 'modules', 'manifest.json')
if (!fs.existsSync(manifestPath)) {
  console.error('未找到 manifest.json——先运行 node scripts/gen-manifest.js 生成注册表')
  process.exit(1)
}
const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
const mods = m.modules || {}

/* 依赖拓扑排序（循环依赖兜底：不无限递归） */
const order = [], done = {}, visiting = {}
function visit(n, chain) {
  if (done[n]) return
  if (visiting[n]) return // 循环依赖：跳过防死循环
  visiting[n] = true
  ;(mods[n] && mods[n].deps || []).forEach(function (d) {
    if (mods[d]) visit(d, chain.concat(n))
  })
  delete visiting[n]
  done[n] = true
  order.push(n)
}
Object.keys(mods).forEach(function (n) { if (!mods[n].stale) visit(n, []) })

console.log('━━ 模块库注册表（' + order.length + ' 个，按依赖序）━━')
console.log('')
order.forEach(function (n) {
  const x = mods[n]
  const tag = x.core ? '[核心] ' : '[功能] '
  console.log(tag + n)
  console.log('     用途: ' + (x.desc || '—'))
  console.log('     依赖: ' + (x.deps && x.deps.length ? x.deps.join(', ') : '无'))
  console.log('     事件: ' + (x.events && x.events.length ? x.events.join(', ') : '—'))
  console.log('     入库: ' + (x.added || '?') + (x.stale ? '  ⚠ 文件缺失' : ''))
  console.log('')
})
console.log('使用: 选中模块写入 data.json 的 config.modules（数组或逗号分隔）→ assemble.js 自动应用已入库模块，无需重写')
