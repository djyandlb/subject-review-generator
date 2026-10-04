/* 生成「基础模板-微生物学.html」：一比一搬运微生物学模板 CSS/HTML/JS 逻辑，
 * 数据占位（模版化）+ 参数化（配色变量化、标题符号占位）+ RV-TEMPLATE 识别标记。
 * 源文件：samples/微生物学与免疫学复习.html
 */
'use strict'
const fs = require('fs')
const path = require('path')

const srcPath = path.join(__dirname, '微生物学与免疫学复习.html')
if (!fs.existsSync(srcPath)) {
  console.error('找不到源文件: ' + srcPath)
  process.exit(1)
}
const src = fs.readFileSync(srcPath, 'utf8')
const lines = src.split('\n')

/* ---- 边界校验 ----
 * 注意：本脚本按「微生物学与免疫学复习.html」的固定行号切片生成模板。
 * 若源文件结构变化（增删行），下方行号锚点会失配——先改 checks 的行号再生成；
 * 产物自校验（RV-TEMPLATE/{{学科名}} 等标记）会兜底拦截坏产物，不会静默产出坏模板。 */
const checks = [
  [2533, '];'],
  [2536, 'const QUESTION_BANK = {'],
  [4492, '};'],
  [4497, 'const STORAGE_FAV']
]
for (const [ln, expect] of checks) {
  const got = lines[ln - 1].trim()
  if (!got.startsWith(expect)) {
    console.error(`边界校验失败 行${ln}: 期望"${expect}" 实际"${got}"`)
    process.exit(1)
  }
}

/* ---- 配色参数化：硬编码学科色 → CSS 变量（仅作用于 :root 之外，避免自引用） ---- */
const COLOR_MAP = [
  ['#ffffff', 'var(--color-on-header)'],
  ['#fff', 'var(--color-on-header)'],
  ['#1a5276', 'var(--color-primary)'],
  ['#8e44ad', 'var(--color-accent)'],
  ['#c0392b', 'var(--color-master)'],
  ['#0d2b45', 'var(--color-header)'],
  ['#e0e6ed', 'var(--color-border)'],
  ['#e8ecf1', 'var(--color-border-soft)'],
  ['#f7f9fb', 'var(--bg-sidebar)'],
  ['#fafbfc', 'var(--bg-soft)'],
  ['#eafaf1', 'var(--color-correct-bg)'],
  ['#fdecea', 'var(--color-wrong-bg)'],
  ['#ffeaea', 'var(--color-master-bg)'],
  ['#fff8e8', 'var(--color-familiar-bg)'],
  ['#e8f1fa', 'var(--color-understand-bg)'],
  ['#fefdf0', 'var(--color-hint-bg)'],
  ['#f0c040', 'var(--color-star)'],
  ['#1a6b3a', 'var(--color-correct-text)'],
  ['#a51c1c', 'var(--color-wrong-text)'],
  ['rgba(13,43,69,', 'rgba(var(--header-rgb),'],
  ['rgba(142,68,173,', 'rgba(var(--accent-rgb),']
]
function parametrizeCss(css) {
  let out = css
  for (const [from, to] of COLOR_MAP) {
    /* #fff 用后向断言：不匹配 #fffa 这类 4 位 hex（否则误伤成 var(--color-on-header)a） */
    if (from === '#fff') out = out.replace(/#fff(?![0-9a-fA-F])/g, to)
    else out = out.split(from).join(to)
  }
  return out
}
/* :root 追加补充变量（配色集中修改点） */
const EXTRA_VARS = ';--color-border:#e0e6ed;--color-border-soft:#e8ecf1;--bg-sidebar:#f7f9fb;--bg-soft:#fafbfc;--header-rgb:13, 43, 69;--accent-rgb:142, 68, 173;--color-on-header:#fff;--color-correct-bg:#eafaf1;--color-wrong-bg:#fdecea;--color-master-bg:#ffeaea;--color-familiar-bg:#fff8e8;--color-understand-bg:#e8f1fa;--color-hint-bg:#fefdf0;--color-star:#f0c040;--color-correct-text:#1a6b3a;--color-wrong-text:#a51c1c'

/* ---- 数据占位（声明与收尾行保留，仅替换中间数据） ---- */
const KNOWN_DATA = [
  '  // ============================================================',
  '  // DATA: KNOWLEDGE_CATEGORIES — 知识点数据（模板化占位，按结构填充后即用）',
  '  // 分类结构：{ id, name, icon, subcategories:[{id,name}], concepts:[{...}] }',
  '  // 概念字段：id / title / subcategory(子分类id) / mastery(掌握|熟悉|了解) / summary(一句话) / content(HTML) / tags[] / isKey(必背)',
  '  // 掌握度由资料判断写入，前端只读；isKey=true 为必背知识点（出题保证覆盖）',
  '  // 填充示例（使用前删除）：',
  '  // { id:"ch00", name:"第一章 绪论", icon:"🔬",',
  '  //   subcategories:[{id:"ch00_0", name:"小节一"}, {id:"ch00_1", name:"小节二"}],',
  '  //   concepts:[{ id:"k001", title:"知识点标题", subcategory:"ch00_0", mastery:"掌握",',
  '  //     summary:"一句话摘要", content:"<p>正文，可含HTML</p>", tags:["标签"], isKey:true }] }'
]
const QUESTION_DATA = [
  '  // ============================================================',
  '  // DATA: QUESTION_BANK — 题库（模板化占位，按结构填充后即用）',
  '  // 结构：choice / truefalse / terminology 各题型数组',
  '  // 题目字段：id / stem(题干) / options[](选项) / answer / chapter(章节id) / explanation(解析) / cardId(关联知识点id)',
  '  //   answer 类型：choice 正确选项索引(number)；truefalse 取值 对|错；terminology 名词解释(term + explanation/fullAnswer)',
  '  // 填充示例（使用前删除）：',
  '  //   choice: [{ id:"c001", stem:"题干", options:["A","B","C","D"], answer:1,',
  '  //             chapter:"", explanation:"解析", cardId:"k001" }]',
  '  choice: [],',
  '  truefalse: [],',
  '  terminology: []'
]

/* ---- 组装 ---- */
const out = []
out.push(...lines.slice(0, 5))                                // 1-5 head 开头
out.push('<title>{{学科名}} {{副标题}}</title>')              // 6 title 占位
out.push('<!-- RV-TEMPLATE: 基础单文件模板 v1 | 数据: KNOWLEDGE_CATEGORIES + QUESTION_BANK | 配色: :root 变量 | 品牌: {{学科名}}/{{副标题}}/{{学科图标}} -->')
const styleBody = lines.slice(7, 302)                         // 8-302 CSS 内容
const rootLine = styleBody[0]                                 // :root 行
/* 匹配 } + 可选 \r + 行尾 追加变量（Windows CRLF 下 :root 行尾是 }\r，\}$ 会失配） */
const rootParam = rootLine.replace(/\}\r?$/, EXTRA_VARS + '}')
const restCss = parametrizeCss(styleBody.slice(1).join('\n')) // 其余 CSS 配色参数化
out.push(lines[6])                                            // 7 <style>
out.push(rootParam)                                           // 8 :root（追加变量）
out.push(restCss)                                             // 9-302 参数化 CSS
out.push(lines[302])                                          // 303 </style>
out.push(lines[303], lines[304])                              // 304 </head> 305 <body>
const bodyHtml = lines.slice(305, 386).map(l =>
  l.replace('微生物学与免疫学', '{{学科名}}')
   .replace('🧬', '{{学科图标}}')
   .replace('期末复习', '{{副标题}}'))
