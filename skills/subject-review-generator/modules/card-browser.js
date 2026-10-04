/* card-browser.js — 主区卡片流模块
 * 从模板「中药学」renderMain 对齐主区体系：
 *   - section header（搜索/收藏/分类/全部 四种标题 + 计数）
 *   - view-filter 按钮（仅必学 isKey / 仅收藏）+ subcat-tabs（子分类过滤）
 *   - 概念卡片流 + 练习入口栏（quizEntries）
 */
;(function () {
  'use strict'
  var RV = window.RV = window.RV || {}
  RV.modules = RV.modules || {}
  RV.modules['card-browser'] = {
    name: 'card-browser',
    deps: ['favorites', 'mastery'],
    init: function (ctx) {
      var self = this
      ctx.event.on('nav:select', function (p) {
        ctx.ui.view = 'browse'
        ctx.ui.catId = p.catId
        ctx.ui.subId = p.subId
        self.render(ctx)
      })
      ctx.event.on('search:change', function () {
        if (ctx.ui.view === 'browse' || ctx.ui.view === 'favorites') self.render(ctx)
      })
      ctx.event.on('fav:change', function () {
        if (ctx.ui.view === 'browse' || ctx.ui.view === 'favorites') self.render(ctx)
      })
      ctx.event.on('mastery:change', function () {
        if (ctx.ui.view === 'browse') self.render(ctx)
      })
      ctx.event.on('view:change', function (p) {
        if (p.view === 'browse' || p.view === 'favorites') {
          ctx.ui.view = p.view
          self.render(ctx)
        }
      })
    },
    render: function (ctx) {
      var self = this
      if (ctx.ui.view !== 'browse' && ctx.ui.view !== 'favorites') return
      var main = ctx.dom.appMain
      var esc = ctx.utils.escHtml
      var all = ctx.utils.allConcepts()

      /* ---- 过滤（模板 getFilteredHerbs 语义；收藏视图同样响应搜索，避免「死」搜索框） ---- */
      var list
      var matchFn = ctx.conceptMatchesSearch || function (k, q) {
        return ctx.utils.fuzzyMatch(k.title, q)
      }
      if (ctx.ui.view === 'favorites') {
        list = all.filter(function (k) {
          if (!ctx.fav.is(k.id)) return false
          if (ctx.ui.query && !matchFn(k, ctx.ui.query)) return false
          return true
        })
      } else {
        list = all.filter(function (k) {
          if (!ctx.ui.query) {
            if (ctx.ui.catId && k.catId !== ctx.ui.catId) return false
            if (ctx.ui.subId && k.subcategory !== ctx.ui.subId) return false
            if (ctx.ui.viewMasteryOnly && !k.isKey) return false
            if (ctx.ui.viewFavOnly && !ctx.fav.is(k.id)) return false
          }
          /* 搜索视图无过滤按钮，忽略仅必学/仅收藏，避免漏结果 */
          if (ctx.ui.query && !matchFn(k, ctx.ui.query)) return false
          return true
        })
      }

      /* ---- 1. section header（模板 renderMain 结构） ---- */
      var header = ''
      if (ctx.ui.query) {
        header = '<div class="main-section-header"><h1 class="main-section-title">🔍 搜索结果</h1>' +
          '<p class="main-section-subtitle">"' + esc(ctx.ui.query) + '" · 共 ' + list.length + ' 个知识点</p></div>'
      } else if (ctx.ui.view === 'favorites') {
        header = '<div class="main-section-header"><h1 class="main-section-title">⭐ 我的收藏</h1>' +
          '<p class="main-section-subtitle">共 ' + list.length + ' 个收藏知识点</p></div>'
      } else {
        var cat = ctx.ui.catId ? ctx.utils.categoryById(ctx.ui.catId) : null
        var filters = '<div class="main-section-filters">' +
          '<button class="view-filter-btn' + (ctx.ui.viewMasteryOnly ? ' active' : '') + '" data-filter-mastery>' +
            (ctx.ui.viewMasteryOnly ? '🔴' : '⚪') + ' 仅必学</button>' +
          '<button class="view-filter-btn' + (ctx.ui.viewFavOnly ? ' active' : '') + '" data-filter-fav>' +
            (ctx.ui.viewFavOnly ? '⭐' : '☆') + ' 仅收藏</button>' +
          '</div>'
        if (cat) {
          var subName = ctx.ui.subId
            ? ((ctx.utils.subcategoryById(cat, ctx.ui.subId) || {}).name || '')
            : ''
          header = '<div class="main-section-header"><div class="main-section-header-row">' +
            '<h1 class="main-section-title">' + esc(cat.icon || '') + ' ' + esc(cat.name) + '</h1>' + filters + '</div>' +
            '<p class="main-section-subtitle">' + (subName ? esc(subName) : '全部知识点') + ' · 共 ' + list.length + ' 个</p></div>'
          /* 子分类 tabs（模板） */
          if (cat.subcategories && cat.subcategories.length) {
            header += '<div class="subcat-tabs">' +
              '<button class="subcat-tab' + (!ctx.ui.subId ? ' active' : '') + '" data-sub-filter data-sub-id="">全部</button>' +
              cat.subcategories.map(function (s) {
                return '<button class="subcat-tab' + (ctx.ui.subId === s.id ? ' active' : '') + '" data-sub-filter data-sub-id="' + esc(s.id) + '">' + esc(s.name) + '</button>'
              }).join('') + '</div>'
          }
        } else {
          header = '<div class="main-section-header"><div class="main-section-header-row">' +
            '<h1 class="main-section-title">📋 全部知识点</h1>' + filters + '</div>' +
            '<p class="main-section-subtitle">共 ' + list.length + ' 个知识点</p></div>'
        }
      }

      /* ---- 2. 练习入口栏（quizEntries） ---- */
      var entriesBar = ''
      if ((ctx.quizEntries || []).length) {
        entriesBar = '<div class="chapter-practice-bar">' +
          ctx.quizEntries.map(function (e) {
            return '<button class="chapter-practice-btn" data-quiz-mode="' + e.mode + '">' + e.label + '</button>'
          }).join('') + '</div>'
      }

      /* ---- 3. 网格 / 空态 ---- */
      if (!list.length) {
        main.innerHTML = header + entriesBar + '<div class="empty-state">' +
          (ctx.ui.query ? '没有匹配「' + esc(ctx.ui.query) + '」的结果' : '这里空空如也～') + '</div>'
        self.bindEvents(ctx, main)
        return
      }
      main.innerHTML = header + entriesBar + '<div class="concept-grid">' + list.map(function (k) {
        return self.cardHtml(ctx, k)
      }).join('') + '</div>'
      self.bindEvents(ctx, main)
    },
    /* 事件绑定（统一委托） */
    bindEvents: function (ctx, main) {
      var self = this
      main.querySelectorAll('.concept-card').forEach(function (el) {
        el.addEventListener('click', function (e) {
          var favBtn = e.target.closest('[data-fav]')
          if (favBtn) {
            e.stopPropagation()
            ctx.fav.toggle(favBtn.getAttribute('data-fav'))
            /* 收藏星弹跳动画（模板 starBounce） */
            favBtn.classList.remove('bounce')
            void favBtn.offsetWidth
            favBtn.classList.add('bounce')
            return
          }
          ctx.event.emit('concept:select', { id: el.getAttribute('data-concept-id') })
        })
      })
      var masteryBtn = main.querySelector('[data-filter-mastery]')
      if (masteryBtn) masteryBtn.addEventListener('click', function () {
        ctx.ui.viewMasteryOnly = !ctx.ui.viewMasteryOnly
        self.render(ctx)
      })
      var favBtn = main.querySelector('[data-filter-fav]')
      if (favBtn) favBtn.addEventListener('click', function () {
        ctx.ui.viewFavOnly = !ctx.ui.viewFavOnly
        self.render(ctx)
      })
      main.querySelectorAll('[data-sub-filter]').forEach(function (tab) {
        tab.addEventListener('click', function () {
          ctx.ui.subId = this.getAttribute('data-sub-id') || null
          self.render(ctx)
        })
      })
      main.querySelectorAll('[data-quiz-mode]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          ctx.event.emit('quiz:launch', {
            mode: btn.getAttribute('data-quiz-mode'),
            catId: ctx.ui.catId,
            subId: ctx.ui.subId
          })
        })
      })
    },
    /* 单张概念卡 HTML */
    cardHtml: function (ctx, k) {
      var isFav = ctx.fav.is(k.id)
      var tags = (k.tags && k.tags.length)
        ? '<div class="concept-card-tags">' + k.tags.map(function (t) {
            return '<span class="concept-tag">' + ctx.utils.escHtml(t) + '</span>'
          }).join('') + '</div>'
        : ''
      return '<div class="concept-card" data-concept-id="' + ctx.utils.escHtml(k.id) + '">' +
        '<div class="concept-card-header">' +
          '<span class="concept-card-title">' + ctx.utils.escHtml(k.title) + '</span>' +
          ctx.masteryBadge(k.id) +
        '</div>' +
        '<div class="concept-card-summary">' + ctx.utils.escHtml(k.summary) + '</div>' +
        tags +
        '<button class="concept-card-star' + (isFav ? ' favorited' : '') + '" data-fav="' + ctx.utils.escHtml(k.id) + '">' + (isFav ? '★' : '☆') + '</button>' +
      '</div>'
    }
  }
})()
