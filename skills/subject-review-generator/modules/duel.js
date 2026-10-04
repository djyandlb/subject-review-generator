/* duel.js — 鉴别挑战模块（通用增强能力）
 * 能力：随机配对两个易混淆概念，并排展示，用户自评是否分清 → 驱动错题本
 *
 * 数据约定（零学科术语，写入 concept.content）：
 *   【鉴别:另一概念标题】  ← 标注易混淆对象（可选；无标记时按同 subcategory 自动配对）
 *
 * 错题本收录（当前模块版实现）：
 *   混淆时对两个概念分别 emit answer:wrong {type:'concept', id}，
 *   错题本按普通知识点收录、重做打开详情（鉴别对的「并排」语境在错题本中不保留；
 *   模板版另有 addDuelToWrongBook 以 type:'duel' 收录鉴别对象——两版行为不完全一致，属已知差异）
 *
 * 交互：
 *   - 注册题型入口「⚔️ 鉴别」→ quiz:launch 打开
 *   - 随机抽一对概念并排展示（title + mastery + summary）
 *   - 「展开对比」显示两卡完整 content；自评「分清 / 还混淆」驱动错题本
 * 依赖：card-browser（读题库池），事件复用 answer:correct / answer:wrong
 */
;(function () {
  'use strict'
  var RV = window.RV = window.RV || {}
  RV.modules = RV.modules || {}
  RV.modules['duel'] = {
    name: 'duel',
    deps: ['card-browser'],
    init: function (ctx) {
      var self = this
      ctx.quizEntries = ctx.quizEntries || []
      ctx.quizEntries.push({ mode: 'duel', label: '⚔️ 鉴别' })
      ctx.event.on('quiz:launch', function (p) { if (p.mode === 'duel') self.open(ctx, p) })
    },
    render: function (ctx) { },
    /* 构建鉴别对：优先 content 标记，兜底同 subcategory 自动配对 */
    buildPairs: function (ctx, p) {
      var self = this
      var pool = ctx.utils.allConcepts().filter(function (k) {
        return !p.catId || k.catId === p.catId
      })
      var byId = {}
      pool.forEach(function (k) { byId[k.id] = k })
      var pairs = []
      var seen = {}
      /* ① 优先 content 里的【鉴别:标题】标记 */
      pool.forEach(function (k) {
        var m = (k.content || '').match(/【鉴别\s*[:：]?\s*([^】]+)】/g) || []
        m.forEach(function (tag) {
          var target = (tag.replace(/【鉴别\s*[:：]?\s*/, '').replace(/】/, '')).trim()
          var t = pool.filter(function (x) { return x.title === target || target.indexOf(x.title) >= 0 || x.title.indexOf(target) >= 0 })
          if (t.length) {
            var key = [k.id, t[0].id].sort().join('|')
            if (!seen[key]) { seen[key] = 1; pairs.push({ a: k, b: t[0] }) }
          }
        })
      })
      /* ② 兜底：同 subcategory 内自动两两配对（掌握/熟悉级优先，避免同标题） */
      var groups = {}
      pool.forEach(function (k) {
        var g = k.subcategory
        groups[g] = groups[g] || []
        groups[g].push(k)
      })
      Object.keys(groups).forEach(function (g) {
        var arr = groups[g].filter(function (k) { return k.mastery === '掌握' || k.mastery === '熟悉' })
        if (arr.length < 2) arr = groups[g]
        for (var i = 0; i + 1 < arr.length; i++) {
          var a = arr[i], b = arr[i + 1]
          if (a.title === b.title) continue
          var key = [a.id, b.id].sort().join('|')
          if (!seen[key]) { seen[key] = 1; pairs.push({ a: a, b: b }) }
        }
      })
      return ctx.utils.shuffle(pairs)
    },
    open: function (ctx, p) {
      var self = this
      ctx.ui.view = 'duel'
      var pairs = this.buildPairs(ctx, p)
      if (!pairs.length) {
        ctx.dom.appMain.innerHTML = '<div class="empty-state">本章暂无足够概念配对鉴别～</div>'
        return
      }
      ctx.ui.quiz = { pairs: pairs, idx: 0, score: 0, total: pairs.length, pair: null }
      this.next(ctx)
    },
    next: function (ctx) {
      var self = this
      var q = ctx.ui.quiz
      if (q.idx >= q.total) { this.finish(ctx); return }
      var pair = q.pairs[q.idx]
      q.pair = pair
      q.locked = false
      ctx.dom.appMain.innerHTML =
        '<div class="quiz-panel">' +
          '<div class="quiz-panel-head">⚔️ 鉴别挑战</div>' +
          '<div class="quiz-panel-sub">分清这两个易混淆概念的区别</div>' +
          '<div class="quiz-progress">第 ' + (q.idx + 1) + ' / ' + q.total + ' 对</div>' +
          '<div class="duel-pair">' +
            self.renderCard(pair.a) + self.renderCard(pair.b) +
          '</div>' +
          '<div class="quiz-actions">' +
            '<button class="btn-primary" data-expand>🔍 展开对比</button>' +
            '<button class="btn-ghost" data-clear>✅ 我分清了</button>' +
            '<button class="btn-ghost" data-muddy>❓ 还混淆</button>' +
          '</div>' +
          '<div class="duel-detail" data-detail hidden></div>' +
          '<div class="quiz-result" data-result hidden></div>' +
        '</div>'
      ctx.dom.appMain.querySelector('[data-expand]').addEventListener('click', function () {
        var d = ctx.dom.appMain.querySelector('[data-detail]')
        d.hidden = !d.hidden
        d.innerHTML = self.renderDetail(pair.a) + self.renderDetail(pair.b)
      })
      ctx.dom.appMain.querySelector('[data-clear]').addEventListener('click', function () { self.judge(ctx, true) })
      ctx.dom.appMain.querySelector('[data-muddy]').addEventListener('click', function () { self.judge(ctx, false) })
    },
    renderCard: function (k) {
      var esc = RV.escHtml
      return '<div class="duel-card">' +
        '<div class="duel-card-title">' + esc(k.title) + '</div>' +
        '<div class="duel-card-meta">' + esc(k.mastery || '') + (k.isKey ? ' · 必背' : '') + '</div>' +
        '<div class="duel-card-sum">' + esc(k.summary || '') + '</div>' +
      '</div>'
    },
    renderDetail: function (k) {
      return '<div class="duel-detail-card"><div class="duel-detail-name">' + RV.escHtml(k.title) + '</div>' +
        '<div class="concept-body">' + RV.sanitizeHtml(k.content) + '</div></div>'
    },
    /* 自评：分清/还混淆 */
    judge: function (ctx, ok) {
      var self = this
      var q = ctx.ui.quiz
      if (q.locked) return
      q.locked = true
      var res = ctx.dom.appMain.querySelector('[data-result]')
      res.hidden = false
      res.innerHTML = '<div class="quiz-result ' + (ok ? 'ok' : 'no') + '">' +
        (ok ? '✅ 分清了！' : '❌ 加入错题本，再看看区别') +
        '<div class="quiz-actions"><button class="btn-primary" data-next>下一对</button></div></div>'
      /* 两个概念都标记：分清则对，混淆则错（进错题本） */
      ;[q.pair.a, q.pair.b].forEach(function (k) {
        ctx.event.emit(ok ? 'answer:correct' : 'answer:wrong', { type: 'concept', id: k.id })
      })
      if (ok) q.score++
      ctx.dom.appMain.querySelector('[data-next]').addEventListener('click', function () {
        q.idx++; self.next(ctx)
      })
    },
    finish: function (ctx) {
      var self = this
      var q = ctx.ui.quiz
      ctx.utils.quizFinish(ctx, {
        title: '鉴别完成',
        score: q.score, total: q.total,
        onAgain: function () {
          q.idx = 0; q.score = 0
          ctx.utils.shuffle(q.pairs)
          self.next(ctx)
        }
      })
    }
  }
})()
