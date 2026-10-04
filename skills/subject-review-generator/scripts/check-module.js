#!/usr/bin/env node
/* check-module.js — 模块自动审查（成长型模块库的入库关卡）
 * 用法: node check-module.js <模块文件路径>
 * 职责: 新模块/改动模块在入库前自动校验，任何一项 FAIL 即拒绝入库
 *   - 语法合法（node --check）
 *   - IIFE + RV.modules['name'] 注册，且注册名与文件名一致
 *   - deps 均存在于模块库（排除 rv-core：恒选中不显式依赖）
 *   - 禁止 document.getElementById（一律经 ctx.dom）
 *   - 无学科术语硬编码（性味/归经/药性等，模块须学科中性）
 *   - 无外部资源引用（CDN/script src/http 直连）
 *   - 事件名须在契约内（软警告，不阻断）
 * 退出码: 0=通过(可入库)  1=FAIL(拒绝入库)
 */
'use strict'
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

if (process.argv.length < 3) {
  console.error('用法: node check-module.js <模块文件路径>')
  process.exit(1)
}
const file = path.resolve(process.argv[2])
if (!fs.existsSync(file)) { console.error('❌ 文件不存在: ' + file); process.exit(1) }
const src = fs.readFileSync(file, 'utf8')
const filename = path.basename(file, '.js')
const moduleDir = path.dirname(file)
const existing = fs.readdirSync(moduleDir).filter(f => f.endsWith('.js')).map(f => f.replace(/\.js$/, ''))

const fails = []
const warns = []
const isCore = filename === 'rv-core' /* 核心基座：构造 ctx.dom，豁免注册名/选择器两项检查 */

/* 1. 语法检查 */
try {
  execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' })
} catch (e) {
  fails.push('JS 语法错误:\n' + String(e.stderr || e.message))
}

/* 2. 接口检查：必须 IIFE + RV.modules 注册（剥掉头部块注释再验） */
const body = src.replace(/^\s*\/\*[\s\S]*?\*\//, '').trimStart()
const hasIIFE = /^;\(function\s*\(\s*\)\s*\{/.test(body) && /\}\)\(\)\s*;?\s*$/.test(src.trimEnd())
if (!hasIIFE) fails.push('必须为 IIFE 包装（;（function () { ... })()）')
const nameM = src.match(/RV\.modules\s*=\s*RV\.modules\s*\|\|\s*\{\}\s*[\s\S]*?RV\.modules\[\s*'([^']+)'\s*\]\s*=\s*\{/)
const regName = nameM ? nameM[1] : null
if (!isCore && !regName) fails.push('缺少 RV.modules[\'模块名\'] 注册（按统一接口）')
if (!isCore && regName && regName !== filename) fails.push('注册名「' + regName + '」与文件名「' + filename + '」不一致（必须同名）')

/* 3. 依赖存在性（rv-core 恒选中，不算显式依赖） */
const depsM = src.match(/deps\s*:\s*\[([^\]]*)\]/)
const deps = depsM ? depsM[1].split(',').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean) : []
deps.forEach(function (d) {
  if (d === 'rv-core') warns.push('deps 含 rv-core：它是恒选中地基，无需显式依赖')
  else if (existing.indexOf(d) === -1) fails.push('依赖模块「' + d + '」不存在于模块库（现有: ' + existing.join(', ') + '）')
})

/* 4. 禁止 document.getElementById（须经 ctx.dom；rv-core 构造 dom 映射豁免） */
if (!isCore && /document\.getElementById|document\.querySelector(?:All)?\(['"]#/.test(src)) {
  fails.push('禁止 document.getElementById / 按 id 选择器——DOM 一律经 ctx.dom.xxx 操作')
}

/* 5. 学科术语硬编码检测（模块须学科中性，可复用任意学科） */
const TERMS = ['性味', '归经', '药性', '君臣佐使', '辩证', '症候', '穴位', '经络', '辨证论治']
TERMS.forEach(function (t) {
  if (src.indexOf(t) !== -1) fails.push('含学科术语「' + t + '」——模块必须学科中性（术语只存在于 data，不硬编码在 JS）')
})

/* 6. 外部资源引用 */
if (/<script[^>]*src=|<link[^>]*href=|https?:\/\/|@import|url\(\s*['"]?https?/.test(src)) {
  fails.push('含外部资源引用（CDN/外链/网络字体）——必须零外部依赖')
}

/* 6.5 硬编码色值检测（UI 统一走主题变量；联动同步更新铁律的机器关卡） */
const hexColors = src.match(/['"]#[0-9a-fA-F]{3,8}['"]/g) || []
if (hexColors.length) {
  fails.push('硬编码色值 ' + hexColors.slice(0, 3).join(', ') + '——UI 必须走主题 :root 变量，禁止在 JS 里硬编码 #hex 色')
}

/* 6.6 数据契约注释检测（跨模块共享数据必定义，软警告） */
if (/(addToWrongBook|wrongBook|state\.store|ctx\.store)/.test(src) && !/数据契约|数据格式|契约/.test(src)) {
  warns.push('涉及错题本/持久化共享数据但未在头部注释定义「数据契约」格式——跨模块共享数据必须在 JS 头部注释定义统一格式（见 rv-module-developer 模块数据契约规范）')
}

/* 7. 事件契约检查（软警告） */
const CONTRACT = ['answer:wrong', 'answer:correct', 'mastery:change', 'fav:toggle', 'fav:change',
  'nav:select', 'concept:select', 'view:change', 'search:change', 'wrong:change', 'quiz:launch']
const usedEvents = []
src.replace(/ctx\.event\.(?:on|emit)\(\s*['"]([^'"]+)['"]/g, function (m, ev) { usedEvents.push(ev) })
usedEvents.forEach(function (ev) {
  if (CONTRACT.indexOf(ev) === -1) warns.push('事件「' + ev + '」不在契约内（现有: ' + CONTRACT.join(', ') + '）——如确需新事件，同步登记到 rv-core 契约与各 SKILL 文档')
})

/* 汇总 */
console.log('── 模块审查: ' + filename + '.js ──')
console.log('  注册名: ' + (regName || '缺失') + '  |  依赖: ' + (deps.length ? deps.join(', ') : '无') + '  |  使用事件: ' + (usedEvents.length ? usedEvents.join(', ') : '无'))
if (fails.length) {
  console.log('  ❌ FAIL——以下未通过，禁止入库:')
  fails.forEach(function (f) { console.log('    · ' + f) })
  process.exit(1)
}
console.log('  ✅ 接口/依赖/术语/资源 全部通过')
if (warns.length) {
  console.log('  ⚠ 建议关注:')
  warns.forEach(function (w) { console.log('    · ' + w) })
}
process.exit(0)
