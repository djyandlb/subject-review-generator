/* stage-timeline.js — 分期时间轴模块（通用增强能力）
 * 能力：从概念 content 解析「【分期】」标记，在详情面板渲染为横向分期时间轴
 * （比【流程】更富：每期可带描述正文，点节点展开详情）
 *
 * 数据约定（零学科术语，任何学科通用，写入 concept.content）：
 *   【分期:标题】
 *   - 期名1 | 描述1
 *   - 期名2 | 描述2
 *   - 期名3 | 描述3
 *   （每行「- 期名 | 描述」；也可用「1. 期名 | 描述」）
 *
 * 交互：
 *   - 详情面板正文后追加 .stage-timeline-block
 *   - 横向节点链；点击节点高亮并展开该期描述
 * 依赖：detail-panel（监听 concept:select）
 */
;(function () {
  'use strict'
  var RV = window.RV = window.RV || {}
  RV.modules = RV.modules || {}
  RV.modules['stage-timeline'] = {
    name: 'stage-timeline',
    deps: ['detail-panel'],
    init: function (ctx) {
      var self = this
      ctx.event.on('concept:select', function (p) {
        var k = ctx.utils.conceptById(p.id)
        if (!k) return
        var blocks = self.parse(k)
        if (blocks && blocks.length) self.inject(ctx, blocks)
      })
    },
    /* 解析【分期】块 */
    parse: function (k) {
      var text = (k.content || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ')
      var blocks = []
      var re = /【分期\s*[:：]\s*([^】]+)】\s*\n?([\s\S]*?)(?=(?:【分期|【结构卡|【对比表|【树|【流程|【速记|\n\s*\n|$))/g
      var m
      while ((m = re.exec(text))) {
        var stages = []
        ;(m[2] || '').split('\n').forEach(function (line) {
          line = line.trim().replace(/^[-*]\s*/, '').replace(/^\d+[\.、．]\s*/, '')
          if (!line) return
          var parts = line.split('|').map(function (s) { return s.trim() })
          if (parts.length >= 2) {
            stages.push({ name: parts[0], desc: parts.slice(1).join('|').trim() })
          } else if (parts[0]) {
            stages.push({ name: parts[0], desc: '' })
          }
        })
        if (stages.length) blocks.push({ title: (m[1] || '').trim() || '分期', stages: stages })
      }
      return blocks.length ? blocks : null
    },
    /* 注入详情面板 */
    inject: function (ctx, blocks) {
      var body = ctx.dom.detailBody
      if (!body) return
      blocks.forEach(function (blk) {
        var wrap = ctx.utils.el(
          '<div class="stage-timeline-block">' +
            '<div class="stage-timeline-head">⏳ ' + ctx.utils.escHtml(blk.title) + '</div>' +
            '<div class="stage-timeline-track" role="list">' +
              blk.stages.map(function (s, i) {
                return '<button type="button" class="stage-node' + (i === 0 ? ' active' : '') + '" data-stage-idx="' + i + '" role="listitem">' +
                  '<span class="stage-dot"></span>' +
                  '<span class="stage-name">' + ctx.utils.escHtml(s.name) + '</span>' +
                '</button>'
              }).join('<span class="stage-connector" aria-hidden="true"></span>') +
            '</div>' +
            '<div class="stage-timeline-detail" data-stage-detail>' +
              blk.stages.map(function (s, i) {
                return '<div class="stage-detail-panel' + (i === 0 ? ' active' : '') + '" data-stage-panel="' + i + '">' +
                  '<div class="stage-detail-title">' + ctx.utils.escHtml(s.name) + '</div>' +
                  '<div class="stage-detail-body">' + (s.desc ? ctx.utils.escHtml(s.desc) : '<span class="stage-empty">暂无描述</span>') + '</div>' +
                '</div>'
              }).join('') +
            '</div>' +
          '</div>'
        )
        body.appendChild(wrap)
        var nodes = wrap.querySelectorAll('.stage-node')
        var panels = wrap.querySelectorAll('[data-stage-panel]')
        nodes.forEach(function (btn) {
          btn.addEventListener('click', function () {
            var idx = this.getAttribute('data-stage-idx')
            nodes.forEach(function (n) { n.classList.remove('active') })
            panels.forEach(function (p) { p.classList.remove('active') })
            this.classList.add('active')
            var panel = wrap.querySelector('[data-stage-panel="' + idx + '"]')
            if (panel) panel.classList.add('active')
          })
        })
      })
    }
  }
})()
