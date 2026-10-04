/* wrongbook.js — 错题本模块
 * 监听 answer:wrong 自动收录 / answer:correct 自动删除；支持手动删除；
 * 提供错题本视图：概念进详情重做，题目进答案回顾重做
 */
;(function () {
  'use strict'
  var RV = window.RV = window.RV || {}
  RV.modules = RV.modules || {}
  RV.modules['wrongbook'] = {
    name: 'wrongbook',
    deps: ['favorites', 'card-browser'],
    init: function (ctx) {
      var self = this
      /* 答错自动收录 */
      ctx.event.on('answer:wrong', function (p) {
        var key = p.type + ':' + p.id
        var w = ctx.state.wrong.get(key)
        if (w) w.count++
        else { w = { type: p.type, id: p.id, count: 1 } }
        ctx.state.wrong.set(key, w)
        ctx.saveAll()
        ctx.event.emit('wrong:change', {})
      })
      /* 答对自动删除 */
      ctx.event.on('answer:correct', function (p) {
        var key = p.type + ':' + p.id
        if (ctx.state.wrong.delete(key)) {
          ctx.saveAll()
          ctx.event.emit('wrong:change', {})
          if (ctx.ui.view === 'wrongbook') self.show(ctx)
        }
      })
      /* 进入错题本视图 */
      ctx.event.on('view:change', function (p) {
        if (p.view === 'wrongbook') self.show(ctx)
      })
    },
    render: function (ctx) { /* 计数由 navigation 监听 wrong:change 更新 */ },
    /* 渲染错题本列表 */
    show: function (ctx) {
      var self = this
      ctx.ui.view = 'wrongbook'
      var main = ctx.dom.appMain
      var items = Array.from(ctx.state.wrong.values())
      if (!items.length) {
        main.innerHTML = '<div class="empty-state">🎉 错题本是空的，继续保持！</div>'
        return
      }
      /* 先过滤失效条目（概念/题目已被数据删除），避免渲染空网格绕过空态分支 */
      var valid = items.filter(function (w) {
        return w.type === 'concept' ? !!ctx.utils.conceptById(w.id) : !!ctx.utils.questionById(w.id)
      })
      if (!valid.length) {
        main.innerHTML = '<div class="empty-state">🎉 错题本是空的，继续保持！</div>'
        return
      }
      var html = valid.map(function (w) {
        var title, sub
        if (w.type === 'concept') {
          var k = ctx.utils.conceptById(w.id)
          title = k.title; sub = '知识点'
        } else {
          var q = ctx.utils.questionById(w.id)
          title = q.stem; sub = '题目'
        }
        return '<div class="concept-card" data-wrong-key="' + ctx.utils.escHtml(w.type + ':' + w.id) + '">' +
          '<div class="concept-card-header">' +
            '<span class="concept-card-title">' + ctx.utils.escHtml(title) + '</span>' +
            '<span class="mastery-badge mastery-了解">错了 ' + w.count + ' 次</span>' +
          '</div>' +
          '<div class="concept-card-tags"><span class="concept-tag">' + sub + '</span></div>' +
          '<div class="detail-actions-row">' +
            '<button class="btn-primary" data-retry>重做</button>' +
            '<button class="btn-ghost" data-del>🗑 删除</button>' +
          '</div>' +
        '</div>'
      }).join('')
      main.innerHTML = '<div class="concept-grid">' + html + '</div>'
      main.querySelectorAll('[data-wrong-key]').forEach(function (el) {
        var key = el.getAttribute('data-wrong-key')
        /* id 可能含冒号：仅用第一个冒号前作类型，其余整体作 id */
        var parts = key.split(':')
        var type = parts.shift(), id = parts.join(':')
        el.querySelector('[data-retry]').addEventListener('click', function () {
          if (type === 'concept') ctx.event.emit('concept:select', { id: id })
          else self.reviewQuestion(ctx, id, type)
        })
        el.querySelector('[data-del]').addEventListener('click', function () {
          ctx.state.wrong.delete(key)
          ctx.saveAll()
          ctx.event.emit('wrong:change', {})
          self.show(ctx)
        })
      })
    },
    /* 题目回顾：题干 + 答案 + 解析，点「已掌握，删除」移除 */
    reviewQuestion: function (ctx, id, type) {
      var self = this
      var q = ctx.utils.questionById(id)
      if (!q) return
      var optsHtml = (q.options || []).map(function (o, i) {
        return '<div class="quiz-option">' + String.fromCharCode(65 + i) + '. ' + ctx.utils.escHtml(o) + '</div>'
      }).join('')
      /* 答案展示：选择题显示「字母. 选项文本」，判断题显示 对/错，其余转义原样 */
      var ansLabel = Array.isArray(q.answer)
        ? q.answer.map(function (a) { return String.fromCharCode(65 + a) + '. ' + ctx.utils.escHtml(q.options[a] || '') }).join('、')
        : (q.answer === '对' || q.answer === '错') ? q.answer
        : (typeof q.answer === 'number' && q.options && q.options[q.answer] != null)
          ? String.fromCharCode(65 + q.answer) + '. ' + ctx.utils.escHtml(q.options[q.answer])
          : ctx.utils.escHtml(String(q.answer))
      ctx.dom.appMain.innerHTML =
        '<div class="quiz-panel">' +
          '<div class="quiz-panel-head">📖 题目回顾</div>' +
          '<div class="quiz-prompt"><div class="quiz-prompt-text">' + ctx.utils.escHtml(q.stem) + '</div>' +
            (optsHtml ? '<div class="quiz-options">' + optsHtml + '</div>' : '') +
          '</div>' +
          '<div class="quiz-result ok"><span>答案：' + ansLabel + '</span>' +
            (q.explanation ? '<span class="ans">解析：' + ctx.utils.escHtml(q.explanation) + '</span>' : '') +
          '</div>' +
          '<div class="quiz-actions">' +
            '<button class="btn-primary" data-master>👍 已掌握，删除</button>' +
            '<button class="btn-ghost" data-back>返回</button>' +
          '</div>' +
        '</div>'
      ctx.dom.appMain.querySelector('[data-master]').addEventListener('click', function () {
        ctx.state.wrong.delete((type || 'question') + ':' + id)
        ctx.saveAll()
        ctx.event.emit('wrong:change', {})
        self.show(ctx)
      })
      ctx.dom.appMain.querySelector('[data-back]').addEventListener('click', function () {
        self.show(ctx)
      })
    }
  }
})()
