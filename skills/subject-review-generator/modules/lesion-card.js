/* lesion-card.js — 结构卡模块（通用增强能力）
 * 能力：从概念 content 解析「【结构卡】」标记，在详情面板渲染为多栏结构面板
 * （常见用法：病因|大体|镜下|临床 四联，栏名由数据决定，模块零学科术语）
 *
 * 数据约定（零学科术语，任何学科通用，写入 concept.content）：
 *   【结构卡:标题】
 *   - 栏名1 | 内容1
 *   - 栏名2 | 内容2
 *   - 栏名3 | 内容3
 *   - 栏名4 | 内容4
 *   （每行「- 栏名 | 内容」；块以连续空行或下一标记结束）
 *
 * 交互：
 *   - 详情面板正文后追加 .lesion-card-block
 *   - 2 列网格展示各栏；点栏标题折叠/展开该栏正文
 * 依赖：detail-panel（监听 concept:select）
 */
;(function () {
  'use strict'
  var RV = window.RV = window.RV || {}
  RV.modules = RV.modules || {}
  RV.modules['lesion-card'] = {
    name: 'lesion-card',
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
    /* 解析【结构卡】块 */
    parse: function (k) {
      var text = (k.content || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ')
      var blocks = []
      var re = /【结构卡\s*[:：]\s*([^】]+)】\s*\n?([\s\S]*?)(?=(?:【结构卡|【分期|【对比表|【树|【流程|【速记|\n\s*\n|$))/g
      var m
      while ((m = re.exec(text))) {
        var panels = []
        ;(m[2] || '').split('\n').forEach(function (line) {
          line = line.trim().replace(/^[-*]\s*/, '')
          if (!line) return
          var parts = line.split('|').map(function (s) { return s.trim() })
          if (parts.length >= 2) {
            panels.push({ label: parts[0], body: parts.slice(1).join('|').trim() })
          }
        })
        if (panels.length) blocks.push({ title: (m[1] || '').trim() || '结构卡', panels: panels })
      }
      return blocks.length ? blocks : null
    },
    /* 注入详情面板 */
    inject: function (ctx, blocks) {
      var body = ctx.dom.detailBody
      if (!body) return
      blocks.forEach(function (blk) {
        var wrap = ctx.utils.el(
          '<div class="lesion-card-block">' +
            '<div class="lesion-card-head">🗂️ ' + ctx.utils.escHtml(blk.title) + '</div>' +
            '<div class="lesion-card-grid">' +
              blk.panels.map(function (p) {
                return '<div class="lesion-card-panel" data-lesion-panel>' +
                  '<div class="lesion-card-label" data-lesion-toggle>' + ctx.utils.escHtml(p.label) + '</div>' +
                  '<div class="lesion-card-body">' + ctx.utils.escHtml(p.body) + '</div>' +
                '</div>'
              }).join('') +
            '</div>' +
          '</div>'
        )
        body.appendChild(wrap)
        wrap.querySelectorAll('[data-lesion-toggle]').forEach(function (toggle) {
          toggle.addEventListener('click', function () {
            this.parentNode.classList.toggle('collapsed')
          })
        })
      })
    }
  }
})()
