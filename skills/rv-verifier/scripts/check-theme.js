#!/usr/bin/env node
/* check-theme.js — 主题硬编码残留审计（静态，无需浏览器）
 * 用法: node check-theme.js <index.html|theme.css> [--warn-only] [--mode dark|light|auto] [--strict-rings]
 *
 * 为什么需要它：
 *   换主题只改 :root 变量是不够的。模板里大量「浅色主题专用」的写法是硬编码字面量：
 *   白色描边、白色玻璃底、白色内高光、白色文字投影、冷色（蓝）焦点环、
 *   以及 rgba(255,255,255,0) 起手的渐隐遮罩。这些东西在暗色主题里会变成白边、白块、
 *   蓝框、或一块突兀的深色方块；人眼很难扫全，所以用脚本按层叠顺序判定「谁覆盖了谁」。
 *
 * 判定口径：
 *   一条可疑声明，若其后存在「类名集合是它的超集、且声明了同属性组」的规则，
 *   即视为已被主题覆盖（等价于更高特异性覆盖）。否则判为残留。
 *
 * 退出码: 0=通过（含仅警告）  1=存在未覆盖残留（或 --strict-rings 下的直角光圈）
 */
'use strict'
const fs = require('fs')
const path = require('path')

const args = process.argv.slice(2)
if (!args.length) {
  console.error('用法: node check-theme.js <index.html|theme.css> [--warn-only] [--mode dark|light|auto] [--strict-rings]')
  process.exit(1)
}
const file = args[0]
const warnOnly = args.includes('--warn-only')
const strictRings = args.includes('--strict-rings')
const modeArg = (function () {
  const i = args.indexOf('--mode')
  return i >= 0 ? (args[i + 1] || 'auto') : 'auto'
})()
if (!fs.existsSync(file)) {
  console.error('找不到文件: ' + path.resolve(file))
  process.exit(1)
}

/* ---------- 1. 抽取样式表 ---------- */
const raw = fs.readFileSync(path.resolve(file), 'utf8')
const styles = []
{
  const re = /<style[^>]*>([\s\S]*?)<\/style>/gi
  let m
  while ((m = re.exec(raw))) {
    const innerStart = m.index + m[0].indexOf(m[1])
    styles.push({ css: m[1], startLine: raw.slice(0, innerStart).split('\n').length })
  }
  if (!styles.length) styles.push({ css: raw, startLine: 1 })
}
const css = styles.map(s => s.css).join('\n')
const baseLine = styles.length === 1 ? styles[0].startLine : 1

/* ---------- 2. 解析规则（@media 等条件组递归展开） ---------- */
const rules = []
const lineOf = (text, idx) => baseLine + (text.slice(0, idx).match(/\n/g) || []).length
/* 注释替换成等长空白，行号不偏移 */
const clean = css.replace(/\/\*[\s\S]*?\*\//g, s => s.replace(/[^\n]/g, ' '))

function parseBlock(text, from, to) {
  var i = from
  while (i < to) {
    var brace = text.indexOf('{', i)
    if (brace < 0 || brace >= to) break
    var prelude = text.slice(i, brace).trim()
    var depth = 1, j = brace + 1
    while (j < to && depth > 0) {
      if (text[j] === '{') depth++
      else if (text[j] === '}') depth--
      j++
    }
    var bodyStart = brace + 1, bodyEnd = j - 1
    if (/^@/.test(prelude)) {
      if (/^@(media|supports|container|layer)/i.test(prelude)) parseBlock(text, bodyStart, bodyEnd)
    } else if (prelude) {
      var body = text.slice(bodyStart, bodyEnd)
      var props = {}
      body.split(';').forEach(function (decl) {
        var idx = decl.indexOf(':')
        if (idx < 0) return
        var name = decl.slice(0, idx).trim().toLowerCase()
        var value = decl.slice(idx + 1).trim()
        if (name) props[name] = value
      })
      var selectors = prelude.split(',').map(function (s) { return s.trim() }).filter(Boolean)
      if (Object.keys(props).length) rules.push({ selector: prelude, selectors: selectors, props: props, line: lineOf(text, i) })
    }
    i = j
  }
}
parseBlock(clean, 0, clean.length)

/* ---------- 3. 主题明暗判定 ---------- */
function findRootVar(name) {
  for (var i = 0; i < rules.length; i++) {
    var r = rules[i]
    if (r.selectors.indexOf(':root') >= 0 && r.props[name]) return r.props[name].trim()
  }
  return null
}
function luminance(color) {
  var hex = color.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (hex) {
    var h = hex[1]
    if (h.length === 3) h = h.split('').map(function (c) { return c + c }).join('')
    var v = [0, 2, 4].map(function (k) { return parseInt(h.slice(k, k + 2), 16) / 255 })
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]
  }
  var rgb = color.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i)
  if (rgb) {
    var c2 = [1, 2, 3].map(function (k) { return parseInt(rgb[k], 10) / 255 })
    return 0.2126 * c2[0] + 0.7152 * c2[1] + 0.0722 * c2[2]
  }
  return null
}
var bgPage = findRootVar('--bg-page')
var lum = bgPage ? luminance(bgPage) : null
var mode = modeArg === 'auto' ? (lum != null && lum < 0.45 ? 'dark' : 'light') : modeArg

