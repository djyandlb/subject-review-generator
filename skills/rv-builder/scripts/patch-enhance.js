#!/usr/bin/env node
/* patch-enhance.js — 模板增强补丁（rv-builder 核心资产，可复用）
 * 用法: node patch-enhance.js <模板副本路径> [--theme <主题css路径>]
 * 职责: 在「学科模板副本」上应用增强能力（不改总体模板，保持总体模板干净骨架）：
 *   1. 修复掌握度徽章 bug（badge-familiar 背景非法值 → --color-familiar-bg）
 *   2. 动态题型入口（renderQuestionSidebar 按题库实际题型渲染，0 题隐藏）
 *   3. 增强解析（parseContentEnhancements + bindEnhancements：对比表/树/流程/速记卡）
 *   4. 增强入口按钮（header「🎯速览」在收藏与刷题之间）
 *   5. 增强聚合视图（renderMainEnhance + btnEnhance 点击切换）
 *   6. 移动端触控优化（小控件 ≥40px）
 *   7. （可选）主题覆盖：--theme 传 CSS 路径，替换 :root 段
 *   8. 可访问性补齐（关闭类按钮 aria-label + 弹窗 role="dialog"/aria-modal）
 * 幂等：重复运行不重复注入（有标记守卫）。注入标记：<!-- ENH-{name} -->
 */
'use strict'
const fs = require('fs')
const path = require('path')

if (process.argv.length < 3) {
  console.error('用法: node patch-enhance.js <模板副本路径> [--theme <css>]')
  process.exit(1)
}
const P = path.resolve(process.argv[2])
let themePath = null
let modulesArg = null
const argv = process.argv.slice(3)
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--theme' && argv[i + 1]) themePath = path.resolve(argv[i + 1])
  if (argv[i] === '--modules' && argv[i + 1]) modulesArg = argv[i + 1]
}
if (!fs.existsSync(P)) { console.error('模板不存在: ' + P); process.exit(1) }
let out = fs.readFileSync(P, 'utf8')

const guard = name => '/* ENH-' + name + ' */'
const has = name => out.includes(guard(name))
/* 统一守卫写入：定位最后一个 </style> 插入（模板可能多 style 块，避免全堆进第一个）
 * 返回是否写入成功——调用方仅在「全部关键注入点命中」时才写守卫，防「注入失败仍记已注入」 */
function writeGuard(name) {
  const idx = out.lastIndexOf('</style>')
  if (idx < 0) { console.log('  ⚠ 未找到 </style>，守卫「' + name + '」未写入（模板结构异常）'); return false }
  out = out.slice(0, idx) + guard(name) + '\n' + out.slice(idx)
  return true
}

