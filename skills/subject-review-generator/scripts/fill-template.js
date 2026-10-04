#!/usr/bin/env node
/* fill-template.js — 模板填充器：识别 RV-TEMPLATE 单文件基础模板，注入 data.json 数据，输出成品网页
 * 用法: node fill-template.js <模板.html> <data.json> <输出.html>
 *
 * 数据映射（data.json → 模板数据结构）：
 *   categories[] → KNOWLEDGE_CATEGORIES[]（结构已兼容）
 *   questions[type=single]      → QUESTION_BANK.choice      （answer=正确选项索引）
 *   questions[type=multi]       → QUESTION_BANK.multi       （answer=索引数组）
 *   questions[type=tf]          → QUESTION_BANK.truefalse   （answer=对|错）
 *   questions[type=fill]        → QUESTION_BANK.fill        （answer=填空答案）
 *   questions[type=terminology] → QUESTION_BANK.terminology （term=题干, fullAnswer=答案）
 *   questions[type=essay]       → QUESTION_BANK.essay       （answer=简答要点）
 *
 * 占位替换：{{学科名}} / {{副标题}} / {{学科图标}} / STORAGE_FAV、STORAGE_WRONG 前缀
 */
'use strict'
const fs = require('fs')
const path = require('path')

if (process.argv.length < 5) {
  console.error('用法: node fill-template.js <模板.html> <data.json> <输出.html>')
  process.exit(1)
}
/* 用相对路径（基于当前工作目录），便于 skill 文件夹整体移动 */
const tplPath = process.argv[2]
const dataPath = process.argv[3]
const outPath = process.argv[4]

if (!fs.existsSync(tplPath) || !fs.existsSync(dataPath)) {
  console.error('找不到模板或数据: ' + tplPath + ' / ' + dataPath + '（相对路径基于当前工作目录）')
  process.exit(1)
}
let tpl
let data
try {
  tpl = fs.readFileSync(tplPath, 'utf8')
  data = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
} catch (e) {
  console.error('读取/解析失败（data.json 请保存为 UTF-8 编码的 JSON）: ' + e.message)
  process.exit(1)
}

/* ---- 模板识别 ---- */
if (!tpl.includes('RV-TEMPLATE')) {
  console.warn('警告: 目标文件不含 RV-TEMPLATE 标记，可能不是基础单文件模板')
}

