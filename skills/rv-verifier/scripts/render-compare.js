/* render-compare.js — UI 一致性校验（rv-verifier 工具）
 * 用法: node render-compare.js <成品.html> <原模板.html>
 * 原理：加载两文件渲染，提取侧边栏/主区渲染出的 UI 类名集合，
 *       对比结构性类名是否一致（忽略数据相关类：展开状态/掌握度徽章/必背标记）。
 * 输出：PASS（UI 骨架一致）或 FAIL（列出差异类名）。
 */
'use strict'
const fs = require('fs')
const vm = require('vm')

/* 数据相关类（允许差异，不算结构破坏）：展开状态 / 掌握度徽章 / 必背标记 / 收藏态 / 空态 */
const DATA_CLASSES = new Set(['expanded', 'active', 'favorited', 'is-key',
  'badge-master', 'badge-familiar', 'badge-understand',
  'mastery-zhangwo', 'mastery-shuxi', 'mastery-lejie',
  'empty-state', 'empty-state-icon', 'empty-state-text'])

function renderAndCollect(file) {
  const html = fs.readFileSync(file, 'utf8')
  /* 收集全部内联 script 块（单文件页可能拆多个块：数据/模块/启动），逐个执行 */
  const scripts = []
  const sre = /<script>([\s\S]*?)<\/script>/g
  let mm
  while ((mm = sre.exec(html))) scripts.push(mm[1])
  if (!scripts.length) throw new Error('未找到内联 <script>（仅支持内联脚本的单文件网页）')
  const cache = {}
  class El {
    constructor(tag) { this.tagName = tag; this._t = ''; this._html = ''; this.style = { setProperty(){}, getPropertyValue(){return ''}, removeProperty(){} }; this.dataset = {}; this.classList = { add(){}, remove(){}, toggle(){}, contains(){return false} } }
    getBoundingClientRect() { return { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0 } }
    get offsetWidth() { return 0 }
    get offsetHeight() { return 0 }
    get clientWidth() { return 0 }
    get clientHeight() { return 0 }
    get scrollTop() { return 0 }
    set scrollTop(v) {}
    get scrollHeight() { return 0 }
    set innerHTML(v) { this._html = v }
    get innerHTML() { return this._html }
    set textContent(v) { this._t = v }
    get textContent() { return this._t }
    appendChild(c) { return c }
    insertBefore(c) { return c }
    removeChild() {}
    insertAdjacentHTML() {}
    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() { return true }
    click() {}
    querySelector() { return new El('div') }
    querySelectorAll() { return [] }
    getElementsByTagName() { return [] }
    getElementsByClassName() { return [] }
    setAttribute() {} removeAttribute() {} getAttribute() { return '' } closest() { return null } matches() { return false } contains() { return false } scrollIntoView() {} focus() {} blur() {} remove() {}
  }
  const documentMock = {
    createElement(t) { return new El(t) },
    getElementById(id) { if (!cache[id]) cache[id] = new El('div'); if (!cache['#' + id]) cache['#' + id] = cache[id]; return cache[id] },
    querySelector(sel) { if (!cache[sel]) cache[sel] = new El('div'); return cache[sel] },
    querySelectorAll() { return [] },
    addEventListener(t, f) { if (t === 'DOMContentLoaded') f() }
  }
  const localStorageMock = { _s:{}, getItem(k){return this._s[k]??null}, setItem(k,v){this._s[k]=String(v)} }
  const sandbox = { document: documentMock, localStorage: localStorageMock, console, addEventListener(){}, removeEventListener(){}, innerWidth:1024, innerHeight:768 }
  sandbox.requestAnimationFrame = function (fn) { try { fn(0) } catch (e) {} return 0 }
  sandbox.cancelAnimationFrame = function () {}
  sandbox.setTimeout = setTimeout
  sandbox.clearTimeout = clearTimeout
  sandbox.getComputedStyle = function () { return { getPropertyValue() { return '' } } }
  sandbox.matchMedia = function () { return { matches: false, addEventListener() {}, addListener() {} } }
  sandbox.window = sandbox
  vm.createContext(sandbox)
  /* 页面脚本异常必须输出 FAIL 而非裸崩（验收工具不能对坏页面静默失败） */
  try {
    scripts.forEach((src, i) => vm.runInContext(src, sandbox, { timeout: 5000, filename: 'script' + i }))
  } catch (e) {
    console.error('FAIL: 页面脚本执行异常 ' + e.message)
    process.exit(1)
  }
  return cache
}

function collectClasses(html) {
  const cls = new Set()
  const re = /class="([^"]*)"/g
  let m
  while ((m = re.exec(html))) m[1].split(/\s+/).filter(Boolean).forEach(c => cls.add(c))
  return cls
}

