/* navigation.js — 侧边栏导航模块
 * 从模板「中药学」侧边栏体系完整对齐：
 *   - 特殊入口（全部/收藏夹/错题本）用 sidebar-category no-children 结构，带计数 + active 状态
 *   - 章节分类树：arrow(展开) 与 category-info(选中) 分离，双计数徽标（count + 📖concepts）
 *   - 子分类带 sub-count + 📖sub-count-concepts
 *   - 移动端：sidebar-mobile-header（标题+关闭）+ 抽屉
 */
;(function () {
  'use strict'
  var RV = window.RV = window.RV || {}
  RV.modules = RV.modules || {}
  RV.modules['navigation'] = {
    name: 'navigation',
    deps: ['favorites'],
    render: function (ctx) {
      var self = this
      var sidebar = ctx.dom.appSidebar
      var total = ctx.utils.allConcepts().length
      var favCount = ctx.fav.count()
      var wrongCount = ctx.state.wrong.size

      /* 特殊入口（模板 no-children 结构） */
      var entryHtml =
        '<div class="sidebar-mobile-header">' +
          '<span class="sidebar-mobile-title">📂 章节导航</span>' +
          '<button class="sidebar-mobile-close" data-sidebar-close aria-label="关闭菜单">✕</button>' +
        '</div>' +
        '<div class="sidebar-heading">章节导航</div>' +
        '<div class="sidebar-category no-children" data-entry data-view="browse">' +
          '<div class="sidebar-category-header"><span class="sidebar-arrow"></span>' +
            '<span class="sidebar-category-info" data-entry data-view="browse">' +
              '<span class="sidebar-icon">📋</span><span class="sidebar-name">全部概念</span>' +
              '<span class="sidebar-count">' + total + '</span>' +
            '</span></div>' +
        '</div>' +
        '<div class="sidebar-category no-children" data-entry data-view="favorites">' +
          '<div class="sidebar-category-header"><span class="sidebar-arrow"></span>' +
            '<span class="sidebar-category-info" data-entry data-view="favorites">' +
              '<span class="sidebar-icon">⭐</span><span class="sidebar-name">收藏夹</span>' +
              '<span class="sidebar-count" data-fav-count>' + favCount + '</span>' +
            '</span></div>' +
        '</div>' +
        '<div class="sidebar-category no-children" data-entry data-view="wrongbook">' +
          '<div class="sidebar-category-header"><span class="sidebar-arrow"></span>' +
            '<span class="sidebar-category-info" data-entry data-view="wrongbook">' +
              '<span class="sidebar-icon">📕</span><span class="sidebar-name">错题本</span>' +
              '<span class="sidebar-count" data-wrong-count>' + wrongCount + '</span>' +
            '</span></div>' +
        '</div>' +
        '<div class="sidebar-heading">章节</div>' +
        '<div data-cat-tree></div>'
      sidebar.innerHTML = entryHtml

      /* 章节分类树（模板结构：arrow + info 分离 + 双计数徽标） */
      var tree = sidebar.querySelector('[data-cat-tree]')
      ctx.data.categories.forEach(function (c) {
        var concepts = c.concepts || []
        var keyCount = concepts.filter(function (k) { return k.isKey }).length
        var subHtml = (c.subcategories || []).map(function (s) {
          var subConcepts = concepts.filter(function (k) { return k.subcategory === s.id })
          var subKey = subConcepts.filter(function (k) { return k.isKey }).length
          return '<div class="sidebar-subcategory" data-sub-id="' + ctx.utils.escHtml(s.id) + '">' +
            '<span class="sidebar-subcategory-name">' + ctx.utils.escHtml(s.name) + '</span>' +
            (subConcepts.length ? '<span class="sidebar-sub-count">' + subConcepts.length + '</span>' : '') +
            (subKey ? '<span class="sidebar-sub-count-concepts">📖' + subKey + '</span>' : '') +
          '</div>'
        }).join('')
        var cat = ctx.utils.el(
          '<div class="sidebar-category" data-cat-id="' + ctx.utils.escHtml(c.id) + '">' +
            '<div class="sidebar-category-header">' +
              '<span class="sidebar-arrow" data-toggle>▶</span>' +
              '<span class="sidebar-category-info" data-select>' +
                '<span class="sidebar-icon">' + ctx.utils.escHtml(c.icon || '📂') + '</span>' +
                '<span class="sidebar-name">' + ctx.utils.escHtml(c.name) + '</span>' +
                '<span class="sidebar-count">' + concepts.length + '</span>' +
                (keyCount ? '<span class="sidebar-count-concepts">📖' + keyCount + '</span>' : '') +
              '</span>' +
            '</div>' +
            '<div class="sidebar-subcategories">' + subHtml + '</div>' +
          '</div>'
        )
        tree.appendChild(cat)
      })

      /* 事件委托 + 计数监听 + 抽屉（仅首次 render 注册，重入不重复绑定） */
      if (!self._bound) { self._bound = true
      sidebar.addEventListener('click', function (e) {
        /* 移动端关闭 */
        if (e.target.closest('[data-sidebar-close]')) { self.closeDrawer(ctx); return }
        /* 特殊入口 */
        var entry = e.target.closest('[data-entry]')
        if (entry) {
          self.updateEntries(ctx, entry.getAttribute('data-view'))
          ctx.event.emit('view:change', { view: entry.getAttribute('data-view') })
          self.closeDrawer(ctx)
          return
        }
        var catEl = e.target.closest('[data-cat-id]')
        if (!catEl) return
        var catId = catEl.getAttribute('data-cat-id')
        /* 箭头：仅展开/收起，不改选中（模板原版） */
        if (e.target.closest('[data-toggle]')) {
          catEl.classList.toggle('expanded')
          return
        }
        /* 子分类：选中 */
        var subEl = e.target.closest('[data-sub-id]')
        if (subEl) {
          self.select(ctx, catId, subEl.getAttribute('data-sub-id'))
          return
        }
        /* 分类主体：选中分类 + 自动展开 */
        if (e.target.closest('[data-select]')) {
          self.select(ctx, catId, null)
        }
      })

      /* 收藏/错题计数徽标 */
      ctx.event.on('fav:change', function () {
        var el = sidebar.querySelector('[data-fav-count]')
        if (el) el.textContent = ctx.fav.count()
      })
      ctx.event.on('wrong:change', function () {
        var el = sidebar.querySelector('[data-wrong-count]')
        if (el) el.textContent = ctx.state.wrong.size
      })
      /* 视图切换时同步入口 active */
      ctx.event.on('view:change', function (p) {
        self.updateEntries(ctx, p.view)
      })

      /* 移动端抽屉 */
      ctx.dom.hamburger.addEventListener('click', function () { self.openDrawer(ctx) })
      ctx.dom.sidebarMask.addEventListener('click', function () { self.closeDrawer(ctx) })

      } /* end _bound */
      /* 初始：浏览视图 → 全部概念 active */
      this.updateEntries(ctx, 'browse')
    },
    /* 特殊入口 active 状态（view 传 null 时全部清除） */
    updateEntries: function (ctx, view) {
      var sb = ctx.dom.appSidebar
      sb.querySelectorAll('[data-entry]').forEach(function (el) {
        el.classList.toggle('active', el.getAttribute('data-view') === view)
      })
    },
    /* 选中分类/子分类：高亮 + 自动展开 + 广播 nav:select */
    select: function (ctx, catId, subId) {
      var sb = ctx.dom.appSidebar
      sb.querySelectorAll('.sidebar-category.active').forEach(function (el) { el.classList.remove('active') })
      sb.querySelectorAll('.sidebar-subcategory.active').forEach(function (el) { el.classList.remove('active') })
      /* 遍历匹配（不用选择器拼接 catId：id 含引号/特殊字符时选择器会抛异常） */
      var catEl = null
      sb.querySelectorAll('[data-cat-id]').forEach(function (el) {
        if (el.getAttribute('data-cat-id') === catId) catEl = el
      })
      if (catEl) { catEl.classList.add('active'); catEl.classList.add('expanded') }
      if (subId) {
        var subEl = null
        if (catEl) catEl.querySelectorAll('[data-sub-id]').forEach(function (el) {
          if (el.getAttribute('data-sub-id') === subId) subEl = el
        })
        if (subEl) subEl.classList.add('active')
      }
      this.updateEntries(ctx, null)
      ctx.event.emit('nav:select', { catId: catId, subId: subId || null })
      this.closeDrawer(ctx)
    },
    openDrawer: function (ctx) {
      ctx.dom.appSidebar.classList.add('open')
      ctx.dom.sidebarMask.classList.add('show')
    },
    closeDrawer: function (ctx) {
      ctx.dom.appSidebar.classList.remove('open')
      ctx.dom.sidebarMask.classList.remove('show')
    }
  }
})()