/* ---------- 4. 可疑模式 ---------- */
var WHITE_A = /rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0?\.(\d+)\s*\)/gi
/* color-mix(...,#fff) 是把主题色往白里混，属正常用法，不按「白底」判 */
var WHITE_HEX = /(^|[\s,:(])#fff(?:fff)?(?=[\s;,)]|$)/i
function whiteHexHit(value) {
  return !/color-mix/i.test(value) && WHITE_HEX.test(value)
}
var COLD = /rgba\(\s*(37\s*,\s*99\s*,\s*235|147\s*,\s*197\s*,\s*253)[^)]*\)|#(2563eb|3b82f6|93c5fd|60a5fa)(?![0-9a-f])/i
var WHITE_ZERO = /rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\s*\)/i

function whiteish(value, minAlpha) {
  var hit = false
  WHITE_A.lastIndex = 0
  var m
  while ((m = WHITE_A.exec(value))) {
    if (parseFloat('0.' + m[1]) >= minAlpha) hit = true
  }
  return hit
}
function propGroup(name) {
  if (/^border/.test(name)) return 'border'
  if (/^background/.test(name)) return 'background'
  if (name === 'box-shadow') return 'box-shadow'
  if (name === 'text-shadow') return 'text-shadow'
  return name
}
function collect(kind, match) {
  var out = []
  rules.forEach(function (r) {
    Object.keys(r.props).forEach(function (name) {
      var v = r.props[name]
      if (match(name, v)) out.push({ rule: r, prop: name, value: v, group: propGroup(name), kind: kind })
    })
  })
  return out
}

var findings = []
if (mode === 'dark') {
  findings = findings.concat(collect('白描边', function (n, v) { return /^border/.test(n) && (whiteish(v, 0.3) || whiteHexHit(v)) }))
  findings = findings.concat(collect('白底', function (n, v) { return /^background/.test(n) && (whiteish(v, 0.3) || whiteHexHit(v)) }))
  findings = findings.concat(collect('白内高光', function (n, v) { return n === 'box-shadow' && whiteish(v, 0.5) }))
  findings = findings.concat(collect('白文字投影', function (n, v) { return n === 'text-shadow' && whiteish(v, 0.3) }))
}
findings = findings.concat(collect('冷色焦点', function (n, v) { return COLD.test(v) }))
findings = findings.concat(collect('白色渐隐起点', function (n, v) { return /^background/.test(n) && WHITE_ZERO.test(v) && /gradient/i.test(v) }))

/* ---------- 5. 覆盖判定：类名超集 + 同属性组 ---------- */
function classTokens(selector) {
  var m = selector.match(/\.[A-Za-z0-9_-]+/g)
  if (m) return m
  var tag = selector.match(/^[a-zA-Z][a-zA-Z0-9]*/)
  return tag ? [tag[0]] : []
}
/* 覆盖判定用「类名集合完全相同」而不是包含关系：
 * 后位规则多一个 .is-selected 就只作用于子集元素，不能证明基础态被覆盖（否则会漏报）。 */
