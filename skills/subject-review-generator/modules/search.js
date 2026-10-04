/* search.js — 搜索模块
 * 从模板「中药学」搜索系统完整移植（不简化）：
 *   - 展开式搜索框：收起=放大镜按钮，展开=输入框滑出（250ms 后聚焦）
 *   - 输入 200ms 防抖；清除按钮；仅空时收起
 *   - 匹配：fuzzyMatch 模糊匹配 concept.title / concept.content（去标签）
 *   - 搜索时忽略章节过滤（全库搜），由 card-browser 响应 search:change 渲染
 */
;(function () {
  'use strict'
  var RV = window.RV = window.RV || {}
  RV.modules = RV.modules || {}
  RV.modules['search'] = {
    name: 'search',
    deps: [],
    _timer: null,
    init: function (ctx) {
      var self = this
      /* 预计算每个概念的可搜索文本（content 去标签一次缓存，避免每次输入全量重算） */
      ctx.data.categories.forEach(function (c) {
        (c.concepts || []).forEach(function (k) {
          k._searchText = (k.content || '').replace(/<[^>]*>/g, '')
        })
      })
      /* 概念匹配函数，供 card-browser 复用（模板原版逻辑） */
      ctx.conceptMatchesSearch = function (concept, query) {
        if (!query) return true
        var contentText = concept._searchText != null ? concept._searchText
          : (concept.content || '').replace(/<[^>]*>/g, '')
        return ctx.utils.fuzzyMatch(concept.title || '', query) ||
               ctx.utils.fuzzyMatch(contentText, query)
      }
      /* 进入刷题等视图时收起搜索 */
      ctx.event.on('view:change', function (p) {
        if (p.view !== 'browse' && p.view !== 'favorites') self.collapseSearch(ctx)
      })
    },
    render: function (ctx) {
      var self = this
      var wrap = ctx.dom.searchWrap
      /* 模板原版 DOM 结构：trigger + 放大镜 svg + input-inner(input + clear) */
      wrap.innerHTML =
        '<button class="search-trigger" id="searchTrigger" aria-label="搜索" title="搜索">' +
          '<span class="search-trigger-text">搜索</span>' +
        '</button>' +
        '<svg class="search-glass-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="16" height="16">' +
          '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>' +
        '</svg>' +
        '<span class="search-input-inner">' +
          '<input type="text" id="searchInput" placeholder="搜索知识点…" autocomplete="off" aria-label="搜索">' +
          '<button class="search-clear hidden" id="searchClear" aria-label="清除搜索" title="清除">✕</button>' +
        '</span>'
      var input = wrap.querySelector('#searchInput')
      var clear = wrap.querySelector('#searchClear')
      ctx.dom.searchInput = input
      ctx.dom.searchClear = clear
      wrap.querySelector('#searchTrigger').addEventListener('click', function () {
        self.expandSearch(ctx)
      })
      clear.addEventListener('click', function () {
        self.handleSearchClear(ctx)
      })
      input.addEventListener('input', function () {
        self.handleSearchInput(ctx)
      })
      /* 失焦自动收回（模板原版）：焦点移到 searchWrap 内或有文字时不收起，200ms 延迟收起 */
      input.addEventListener('blur', function (e) {
        var related = e.relatedTarget
        if (related && related.closest && related.closest('#searchWrap')) return
        if (ctx.ui.query || input.value.trim()) return
        setTimeout(function () {
          self.collapseSearch(ctx)
        }, 200)
      })
      /* Escape 键（模板原版）：无搜索内容时清空 + 收起 + blur */
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !ctx.ui.query) {
          input.value = ''
          ctx.dom.searchWrap.classList.remove('expanded')
          input.blur()
        }
      })
    },
    /* 输入处理：防抖 200ms；搜索时切回浏览视图并广播 */
    handleSearchInput: function (ctx) {
      var self = this
      if (ctx.ui.view !== 'browse' && ctx.ui.view !== 'favorites') {
        ctx.event.emit('view:change', { view: 'browse' })
      }
      clearTimeout(self._timer)
      self._timer = setTimeout(function () {
        ctx.ui.query = ctx.dom.searchInput.value.trim()
        if (ctx.ui.query) ctx.dom.searchClear.classList.remove('hidden')
        else ctx.dom.searchClear.classList.add('hidden')
        ctx.event.emit('search:change', { query: ctx.ui.query })
      }, 200)
    },
    /* 展开搜索：加 expanded 类，250ms 后聚焦 */
    expandSearch: function (ctx) {
      if (ctx.dom.searchWrap.classList.contains('expanded')) return
      ctx.dom.searchWrap.classList.add('expanded')
      setTimeout(function () {
        ctx.dom.searchInput.focus()
      }, 250)
    },
    /* 收起搜索：仅当输入为空时 */
    collapseSearch: function (ctx) {
      if (ctx.dom.searchInput && !ctx.ui.query && !ctx.dom.searchInput.value.trim()) {
        ctx.dom.searchWrap.classList.remove('expanded')
      }
    },
    /* 清空搜索：清 query、聚焦、200ms 后收起 */
    handleSearchClear: function (ctx) {
      var self = this
      clearTimeout(self._timer) /* 防残留防抖 timer 延迟触发再次广播 */
      ctx.ui.query = ''
      ctx.dom.searchInput.value = ''
      ctx.dom.searchClear.classList.add('hidden')
      ctx.event.emit('search:change', { query: '' })
      ctx.dom.searchInput.focus()
      setTimeout(function () {
        self.collapseSearch(ctx)
      }, 200)
    }
  }
})()
