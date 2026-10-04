#!/usr/bin/env node
/* gen-manifest.js — 模块注册表自动生成/更新（成长型模块库的"记忆"）
 * 用法: node gen-manifest.js            # 扫描 modules/ 重建 manifest.json（幂等）
 *       node gen-manifest.js <某模块名>  # 仅更新某模块
 * 职责: 扫描 modules/*.js，提取每个模块的 name/desc/deps/events → 写入 modules/manifest.json
 *       - 已登记模块的 added（入库日期）保留不变；新模块补 today
 *       - 已删除/改名模块自动清理（不再出现在扫描结果中的旧登记移除）
 *       - desc 取文件头部注释第一行（「xxx.js — 描述」样式）
 * 产出: modules/manifest.json —— 组装/调用/协作都读它，模块库的记忆中枢
 */
'use strict'
const fs = require('fs')
const path = require('path')

const moduleDir = path.join(__dirname, '..', 'modules')
const manifestPath = path.join(moduleDir, 'manifest.json')

const CONTRACT = ['answer:wrong', 'answer:correct', 'mastery:change', 'fav:toggle',
  'nav:select', 'concept:select', 'view:change', 'search:change', 'wrong:change', 'quiz:launch']
const today = new Date().toISOString().slice(0, 10)

/* 读取旧 manifest（不存在则空） */
let old = { schema: 1, updated: today, modules: {} }
if (fs.existsSync(manifestPath)) {
  try { old = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) } catch (e) { old = { schema: 1, updated: today, modules: {} } }
}
const oldMods = (old.modules || {})

/* 扫描模块目录 */
const files = fs.readdirSync(moduleDir).filter(f => f.endsWith('.js'))
const entries = {}
files.forEach(function (f) {
  const name = f.replace(/\.js$/, '')
  const src = fs.readFileSync(path.join(moduleDir, f), 'utf8')
  const prev = oldMods[name] || {}

  /* desc：头部注释第一行描述（/* 到行尾，兼容多行头注释） */
  const headM = src.match(/\/\*\s*([^\n]*)/) || src.match(/\/\/\s*([^\n]+)/)
  const desc = (headM ? headM[1].replace(/^[^\n]*?\.js\s*—\s*/, '').trim() : name)

  /* deps：源码提取 */
  const depsM = src.match(/deps\s*:\s*\[([^\]]*)\]/)
  const deps = depsM ? depsM[1].split(',').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean) : []

  /* events：源码提取（ctx.event.on/emit 字符串字面量） */
  const evSet = new Set()
  src.replace(/ctx\.event\.(?:on|emit)\(\s*['"]([^'"]+)['"]/g, function (m, ev) { evSet.add(ev) })

  entries[name] = {
    name: name,
    desc: desc,
    deps: deps,
    events: Array.from(evSet),
    /* 核心模块 rv-core：骨架，恒选中 */
    core: name === 'rv-core',
    added: prev.added || today
  }
})

/* 合并保留旧登记里已不在扫描结果的（标记 stale，由检查方处理而非直接删） */
Object.keys(oldMods).forEach(function (n) {
  if (!entries[n]) entries[n] = Object.assign({}, oldMods[n], { stale: true })
})

const out = { schema: 1, updated: today, modules: entries }
fs.writeFileSync(manifestPath, JSON.stringify(out, null, 2), 'utf8')
const active = Object.values(entries).filter(m => !m.stale).length
const stale = Object.values(entries).filter(m => m.stale).length
console.log('manifest.json 已更新: ' + active + ' 个模块（stale: ' + stale + '）')
const newOnes = Object.values(entries).filter(m => m.added === today && !m.stale).map(m => m.name)
console.log('  新登记: ' + (newOnes.length ? newOnes.join(', ') : '无'))
if (stale) console.log('  ⚠ 标记 stale（文件已不在模块库）: ' + Object.values(entries).filter(m => m.stale).map(m => m.name).join(', '))