out.push(...bodyHtml)                                         // 306-386 body HTML
out.push(...lines.slice(386, 391))                            // 387-391 script + DATA 注释
out.push(lines[391])                                          // 392 const KNOWLEDGE_CATEGORIES = [
out.push(...KNOWN_DATA)                                       // 数据占位
out.push(lines[2532])                                         // 2533 ];
out.push(lines[2533], lines[2534], lines[2535])               // 2534空 2535注释 2536 const QUESTION_BANK = {
out.push(...QUESTION_DATA)                                    // 数据占位
out.push(lines[4491])                                         // 4492 };
out.push(...lines.slice(4492, 5394))                          // 4493-5394 全部逻辑原样
out.push(...lines.slice(5394))                                // 5395-5397 收尾

const tpl = out.join('\n')

const final = tpl.replace(
  "const STORAGE_WRONG = 'microbio_wrongbook';",
  "const STORAGE_WRONG = 'microbio_wrongbook';\n// 提示：使用前将 STORAGE_FAV / STORAGE_WRONG 前缀改为本学科标识，避免多学科数据串用"
)

/* 产物自校验：关键占位/标记必须存在，缺则说明源文件结构已变化，宁可失败不产出坏模板 */
const required = ['RV-TEMPLATE', '{{学科名}}', '{{学科图标}}', '{{副标题}}',
  'const KNOWLEDGE_CATEGORIES = [', 'const QUESTION_BANK = {']
for (const mark of required) {
  if (!final.includes(mark)) {
    console.error('产物校验失败: 缺少标记 ' + mark + '（源文件结构可能已变化，需核对行号锚点）')
    process.exit(1)
  }
}

const dest = path.join(__dirname, '基础模板-微生物学.html')
fs.writeFileSync(dest, final, 'utf8')
console.log('已生成: ' + dest)
console.log('总行数:', final.split('\n').length)