/* ---- 数据转换 ---- */
const skipped = []
/* 自动关联 cardId：题干(或填空答案)含概念标题核心词 → 关联知识点（模板「相关题」回跳用） */
function matchCardId(categories, stem, answer) {
  const hay = (stem || '') + ' ' + (answer || '')
  if (!hay.trim()) return ''
  let found = ''
  categories.forEach(c => (c.concepts || []).forEach(k => {
    if (found || !k.title) return
    const core = k.title.split(/[（(]/)[0].trim() /* 标题去括号核心词：CPU（中央处理器）→CPU */
    if (core && core.length >= 2 && hay.indexOf(core) >= 0) found = k.id
  }))
  return found
}
/* choice 答案规范化：兼容数字索引/'A'/'0' → 合法索引数字
 * （模板渲染 labels[q.answer] + q.options[q.answer] 需要索引，防止文本答案 → undefined. undefined） */
const normChoice = function (a, opts) {
  var n = opts ? opts.length : 0
  if (typeof a === 'number') return (a >= 0 && a < n) ? a : 0
  if (typeof a === 'string') {
    var t = a.trim().toUpperCase()
    if (/^[A-Z]$/.test(t)) return Math.min(t.charCodeAt(0) - 65, Math.max(n - 1, 0))
    if (/^\d+$/.test(t)) { var d = parseInt(t, 10); return (d >= 0 && d < n) ? d : 0 }
  }
  return 0
}
const toChoice = data.questions.filter(q => q.type === 'single').map(q => ({
  id: q.id, stem: q.stem, options: q.options || [], answer: normChoice(q.answer, q.options),
  chapter: q.chapter || '', explanation: q.explanation || '',
  cardId: q.cardId || matchCardId(data.categories, q.stem, q.answer)
}))
/* tf 答案规范化：兼容 true/false、1/0、'正确'/'错误'、'T'/'F' → 统一 '对'/'错'
 * （模板判定契约 q.answer === '对'，防止数据端写法不一导致判定颠倒/失效） */
const normTf = function (a) {
  if (a === '对' || a === '正确' || a === true || a === 'true' || a === 1 || a === '1' || a === 'T' || a === 't') return '对'
  if (a === '错' || a === '错误' || a === false || a === 'false' || a === 0 || a === '0' || a === 'F' || a === 'f') return '错'
  return a
}
const toTruefalse = data.questions.filter(q => q.type === 'tf').map(q => ({
  id: q.id, stem: q.stem, options: [], answer: normTf(q.answer),
  chapter: q.chapter || '', explanation: q.explanation || '',
  cardId: q.cardId || matchCardId(data.categories, q.stem, q.answer)
}))
/* multi 答案规范化：索引数组/'A,B'/单个 → 去重合法索引数组（模板多选判题用） */
const normMulti = function (a, opts) {
  var n = opts ? opts.length : 0
  var arr = Array.isArray(a) ? a : (typeof a === 'number' ? [a] : (typeof a === 'string' ? a.split(/[,，、]/).map(s => s.trim()) : []))
  return arr.map(function (x) {
    if (typeof x === 'number') return (x >= 0 && x < n) ? x : 0
    if (typeof x === 'string') {
      var t = x.trim().toUpperCase()
      if (/^[A-Z]$/.test(t)) return Math.min(t.charCodeAt(0) - 65, Math.max(n - 1, 0))
      if (/^\d+$/.test(t)) { var d = parseInt(t, 10); return (d >= 0 && d < n) ? d : 0 }
    }
    return 0
  }).filter(function (v, i, s) { return s.indexOf(v) === i })
}
const toMulti = data.questions.filter(q => q.type === 'multi').map(q => ({
  id: q.id, stem: q.stem, options: q.options || [], answer: normMulti(q.answer, q.options),
  chapter: q.chapter || '', explanation: q.explanation || '',
  cardId: q.cardId || matchCardId(data.categories, q.stem, q.answer)
}))
const toFill = data.questions.filter(q => q.type === 'fill').map(q => ({
  id: q.id, stem: q.stem, options: [], answer: q.answer || '',
  chapter: q.chapter || '', explanation: q.explanation || '',
  cardId: q.cardId || matchCardId(data.categories, q.stem, q.answer)
}))
const toTerminology = data.questions.filter(q => q.type === 'terminology').map(q => ({
  id: q.id, term: q.stem, chapter: q.chapter || '',
  explanation: q.answer || '', fullAnswer: q.answer || '',
  cardId: q.cardId || matchCardId(data.categories, q.stem, q.answer)
}))
const toEssay = data.questions.filter(q => q.type === 'essay').map(q => ({
  id: q.id, stem: q.stem, options: [], answer: q.answer || '',
  chapter: q.chapter || '', explanation: q.explanation || '',
  cardId: q.cardId || matchCardId(data.categories, q.stem, q.answer)
}))

/* 概念子分类：concept.subcategory=子分类 id；subcategoryKey=「章节id/子分类id」全局唯一（防跨章节同 id 冲突）；
 * subcategoryName=显示名。模板按 subcategoryKey 过滤、详情显示用 subcategoryName */
const categories = (data.categories || []).map(c => ({
  ...c,
  concepts: (c.concepts || []).map(k => {
    const sub = (c.subcategories || []).find(s => s.id === k.subcategory) || (c.subcategories || []).find(s => s.name === k.subcategory)
    if (sub) return { ...k, subcategory: sub.id, subcategoryKey: c.id + '/' + sub.id, subcategoryName: sub.name }
    return k
  })
}))
const questionBank = { choice: toChoice, multi: toMulti, truefalse: toTruefalse, fill: toFill, terminology: toTerminology, essay: toEssay }

/* ---- 占位替换（跨行非贪婪匹配整个数据块，模板占位为「声明 + 注释 + 收尾」多行结构） ---- */
/* 占位替换：
 *  - 行尾兼容 CRLF：Windows 下模板以 \r\n 保存时数组结束行是 \r\n];，原 \n\]; 会失配导致静默不替换
 *  - 一律函数式 replace：避免 replacement 字符串里 $&/$1 等记号被展开破坏产物
 *  - 数据注入转义 </script>：防 data.json 含该串时提前闭合脚本标签
 *  - 替换后校验：两个数据占位必须命中，否则报错退出而非静默出空页面
 */
const jsonSafe = obj => JSON.stringify(obj).replace(/<\/script>/g, '<\\/script>')
let dataHits = 0
const rep = (pat, get) => { tpl = tpl.replace(pat, () => get()) }
rep(/const KNOWLEDGE_CATEGORIES = \[[\s\S]*?\r?\n\];/, () => { dataHits++; return 'const KNOWLEDGE_CATEGORIES = ' + jsonSafe(categories) + ';' })
rep(/const QUESTION_BANK = \{[\s\S]*?\r?\n\};/, () => { dataHits++; return 'const QUESTION_BANK = ' + jsonSafe(questionBank) + ';' })
rep(/\{\{学科名\}\}/g, () => data.subject || '学科')
rep(/\{\{副标题\}\}/g, () => data.subtitle || '期末复习')
rep(/\{\{学科图标\}\}/g, () => data.icon || '📚')
/* localStorage 前缀学科化，避免多学科串数据（slug 空时兜底，防键变 _favorites） */
let slug = (data.subject || 'subject').replace(/[^\w一-龥]/g, '')
if (!slug) slug = 'subject'
rep(/const STORAGE_FAV = '[^']*'/, () => "const STORAGE_FAV = '" + slug + "_favorites'")
rep(/const STORAGE_WRONG = '[^']*'/, () => "const STORAGE_WRONG = '" + slug + "_wrongbook'")
/* v3 Soft UI：进度（章节展开/筛选/选中详情）也按学科隔离 */
if (/const STORAGE_PROGRESS = '[^']*'/.test(tpl)) {
  rep(/const STORAGE_PROGRESS = '[^']*'/, () => "const STORAGE_PROGRESS = '" + slug + "_progress'")
}
const isV3 = tpl.includes('v3 Soft UI') || tpl.includes('--elev-card')
if (dataHits < 2) {
  console.error('错误: 模板数据占位未匹配替换（命中 ' + dataHits + '/2），请确认模板含 const KNOWLEDGE_CATEGORIES = [...] 与 const QUESTION_BANK = {...}')
  process.exit(1)
}

fs.writeFileSync(outPath, tpl, 'utf8')

const report = [
  '--- 模板填充报告 ---',
  '模板: ' + tplPath + (isV3 ? ' [v3 Soft UI]' : ''),
  '数据: ' + dataPath,
  '输出: ' + outPath,
  '知识点分类: ' + categories.length + ' 章',
  'choice: ' + toChoice.length + ' | multi: ' + toMulti.length + ' | truefalse: ' + toTruefalse.length + ' | fill: ' + toFill.length + ' | terminology: ' + toTerminology.length + ' | essay: ' + toEssay.length,
  skipped.length ? '跳过题: ' + skipped.join(', ') : '无跳过题',
  'localStorage 键: ' + slug + '_favorites / ' + slug + '_wrongbook' + (isV3 ? ' / ' + slug + '_progress' : '')
].join('\n')
console.log(report)
const reportPath = outPath + '-fill-report.txt'
fs.writeFileSync(reportPath, report, 'utf8')