/* ============ 1. 修复掌握度徽章 bug ============ */
function ensureCmpCss() {
  if (out.includes('.enh-cmp,.cmp-wrap{') || (out.includes('.cmp-wrap{') && out.includes('.cmp-table{'))) {
    console.log('  ⏭ [css] cmp/enh 对比表样式已就绪')
    return
  }
  const dual = "/* Enhance markers — support both enh-* (template) and cmp-* (patch-enhance JS) */\n.enh-cmp,.cmp-wrap{margin-top:var(--space-3);border:1px solid var(--color-border);border-radius:var(--radius-md);overflow:hidden;box-shadow:var(--elev-2);background:var(--bg-card);container-type:inline-size}\n.enh-cmp-head,.cmp-head{background:linear-gradient(115deg,var(--color-primary),color-mix(in srgb,var(--color-primary) 70%,var(--color-accent)));color:var(--color-on-header);padding:9px var(--space-3);font-weight:650;font-size:.86rem;box-shadow:0 4px 14px rgba(var(--header-rgb),0.18);line-height:1.35;border-bottom:1px solid rgba(255,255,255,0.12)}\n.enh-cmp-scroll,.cmp-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}\n.enh-cmp-table,.cmp-table{width:100%;min-width:100%;border-collapse:separate;border-spacing:0;font-size:.82rem;table-layout:auto;margin:0}\n.enh-cmp-table th,.cmp-table th{background:var(--bg-soft);color:var(--text-light);text-align:left;padding:8px var(--space-3);border-bottom:1px solid var(--color-border);font-weight:600;vertical-align:top;word-break:break-word;min-width:96px;position:sticky;top:0;z-index:2}\n.enh-cmp-table td,.cmp-table td,.cmp-table .cmp-cell{padding:8px var(--space-3);border-bottom:1px solid var(--color-border-soft);vertical-align:top;line-height:1.55;text-align:left;word-break:break-word;overflow-wrap:anywhere;min-width:96px}\n.enh-cmp-table tr:last-child td,.cmp-table tr:last-child td{border-bottom:none}\n.enh-cmp-table tr:nth-child(even) td,.cmp-table tr:nth-child(even) td{background:var(--bg-soft)}\n.enh-cmp-key,.cmp-key,.cmp-table .cmp-key,.cmp-table th.cmp-key{width:auto;min-width:96px;font-weight:600;color:var(--color-primary);background:var(--bg-card-hover)!important;position:sticky;left:0;z-index:1;box-shadow:1px 0 0 var(--color-border-soft)}\n.enh-cmp-table th.cmp-key,.cmp-table th.cmp-key{z-index:3}\n.enh-cmp-table tr:hover td,.cmp-table tr:hover td{background:var(--hover-bg)}\n.enh-cmp-scroll::-webkit-scrollbar,.cmp-scroll::-webkit-scrollbar{height:8px}\n.enh-cmp-scroll::-webkit-scrollbar-thumb,.cmp-scroll::-webkit-scrollbar-thumb{background:rgba(var(--header-rgb),0.18);border-radius:999px}\n.enh-cmp-scroll::-webkit-scrollbar-track,.cmp-scroll::-webkit-scrollbar-track{background:transparent}\n/* 列数自适应密度：列数越多越紧凑，保证多列表格在详情面板窄容器内也能完整显示 */\n.cmp-table.cmp-cols-3 th,.cmp-table.cmp-cols-3 td{font-size:.8rem;padding:7px 9px;min-width:76px}\n.cmp-table.cmp-cols-4 th,.cmp-table.cmp-cols-4 td{font-size:.79rem;padding:7px 8px;min-width:68px}\n.cmp-table.cmp-cols-5 th,.cmp-table.cmp-cols-5 td{font-size:.755rem;padding:6px 7px;min-width:64px}\n.cmp-table.cmp-cols-6 th,.cmp-table.cmp-cols-6 td{font-size:.72rem;padding:5px 6px;min-width:56px}\n.cmp-table.cmp-cols-7 th,.cmp-table.cmp-cols-7 td,.cmp-table.cmp-cols-8 th,.cmp-table.cmp-cols-8 td{font-size:.7rem;padding:5px 5px;min-width:50px}\n.cmp-table[class*=cmp-cols-] td.cmp-key,.cmp-table[class*=cmp-cols-] th.cmp-key{min-width:60px}\n/* 窄容器：列宽按内容自适应贴合容器——min-width 归零让 auto 布局可压缩，配合 overflow-wrap 换行，表格宽 = 容器宽，既不横向滚动也不裁列 */\n@container (max-width:364px){.cmp-table th,.cmp-table td,.cmp-table[class*=cmp-cols-] th,.cmp-table[class*=cmp-cols-] td{min-width:0}}\n/* 窄容器可选开关：给表格加 .cmp-wide 类即在此宽度下转为「按属性分组的纵向列表」。渲染端默认不输出该类——面板内保持表格并横向滚动（首列冻结 + 标题钉住），纵向列表仅在移动端视口(≤560px)生效。 */\n@container (max-width:364px){.cmp-table.cmp-wide,.cmp-table.cmp-wide tbody,.cmp-table.cmp-wide tr,.cmp-table.cmp-wide td{display:block;width:auto;min-width:0}.cmp-table.cmp-wide thead{display:none}.cmp-table.cmp-wide tr{border-bottom:1px solid var(--color-border-soft);padding:var(--space-1) 0}.cmp-table.cmp-wide tr:last-child{border-bottom:none}.cmp-table.cmp-wide td{border-bottom:none;padding:0}.cmp-table.cmp-wide tr:nth-child(even) td{background:transparent}.cmp-table.cmp-wide td.cmp-key{font-weight:650;color:var(--color-primary);background:var(--bg-soft)!important;padding:5px var(--space-3);margin-bottom:2px;position:static;box-shadow:none}.cmp-table.cmp-wide td.cmp-cell{display:flex;gap:var(--space-2);padding:4px var(--space-3);font-size:.79rem}.cmp-table.cmp-wide td.cmp-cell::before{content:attr(data-col);flex:0 0 4.8em;color:var(--text-muted);font-weight:500;overflow-wrap:anywhere}.cmp-table.cmp-wide td.cmp-cell:empty{display:none}}\n@media(max-width:560px){.cmp-table,.cmp-table tbody,.cmp-table tr,.cmp-table td{display:block;width:auto;min-width:0}.cmp-table thead{display:none}.cmp-table tr{border-bottom:1px solid var(--color-border-soft);padding:var(--space-1) 0}.cmp-table tr:last-child{border-bottom:none}.cmp-table td{border-bottom:none;padding:0}.cmp-table tr:nth-child(even) td{background:transparent}.cmp-table td.cmp-key{font-weight:650;color:var(--color-primary);background:var(--bg-soft)!important;padding:5px var(--space-3);margin-bottom:2px;position:static;box-shadow:none}.cmp-table td.cmp-cell{display:flex;gap:var(--space-2);padding:4px var(--space-3);font-size:.79rem}.cmp-table td.cmp-cell::before{content:attr(data-col);flex:0 0 4.8em;color:var(--text-muted);font-weight:500;overflow-wrap:anywhere}.cmp-table td.cmp-cell:empty{display:none}}\n.enh-tree,.enh-flow,.enh-fc{margin-top:var(--space-3);border:1px solid var(--color-border);border-radius:var(--radius-md);padding:var(--space-3);background:var(--bg-card);box-shadow:var(--elev-2),var(--inset-highlight)}\n.enh-tree-title,.enh-flow-title,.enh-fc-title{font-family:var(--font-heading);font-weight:650;font-size:.86rem;margin-bottom:var(--space-2);color:var(--color-primary)}\n.enh-tree-row{padding-top:2px;font-size:.82rem;line-height:1.5}\n.enh-tree-row.lvl-1{font-weight:600}\n.enh-flow-steps{display:flex;flex-wrap:wrap;gap:var(--space-1);align-items:center}\n.enh-flow-step{background:var(--bg-soft);padding:var(--space-1) var(--space-3);border-radius:999px;font-size:.76rem;border:1px solid var(--color-border-soft);box-shadow:var(--elev-1);transition:background var(--transition-fast),border-color var(--transition-fast),box-shadow var(--transition-fast)}\n.enh-flow-step:hover{background:var(--hover-bg);border-color:rgba(var(--accent-rgb),0.28);box-shadow:var(--elev-2)}\n.enh-fc-card,.fc-card{border:1px solid var(--color-border-soft);border-radius:var(--radius-sm);padding:var(--space-2) var(--space-3);margin-bottom:var(--space-1);cursor:pointer;font-size:.82rem;background:var(--bg-card);box-shadow:var(--elev-1);transition:box-shadow var(--transition-fast),border-color var(--transition-fast),transform var(--transition-fast)}\n.enh-fc-card:hover,.fc-card:hover{box-shadow:var(--elev-2);border-color:rgba(var(--accent-rgb),0.22);transform:translateY(-1px)}\n.enh-fc-q,.fc-q{font-weight:600}\n.enh-fc-a,.fc-a{display:none;margin-top:var(--space-1);color:var(--color-primary);padding-top:var(--space-1);border-top:1px dashed var(--color-border-soft);animation:reveal-in var(--duration-fast) var(--ease) both}\n.enh-fc-card.open .enh-fc-a,.fc-card.open .fc-a{display:block}"
  const mark = '</style>'
  const i = out.lastIndexOf(mark)
  if (i < 0) { console.log('  ⚠ [css] 未找到 </style>，跳过对比表样式'); return }
  out = out.slice(0, i) + '\n' + dual + '\n' + out.slice(i)
  console.log('  ✅ [css] 已挂载 cmp/enh 对比表双选择器样式')
}

