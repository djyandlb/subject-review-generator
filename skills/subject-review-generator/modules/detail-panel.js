/* detail-panel.js — 详情面板模块
 * 监听 concept:select 渲染概念详情：分类/摘要/正文/标签/掌握度/收藏
 */
;(function () {
  'use strict'
  var RV = window.RV = window.RV || {}
  RV.modules = RV.modules || {}
  RV.modules['detail-panel'] = {
    name: 'detail-panel',
    deps: ['favorites', 'mastery'],
    init: function (ctx) {
      var self = this
      ctx.event.on('concept:select', function (p) { self.show(ctx, p.id) })
    },
    render: function (ctx) {
      var self = this
      ctx.dom.detailClose.addEventListener('click', function () { self.close(ctx) })
      /* 移动端底部返回按钮 */
      var back = ctx.utils.el('<button class="btn-primary">← 返回列表</button>')
      ctx.dom.detailFooter.appendChild(back)
      back.addEventListener('click', function () { self.close(ctx) })
    },
    show: function (ctx, id) {
      var k = ctx.utils.conceptById(id)
      if (!k) return
      var cat = ctx.utils.categoryById(k.catId)
      var sub = cat ? ctx.utils.subcategoryById(cat, k.subcategory) : null
      ctx.dom.detailTitle.textContent = k.title
      var isFav = ctx.fav.is(id)
      var m = ctx.masteryApi.get(id) || ''
      ctx.dom.detailBody.innerHTML =
        (cat ? '<span class="detail-cat">' + ctx.utils.escHtml(cat.name) + (sub ? ' · ' + ctx.utils.escHtml(sub.name) : '') + '</span>' : '') +
        '<div class="detail-summary">' + ctx.utils.escHtml(k.summary) + '</div>' +
        '<div class="detail-content">' + ctx.utils.sanitizeHtml(ctx.utils.stripEnhanceMarkers(k.content)) + '</div>' +
        (k.tags && k.tags.length
          ? '<div class="detail-tags">' + k.tags.map(function (t) {
              return '<span class="concept-tag">' + ctx.utils.escHtml(t) + '</span>'
            }).join('') + '</div>'
          : '') +
        '<div class="detail-actions-row">' +
          '<span class="mastery-badge mastery-' + ctx.utils.escHtml(m) + '">' + ctx.utils.escHtml(m) + '</span>' +
          '<button class="btn-ghost" data-fav>' + (isFav ? '★ 已收藏' : '☆ 收藏') + '</button>' +
        '</div>'
      /* 掌握度只读展示，不可切换（由资料判断写入） */
      /* 收藏切换 */
      ctx.dom.detailBody.querySelector('[data-fav]').addEventListener('click', function () {
        ctx.fav.toggle(id)
        this.textContent = ctx.fav.is(id) ? '★ 已收藏' : '☆ 收藏'
      })
      ctx.dom.appDetail.classList.add('open')
    },
    close: function (ctx) {
      ctx.dom.appDetail.classList.remove('open')
      ctx.dom.detailBody.innerHTML = ''
      ctx.dom.detailTitle.textContent = ''
    }
  }
})()
