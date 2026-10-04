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
const argv = process.argv.slice(3)
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--theme' && argv[i + 1]) themePath = path.resolve(argv[i + 1])
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
  const dual = "/* Enhance markers — support both enh-* (template) and cmp-* (patch-enhance JS) */\n.enh-cmp,.cmp-wrap{margin-top:var(--space-3);border:1px solid var(--color-border);border-radius:var(--radius-md);overflow:hidden;box-shadow:var(--elev-2);background:var(--bg-card)}\n.enh-cmp-head,.cmp-head{background:linear-gradient(115deg,var(--color-primary),color-mix(in srgb,var(--color-primary) 70%,var(--color-accent)));color:var(--color-on-header);padding:9px var(--space-3);font-weight:650;font-size:.86rem;box-shadow:0 4px 14px rgba(var(--header-rgb),0.18);line-height:1.35;border-bottom:1px solid rgba(255,255,255,0.12)}\n.enh-cmp-scroll{overflow-x:auto}\n.enh-cmp-table,.cmp-table{width:100%;border-collapse:collapse;border-spacing:0;font-size:.82rem;table-layout:fixed;margin:0}\n.enh-cmp-table th,.cmp-table th{background:var(--bg-soft);color:var(--text-light);text-align:left;padding:7px var(--space-3);border-bottom:1px solid var(--color-border);font-weight:600;vertical-align:top;word-break:break-word}\n.enh-cmp-table td,.cmp-table td,.cmp-table .cmp-cell{padding:7px var(--space-3);border-bottom:1px solid var(--color-border-soft);vertical-align:top;line-height:1.55;text-align:left;word-break:break-word;overflow-wrap:anywhere}\n.enh-cmp-table tr:last-child td,.cmp-table tr:last-child td{border-bottom:none}\n.enh-cmp-table tr:nth-child(even) td,.cmp-table tr:nth-child(even) td{background:var(--bg-soft)}\n.enh-cmp-key,.cmp-key,.cmp-table .cmp-key,.cmp-table th.cmp-key{width:22%;font-weight:600;color:var(--color-primary);background:var(--bg-card-hover)!important}\n.enh-cmp-table tr:hover td,.cmp-table tr:hover td{background:var(--hover-bg)}\n@media(max-width:640px){.enh-cmp-key,.cmp-key,.cmp-table .cmp-key{width:30%}.enh-cmp-table,.cmp-table{font-size:.78rem}}\n.enh-tree,.enh-flow,.enh-fc{margin-top:var(--space-3);border:1px solid var(--color-border);border-radius:var(--radius-md);padding:var(--space-3);background:var(--bg-card);box-shadow:var(--elev-2),var(--inset-highlight)}\n.enh-tree-title,.enh-flow-title,.enh-fc-title{font-family:var(--font-heading);font-weight:650;font-size:.86rem;margin-bottom:var(--space-2);color:var(--color-primary)}\n.enh-tree-row{padding-top:2px;font-size:.82rem;line-height:1.5}\n.enh-tree-row.lvl-1{font-weight:600}\n.enh-flow-steps{display:flex;flex-wrap:wrap;gap:var(--space-1);align-items:center}\n.enh-flow-step{background:var(--bg-soft);padding:var(--space-1) var(--space-3);border-radius:999px;font-size:.76rem;border:1px solid var(--color-border-soft);box-shadow:var(--elev-1);transition:background var(--transition-fast),border-color var(--transition-fast),box-shadow var(--transition-fast)}\n.enh-flow-step:hover{background:var(--hover-bg);border-color:rgba(var(--accent-rgb),0.28);box-shadow:var(--elev-2)}\n.enh-fc-card,.fc-card{border:1px solid var(--color-border-soft);border-radius:var(--radius-sm);padding:var(--space-2) var(--space-3);margin-bottom:var(--space-1);cursor:pointer;font-size:.82rem;background:var(--bg-card);box-shadow:var(--elev-1);transition:box-shadow var(--transition-fast),border-color var(--transition-fast),transform var(--transition-fast)}\n.enh-fc-card:hover,.fc-card:hover{box-shadow:var(--elev-2);border-color:rgba(var(--accent-rgb),0.22);transform:translateY(-1px)}\n.enh-fc-q,.fc-q{font-weight:600}\n.enh-fc-a,.fc-a{display:none;margin-top:var(--space-1);color:var(--color-primary);padding-top:var(--space-1);border-top:1px dashed var(--color-border-soft);animation:reveal-in var(--duration-fast) var(--ease) both}\n.enh-fc-card.open .enh-fc-a,.fc-card.open .fc-a{display:block}"
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
  /* 对比表 */
  var cmpRe = /【对比表\\s*[:：]\\s*([^】]+)】\\s*\\n?([\\s\\S]*?)(?=(?:【对比表|【树|【流程|【速记|【结构卡|【分期|\\n\\s*\\n|$))/g
  while ((m = cmpRe.exec(text))) {
    var sides = (m[1] || '').split(/\\s*(?:vs\\.?|VS|与)\\s*/).map(function (s) { return s.trim() })
    var rows = []
    ;(m[2] || '').split('\\n').forEach(function (line) {
      line = line.trim().replace(/^-\\s*/, '')
      if (!line) return
      var p = line.split('|').map(function (s) { return s.trim() })
      if (p.length >= 3) rows.push('<tr><td class="cmp-key">' + escHtml(p[0]) + '</td><td class="cmp-cell">' + escHtml(p[1]) + '</td><td class="cmp-cell">' + escHtml(p.slice(2).join('|').trim()) + '</td></tr>')
    })
    if (rows.length) {
      html += '<div class="cmp-wrap">' +
        '<div class="cmp-head">⚖️ ' + escHtml(sides.join(' vs ')) + '</div>' +
        '<table class="cmp-table"><thead><tr class="cmp-header">' +
        '<th class="cmp-key">对比项</th>' +
        '<th>' + escHtml(sides[0] || '左') + '</th>' +
        '<th>' + escHtml(sides[1] || '右') + '</th></tr></thead><tbody>' +
        rows.join('') + '</tbody></table></div>'
    }
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
  .subcat-tab { padding: 8px 12px; min-height: 36px; }
}
`
  /* 定位最后一个 </style> 注入（防多 style 块时全堆进第一个） */
  const idx = out.lastIndexOf('</style>')
  if (idx < 0) { console.log('  ⚠ [6] 未找到 </style>，触控优化未注入'); return }
  out = out.slice(0, idx) + touchCss + '\n' + guard('touch') + '\n' + out.slice(idx)
  console.log('  ✅ [6] 移动端触控优化')
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

console.log('模板增强补丁 → ' + P)
ensureCmpCss()
fixBadge()
patchDynamicTabs()
patchEnhance()
patchEntry()
patchTouch()
patchTheme()
fs.writeFileSync(P, out, 'utf8')
console.log('完成 ✅ 文件大小:', (fs.statSync(P).size / 1024).toFixed(1), 'KB')