function fixBadge() {
  if (has('badge')) return
  /* v3 Soft UI：卡片角标是 3/2/1 竖线，禁止再用实心底色「修复」盖掉 */
  if (out.includes('v3 Soft UI') || out.includes('--elev-card') || out.includes('Mastery marks: 3/2/1')) {
    console.log('  ⏭ [1] v3 Soft UI 竖线角标，跳过旧 badge 实心修复')
    return
  }
  let fixed = false
  const bad = '.badge-familiar{background:var(--color-on-header)8e8;color:var(--color-familiar)}'
  const good = '.badge-familiar{background:var(--color-familiar-bg);color:var(--color-familiar)}'
  if (out.includes(bad)) { out = out.replace(bad, good); fixed = true }
  else if (!out.includes(good) && out.includes('.badge-familiar{')) {
    out = out.replace(/\.badge-familiar\{[^}]*\}/, good)
    fixed = true
  }
  if (fixed) { if (writeGuard('badge')) console.log('  ✅ [1] 掌握度徽章 bug 修复') }
  else console.log('  ⚠ [1] 未发现需修复的 badge-familiar 规则，跳过')
}

/* ============ 2. 动态题型入口 ============ */
function patchDynamicTabs() {
  if (has('tabs')) return
  const oldStart = 'function renderQuestionSidebar() {'
  const idx = out.indexOf(oldStart)
  if (idx < 0) { console.log('  ⚠ [2] 未找到 renderQuestionSidebar，跳过'); return }
  /* 找到 tabs 数组定义到第一个 for 循环前，整体替换 */
  const tabsMark = '  const tabs = ['
  let tIdx = out.indexOf(tabsMark, idx)
  /* 兼容已有 typeDefs 动态版：若已应用则补标记并跳过 */
  if (tIdx < 0 && out.includes('typeDefs') && out.includes('.filter(t => (bank[t.id] || []).length > 0)')) {
    if (writeGuard('tabs')) console.log('  ✅ [2] 动态题型已存在，补标记')
    return
  }
  if (tIdx < 0) { console.log('  ⚠ [2] 未找到 tabs 定义，跳过'); return }
  /* 定位 tabs 数组结束（到 ] 后的分号）
   * 注意：arrStart 已在外层 [ 之后，depth 须从 1 起——否则内层 (bank.choice||[]) 的 [ ] 会误判为数组结束 */
  const arrStart = tIdx + tabsMark.length
  let depth = 1, end = -1
  for (let i = arrStart; i < out.length; i++) {
    if (out[i] === '[') depth++
    else if (out[i] === ']') { depth--; if (depth === 0) { end = i + 1; break } }
  }
  /* 防御：数组未配平（模板结构异常）时宁可失败，也不让 out.slice(end) 清空整个文件 */
  if (end < 0) { console.log('  ⚠ [2] tabs 数组定义未配平，跳过（模板结构异常，请检查 renderQuestionSidebar）'); return }
  const newBlock = `  /* 题型入口自动取舍：题库有几种题型渲染几种，0 题自动隐藏 */
  const typeDefs = [
    { id: 'choice', label: '选择题', icon: '📋' },
    { id: 'multi', label: '多选题', icon: '🔢' },
    { id: 'truefalse', label: '判断题', icon: '✅' },
    { id: 'terminology', label: '名词解释', icon: '📖' },
    { id: 'fill', label: '填空题', icon: '✍️' },
  ];
  const tabs = typeDefs
    .filter(t => (bank[t.id] || []).length > 0)
    .map(t => ({ ...t, count: (bank[t.id] || []).length }));
  /* 当前选中题型无题时自动回退到第一个可用题型 */
  const availableIds = tabs.map(t => t.id);
  if (availableIds.indexOf(state.questionTab) < 0 && state.questionTab !== 'wrongbook') {
    state.questionTab = availableIds.length ? availableIds[0] : 'wrongbook';
  }`
  out = out.slice(0, tIdx) + newBlock + out.slice(end)
  /* 空题型占位：在 let html = '<div class="sidebar-heading"> 后加空态 */
  const emptyMark = `  let html = '<div class="sidebar-heading">题型分类</div>';`
  if (out.includes(emptyMark)) {
    out = out.replace(emptyMark, emptyMark + "\n  if (!tabs.length) {\n    html += '<div class=\"sidebar-qtab\" style=\"color:var(--text-muted);cursor:default;\"><span>暂无题型</span></div>';\n  }")
  }
  if (writeGuard('tabs')) console.log('  ✅ [2] 动态题型入口')
}

