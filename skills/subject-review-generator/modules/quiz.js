/* quiz.js — 互猜自测模块（双向随机）
 * 正向：给 title 考 summary；反向：给 summary 考 title
 * 自评制：揭晓答案后用户自评对错 → 驱动错题本
 */
;(function () {
  'use strict'
  var RV = window.RV = window.RV || {}
  RV.modules = RV.modules || {}
  RV.modules['quiz'] = {
    name: 'quiz',
    deps: ['card-browser'],
    init: function (ctx) {
      var self = this
      ctx.quizEntries = ctx.quizEntries || []
      ctx.quizEntries.push({ mode: 'quiz', label: '🎯 互猜' })
      ctx.event.on('quiz:launch', function (p) { if (p.mode === 'quiz') self.open(ctx, p) })
    },
    render: function (ctx) { /* 无独立 DOM，入口栏由 card-browser 渲染 */ },
    open: function (ctx, p) {
      var self = this
      ctx.ui.view = 'quiz'
      var pool = ctx.utils.allConcepts().filter(function (k) {
        return !p.catId || k.catId === p.catId
      })
      if (!pool.length) {
        ctx.dom.appMain.innerHTML = '<div class="empty-state">本章暂无知识点～</div>'
        return
      }
      ctx.ui.quiz = { pool: ctx.utils.shuffle(pool), idx: 0, score: 0, total: pool.length, catId: p.catId || null }
      this.next(ctx)
    },
    next: function (ctx) {
      var self = this
      var q = ctx.ui.quiz
      if (q.idx >= q.total) { this.finish(ctx); return }
      var k = q.pool[q.idx]
      var backward = Math.random() < 0.5
      q.current = { concept: k, backward: backward }
      var prompt = backward ? k.summary : k.title
      var askLabel = backward ? '根据摘要回忆标题' : '回忆该知识点的摘要'
      ctx.dom.appMain.innerHTML =
        '<div class="quiz-panel">' +
          '<div class="quiz-panel-head">🎯 互猜自测</div>' +
          '<div class="quiz-panel-sub">' + askLabel + '，先在心里作答再揭晓</div>' +
          '<div class="quiz-progress">第 ' + (q.idx + 1) + ' / ' + q.total + ' 题</div>' +
          '<div class="quiz-prompt"><div class="quiz-prompt-text">' + ctx.utils.escHtml(prompt) + '</div></div>' +
          '<div class="quiz-actions">' +
            '<button class="btn-primary" data-reveal>👁 揭晓答案</button>' +
            '<button class="btn-ghost" data-skip>跳过</button>' +
          '</div>' +
          '<div class="quiz-result" data-result hidden></div>' +
        '</div>'
      var reveal = ctx.dom.appMain.querySelector('[data-reveal]')
      var resultBox = ctx.dom.appMain.querySelector('[data-result]')
      reveal.addEventListener('click', function () {
        var answer = backward ? k.title : k.summary
        resultBox.hidden = false
        resultBox.innerHTML = '<div class="quiz-result">答案：<span class="ans">' + ctx.utils.escHtml(answer) + '</span></div>' +
          '<div class="quiz-actions">' +
            '<button class="btn-primary" data-good>👍 答对了</button>' +
            '<button class="btn-ghost" data-bad>👎 答错了</button>' +
          '</div>'
        reveal.hidden = true
        resultBox.querySelector('[data-good]').addEventListener('click', function () {
          ctx.event.emit('answer:correct', { type: 'concept', id: k.id })
          q.idx++; q.score++; self.next(ctx)
        })
        resultBox.querySelector('[data-bad]').addEventListener('click', function () {
          ctx.event.emit('answer:wrong', { type: 'concept', id: k.id })
          q.idx++; self.next(ctx)
        })
      })
      ctx.dom.appMain.querySelector('[data-skip]').addEventListener('click', function () {
        q.idx++; self.next(ctx)
      })
    },
    finish: function (ctx) {
      var self = this
      var q = ctx.ui.quiz
      ctx.utils.quizFinish(ctx, {
        title: '自测完成',
        score: q.score, total: q.total,
        onAgain: function () {
          q.idx = 0; q.score = 0
          ctx.utils.shuffle(q.pool)
          self.next(ctx)
        }
      })
    }
  }
})()
