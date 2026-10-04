/* truefalse.js — 判断题模块（基于题库 tf）
 * 渲染陈述 + 「对 / 错」按钮，点即判
 */
;(function () {
  'use strict'
  var RV = window.RV = window.RV || {}
  RV.modules = RV.modules || {}
  RV.modules['truefalse'] = {
    name: 'truefalse',
    deps: ['card-browser'],
    init: function (ctx) {
      var self = this
      ctx.quizEntries = ctx.quizEntries || []
      ctx.quizEntries.push({ mode: 'tf', label: '⚖️ 判断' })
      ctx.event.on('quiz:launch', function (p) { if (p.mode === 'tf') self.open(ctx, p) })
    },
    render: function (ctx) { },
    open: function (ctx, p) {
      var self = this
      ctx.ui.view = 'tf'
      var pool = ctx.data.questions.filter(function (q) {
        if (q.type !== 'tf') return false
        return !p.catId || q.chapter === p.catId
      })
      if (!pool.length) {
        ctx.dom.appMain.innerHTML = '<div class="empty-state">本章暂无判断题</div>'
        return
      }
      ctx.ui.quiz = { pool: ctx.utils.shuffle(pool), idx: 0, score: 0, total: pool.length, current: null }
      this.next(ctx)
    },
    next: function (ctx) {
      var self = this
      var q = ctx.ui.quiz
      if (q.idx >= q.total) { this.finish(ctx); return }
      q.locked = false /* 解锁，允许本次作答 */
      var item = q.pool[q.idx]
      q.current = item
      ctx.dom.appMain.innerHTML =
        '<div class="quiz-panel">' +
          '<div class="quiz-panel-head">⚖️ 判断题</div>' +
          '<div class="quiz-progress">第 ' + (q.idx + 1) + ' / ' + q.total + ' 题</div>' +
          '<div class="quiz-prompt"><div class="quiz-prompt-text">' + ctx.utils.escHtml(item.stem) + '</div></div>' +
          '<div class="quiz-actions">' +
            '<button class="btn-primary" data-tf="对">对</button>' +
            '<button class="btn-ghost" data-tf="错">错</button>' +
          '</div>' +
          '<div class="quiz-result" data-result hidden></div>' +
        '</div>'
      ctx.dom.appMain.querySelectorAll('[data-tf]').forEach(function (btn) {
        btn.addEventListener('click', function () { self.check(ctx, item, this.getAttribute('data-tf')) })
      })
    },
    check: function (ctx, item, userAns) {
      var self = this
      var q = ctx.ui.quiz
      if (q.locked) return /* 已判分，防「对/错」按钮重复触发重复计分 */
      q.locked = true
      /* 答案规范化后比较：数据端可能写 true/false、1/0、'正确'/'错误'，统一按 '对'/'错' 判定 */
      var ans = (item.answer === '对' || item.answer === '正确' || item.answer === true || item.answer === 1 || item.answer === '1' || item.answer === 'true') ? '对'
        : (item.answer === '错' || item.answer === '错误' || item.answer === false || item.answer === 0 || item.answer === '0' || item.answer === 'false') ? '错' : item.answer
      var correct = userAns === ans
      var res = ctx.dom.appMain.querySelector('[data-result]')
      res.hidden = false
      res.innerHTML = '<div class="quiz-result ' + (correct ? 'ok' : 'no') + '">' +
        (correct ? '✅ 判断正确！' : '❌ 正确答案：' + item.answer) +
        (item.explanation ? '<span class="ans">解析：' + ctx.utils.escHtml(item.explanation) + '</span>' : '') +
        '</div>' +
        '<div class="quiz-actions"><button class="btn-primary" data-next>下一题</button></div>'
      ctx.event.emit(correct ? 'answer:correct' : 'answer:wrong', { type: 'question', id: item.id })
      if (correct) q.score++
      ctx.dom.appMain.querySelector('[data-next]').addEventListener('click', function () {
        q.idx++; self.next(ctx)
      })
    },
    finish: function (ctx) {
      var self = this
      var q = ctx.ui.quiz
      ctx.utils.quizFinish(ctx, {
        title: '练习完成',
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