/* ============ 3. 增强解析（对比/树/流程/速记卡） ============ */
function patchEnhance() {
  if (has('enh')) return
  const marker = '// INITIALIZATION'
  const idx = out.indexOf(marker)
  if (idx < 0) { console.log('  ⚠ [3] 未找到 INITIALIZATION，跳过'); return }
  const funcs = `
// ============================================================
// 增强能力：对比表 / 分类树 / 流程 / 速记卡（数据约定见 rv-builder SKILL.md）
// ============================================================
/* 剥离增强标记块：从 content 去掉【对比表】【树】【流程】【速记】【结构卡】【分期】原文块，只留正文，
 * 防止「纯文本标记 + 排版增强卡」重复显示（增强卡由 parseContentEnhancements 单独渲染） */
function stripEnhanceMarkers(content) {
  if (!content) return ''
  var s = String(content)
  /* 剥离整块：可选引导行 <p><b>xxx</b></p> + 【标记:标题】+ 内容到下一个 <p>/<ul> 或结尾 */
  s = s.replace(/(?:<p><b>[^<]*<\\/b><\\/p>\\s*)?【(?:对比表|树|流程|速记|结构卡|分期)[^】]*】[^\\n]*[\\s\\S]*?(?=(?:<p>|<ul>|【(?:对比表|树|流程|速记|结构卡|分期)|\\n\\s*\\n|$))/g, '')
  return s
}
function parseContentEnhancements(content) {
  function escHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    })
  }
  var text = String(content || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ')
  var html = ''
  var m
  /* 对比表：列数完全由数据决定 —— 不写死 3 列，也不把多余的值用 | 拼进同一格（会丢列）
   * 标题支持两种写法：
   *   ①【对比表:A vs B vs C】          → 卡片头「A vs B vs C」，表头列名 A / B / C
   *   ②【对比表:表名（A vs B vs C）】  → 卡片头「表名」，表头列名 A / B / C（推荐，可保留概括名） */
  var cmpRe = /【对比表\\s*[:：]\\s*([^】]+)】\\s*\\n?([\\s\\S]*?)(?=(?:【对比表|【树|【流程|【速记|【结构卡|【分期|\\n\\s*\\n|$))/g
  while ((m = cmpRe.exec(text))) {
    var cmpTitle = (m[1] || '').trim()
    var splitSides = function (str) {
      return String(str || '').split(/\\s*(?:vs\\.?|VS|与)\\s*/).map(function (s) { return s.trim() }).filter(Boolean)
    }
    /* 表名 + 列名分离：仅当括号内含 ≥2 段时才认定是列名，否则括号只是表名的一部分 */
    var headName = cmpTitle
    var sides = []
    var paren = cmpTitle.match(/[（(]([^）)]*)[)）]/)
    if (paren) {
      var innerSides = splitSides(paren[1])
      if (innerSides.length > 1) { headName = cmpTitle.replace(paren[0], '').trim() || cmpTitle; sides = innerSides }
    }
    if (!sides.length) sides = splitSides(cmpTitle)
    /* 先扫全部数据行，最大段数 = 表格列数（含「对比项」列） */
    var grid = []
    var maxCols = 0
    ;(m[2] || '').split('\\n').forEach(function (line) {
      line = line.trim().replace(/^-\\s*/, '').replace(/^\\*\\s*/, '')
      if (!line || line.indexOf('【') === 0) return
      var p = line.split('|').map(function (s) { return s.trim() })
      if (p.length >= 2) { grid.push(p); if (p.length > maxCols) maxCols = p.length }
    })
    if (!grid.length) continue
    /* 列名：优先用标题里的 vs 列表，缺失则用「对象N」兜底 */
    var colNames = []
    for (var j = 1; j < maxCols; j++) colNames.push(sides.length > 1 ? (sides[j - 1] || ('对象' + j)) : ('对象' + j))
    var ths = '<th class="cmp-key">对比项</th>'
    colNames.forEach(function (n) { ths += '<th>' + escHtml(n) + '</th>' })
    /* 每行补齐到 maxCols：缺格补空 td 保证列对齐，绝不把多值用 | 合并。
     * data-col 写入所属对象名——窄屏转置布局靠它渲染「对象名：值」，宽屏不使用。 */
    var rows = grid.map(function (p) {
      var tds = '<td class="cmp-key">' + escHtml(p[0] || '') + '</td>'
      for (var i = 1; i < maxCols; i++) {
        tds += '<td class="cmp-cell" data-col="' + escHtml(colNames[i - 1] || '') + '">' + escHtml(p[i] || '') + '</td>'
      }
      return '<tr>' + tds + '</tr>'
    })
    /* 显示形态：面板里一律保持表格（对比表的价值就是横向并排比较）。
     * 容器窄时不转纵向列表、不压扁列宽，改为「首列冻结 + 横向滚动」，靠列数自适应密度
     * 收紧字号与列宽。CSS 保留了 .cmp-wide 转列表规则作为可选开关，渲染端默认不输出。 */
    /* 结构分层：.cmp-wrap 只做卡片外观（overflow:hidden 裁圆角），表格进 .cmp-scroll 滚动。
     * 若把标题栏与表格放在同一滚动容器里，横滚时标题会被一并拖走、右侧露出卡片底板。 */
    html += '<div class="cmp-wrap">' +
      '<div class="cmp-head">⚖️ ' + escHtml(headName) + '</div>' +
      '<div class="cmp-scroll">' +
      '<table class="cmp-table cmp-cols-' + maxCols + '"><thead><tr class="cmp-header">' + ths + '</tr></thead><tbody>' +
      rows.join('') + '</tbody></table></div></div>'
  }
  /* 分类树 */
  var treeRe = /【树\\s*[:：]\\s*([^\\n]+)】\\s*\\n([\\s\\S]*?)(?=(?:【树|【流程|【速记|【对比表|【结构卡|【分期|\\n\\s*\\n|$))/
  var tm = treeRe.exec(text)
  if (tm) {
    var treeLines = tm[2].split('\\n').map(function (s) { return s.trim() }).filter(Boolean)
    var treeHtml = '<div style="margin-top:14px;border:1px solid var(--color-border);border-radius:var(--radius-md);padding:10px 12px;">' +
      '<div style="font-family:var(--font-heading);font-weight:600;font-size:0.9rem;margin-bottom:6px;">🌳 ' + escHtml(tm[1].trim()) + '</div>'
    treeLines.forEach(function (line) {
      var mm = /^(-+)\\s*(.+)$/.exec(line)
      if (!mm) return
      var depth = mm[1].length
      treeHtml += '<div style="padding-left:' + (depth * 16) + 'px;padding-top:3px;font-size:0.85rem;' + (depth === 1 ? 'font-weight:600;' : '') + '">' +
        '<span style="color:var(--text-muted);margin-right:6px;">' + (depth > 1 ? '└' : '▸') + '</span>' + escHtml(mm[2].trim()) + '</div>'
    })
    treeHtml += '</div>'
    html += treeHtml
  }
  /* 流程链 */
  var flowRe = /【流程\\s*[:：]\\s*([^\\n]+)】\\s*\\n([\\s\\S]*?)(?=(?:【树|【流程|【速记|【对比表|【结构卡|【分期|\\n\\s*\\n|$))/
  var fm = flowRe.exec(text)
  if (fm) {
    var body = fm[2].trim()
    var steps = body.indexOf('→') >= 0 ? body.split('→').map(function (s) { return s.trim() }).filter(Boolean)
      : body.split('\\n').map(function (s) { return s.trim().replace(/^[①②③④⑤⑥⑦⑧⑨⑩]+\\s*/, '') }).filter(Boolean)
    if (steps.length) {
      html += '<div style="margin-top:14px;border:1px solid var(--color-border);border-radius:var(--radius-md);padding:10px 12px;">' +
        '<div style="font-family:var(--font-heading);font-weight:600;font-size:0.9rem;margin-bottom:6px;">🔀 ' + escHtml(fm[1].trim()) + '</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;">' + steps.map(function (s) { return '<span style="background:var(--bg-soft);padding:4px 10px;border-radius:var(--radius-sm);font-size:0.8rem;">' + escHtml(s) + '</span>' }).join('<span style="color:var(--text-muted);">→</span>') + '</div></div>'
    }
  }
  /* 速记卡 */
  var fcRe = /【速记\\s*[:：]\\s*([^\\n]+)】\\s*\\n([\\s\\S]*?)(?=(?:【速记|【树|【流程|【对比表|【结构卡|【分期|\\n\\s*\\n|$))/
  var fm2 = fcRe.exec(text)
  if (fm2) {
    var cards = fm2[2].split('\\n').map(function (line) {
      line = line.trim().replace(/^[-*]\\s*/, '')
      if (!line) return null
      var p = line.split(/→|：|->/).map(function (s) { return s.trim() })
      if (p.length >= 2) return { q: p[0], a: p.slice(1).join('：').trim() }
      return null
    }).filter(Boolean)
    if (cards.length) {
      html += '<div style="margin-top:14px;border:1px solid var(--color-border);border-radius:var(--radius-md);padding:10px 12px;">' +
        '<div style="font-family:var(--font-heading);font-weight:600;font-size:0.9rem;margin-bottom:8px;">🎴 ' + escHtml(fm2[1].trim()) + '</div>' +
        cards.map(function (c, i) { return '<div class="fc-card" data-fc="' + i + '" style="border:1px solid var(--color-border-soft);border-radius:var(--radius-sm);padding:8px 10px;margin-bottom:6px;cursor:pointer;font-size:0.85rem;background:var(--bg-card);transition:box-shadow .15s;">' +
          '<div class="fc-q" style="font-weight:600;">' + escHtml(c.q) + '</div>' +
          '<div class="fc-a" style="display:none;margin-top:4px;color:var(--color-primary);">' + escHtml(c.a) + '</div></div>' }).join('') + '</div>'
    }
  }
  /* 结构卡（多栏面板） */
  var scRe = /【结构卡\\s*[:：]\\s*([^】]+)】\\s*\\n?([\\s\\S]*?)(?=(?:【结构卡|【分期|【对比表|【树|【流程|【速记|\\n\\s*\\n|$))/g
  while ((m = scRe.exec(text))) {
    var panels = []
    ;(m[2] || '').split('\\n').forEach(function (line) {
      line = line.trim().replace(/^[-*]\\s*/, '')
      if (!line) return
      var pp = line.split('|').map(function (s) { return s.trim() })
      if (pp.length >= 2) panels.push({ label: pp[0], body: pp.slice(1).join('|').trim() })
    })
    if (panels.length) {
      html += '<div style="margin-top:14px;border:1px solid var(--color-border);border-radius:var(--radius-md);overflow:hidden;">' +
        '<div style="background:var(--bg-soft);padding:8px 12px;font-family:var(--font-heading);font-weight:600;font-size:0.9rem;">🗂️ ' + escHtml((m[1] || '').trim() || '结构卡') + '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:10px;">' +
        panels.map(function (p) {
          return '<div style="border:1px solid var(--color-border-soft);border-radius:var(--radius-sm);border-top:3px solid var(--color-accent);padding:8px 10px;background:var(--bg-card);">' +
            '<div style="font-family:var(--font-heading);font-weight:700;font-size:0.82rem;color:var(--color-accent);margin-bottom:4px;">' + escHtml(p.label) + '</div>' +
            '<div style="font-size:0.85rem;line-height:1.6;">' + escHtml(p.body) + '</div></div>'
        }).join('') + '</div></div>'
    }
  }
  /* 分期时间轴 */
  var stRe = /【分期\\s*[:：]\\s*([^】]+)】\\s*\\n?([\\s\\S]*?)(?=(?:【分期|【结构卡|【对比表|【树|【流程|【速记|\\n\\s*\\n|$))/g
  while ((m = stRe.exec(text))) {
    var stages = []
    ;(m[2] || '').split('\\n').forEach(function (line) {
      line = line.trim().replace(/^[-*]\\s*/, '').replace(/^\\d+[\\.、．]\\s*/, '')
      if (!line) return
      var sp = line.split('|').map(function (s) { return s.trim() })
      if (sp.length >= 2) stages.push({ name: sp[0], desc: sp.slice(1).join('|').trim() })
      else if (sp[0]) stages.push({ name: sp[0], desc: '' })
    })
    if (stages.length) {
      html += '<div style="margin-top:14px;border:1px solid var(--color-border);border-radius:var(--radius-md);padding:10px 12px;">' +
        '<div style="font-family:var(--font-heading);font-weight:600;font-size:0.9rem;margin-bottom:8px;">⏳ ' + escHtml((m[1] || '').trim() || '分期') + '</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:8px;">' +
        stages.map(function (s, i) {
          return '<span style="background:' + (i === 0 ? 'var(--bg-soft)' : 'var(--bg-card)') + ';border:1px solid var(--color-border);padding:4px 10px;border-radius:var(--radius-sm);font-size:0.8rem;font-weight:600;">' + escHtml(s.name) + '</span>'
        }).join('<span style="color:var(--text-muted);">→</span>') + '</div>' +
        '<div style="font-size:0.85rem;line-height:1.65;color:var(--text-main);">' +
        stages.map(function (s) {
          return '<div style="margin-bottom:6px;"><b style="color:var(--color-accent);">' + escHtml(s.name) + '</b> ' + escHtml(s.desc) + '</div>'
        }).join('') + '</div></div>'
    }
  }
  return html || null
}
function bindEnhancements() {
  var cards = document.querySelectorAll('.fc-card')
  cards.forEach(function (card) {
    card.addEventListener('click', function () {
      var a = this.querySelector('.fc-a')
      a.style.display = a.style.display === 'none' ? 'block' : 'none'
    })
  })
}

`
  out = out.slice(0, idx) + funcs + out.slice(idx)
  /* 接入 renderDetailPanel（两个接线点都命中才记成功；任一失败不写守卫，修复模板后可重跑补注入） */
  let ok = true
  const contentLine = "html += '<div style=\"margin-top:12px;\">' + concept.content + '</div>';"
  if (out.includes(contentLine)) {
    out = out.replace(contentLine, "html += '<div style=\"margin-top:12px;\">' + stripEnhanceMarkers(concept.content) + '</div>';\n    /* 增强能力：对比表 / 分类树 / 流程 / 速记卡 */\n    var enh = parseContentEnhancements(concept.content);\n    if (enh) html += '<div style=\"margin-top:10px;\">' + enh + '</div>';")
  } else { console.log('  ⚠ [3] 未找到正文接线点，增强解析未接入（模板 renderDetailPanel 写法可能已变）'); ok = false }
  const setHtml = 'dom.detailBody.innerHTML = html;'
  if (out.includes(setHtml)) {
    out = out.replace(setHtml, setHtml + "\n    if (typeof bindEnhancements === 'function') bindEnhancements();")
  } else { console.log('  ⚠ [3] 未找到 detailBody 赋值接线点，bindEnhancements 未接入'); ok = false }
  if (ok) { if (writeGuard('enh')) console.log('  ✅ [3] 增强解析（对比/树/流程/速记卡）') }
  else console.log('  ⚠ [3] 部分接线失败，未写守卫标记——修复模板后可重跑本脚本补注入')
}