function sameSet(a, b) {
  var x = a.slice().sort().join('|')
  var y = b.slice().sort().join('|')
  return x === y
}
/* 交互态必须一致：:hover 规则不能覆盖基础态（反之亦然），否则会误判「已覆盖」 */
var STATE_RE = /:(hover|focus-visible|focus-within|focus|active|checked|disabled|before|after)\b/g
function statesOf(selector) {
  var out = []
  var m
  STATE_RE.lastIndex = 0
  while ((m = STATE_RE.exec(selector))) out.push(m[1])
  return out.sort().join(',')
}
function covered(f) {
  var ft = classTokens(f.rule.selectors[0])
  for (var i = 0; i < rules.length; i++) {
    var r = rules[i]
    if (r === f.rule || r.line < f.rule.line) continue
    var declaredSame = Object.keys(r.props).some(function (p) { return propGroup(p) === f.group })
    if (!declaredSame) continue
    for (var k = 0; k < r.selectors.length; k++) {
      var rt = classTokens(r.selectors[k])
      /* 后位规则的交互态必须是原规则的子集（基础态不带 :hover，就不能被 :hover 规则覆盖） */
      var fs = statesOf(f.rule.selectors[0])
      var rs = statesOf(r.selectors[k])
      if (rs !== '' && fs.indexOf(rs) < 0 && rs !== fs) continue
      if (sameSet(rt, ft)) return true
    }
  }
  return false
}

/* ---------- 6. 直角光圈：box-shadow 0 0 0 Npx，但相关选择器没有 border-radius ---------- */
var rings = []
rules.forEach(function (r) {
  var v = r.props['box-shadow']
  if (!v) return
  var stripped = v.replace(/rgba?\([^)]*\)/g, '').replace(/var\([^)]*\)/g, '')
  if (!/(^|[\s,])0\s+0\s+0\s+[1-9]/.test(stripped)) return
  var tokens = classTokens(r.selectors[0])
  var hasRadius = rules.some(function (x) {
    if (!x.props['border-radius']) return false
    return x.selectors.some(function (s) {
      var xt = classTokens(s)
      return xt.some(function (t) { return tokens.indexOf(t) >= 0 })
    })
  })
  if (!hasRadius) rings.push({ rule: r, tokens: tokens, value: v })
})

/* ---------- 7. 输出 ---------- */
var uncovered = findings.filter(function (f) { return !covered(f) })
var byKind = {}
findings.forEach(function (f) {
  if (!byKind[f.kind]) byKind[f.kind] = { total: 0, open: 0 }
  byKind[f.kind].total++
})
uncovered.forEach(function (f) { byKind[f.kind].open++ })

console.log('主题硬编码审计: ' + path.basename(file) + '（' + mode + ' 主题' + (bgPage ? '，--bg-page=' + bgPage : '') + '）')
console.log('规则 ' + rules.length + ' 条 · 可疑声明 ' + findings.length + ' 处 · 未覆盖 ' + uncovered.length + ' 处')

Object.keys(byKind).forEach(function (k) {
  var b = byKind[k]
  console.log('  ' + (b.open === 0 ? '✅' : '❌') + ' ' + k + ': ' + b.total + ' 处，已覆盖 ' + (b.total - b.open) + '，未覆盖 ' + b.open)
})

if (uncovered.length) {
  console.log('\n❌ 未覆盖清单:')
  uncovered.forEach(function (f) {
    console.log('  L' + f.rule.line + '  [' + f.kind + '] ' + f.rule.selector)
    console.log('        ' + f.prop + ': ' + f.value.slice(0, 110))
  })
  console.log('\n修复：在 theme.css 用**同一选择器或更具体选择器**在后位重写该属性；')
  console.log('只改 :root 变量无效——这些都是写死的字面量。')
}

if (rings.length) {
  console.log('\n' + (strictRings ? '❌' : '⚠') + ' 直角光圈（box-shadow 画环，未在同名/相关选择器上找到 border-radius）:')
  rings.forEach(function (r) {
    console.log('  L' + r.rule.line + '  ' + r.rule.selector)
    console.log('        ' + r.value.slice(0, 110))
  })
  console.log('  说明：光圈沿元素外接矩形绘制，元素没有圆角就是直角框。')
  console.log('  注意：若圆角来自另一条同样作用于该元素的规则（如 .btn-icon），此处会是误报，需目测确认。')
}

var fail = uncovered.length > 0 || (strictRings && rings.length > 0)
if (!fail) {
  console.log('\n✅ PASS：未发现未覆盖的主题硬编码残留')
  process.exit(0)
}
if (warnOnly) {
  console.log('\n⚠ 已发现问题（--warn-only，退出码 0）')
  process.exit(0)
}
process.exit(1)
