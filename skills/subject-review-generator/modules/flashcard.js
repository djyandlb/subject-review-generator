/* flashcard.js — 速记卡模块（通用增强能力）
 * 能力：把纯记忆点做成「正面提问 → 点卡翻面 → 背面答案」的闪卡流
 *
 * 数据约定（零学科术语，任何学科通用，写入 concept.content）：
 *   【速记:卡组标题】
 *   提问1？→ 答案1
 *   提问2？→ 答案2
 *
 * 兜底（无【速记】块时）：
 *   自动用「概念 title 当正面，summary 当背面」生成一张卡——任何概念都有卡
 *
 * 交互：
 *   - 详情面板内渲染成闪卡列表，点卡片翻面（正→背→正）
 *   - 卡片翻转动画，已知/再练标记（本地记忆，非错题本）
 * 依赖：detail-panel
 */
;(function () {
  'use strict'
  var RV = window.RV = window.RV || {}
  RV.modules = RV.modules || {}
  RV.modules['flashcard'] = {
    name: 'flashcard',
    deps: ['detail-panel'],
    init: function (ctx) {
      var self = this
      ctx.event.on('concept:select', function (p) {
        var k = ctx.utils.conceptById(p.id)
        if (!k) return
        var cards = self.build(k)
        if (cards.length) self.inject(ctx, k.id, cards)
      })
    },
    /* 构建卡片：优先【速记】块，兜底 title/summary */
    build: function (k) {
      var text = (k.content || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ')
      var m = /【速记\s*[:：]\s*([^\n]+)】\s*\n([\s\S]*?)(?=(?:【速记|【树|【流程|【对比表|【结构卡|【分期|\n\s*\n|$))/.exec(text)
      if (m) {
        var title = m[1].trim()
        var cards = m[2].split('\n').map(function (line) {
          line = line.trim().replace(/^[-*]\s*/, '')
          if (!line) return null
          var parts = line.split(/\s*(?:→|->|：|:)\s*/).map(function (s) { return s.trim() })
          if (parts.length >= 2) return { q: parts[0], a: parts.slice(1).join('：').trim() }
          return null
        }).filter(Boolean)
        if (cards.length) return { title: title, cards: cards }
      }
      /* 兜底：title + summary 一张卡 */
      if (k.title && k.summary) {
        return { title: '速记', cards: [{ q: k.title, a: k.summary }] }
      }
      return []
    },
    /* 注入详情面板 */
    inject: function (ctx, conceptId, pack) {
      var body = ctx.dom.detailBody
      if (!body) return
      var self = this
      var wrap = ctx.utils.el(
        '<div class="flashcard-block">' +
          '<div class="flashcard-head">🎴 ' + ctx.utils.escHtml(pack.title) + '</div>' +
          '<div class="flashcard-list">' + pack.cards.map(function (c, i) {
            return '<div class="flashcard" data-card="' + i + '">' +
              '<div class="flashcard-inner">' +
                '<div class="flashcard-face flashcard-front">' + ctx.utils.escHtml(c.q) + '</div>' +
                '<div class="flashcard-face flashcard-back">' + ctx.utils.escHtml(c.a) + '</div>' +
              '</div>' +
            '</div>'
          }).join('') + '</div>' +
        '</div>'
      )
      /* 点卡翻面 */
      wrap.querySelectorAll('.flashcard').forEach(function (card) {
        card.addEventListener('click', function () {
          this.classList.toggle('flipped')
        })
      })
      body.appendChild(wrap)
    }
  }
})()