/* ============ 4+5. 增强入口按钮 + 聚合视图 ============ */
function patchEntry() {
  if (has('entry')) return
  const steps = []
  /* 4a. header 加「🎯速览」按钮（收藏和刷题之间） */
  const favBtn = '<button class="btn-icon btn-quiz" id="btnQuiz" title="刷题模式">'
  const entryBtn = '<button class="btn-icon btn-enhance" id="btnEnhance" title="对比/树/速记速览">🎯 <span>速览</span></button>\n      '
  if (out.includes(favBtn)) { out = out.replace(favBtn, entryBtn + favBtn); steps.push('4a') }
  else console.log('  ⚠ [4a] 未找到 btnQuiz 按钮，速览入口未插入')
  /* 4b. btn-enhance 样式 */
  const styleMark = '.btn-quiz:hover{background:rgba(255,255,255,0.18)}'
  if (out.includes(styleMark)) {
    out = out.replace(styleMark, styleMark + '\n.btn-enhance{color:var(--color-on-header);background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15)}\n.btn-enhance:hover{background:rgba(255,255,255,0.18);box-shadow:0 0 0 1px rgba(var(--accent-rgb),0.4)}\n.btn-enhance.active{color:#fff;background:var(--color-accent);border:none;box-shadow:none}')
    steps.push('4b')
  } else console.log('  ⚠ [4b] 未找到 btn-quiz:hover 样式，速览按钮样式未注入')
  /* 4c. initDom 登记 btnEnhance */
  const domMark = "dom.btnQuiz = $('#btnQuiz');"
  if (out.includes(domMark)) { out = out.replace(domMark, domMark + "\n  dom.btnEnhance = $('#btnEnhance');"); steps.push('4c') }
  else console.log('  ⚠ [4c] 未找到 btnQuiz 登记行，btnEnhance 未登记')
  /* 4e（先做）聚合视图函数 renderMainEnhance + handleEnhanceClick（插在 renderMain 前）
   * 顺序放在 4d 之前：4d 的按钮绑定依赖 handleEnhanceClick 定义已注入 */
  const rmMark = 'function renderMain() {'
  const rmIdx = out.indexOf(rmMark)
  if (rmIdx >= 0) {
    const enhanceView = `
/* 增强聚合视图：展示所有含对比/树/速记的概念卡片 */
function renderMainEnhance() {
  function escHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    })
  }
  const all = getAllConceptsFlat ? getAllConceptsFlat() : [];
  const tagged = [];
  for (const c of all) {
    const txt = String(c.content || '');
    const flags = [];
    if (txt.indexOf('【对比表') >= 0) flags.push('⚖️ 对比');
    if (txt.indexOf('【树') >= 0) flags.push('🌳 树');
    if (txt.indexOf('【流程') >= 0) flags.push('🔀 流程');
    if (txt.indexOf('【速记') >= 0) flags.push('🎴 速记');
    if (txt.indexOf('【结构卡') >= 0) flags.push('🗂️ 结构');
    if (txt.indexOf('【分期') >= 0) flags.push('⏳ 分期');
    if (flags.length) tagged.push({ ...c, flags });
  }
  let html = '<div class="main-header"><h2 class="main-title">🎯 增强速览</h2><p class="main-subtitle">对比表 · 分类树 · 流程 · 速记 · 结构卡 · 分期（' + tagged.length + ' 个概念含增强内容）</p></div>';
  if (!tagged.length) {
    html += '<div class="empty-state"><div class="empty-state-icon">🔍</div><div class="empty-state-text">当前资料暂无增强内容，可在概念 content 中加入【对比表】/【树】/【流程】/【速记】/【结构卡】/【分期】标记</div></div>';
    dom.mainContent.innerHTML = html;
    return;
  }
  html += '<div class="concept-grid">';
  for (const c of tagged) {
    html += '<div class="concept-card" data-concept-id="' + escHtml(c.id) + '">';
    html += '<div class="concept-card-header"><div class="concept-card-title">' + escHtml(c.title) + '</div></div>';
    html += '<div class="concept-card-summary">' + escHtml(c.summary) + '</div>';
    html += '<div class="concept-card-footer"><div class="concept-card-tags">' + c.flags.map(f => '<span class="concept-card-tag" style="background:var(--color-familiar-bg);color:var(--color-familiar);">' + escHtml(f) + '</span>').join('') + '</div></div>';
    html += '</div>';
  }
  html += '</div>';
  dom.mainContent.innerHTML = html;
}
function handleEnhanceClick() {
  if (state.sidebarMode === 'enhance') {
    state.sidebarMode = state._enhanceReturnMode || 'knowledge';
    state._enhanceReturnMode = null;
    if (dom.btnEnhance) dom.btnEnhance.classList.remove('active');
    renderAll();
    return;
  }
  state._enhanceReturnMode = (state.sidebarMode === 'question') ? 'question' : 'knowledge';
  state.sidebarMode = 'enhance';
  state.showFavoritesOnly = false;
  if (dom.btnFavorites) dom.btnFavorites.classList.remove('active');
  if (dom.btnEnhance) dom.btnEnhance.classList.add('active');
  renderAll();
}

`
    out = out.slice(0, rmIdx) + enhanceView + out.slice(rmIdx)
    steps.push('4e')
  } else console.log('  ⚠ [4e] 未找到 renderMain，聚合视图未注入——速览功能不可用')
  /* 4d（后做，依赖 handleEnhanceClick 已注入）init 绑定点击事件 */
  const bindMark = "if (dom.btnQuiz) dom.btnQuiz.addEventListener('click', openQuizModal);"
  if (out.includes(bindMark)) {
    if (out.includes('function handleEnhanceClick')) {
      out = out.replace(bindMark, bindMark + "\n  if (dom.btnEnhance) dom.btnEnhance.addEventListener('click', handleEnhanceClick);")
      steps.push('4d')
    } else console.log('  ⚠ [4d] handleEnhanceClick 未注入（4e 失败），速览按钮未绑定')
  } else console.log('  ⚠ [4d] 未找到 btnQuiz 绑定行，速览按钮未绑定')
  /* 4f. renderMain 三分支：用「极简分发结构」正则替换（代替大括号配平，避免函数体字符串内 { } 误判截断） */
  const rmRe = /function renderMain\(\)\s*\{\s*if \(state\.sidebarMode === 'knowledge'\) \{ renderMainKnowledge\(\); \}\s*else \{ renderMainQuestions\(\); \}\s*\}/
  const rmM = out.match(rmRe)
  if (rmM) {
    out = out.replace(rmM[0], "function renderMain() {\n  if (state.sidebarMode === 'knowledge') { renderMainKnowledge(); }\n  else if (state.sidebarMode === 'enhance') { renderMainEnhance(); }\n  else { renderMainQuestions(); }\n}")
    steps.push('4f')
  } else console.log('  ⚠ [4f] renderMain 非极简分发结构（或已含 enhance 分支），跳过三分支改造')
  /* 4g. 修复 renderSidebar：enhance 速览模式保持知识点侧边栏（正则容忍 CRLF） */
  const rsRe = /(function renderSidebar\(\)\s*\{\s*if \(state\.sidebarMode === 'knowledge'\) \{ renderKnowledgeSidebar\(\); \}\s*)else \{ renderQuestionSidebar\(\); \}\s*\}/
  const rsM = out.match(rsRe)
  if (rsM) {
    out = out.replace(rsM[0], "function renderSidebar() {\n  if (state.sidebarMode === 'knowledge' || state.sidebarMode === 'enhance') { renderKnowledgeSidebar(); }\n  else { renderQuestionSidebar(); }\n}")
    steps.push('4g')
  } else console.log('  ⚠ [4g] renderSidebar 结构未匹配，enhance 模式侧边栏可能异常')
  /* 汇总：关键注入点全成功才写守卫（防「部分失败仍记已注入」）；4e/4f 缺失 = 速览核心不可用，坚决不写 */
  const critical = ['4a', '4b', '4c', '4e', '4f']
  const missing = critical.filter(s => steps.indexOf(s) < 0)
  if (missing.length) {
    console.log('  ⚠ [4][5] 注入不完整，缺: ' + missing.join(', ') + ' ——未写守卫标记，修复模板后可重跑本脚本补注入')
  } else if (writeGuard('entry')) {
    console.log('  ✅ [4][5] 增强入口按钮 + 聚合视图')
  }
}

