/* comparison.js — 对比速查表模块（通用增强能力）
 * 能力：从概念 content 中解析「【对比表】」标记块，在详情面板渲染为双列对比表
 *
 * 数据约定（零学科术语，任何学科通用，写入 concept.content）：
 *   【对比表:左标题 vs 右标题】
 *   - 键1 | 左值1 | 右值1
 *   - 键2 | 左值2 | 右值2
 *   （每行用「- 键 | 左 | 右」，| 分隔；块以连续两行空行或下一标记结束）
 *
 * 交互：
 *   - 详情面板正文后追加 .comparison-block
 *   - 表头双列 + 行键 + 两侧值，键列点击可折叠/展开当前行
 * 依赖：detail-panel（监听 concept:select，在正文后插入）
 */
;(function () {
  'use strict'
  var RV = window.RV = window.RV || {}
  RV.modules = RV.modules || {}
  RV.modules['comparison'] = {
    name: 'comparison',
    deps: ['detail-panel'],
    init: function (ctx) {
      var self = this
      ctx.event.on('concept:select', function (p) {
        var k = ctx.utils.conceptById(p.id)
        if (!k) return
        var blocks = self.parse(k)
        if (blocks && blocks.length) self.inject(ctx, blocks)
      })
    },
    /* 解析 content 里的对比表块 */
    parse: function (k) {
      var text = (k.content || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ')
      var blocks = []
      var re = /【对比表\s*[:：]\s*([^】]+)】\s*\n?([\s\S]*?)(?=(?:【对比表|【树|【流程|【速记|【结构卡|【分期|\n\s*\n|$))/g
      var m
      while ((m = re.exec(text))) {
        var sides = (m[1] || '').split(/\s*(?:vs\.?|VS|与)\s*/).map(function (s) { return s.trim() })
        var rows = []
        ;(m[2] || '').split('\n').forEach(function (line) {
          line = line.trim().replace(/^-\s*/, '')
          if (!line) return
          var parts = line.split('|').map(function (s) { return s.trim() })
          if (parts.length >= 3) rows.push({ k: parts[0], l: parts[1], r: parts.slice(2).join('|').trim() })
        })
        if (rows.length) blocks.push({
          title: sides.join(' vs '),
          leftLabel: sides[0] || '左',
          rightLabel: sides[1] || '右',
          rows: rows
        })
      }
      return blocks.length ? blocks : null
    },
    /* 注入详情面板 */
    inject: function (ctx, blocks) {
      var body = ctx.dom.detailBody
      if (!body) return
      var self = this
      blocks.forEach(function (tbl) {
        var wrap = ctx.utils.el(
          '<div class="comparison-block">' +
            '<div class="comparison-head">⚖️ ' + ctx.utils.escHtml(tbl.title) + '</div>' +
            '<div class="comparison-table">' +
              '<div class="comparison-row comparison-header">' +
                '<div class="comparison-key">对比项</div>' +
                '<div class="comparison-side comparison-left">' + ctx.utils.escHtml(tbl.leftLabel) + '</div>' +
                '<div class="comparison-side comparison-right">' + ctx.utils.escHtml(tbl.rightLabel) + '</div>' +
              '</div>' +
              tbl.rows.map(function (r) {
                return '<div class="comparison-row" data-cmp-row>' +
                  '<div class="comparison-key" data-cmp-toggle>' + ctx.utils.escHtml(r.k) + '</div>' +
                  '<div class="comparison-side comparison-left">' + ctx.utils.escHtml(r.l) + '</div>' +
                  '<div class="comparison-side comparison-right">' + ctx.utils.escHtml(r.r) + '</div>' +
                '</div>'
              }).join('') +
            '</div>' +
          '</div>'
        )
        body.appendChild(wrap)
        /* 键列点击折叠行（保留表格完整性） */
        var rows = wrap.querySelectorAll('[data-cmp-toggle]')
        rows.forEach(function (toggle) {
          toggle.addEventListener('click', function () {
            this.parentNode.classList.toggle('collapsed')
          })
        })
      })
    }
  }
})()
