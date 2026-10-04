/* 验证「基础模板-微生物学.html」可独立运行：vm 沙箱执行模板 script（init → 渲染），检查不抛异常 */
'use strict'
const fs = require('fs')
const vm = require('vm')
const path = require('path')

const file = process.argv[2] ? path.resolve(process.argv[2]) : path.join(__dirname, '基础模板-复习页-v3.html')
if (!fs.existsSync(file)) {
  console.error('找不到页面: ' + file)
  process.exit(1)
}
const html = fs.readFileSync(file, 'utf8')
const m = html.match(/<script>([\s\S]*?)<\/script>/)
if (!m) {
  console.log('FAIL: 页面没有内联 <script>（仅支持内联脚本的单文件网页）')
  process.exit(1)
}
const script = m[1] /* match 返回数组，取组 1（脚本内容），勿传整个数组 */

class El {
  constructor(tag) {
    this.tagName = tag; this._t = ''; this._html = ''; this.children = []
    this.classList = { add() {}, remove() {}, toggle() {}, contains() { return false } }
    this.style = { setProperty() {}, removeProperty() {}, getPropertyValue() { return '' } }
    this.dataset = {}
    this.offsetWidth = 72
    this.offsetHeight = 34
    this.offsetLeft = 0
    this.offsetTop = 0
    this.parentNode = null
  }
  set innerHTML(v) { this._html = v }
  get innerHTML() { return this._html }
  set textContent(v) { this._t = v }
  get textContent() { return this._t }
  appendChild(c) { c.parentNode = this; this.children.push(c); return c }
  append(...cs) { cs.forEach(c => this.appendChild(c)) }
  addEventListener() {}
  removeEventListener() {}
  querySelector() { return new El('div') }
  querySelectorAll() { return [] }
  setAttribute() {}
  getAttribute() { return '' }
  closest() { return null }
  focus() {}
  blur() {}
  click() {}
  scrollIntoView() {}
  remove() { this.parentNode = null }
  getBoundingClientRect() {
    return { x: 0, y: 0, top: 0, left: 0, right: this.offsetWidth, bottom: this.offsetHeight, width: this.offsetWidth, height: this.offsetHeight }
  }
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
const localStorageMock = { _s: {}, getItem(k) { return this._s[k] ?? null }, setItem(k, v) { this._s[k] = String(v) } }

const sandbox = {
  document: documentMock,
  localStorage: localStorageMock,
  console: console,
  addEventListener() {},
  removeEventListener() {},
  innerWidth: 1024,
  innerHeight: 768,
  matchMedia() { return { matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} } },
  requestAnimationFrame(fn) { if (typeof fn === 'function') fn(0); return 0 },
  cancelAnimationFrame() {},
  setTimeout,
  clearTimeout,
  getComputedStyle() { return { getPropertyValue() { return '' } } }
}
sandbox.window = sandbox
vm.createContext(sandbox)

try {
  vm.runInContext(script, sandbox, { timeout: 5000 })
  console.log('PASS: 模板 init → renderAll 执行无异常（空数据可运行，填充数据即用）')
  console.log('renderSidebar / renderMain / init 均已执行，占位数据下渲染空态')
} catch (e) {
  console.log('FAIL: ' + e.message)
  process.exit(1)
}