/* ============ 6. 移动端触控优化 ============ */
function patchTouch() {
  if (has('touch')) return
  const touchCss = `
/* 触控目标优化：移动端小控件补齐 ≥40px 点区（rv-polisher 要求） */
@media (max-width: 767px) {
  .detail-back-btn { padding: 10px 14px; min-height: 40px; }
  .concept-card-star { padding: 10px; min-width: 40px; min-height: 40px; margin: -6px; }
  .question-tf-btn { padding: 10px 20px; min-height: 40px; }
  .subcat-tab { padding: 10px 12px; min-height: 40px; }
  .modal-close { min-width: 40px; min-height: 40px; }
}
`
  /* 定位最后一个 </style> 注入（防多 style 块时全堆进第一个） */
  const idx = out.lastIndexOf('</style>')
  if (idx < 0) { console.log('  ⚠ [6] 未找到 </style>，触控优化未注入'); return }
  out = out.slice(0, idx) + touchCss + '\n' + guard('touch') + '\n' + out.slice(idx)
  console.log('  ✅ [6] 移动端触控优化')
}

/* ============ 8. 可访问性补齐（关闭类按钮可访问名 + 弹窗 dialog 语义） ============
 * 模板的关闭按钮内容是纯符号「&times;」，没有可访问名——屏幕阅读器只会读出「×」，
 * 键盘/辅助技术用户无法判断这个按钮是干什么的；刷题弹窗的 .modal 容器也缺
 * role="dialog" / aria-modal，模态语义未声明。二者都是模板级缺陷，逐副本补齐。
 * 幂等：区分「命中并已修」与「已就绪」，全部命中才写守卫；将来模板上游修好后此处自动 no-op。 */
