/* selfcheck.js — 简答自测模块
 * 基于概念：显示标题，用户自答，再展开标准答案对照（不计对错、不进错题本）
 */
;(function () {
  'use strict'
  var RV = window.RV = window.RV || {}
  RV.modules = RV.modules || {}
  RV.modules['selfcheck'] = {
    name: 'selfcheck',
    deps: ['card-browser'],
    init: function (ctx) {
      var self = this
      ctx.quizEntries = ctx.quizEntries || []
      ctx.quizEntries.push({ mode: 'selfcheck', label: '📝 简答' })
      ctx.event.on('quiz:launch', function (p) { if (p.mode === 'selfcheck') self.open(ctx, p) })
    },
    render: function (ctx) { },
    open: function (ctx, p) {
      var self = this
      ctx.ui.view = 'selfcheck'
      var pool = ctx.utils.allConcepts().filter(function (k) {
        return !p.catId || k.catId === p.catId
      })
      if (!pool.length) {
        ctx.dom.appMain.innerHTML = '<div class="empty-state">本章暂无知识点</div>'
        return
      }
      ctx.ui.quiz = { pool: ctx.utils.shuffle(pool), idx: 0, total: pool.length, current: null }
      this.next(ctx)
    },
    next: function (ctx) {
      var self = this
      var q = ctx.ui.quiz
      if (q.idx >= q.total) { this.finish(ctx); return }
      var k = q.pool[q.idx]
      q.current = k
      ctx.dom.appMain.innerHTML =
        '<div class="quiz-panel">' +
          '<div class="quiz-panel-head">📝 简答自测</div>' +
          '<div class="quiz-panel-sub">先自答，再展开标准答案对照（不计对错）</div>' +
          '<div class="quiz-progress">第 ' + (q.idx + 1) + ' / ' + q.total + ' 个</div>' +
          '<div class="quiz-prompt"><div class="quiz-prompt-text">' + ctx.utils.escHtml(k.title) + '</div></div>' +
          '<textarea class="quiz-input" data-answer rows="4" placeholder="写下你的回答…"></textarea>' +
          '<div class="quiz-actions">' +
            '<button class="btn-primary" data-reveal>📖 对照答案</button>' +
            '<button class="btn-ghost" data-next>下一个</button>' +
          '</div>' +
          '<div class="quiz-result" data-result hidden></div>' +
        '</div>'
      ctx.dom.appMain.querySelector('[data-reveal]').addEventListener('click', function () {
        var res = ctx.dom.appMain.querySelector('[data-result]')
        res.hidden = false
        res.innerHTML = '<div class="quiz-result ok"><span>摘要：</span><span class="ans">' + ctx.utils.escHtml(k.summary) + '</span></div>' +
          '<div class="quiz-result"><span>详细内容：</span><div class="ans detail-content">' + ctx.utils.sanitizeHtml(k.content) + '</div></div>'
      })
      ctx.dom.appMain.querySelector('[data-next]').addEventListener('click', function () {
        q.idx++; self.next(ctx)
      })
    },
    finish: function (ctx) {
      var q = ctx.ui.quiz
      ctx.utils.quizFinish(ctx, {
        title: '自测完成',
        score: q.idx, total: q.total
      })
    }
  }
})()