/* ---- CSS 结构 + JS 函数数 + 渲染类名 三指标 ---- */
function fileStats(file) {
  const html = fs.readFileSync(file, 'utf8')
  /* 多 style/script 块全部收集求和（只取第一个会漏掉其余块） */
  let cssLines = 0
  const sre = /<style>([\s\S]*?)<\/style>/g
  let sm
  while ((sm = sre.exec(html))) cssLines += sm[1].split('\n').length
  let jsFuncs = 0
  const jre = /<script>([\s\S]*?)<\/script>/g
  let jm
  while ((jm = jre.exec(html))) jsFuncs += (jm[1].match(/function [A-Za-z_]+/g) || []).length
  if (cssLines === 0 || jsFuncs === 0) throw new Error('未找到 <style> 或 <script>')
  return { cssLines, jsFuncs }
}

/* ---- 变量完整性检查：CSS 引用的每个 var(--x) 必须在 :root 有定义 ---- */
/* 防止「参数化替换把色值变 var() 但 :root 缺变量」→ 背景/样式静默失效 */
function checkVars(file) {
  const html = fs.readFileSync(file, 'utf8')
  const style = html.match(/<style>([\s\S]*?)<\/style>/)
  if (!style) return []
  /* 收集全部 :root 块合并变量（主题覆盖可能产生多块） */
  const defined = new Set()
  const rre = /:root\s*\{([\s\S]*?)\}/g
  let rm
  while ((rm = rre.exec(style[1]))) {
    /* 先剥掉 :root 内注释，避免注释行干扰变量提取 */
    const cleanRoot = rm[1].replace(/\/\*[\s\S]*?\*\//g, '')
    cleanRoot.split(';').forEach(v => { const m = v.trim().match(/^(--[\w-]+)/); if (m) defined.add(m[1]) })
  }
  const used = new Set()
  const re = /var\((--[\w-]+)/g
  let m
  while ((m = re.exec(style[1]))) used.add(m[1])
  return [...used].filter(v => !defined.has(v))
}

const [out, tpl] = process.argv.slice(2)
if (!out || !tpl) { console.error('用法: node render-compare.js <成品.html> <原模板.html>'); process.exit(1) }

const A = renderAndCollect(out)
const B = renderAndCollect(tpl)
const sA = A['#sidebarTree'] ? A['#sidebarTree'].innerHTML : ''
const mA = A['#mainContent'] ? A['#mainContent'].innerHTML : ''
const sB = B['#sidebarTree'] ? B['#sidebarTree'].innerHTML : ''
const mB = B['#mainContent'] ? B['#mainContent'].innerHTML : ''

const ca = [...collectClasses(sA + '\n' + mA)].filter(c => !DATA_CLASSES.has(c))
const cb = [...collectClasses(sB + '\n' + mB)].filter(c => !DATA_CLASSES.has(c))
const onlyA = ca.filter(x => !cb.includes(x))
const onlyB = cb.filter(x => !ca.includes(x))

const stA = fileStats(out), stB = fileStats(tpl)
/* 容差判定：成品应 ≥ 模板（patch-enhance/增强注入只会增加 CSS/函数，不会删）；
 * 若成品 < 模板 = 生成链路丢代码 → FAIL（精确相等在「成品经 patch 注入」场景必然误报） */
const cssOk = stA.cssLines >= stB.cssLines
const jsOk = stA.jsFuncs >= stB.jsFuncs
/* 结构一致性：模板/母版有而成品缺的类 = 结构丢失 → FAIL；
 * 成品多出的类多为数据驱动新增（空占位模板 → 填充后渲染分类/卡片），仅提示不判 FAIL */
const uiOk = onlyB.length === 0
const undefA = checkVars(out), undefB = checkVars(tpl)
const varsOk = undefA.length === 0

console.log('=== UI 一致性校验 ===')
console.log('成品: ' + out + ' | 原模板: ' + tpl)
console.log('CSS 行数: 成品=' + stA.cssLines + ' 原=' + stB.cssLines + ' ' + (cssOk ? '✓' : '✗ 不一致'))
console.log('JS 函数: 成品=' + stA.jsFuncs + ' 原=' + stB.jsFuncs + ' ' + (jsOk ? '✓' : '✗ 不一致'))
console.log('渲染 UI 类名: 成品=' + ca.length + ' 原=' + cb.length)
console.log('成品独有类(多为数据驱动新增，非结构问题): ' + (onlyA.length ? onlyA.join(', ') : '无'))
console.log('原模板独有结构性类: ' + (onlyB.length ? onlyB.join(', ') : '无'))
console.log('CSS 未定义变量(背景/样式失效源): ' + (undefA.length ? undefA.join(', ') : '无 ✓'))
console.log('原模板未定义变量: ' + (undefB.length ? undefB.join(', ') : '无 ✓'))
const pass = cssOk && jsOk && uiOk && varsOk
console.log(pass ? '✅ PASS: 成品与原模板 UI 骨架一致 + CSS 变量完整（差异仅数据量）' : '❌ FAIL: UI 不一致或 CSS 变量缺失，检查生成链路')
process.exit(pass ? 0 : 1)