function patchA11y() {
  if (has('a11y')) return
  const items = [
    { name: '侧栏关闭按钮', re: /<button class="sidebar-mobile-close" id="sidebarClose"([^>]*)>/,
      repl: '<button class="sidebar-mobile-close" id="sidebarClose" aria-label="关闭菜单" title="关闭菜单"$1>' },
    { name: '详情关闭按钮', re: /<button class="btn-detail-close" id="detailClose"([^>]*)>/,
      repl: '<button class="btn-detail-close" id="detailClose" aria-label="关闭详情"$1>' },
    { name: '弹窗关闭按钮', re: /<button class="modal-close" id="quizModalClose"([^>]*)>/,
      repl: '<button class="modal-close" id="quizModalClose" aria-label="关闭弹窗" title="关闭弹窗"$1>' },
    { name: '弹窗 dialog 语义', re: /<div class="modal"([^>]*)>/,
      repl: '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="quizModalTitle"$1>' }
  ]
  const miss = []
  let changed = 0
  items.forEach(it => {
    const m = out.match(it.re)
    if (!m) { miss.push(it.name); return }                 /* 模板结构不同，跳过不硬改 */
    if (m[0].includes('aria-label') || m[0].includes('role="dialog"')) return  /* 已就绪 */
    out = out.replace(it.re, it.repl)
    changed++
  })
  if (miss.length) { console.log('  ⚠ [8] 可访问性补齐未命中: ' + miss.join('、') + '（模板结构不同，跳过）'); return }
  if (!writeGuard('a11y')) return
  console.log('  ✅ [8] 可访问性补齐（' + (changed ? changed + ' 处新修' : '模板已就绪') + '）')
}

