/* favorites.js — 收藏模块
 * 提供 ctx.fav API（is/toggle/count）+ 标题栏收藏按钮（点击切到收藏视图）
 */
;(function () {
  'use strict'
  var RV = window.RV = window.RV || {}
  RV.modules = RV.modules || {}
  RV.modules['favorites'] = {
    name: 'favorites',
    deps: [],
    init: function (ctx) {
      /* 收藏 API，供卡片/详情/导航调用 */
      ctx.fav = {
        is: function (id) { return ctx.state.favorites.has(id) },
        toggle: function (id) {
          var on = ctx.state.favorites.has(id)
          if (on) ctx.state.favorites.delete(id)
          else ctx.state.favorites.add(id)
          ctx.saveAll()
          ctx.event.emit('fav:toggle', { id: id, on: !on })
          ctx.event.emit('fav:change', {})
        },
        count: function () { return ctx.state.favorites.size }
      }
    },
    render: function (ctx) {
      if (this._rendered) return /* render 重入防御：收藏按钮只插入一次 */
      this._rendered = true
      var btn = ctx.utils.el(
        '<button class="btn-icon" data-fav-btn>⭐ <span>收藏</span> <span class="count" data-fav-count>0</span></button>'
      )
      ctx.dom.headerActions.appendChild(btn)
      var countEl = btn.querySelector('[data-fav-count]')
      var update = function () { countEl.textContent = ctx.fav.count() }
      update()
      ctx.event.on('fav:change', update)
      btn.addEventListener('click', function () {
        ctx.event.emit('view:change', { view: 'favorites' })
      })
    }
  }
})()
