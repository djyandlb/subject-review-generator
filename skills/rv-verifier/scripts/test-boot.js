/* boot 端到端冒烟：vm 沙箱 mock DOM，加载 index.html 三个 script，验证 RV.boot 不抛异常
 * 用法: node test-boot.js <index.html>   （缺省读取同级 index.html）
 */
'use strict'
const fs = require('fs')
const vm = require('vm')
const path = require('path')

const target = process.argv[2] ? path.resolve(process.argv[2]) : path.join(__dirname, 'index.html')
if (!fs.existsSync(target)) {
  console.error('找不到页面: ' + target)
  process.exit(1)
}
const html = fs.readFileSync(target, 'utf8')
const scripts = []
const re = /<script>([\s\S]*?)<\/script>/g
let m
while ((m = re.exec(html))) scripts.push(m[1])
if (scripts.length === 0) {
  console.log('FAIL: 页面没有内联 <script>（成品必须内联脚本，无法执行 boot 验证）')
  process.exit(1)
}

/* ---- 简易 DOM mock ---- */
class El {
  constructor(tag) {
    this.tagName = tag
    this._t = ''
    this._html = ''
    this.children = []
    this._attrs = {}
    this.style = { setProperty() {}, getPropertyValue() { return '' }, removeProperty() {} }
    this.dataset = {}
    this.classList = { add() {}, remove() {}, toggle() {}, contains() { return false } }
  }
  /* 尺寸/位置接口：模板与增强脚本会读 rect 做定位（缺失会抛 TypeError 误判页面异常） */
  getBoundingClientRect() { return { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0 } }
  get offsetWidth() { return 0 }
  get offsetHeight() { return 0 }
  get offsetTop() { return 0 }
  get offsetLeft() { return 0 }
  get clientWidth() { return 0 }
  get clientHeight() { return 0 }
  get scrollTop() { return 0 }
  set scrollTop(v) {}
  get scrollHeight() { return 0 }
  set innerHTML(v) { this._html = v }
  get innerHTML() { return this._html }
  set textContent(v) { this._t = v }
  get textContent() { return this._t }
  appendChild(c) { this.children.push(c); return c }
  append(...cs) { cs.forEach(c => this.children.push(c)) }
  insertBefore(c) { this.children.push(c); return c }
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
  setAttribute(k, v) { this._attrs[k] = v }
  getAttribute(k) { return this._attrs[k] || '' }
  removeAttribute() {}
  closest() { return null }
  matches() { return false }
  contains() { return false }
  scrollIntoView() {}
  focus() {}
  blur() {}
  remove() {}
}

const documentMock = {
  createElement(tag) {
    if (tag === 'template') { const t = new El('template'); t.content = { firstChild: new El('div') }; return t }
    return new El(tag)
  },
  getElementById() { return new El('div') },
  querySelector() { return new El('div') },
  querySelectorAll() { return [] },
  addEventListener(type, fn) { if (type === 'DOMContentLoaded') fn() }
}
const localStorageMock = {
  _s: {},
  getItem(k) { return Object.prototype.hasOwnProperty.call(this._s, k) ? this._s[k] : null },
  setItem(k, v) { this._s[k] = String(v) }
}

/* vm 沙箱：window 指向全局对象，window.RV 与裸 RV 等价 */
const sandbox = { document: documentMock, localStorage: localStorageMock }
/* 浏览器 API 桩：模板/增强脚本可能使用（缺失会误判「页面脚本异常」） */
sandbox.requestAnimationFrame = function (fn) { try { fn(0) } catch (e) {} return 0 }
sandbox.cancelAnimationFrame = function () {}
sandbox.setTimeout = setTimeout
sandbox.clearTimeout = clearTimeout
sandbox.getComputedStyle = function () { return { getPropertyValue() { return '' } } }
sandbox.matchMedia = function () { return { matches: false, addEventListener() {}, addListener() {} } }
sandbox.window = sandbox
sandbox.window.addEventListener = function () {}
sandbox.window.removeEventListener = function () {}
sandbox.addEventListener = sandbox.window.addEventListener
sandbox.removeEventListener = sandbox.window.removeEventListener
vm.createContext(sandbox)

const errors = []
scripts.forEach((src, i) => {
  try { vm.runInContext(src, sandbox, { filename: 'script' + i }) }
  catch (e) { errors.push('script' + i + ': ' + e.message) }
})

if (errors.length) {
  console.log('FAIL 页面脚本异常:')
  errors.forEach(e => console.log('  ' + e))
  process.exit(1)
} else {
  console.log('PASS: 页面脚本执行无异常')
  const ctx = sandbox.RV && sandbox.RV.ctx
  if (ctx) {
    /* 模块化架构：RV.boot 已建 ctx */
    console.log('[模块化] ctx.dom 填充数:', Object.keys(ctx.dom).length)
    console.log('[模块化] ctx.ui.view:', ctx.ui.view)
    console.log('[模块化] 初始主区已渲染:', ctx.dom.appMain && ctx.dom.appMain.innerHTML.indexOf('concept-grid') >= 0)
    if (ctx.conceptMatchesSearch) {
      const c = { title: 'CPU（中央处理器）', content: '<p>CPU 由运算器、控制器、寄存器组组成</p>' }
      console.log('[模块化] 搜索 title 命中:', ctx.conceptMatchesSearch(c, '中央处理器') === true)
      console.log('[模块化] 搜索 content 命中:', ctx.conceptMatchesSearch(c, '运算器') === true)
      console.log('[模块化] 搜索 无命中:', ctx.conceptMatchesSearch(c, '完全不存在词') === false)
    }
  } else {
    /* 模板架构：模板自带 init 体系，验证关键全局函数就绪 */
    const need = ['init', 'getAllConceptsFlat', 'getConceptById', 'getQuestionBank', 'renderAll',
      'parseContentEnhancements', 'bindEnhancements', 'renderDetailPanel']
    const missing = need.filter(f => typeof sandbox[f] !== 'function')
    if (missing.length) console.log('[模板] 缺函数: ' + missing.join(', '))
    else console.log('[模板] 核心函数 ' + need.length + ' 个全部就绪 ✅')
    if (typeof sandbox.renderAll === 'function') {
      try {
        sandbox.renderAll()
        console.log('[模板] renderAll 执行无异常 ✅')
      } catch (e) {
        console.log('[模板] renderAll 异常: ' + e.message)
      }
    }
    if (typeof sandbox.parseContentEnhancements === 'function') {
      try {
        const r = sandbox.parseContentEnhancements('【对比表:甲 vs 乙】\n- 键 | 左 | 右')
        console.log('[模板] 增强解析(对比表):', r && r.indexOf('对比项') >= 0 ? '✅' : '❌')
      } catch (e) {
        console.log('[模板] 增强解析异常: ' + e.message)
      }
    }
  }
}