/* ============ 7. 主题覆盖（可选） ============ */
function patchTheme() {
  if (!themePath) return
  if (has('theme')) { console.log('  ⚠ [7] 主题已应用，跳过'); return }
  if (!fs.existsSync(themePath)) { console.log('  ⚠ [7] 主题文件不存在: ' + themePath + '，跳过'); return }
  const css = fs.readFileSync(themePath, 'utf8')
  const rootM = css.match(/:root\s*\{[\s\S]*?\}/)
  if (!rootM) { console.log('  ⚠ [7] 主题 CSS 无 :root 段，跳过'); return }
  const tplRoot = out.match(/:root\s*\{[\s\S]*?\}/)
  if (tplRoot) out = out.replace(tplRoot[0], rootM[0])
  /* 追加主题额外规则（:root 之后的部分）：定位最后一个 </style> 注入 */
  const extra = css.replace(/:root\s*\{[\s\S]*?\}/, '')
  const idx = out.lastIndexOf('</style>')
  if (idx < 0) { console.log('  ⚠ [7] 未找到 </style>，主题未应用'); return }
  out = out.slice(0, idx) + (extra.trim() ? extra + '\n' : '') + guard('theme') + '\n' + out.slice(idx)
  console.log('  ✅ [7] 主题覆盖应用')
}

/* 模板模式下模块能力边界：patch-enhance 只做「模板增强」，不装配 modules/*.js。
 * 传了 --modules 必须显式核对并告警——静默忽略会造成「以为启用了，页面里却没有」。 */
function reportModules() {
  if (!modulesArg) return
  const list = String(modulesArg).split(/[,\s]+/).map(s => s.trim()).filter(Boolean)
  if (!list.length) return
  const BUILTIN = { 'rv-core': 1, favorites: 1, mastery: 1, 'card-browser': 1, search: 1, 'detail-panel': 1, navigation: 1, choice: 1, truefalse: 1, quiz: 1, wrongbook: 1 }
  const MARKER = { comparison: '【对比表】', tree: '【树】', flashcard: '【速记】/【流程】' }
  const MODULE_ONLY = { duel: '鉴别挑战', guess: '填空猜一猜', selfcheck: '自测', 'lesion-card': '病变卡', 'stage-timeline': '分阶段时间线' }
  const okB = [], okM = [], no = []
  list.forEach(m => {
    if (BUILTIN[m]) okB.push(m)
    else if (MARKER[m]) okM.push(m + ' → ' + MARKER[m])
    else if (MODULE_ONLY[m]) no.push(m + '（' + MODULE_ONLY[m] + '）')
    else no.push(m + '（未知模块）')
  })
  console.log('  · 模块核对（模板模式）')
  if (okB.length) console.log('    ✅ 模板内置 ' + okB.length + ' 项: ' + okB.join(', '))
  if (okM.length) console.log('    ✅ 标记驱动 ' + okM.length + ' 项: ' + okM.join('、') + '（需 content 里有对应标记块）')
  if (no.length) {
    console.log('    ❌ 模板模式不支持 ' + no.length + ' 项: ' + no.join('、'))
    console.log('       这些只在模块化页面（assemble.js）里存在，模板填充不会装配。')
    console.log('       要用就另写 patch 脚本（按钮 + 弹窗 + CSS + JS），插在 patch-enhance 之后、fill-template 之前；')
    console.log('       不要默认它已经生效。')
  }
}

console.log('模板增强补丁 → ' + P)
reportModules()
ensureCmpCss()
fixBadge()
patchDynamicTabs()
patchEnhance()
patchEntry()
patchTouch()
patchA11y()
patchTheme()
fs.writeFileSync(P, out, 'utf8')
console.log('完成 ✅ 文件大小:', (fs.statSync(P).size / 1024).toFixed(1), 'KB')
if (themePath) {
  console.log('')
  console.log('⚠ 主题验收（必做，换主题只改 :root 不够）：')
  console.log('   生成页面后跑  node <同级skill:rv-verifier>/scripts/check-theme.js <index.html>')
  console.log('   它按层叠顺序核对：白描边 / 白底 / 白内高光 / 白文字投影 / 冷色焦点 / 白色渐隐起点')
  console.log('   是否有未覆盖的硬编码残留（未覆盖会以非 0 退出）。')
}
