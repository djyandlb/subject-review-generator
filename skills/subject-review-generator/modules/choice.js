/* choice.js — 选择题模块（基于题库 single/multi）
 * 单选：点选项即判；多选：勾选后点「确认选择」判
 */
;(function () {
  'use strict'
  var RV = window.RV = window.RV || {}
  RV.modules = RV.modules || {}
  RV.modules['choice'] = {
    name: 'choice',
    deps: ['card-browser'],
    init: function (ctx) {
      var self = this
      ctx.quizEntries = ctx.quizEntries || []
      ctx.quizEntries.push({ mode: 'choice', label: '🔘 选择' })
      ctx.event.on('quiz:launch', function (p) { if (p.mode === 'choice') self.open(ctx, p) })
    },
    render: function (ctx) { },
    open: function (ctx, p) {
      var self = this
      ctx.ui.view = 'choice'
      var pool = ctx.data.questions.filter(function (q) {
        if (q.type !== 'single' && q.type !== 'multi') return false
        return !p.catId || q.chapter === p.catId
      })
      if (!pool.length) {
        ctx.dom.appMain.innerHTML = '<div class="empty-state">本章暂无选择题</div>'
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
      var isMulti = item.type === 'multi'
      var optsHtml = item.options.map(function (o, i) {
        return '<button class="quiz-option" data-opt="' + i + '">' + String.fromCharCode(65 + i) + '. ' + ctx.utils.escHtml(o) + '</button>'
      }).join('')
      ctx.dom.appMain.innerHTML =
        '<div class="quiz-panel">' +
          '<div class="quiz-panel-head">' + (isMulti ? '🔘 多选题' : '🔘 单选题') + '</div>' +
          '<div class="quiz-progress">第 ' + (q.idx + 1) + ' / ' + q.total + ' 题</div>' +
          '<div class="quiz-prompt"><div class="quiz-prompt-text">' + ctx.utils.escHtml(item.stem) + '</div>' +
            '<div class="quiz-options">' + optsHtml + '</div>' +
          '</div>' +
          '<div class="quiz-actions">' + (isMulti ? '<button class="btn-primary" data-confirm>确认选择</button>' : '') + '</div>' +
          '<div class="quiz-result" data-result hidden></div>' +
        '</div>'
      var selected = []
      var options = ctx.dom.appMain.querySelectorAll('.quiz-option')
      options.forEach(function (opt) {
        opt.addEventListener('click', function () {
          if (isMulti) {
            this.classList.toggle('selected')
            var idx = parseInt(this.getAttribute('data-opt'), 10)
            var pos = selected.indexOf(idx)
            if (pos >= 0) selected.splice(pos, 1); else selected.push(idx)
          } else {
            self.check(ctx, item, [parseInt(this.getAttribute('data-opt'), 10)])
          }
        })
      })
      if (isMulti) {
        ctx.dom.appMain.querySelector('[data-confirm]').addEventListener('click', function () {
          self.check(ctx, item, selected)
        })
      }
    },
    check: function (ctx, item, userAns) {
      var self = this
      var q = ctx.ui.quiz
      if (q.locked) return /* 已判分，防选项/确认按钮重复触发重复计分 */
      q.locked = true
      var correct
      if (Array.isArray(item.answer)) {
        correct = userAns.length === item.answer.length &&
          item.answer.every(function (a) { return userAns.indexOf(a) >= 0 })
      } else {
        correct = userAns.length === 1 && userAns[0] === item.answer
      }
      /* 高亮正确/错误选项 */
      ctx.dom.appMain.querySelectorAll('.quiz-option').forEach(function (opt) {
        var i = parseInt(opt.getAttribute('data-opt'), 10)
        var isAns = item.answer === i || (Array.isArray(item.answer) && item.answer.indexOf(i) >= 0)
        if (isAns) opt.classList.add('correct')
        else if (userAns.indexOf(i) >= 0) opt.classList.add('wrong')
      })
      var correctLabel = Array.isArray(item.answer)
        ? item.answer.map(function (a) { return String.fromCharCode(65 + a) }).join('、')
        : String.fromCharCode(65 + item.answer)
      var res = ctx.dom.appMain.querySelector('[data-result]')
      res.hidden = false
      res.innerHTML = '<div class="quiz-result ' + (correct ? 'ok' : 'no') + '">' +
        (correct ? '✅ 回答正确！' : '❌ 正确答案：' + correctLabel) +
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
