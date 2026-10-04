/* tree.js — 分类树/流程模块（通用增强能力）
 * 能力：从概念 content 解析「【树】/【流程】」标记，在详情面板渲染为可折叠树或流程链
 *
 * 数据约定（零学科术语，任何学科通用，写入 concept.content）：
 *   【树:标题】
 *   - 根1
 *   -- 子1
 *   --- 孙1
 *   - 根2
 *   缩进 = 每级一个「-」；同级用相同个数「-」
 *
 *   【流程:标题】
 *   步骤1 → 步骤2 → 步骤3
 *   或
 *   ① 步骤1
 *   ② 步骤2
 *
 * 交互：
 *   - 树：点节点箭头可折叠/展开其子树
 *   - 流程：横向链展示，点步骤高亮
 * 依赖：detail-panel（监听 concept:select）
 */
;(function () {
  'use strict'
  var RV = window.RV = window.RV || {}
  RV.modules = RV.modules || {}
  RV.modules['tree'] = {
    name: 'tree',
    deps: ['detail-panel'],
    init: function (ctx) {
      var self = this
      ctx.event.on('concept:select', function (p) {
        var k = ctx.utils.conceptById(p.id)
        if (!k) return
        var tree = self.parseTree(k)
        var flow = self.parseFlow(k)
        if (tree || flow) self.inject(ctx, tree, flow)
      })
    },
    /* 解析【树】块：缩进 = 每级一个「-」 */
    parseTree: function (k) {
      var text = (k.content || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ')
      var m = /【树\s*[:：]\s*([^\n]+)】\s*\n([\s\S]*?)(?=(?:【树|【流程|【速记|【对比表|【结构卡|【分期|\n\s*\n|$))/.exec(text)
      if (!m) return null
      var lines = m[2].split('\n').map(function (s) { return s.trim() }).filter(Boolean)
      var root = { label: m[1].trim(), children: [] }
      var stack = [{ depth: -1, node: root }]
      lines.forEach(function (line) {
        var mm = /^(-+)\s*(.+)$/.exec(line)
        if (!mm) return
        var depth = mm[1].length
        var node = { label: mm[2].trim(), children: [], depth: depth }
        while (stack.length && stack[stack.length - 1].depth >= depth) stack.pop()
        var parent = stack.length ? stack[stack.length - 1].node : root
        parent.children.push(node)
        stack.push({ depth: depth, node: node })
      })
      return { title: root.label, children: root.children }
    },
    /* 解析【流程】块 */
    parseFlow: function (k) {
      var text = (k.content || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ')
      var m = /【流程\s*[:：]\s*([^\n]+)】\s*\n([\s\S]*?)(?=(?:【树|【流程|【速记|【对比表|【结构卡|【分期|\n\s*\n|$))/.exec(text)
      if (!m) return null
      var body = m[2].trim()
      var steps = []
      if (body.indexOf('→') >= 0) {
        steps = body.split('→').map(function (s) { return s.trim() }).filter(Boolean)
      } else {
        steps = body.split('\n').map(function (s) {
          return s.trim().replace(/^[①②③④⑤⑥⑦⑧⑨⑩]+\s*/, '')
        }).filter(Boolean)
      }
      return { title: m[1].trim(), steps: steps }
    },
    /* 树节点 HTML（递归） */
    treeHtml: function (nodes, depth, esc) {
      var self = this
      return nodes.map(function (n) {
        var hasKids = n.children && n.children.length
        return '<div class="tree-node" data-depth="' + depth + '">' +
          '<div class="tree-row">' +
            '<span class="tree-toggle">' + (hasKids ? '▾' : '·') + '</span>' +
            '<span class="tree-label">' + esc(n.label) + '</span>' +
          '</div>' +
          (hasKids ? '<div class="tree-children">' + self.treeHtml(n.children, depth + 1, esc) + '</div>' : '') +
        '</div>'
      }).join('')
    },
    /* 注入详情面板 */
    inject: function (ctx, tree, flow) {
      var body = ctx.dom.detailBody
      if (!body) return
      if (tree) {
        var treeWrap = ctx.utils.el(
          '<div class="tree-block">' +
            '<div class="tree-head">🌳 ' + ctx.utils.escHtml(tree.title) + '</div>' +
            '<div class="tree-body">' + this.treeHtml(tree.children, 1, ctx.utils.escHtml) + '</div>' +
          '</div>'
        )
        /* 折叠交互 */
        treeWrap.querySelectorAll('.tree-toggle').forEach(function (tgl) {
          tgl.addEventListener('click', function () {
            var row = this.parentNode
            var kids = row.nextElementSibling
            if (!kids) return
            var open = kids.style.display !== 'none'
            kids.style.display = open ? 'none' : ''
            this.textContent = open ? '▸' : '▾'
          })
        })
        body.appendChild(treeWrap)
      }
      if (flow) {
        var flowWrap = ctx.utils.el(
          '<div class="flow-block">' +
            '<div class="flow-head">🔀 ' + ctx.utils.escHtml(flow.title) + '</div>' +
            '<div class="flow-chain">' + flow.steps.map(function (s) {
              return '<span class="flow-step">' + ctx.utils.escHtml(s) + '</span>'
            }).join('<span class="flow-arrow">→</span>') + '</div>' +
          '</div>'
        )
        body.appendChild(flowWrap)
      }
    }
  }
})()
