/* rv-core.js — 模块运行时核心（所有模块的地基，恒选中）
 * 职责：
 *   1. 模块注册表 RV.modules / 事件总线 RV.on / RV.emit
 *   2. 共享上下文 ctx（data/state/store/dom/event/utils）
 *   3. boot 拓扑排序 → init → render 装配
 * 契约：
 *   事件：answer:wrong / answer:correct / mastery:change / fav:toggle
 *   localStorage 键：rv_fav_{subject} / rv_mastery_{subject} / rv_wrong_{subject}
 */
;(function () {
  'use strict'
  /* 用局部 RV 指向 window.RV：浏览器全局属性即变量，Node 测试靠 window 对象 */
  var RV = window.RV = window.RV || {}
  RV.modules = {}
  RV._listeners = {}
  RV.ctx = null

  /* ---------- 事件总线：模块间通信（错题本靠它监听答题结果） ---------- */
  RV.on = function (type, fn) {
    ;(RV._listeners[type] = RV._listeners[type] || []).push(fn)
  }
  RV.emit = function (type, payload) {
    ;(RV._listeners[type] || []).slice().forEach(function (fn) { fn(payload) })
  }

  /* ---------- 工具函数 ---------- */
  RV.escHtml = function (str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    })
  }
  /* 富文本白名单清洗：content 允许基础排版标签（p/b/strong/i/em/ul/ol/li/br/blockquote/span/img 等），
   * 剥离脚本/框架/表单等危险标签（含其内容）、全部 on* 事件属性、javascript: 协议，防 AI 生成内容注入 */
  RV.sanitizeHtml = function (html) {
    if (html == null) return ''
    var str = String(html)
    /* 1. 危险容器标签连内容一起删（script/style/iframe 等成对标签） */
    str = str.replace(/<\s*(script|style|iframe|object|embed|svg|math|noscript)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    /* 2. 危险/表单标签（含孤立未闭合标签）删除 */
    str = str.replace(/<\s*\/?\s*(script|style|iframe|object|embed|svg|math|form|input|button|textarea|select|option|link|meta|base|applet|frameset|frame|noscript)\b[^>]*>/gi, '')
    /* 3. 移除全部 on* 事件属性 */
    str = str.replace(/\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/gi, '')
    /* 4. javascript: 协议属性值替换为 #（保留原引号，避免闭合引号丢失破坏结构） */
    str = str.replace(/\s(href|src)\s*=\s*(["'])\s*javascript:[^"']*?\2/gi, ' $1=$2#$2')
    /* 无引号形式的 javascript: 协议（href=javascript:...）一并清除 */
    str = str.replace(/\s(href|src)\s*=\s*javascript:[^\s>]*/gi, '')
    return str
  }
  /* 剥离增强标记块：从 content 去掉【对比表】【树】【流程】【速记】【结构卡】【分期】原文块，只留正文
   * （模板版 stripEnhanceMarkers 的模块版实现，防「标记原文 + 增强卡」重复显示；
   *   终止：下一个 <p>/<ul>、下一标记、连续空行或结尾——与生成规范的单空行对齐） */
  RV.stripEnhanceMarkers = function (content) {
    if (content == null) return ''
    return String(content).replace(/(?:<p><b>[^<]*<\/b><\/p>\s*)?【(?:对比表|树|流程|速记|结构卡|分期)[^】]*】[^\n]*[\s\S]*?(?=(?:<p>|<ul>|【(?:对比表|树|流程|速记|结构卡|分期)|\n\s*\n|$))/g, '')
  }
  RV.el = function (html) {
    var t = document.createElement('template')
    t.innerHTML = html.trim()
    return t.content.firstChild
  }
  /* 模糊匹配：query 按字符顺序出现在 text 中即命中 */
  RV.fuzzyMatch = function (text, query) {
    if (!query) return true
    var t = String(text).toLowerCase(), q = String(query).toLowerCase(), qi = 0
    for (var i = 0; i < t.length && qi < q.length; i++) {
      if (t[i] === q[qi]) qi++
    }
    return qi === q.length
  }

  /* ---------- 构造共享上下文 ctx ---------- */
  RV.buildCtx = function (data) {
    /* 预处理：给每个概念挂上所属分类 id，供过滤使用（幂等，重复 boot 无害，有意为之） */
    (data.categories || []).forEach(function (c) {
      ;(c.concepts || []).forEach(function (k) { k.catId = c.id })
    })
    var ctx = {
      data: data,
      state: {
        favorites: new Set(),          // 收藏的 conceptId
        mastery: new Map(),            // conceptId -> '掌握'|'熟悉'|'了解'
        wrong: new Map()               // 'type:id' -> {type, id, count}
      },
      store: {
        key: function (suffix) { return 'rv_' + suffix + '_' + data.subject },
        load: function (suffix, def) {
          try { return JSON.parse(localStorage.getItem(this.key(suffix)) || 'null') || def }
          catch (e) { return def }
        },
        save: function (suffix, val) {
          /* 隐私模式/配额满时 setItem 抛错：静默降级，内存态仍有效，仅不持久化 */
          try { localStorage.setItem(this.key(suffix), JSON.stringify(val)) }
          catch (e) { /* 忽略，不打断收藏/错题/掌握度操作链 */ }
        }
      },
      /* dom 容器引用：boot 时自动填充母版容器，模块一律经 ctx.dom.xxx 操作 */
      dom: (function () {
        var d = {}
        var map = {
          headerActions: 'headerActions', searchWrap: 'searchWrap',
          appSidebar: 'appSidebar', sidebarMask: 'sidebarMask',
          appMain: 'appMain', appDetail: 'appDetail',
          detailTitle: 'detailTitle', detailActions: 'detailActions',
          detailBody: 'detailBody', detailFooter: 'detailFooter',
          detailClose: 'detailClose', hamburger: 'btnHamburger',
          brandName: 'brandName'
        }
        if (typeof document !== 'undefined' && typeof document.getElementById === 'function') {
          Object.keys(map).forEach(function (k) { d[k] = document.getElementById(map[k]) })
        }
        return d
      })(),
      event: { on: RV.on, emit: RV.emit },
      utils: {
        escHtml: RV.escHtml,
        sanitizeHtml: RV.sanitizeHtml,
        stripEnhanceMarkers: RV.stripEnhanceMarkers,
        el: RV.el,
        fuzzyMatch: RV.fuzzyMatch,
        /* 数据查找工具：全模块复用 */
        allConcepts: function () {
          var out = []
          data.categories.forEach(function (c) {
            c.concepts.forEach(function (k) { out.push(k) })
          })
          return out
        },
        conceptById: function (id) {
          var sid = String(id)
          var found = null
          data.categories.some(function (c) {
            return (c.concepts || []).some(function (k) {
              if (String(k.id) === sid) { found = k; return true }
              return false
            })
          })
          return found
        },
        questionById: function (id) {
          var sid = String(id)
          var found = null
          data.questions.some(function (q) {
            if (String(q.id) === sid) { found = q; return true }
            return false
          })
          return found
        },
        categoryById: function (id) {
          var sid = String(id)
          var found = null
          data.categories.some(function (c) {
            if (String(c.id) === sid) { found = c; return true }
            return false
          })
          return found
        },
        subcategoryById: function (cat, subId) {
          var sid = String(subId)
          var found = null
          ;(cat.subcategories || []).some(function (s) {
            if (String(s.id) === sid) { found = s; return true }
            return false
          })
          return found
        },
        /* 打乱数组（刷题模块共用，DRY） */
        shuffle: function (arr) {
          for (var i = arr.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1))
            var t = arr[i]; arr[i] = arr[j]; arr[j] = t
          }
          return arr
        },
        /* 刷题完成面板（共用）：渲染完成视图 + 绑定再来/返回 */
        quizFinish: function (ctx, opts) {
          ctx.dom.appMain.innerHTML =
            '<div class="quiz-panel">' +
              '<div class="quiz-panel-head">' + ctx.utils.escHtml(opts.title || '练习完成') + ' 🎉</div>' +
              '<div class="quiz-panel-sub">答对 ' + opts.score + ' / ' + opts.total + '，答错的已自动收进错题本</div>' +
              '<div class="quiz-actions">' +
                (opts.onAgain ? '<button class="btn-primary" data-again>再来一轮</button>' : '') +
                '<button class="btn-ghost" data-back>返回</button>' +
              '</div></div>'
          var again = ctx.dom.appMain.querySelector('[data-again]')
          if (again) again.addEventListener('click', opts.onAgain)
          ctx.dom.appMain.querySelector('[data-back]').addEventListener('click', function () {
            ctx.event.emit('view:change', { view: 'browse' })
          })
        }
      },
      /* 当前界面状态：导航/视图/搜索/视图过滤（模板 viewMasteryOnly/viewFavOnly） */
      ui: { catId: null, subId: null, query: '', view: 'browse',
            viewMasteryOnly: false, viewFavOnly: false }
    }
    /* 从 localStorage 恢复状态（类型校验，防外部篡改/损坏数据导致崩溃） */
    var favs = ctx.store.load('fav', [])
    if (Array.isArray(favs)) favs.forEach(function (id) { ctx.state.favorites.add(id) })
    var mast = ctx.store.load('mastery', {})
    if (mast && typeof mast === 'object' && !Array.isArray(mast)) {
      Object.keys(mast).forEach(function (id) { ctx.state.mastery.set(id, mast[id]) })
    }
    var wrongs = ctx.store.load('wrong', [])
    if (Array.isArray(wrongs)) wrongs.forEach(function (w) {
      if (w && w.type && w.id) ctx.state.wrong.set(w.type + ':' + w.id, w)
    })
    ctx.saveAll = function () {
      ctx.store.save('fav', Array.from(ctx.state.favorites))
      var mo = {}
      ctx.state.mastery.forEach(function (v, k) { mo[k] = v })
      ctx.store.save('mastery', mo)
      ctx.store.save('wrong', Array.from(ctx.state.wrong.values()))
    }
    return ctx
  }

  /* ---------- boot：deps 拓扑排序 → init → render ---------- */
  RV.boot = function (data) {
    var ctx = RV.buildCtx(data)
    /* 校验母版必填容器：缺失直接报错，避免模块运行时 null 崩溃（如模板缺 id） */
    var required = ['appMain', 'appSidebar', 'appDetail', 'searchWrap', 'headerActions',
      'hamburger', 'sidebarMask', 'detailClose', 'detailBody', 'detailFooter']
    required.forEach(function (name) {
      if (!ctx.dom[name]) throw new Error('母版缺少容器: ' + name + '（检查 frame.html 的 id）')
    })
    var order = [], visiting = {}, done = {}
    function visit(name) {
      if (done[name]) return
      if (visiting[name]) throw new Error('模块循环依赖: ' + name)
      visiting[name] = true
      var m = RV.modules[name]
      if (!m) throw new Error('未知模块: ' + name)
      ;(m.deps || []).forEach(visit)
      delete visiting[name]
      done[name] = true
      order.push(name)
    }
    Object.keys(RV.modules).forEach(visit)
    order.forEach(function (name) { var m = RV.modules[name]; if (m.init) m.init(ctx) })
    order.forEach(function (name) { var m = RV.modules[name]; if (m.render) m.render(ctx) })
    RV.ctx = ctx
    return ctx
  }
})()
