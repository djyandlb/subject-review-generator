/* mastery.js — 掌握度模块（三档：掌握/熟悉/了解）
 * 掌握度由资料判断写入数据（concept.mastery），前端只读展示，用户不可自设。
 * 徽章配色：掌握·红 / 熟悉·黄 / 了解·蓝（样板 --color-master/familiar/understand）
 */
;(function () {
  'use strict'
  var RV = window.RV = window.RV || {}
  RV.modules = RV.modules || {}
  RV.modules['mastery'] = {
    name: 'mastery',
    deps: [],
    init: function (ctx) {
      /* 只读 API：从数据取掌握度，不提供 set/cycle（写死，用户不可改） */
      ctx.masteryApi = {
        get: function (id) {
          var k = ctx.utils.conceptById(id)
          return k ? k.mastery : null
        }
      }
      /* 掌握度徽章 HTML（三色固定） */
      ctx.masteryBadge = function (id, label) {
        var m = ctx.masteryApi.get(id) || label || ''
        /* 值域受控（掌握/熟悉/了解），但数据异常时仍转义防类名/文本注入 */
        return '<span class="mastery-badge mastery-' + ctx.utils.escHtml(m) + '">' + ctx.utils.escHtml(m) + '</span>'
      }
    },
    render: function (ctx) { /* 无独立 DOM，由卡片/详情调用 */ }
  }
})()
