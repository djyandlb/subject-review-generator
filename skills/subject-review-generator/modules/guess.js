/* guess.js — 填空猜一猜模块
 * 给 title，用户输入摘要关键词，关键词命中率判定对错 → 驱动错题本
 */
;(function () {
  'use strict'
  var RV = window.RV = window.RV || {}
  RV.modules = RV.modules || {}
  RV.modules['guess'] = {
    name: 'guess',
    deps: ['card-browser'],
    init: function (ctx) {
      var self = this
      ctx.quizEntries = ctx.quizEntries || []
      ctx.quizEntries.push({ mode: 'guess', label: '✍️ 填空' })
      ctx.event.on('quiz:launch', function (p) { if (p.mode === 'guess') self.open(ctx, p) })
    },
    render: function (ctx) { },
    open: function (ctx, p) {
      var self = this
      ctx.ui.view = 'guess'
      var pool = ctx.utils.allConcepts().filter(function (k) {
        return !p.catId || k.catId === p.catId
      })
      if (!pool.length) {
        ctx.dom.appMain.innerHTML = '<div class="empty-state">本章暂无知识点～</div>'
        return
      }
      ctx.ui.quiz = { pool: ctx.utils.shuffle(pool), idx: 0, score: 0, total: pool.length, concept: null }
      this.next(ctx)
    },
    next: function (ctx) {
      var self = this
      var q = ctx.ui.quiz
      if (q.idx >= q.total) { this.finish(ctx); return }
      q.locked = false /* 解锁，允许本次作答 */
      var k = q.pool[q.idx]
      q.concept = k
      ctx.dom.appMain.innerHTML =
        '<div class="quiz-panel">' +
          '<div class="quiz-panel-head">✍️ 填空猜一猜</div>' +
          '<div class="quiz-panel-sub">根据标题补全摘要关键词</div>' +
          '<div class="quiz-progress">第 ' + (q.idx + 1) + ' / ' + q.total + ' 题</div>' +
          '<div class="quiz-prompt"><div class="quiz-prompt-text">' + ctx.utils.escHtml(k.title) + '</div></div>' +
          '<input class="quiz-input" data-answer placeholder="输入摘要关键词…">' +
          '<div class="quiz-actions"><button class="btn-primary" data-submit>提交</button></div>' +
          '<div class="quiz-result" data-result hidden></div>' +
        '</div>'
      var input = ctx.dom.appMain.querySelector('[data-answer]')
      input.focus()
      ctx.dom.appMain.querySelector('[data-submit]').addEventListener('click', function () {
        self.check(ctx, input.value)
      })
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') self.check(ctx, input.value) })
    },
    check: function (ctx, answer) {
      var self = this
      var q = ctx.ui.quiz
      if (q.locked) return /* 已判分，防输入框 Enter/提交按钮重复触发重复计分 */
      q.locked = true
      var k = q.concept
      var summary = k.summary || ''
      /* 关键词判定：摘要中长度≥2 的词，输入命中 ≥50% 即算对 */
      var tokens = summary.split(/[\s，。、；：()（）《》「」""''.,;:!?]+/).filter(function (t) { return t.length >= 2 })
      var hit = tokens.filter(function (t) { return answer.indexOf(t) >= 0 }).length
      var ok = tokens.length ? hit / tokens.length >= 0.5 : false /* 摘要无关键词可判时不算对 */
      var res = ctx.dom.appMain.querySelector('[data-result]')
      res.hidden = false
      res.innerHTML = '<div class="quiz-result ' + (ok ? 'ok' : 'no') + '">' +
        (ok ? '✅ 答对了！' : '❌ 正确答案：') +
        '<span class="ans">' + ctx.utils.escHtml(summary) + '</span></div>' +
        '<div class="quiz-actions"><button class="btn-primary" data-next>下一题</button></div>'
      ctx.event.emit(ok ? 'answer:correct' : 'answer:wrong', { type: 'concept', id: k.id })
      if (ok) q.score++
      ctx.dom.appMain.querySelector('[data-next]').addEventListener('click', function () {
        q.idx++; self.next(ctx)
      })
    },
    finish: function (ctx) {
      var self = this
      var q = ctx.ui.quiz
      ctx.utils.quizFinish(ctx, {
        title: '填空完成',
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
