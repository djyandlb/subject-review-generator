#!/usr/bin/env node
/* assemble.js — 内联拼接器
 * 用法: node assemble.js <data.json> <输出.html>
 * 流程: 扫描 modules/ → 取 config.modules 选中列表（默认全选）→ deps 拓扑排序
 *       → 替换母版 frame.html 的 4 个占位符 → 输出单文件（无外部依赖）
 */
'use strict'
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

if (process.argv.length < 4) {
  console.error('用法: node assemble.js <data.json> <输出.html>')
  process.exit(1)
}
const baseDir = path.join(__dirname, '..')
const dataPath = path.resolve(process.argv[2])
const outPath = path.resolve(process.argv[3])

if (!fs.existsSync(dataPath)) {
  console.error('找不到 data.json: ' + dataPath)
  process.exit(1)
}
let data
try {
  data = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
} catch (e) {
  console.error('data.json 解析失败（请确认文件为 UTF-8 JSON）: ' + e.message)
  process.exit(1)
}

/* 1. 扫描模块目录，收集全部模块源码 */
const modules = {}
fs.readdirSync(path.join(baseDir, 'modules'))
  .filter(f => f.endsWith('.js'))
  .forEach(f => {
    modules[f.replace(/\.js$/, '')] = fs.readFileSync(path.join(baseDir, 'modules', f), 'utf8')
  })

/* 2. 从源码正则提取 deps 数组 */
function parseDeps(src) {
  const m = src.match(/deps\s*:\s*\[([^\]]*)\]/)
  if (!m) return []
  return m[1].split(',').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean)
}

/* 2.5 模块注册表联动（成长型：模块库"自己记住自己"）
 *    - 读取 modules/manifest.json；模块目录有 JS 但注册表缺登记 → 自动调 gen-manifest.js 补登记
 *    - 选中模块校验已在注册表（无 manifest 时告警但仍按模块目录装载，兜底不阻断） */
const genManifest = path.join(__dirname, 'gen-manifest.js')
let manifest = null
try {
  manifest = JSON.parse(fs.readFileSync(path.join(baseDir, 'modules', 'manifest.json'), 'utf8'))
} catch (e) { manifest = null }
if (manifest) {
  const registered = new Set(Object.keys(manifest.modules || {}))
  const unregistered = Object.keys(modules).filter(n => !registered.has(n))
  if (unregistered.length) {
    console.log('发现未登记模块: ' + unregistered.join(', ') + ' → 自动登记...')
    try { execFileSync(process.execPath, [genManifest], { stdio: 'inherit' }) }
    catch (e) { console.error('自动登记失败（不影响组装）: ' + e.message) }
    try { manifest = JSON.parse(fs.readFileSync(path.join(baseDir, 'modules', 'manifest.json'), 'utf8')) } catch (e) { /* 兜底 */ }
  }
} else {
  console.log('⚠ 未找到 modules/manifest.json——运行 node scripts/gen-manifest.js 生成注册表')
}

/* 3. 选中模块（默认全选）+ 递归展开依赖 */
/* 选中模块：config.modules 支持数组或逗号分隔字符串；缺省全选 */
const rawModules = data.config && data.config.modules
const selected = Array.isArray(rawModules) ? rawModules
  : typeof rawModules === 'string' ? rawModules.split(',').map(s => s.trim()).filter(Boolean)
  : Object.keys(modules)
/* 选中模块校验：已在注册表才允许指定（未登记/不存在的名称直接报错） */
if (manifest && Array.isArray(rawModules) || (manifest && typeof rawModules === 'string')) {
  selected.forEach(function (n) {
    if (!modules[n]) throw new Error('选中模块不存在（模块库无此 JS）: ' + n)
    if (manifest && !(manifest.modules || {})[n]) throw new Error('选中模块未登记进 manifest.json，先运行 node scripts/gen-manifest.js: ' + n)
  })
}
const needed = new Set()
needed.add('rv-core') /* 强制注入运行时基座（页面 boot 依赖 RV） */
function addWithDeps(name) {
  if (needed.has(name)) return
  if (!modules[name]) throw new Error('选中模块不存在: ' + name)
  needed.add(name)
  parseDeps(modules[name]).forEach(addWithDeps)
}
selected.forEach(addWithDeps)

/* 4. deps 拓扑排序（循环依赖会死循环，先探测） */
const visiting = new Set()
const order = []
const visited = new Set()
function visit(name) {
  if (visited.has(name)) return
  if (visiting.has(name)) throw new Error('模块循环依赖: ' + name)
  visiting.add(name)
  parseDeps(modules[name]).forEach(visit)
  visiting.delete(name)
  visited.add(name)
  order.push(name)
}
needed.forEach(visit)

/* 5. 读取母版 + 主题 */
let frame = fs.readFileSync(path.join(baseDir, 'templates', 'frame.html'), 'utf8')
let css = fs.readFileSync(path.join(baseDir, 'templates', 'theme.css'), 'utf8')
if (data.config && data.config.themeCss) css += '\n' + data.config.themeCss

/* 6. 替换 4 个占位符
 *  - 一律函数式 replace：避免 replacement 字符串里 $&/$1 等记号被展开破坏产物
 *  - 数据注入转义 </script>：防 data.json 含该串时提前闭合脚本标签（脚本注入）
 */
const jsonSafe = obj => JSON.stringify(obj).replace(/<\/script>/g, '<\\/script>')
frame = frame.replace('/*__RV_TITLE__*/', () => (data.subject || '复习') + ' 复习')
frame = frame.replace('/*__RV_THEME__*/', () => css)
frame = frame.replace('/*__RV_MODULES__*/', () => order.map(n => modules[n]).join('\n\n'))
frame = frame.replace('/*__RV_DATA__*/', () => 'window.RV_DATA = ' + jsonSafe(data) + ';')

/* 7. 输出（先确保输出目录存在） */
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, frame, 'utf8')
const size = (fs.statSync(outPath).size / 1024).toFixed(1)
console.log('已生成: ' + outPath + ' (' + size + ' KB)')
console.log('包含模块: ' + order.join(', '))
if (manifest) {
  const regs = order.map(n => (manifest.modules || {})[n])
  const missing = order.filter(n => !(manifest.modules || {})[n])
  if (missing.length) console.log('⚠ 以下模块未登记 manifest: ' + missing.join(', '))
  else console.log('模块注册表校验: ' + order.length + ' 个全部已登记 ✅')
}
