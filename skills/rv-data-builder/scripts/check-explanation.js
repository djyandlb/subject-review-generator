#!/usr/bin/env node
/* check-explanation.js — 题目质量机器关卡（防「解析空转 / options 序号 / 填空不统一 / 名解缺完整句 / 简答无结构」）
 * 用法: node check-explanation.js <data.json>
 * 职责: 出题后逐题校验题目数据质量：
 *   A. 解析质量（每个题型）：
 *      1. 空解析
 *      2. 纯答案字母（「A」「ABD」「答案：B」）
 *      3. 纯对错词（「正确」「错误」）
 *      4. 通用套话（「本题考查…」「……见资料参考答案」——雷同无针对性）
 *      5. 过短（≤4 字）
 *   B. options 纯文本（禁「A. xxx」序号前缀，模板再拼变「A. A.」双序号）
 *   C. 填空空占位统一「____」（4 个半角下划线，禁 3/5/6 个或空格）
 *   D. 名词解释 answer = 完整定义句 + 答题要点（禁只有 abc 要点）
 *   E. 简答 answer 结构化分点（禁一大段无结构）
 * 退出码: 0=通过  1=FAIL（打回补写，不许空转/不规范进网页）
 */
'use strict'
const fs = require('fs')
const path = require('path')

if (process.argv.length < 3) {
  console.error('用法: node check-explanation.js <data.json>')
  process.exit(1)
}
const d = JSON.parse(fs.readFileSync(path.resolve(process.argv[2]), 'utf8'))
const qs = d.questions || []
const fails = []

const norm = s => String(s || '').replace(/[\s　]/g, '')
const ANS_RE = /^(答案[：:]?)?[A-E]([、,，/ ]?[A-E])*$/i
const TF_RE = /^(答案[：:]?)?(正确|错误|对|错|√|×)$/
/* 通用套话：所有题雷同无针对性（含「见资料参考答案」类推诿——让用户自己找答案 = 不合格） */
const GENERIC_RE = /本题考查|本题考察|本题主要|本题重点|掌握其核心|掌握核心|具有重要意义|核心要点|基础概念|相关知识|理解.{0,6}机制|本题目|本题目考查|此题考查|见资料参考答案|答案依据见资料|参考答案见|定义见资料|详见资料|详见教材|见课本/
const MIN_LEN = 5

let pass = 0
qs.forEach(function (q) {
  const type = q.type
  const stem = String(q.stem || '')
  const ans = String(q.answer || '')

  /* A. 解析质量（所有题型） */
  const s = norm(q.explanation)
  let why = null
  if (!s) why = '解析为空'
  else if (ANS_RE.test(s)) why = '纯答案字母（「' + q.explanation + '」）——只写答案不解释'
  else if (TF_RE.test(s)) why = '纯对错词（「' + q.explanation + '」）——只说对错不说明依据'
  else if (GENERIC_RE.test(s)) why = '通用套话/推诿（「' + q.explanation.slice(0, 30) + '…」）——须贴本题实际依据，禁止「见资料参考答案」式让用户自己找'
  else if (s.length < MIN_LEN) why = '解析过短（仅 ' + s.length + ' 字）——不足以承载解释'
  if (why) fails.push({ id: q.id, type: type, stem: stem.slice(0, 24), why: why })
  else pass++

  /* B. options 纯文本 */
  if ((q.options || []).length) {
    const o0 = String(q.options[0] || '').trim()
    if (/^[a-zA-Z][.、．)）]/.test(o0)) {
      fails.push({ id: q.id, type: type, stem: stem.slice(0, 24), why: 'options 带序号前缀（「' + o0.slice(0, 20) + '…」）——模板再拼序号变「A. A. xxx」，须存纯文本选项' })
    }
  }

  /* C. 填空空占位统一「____」（4 个半角下划线）+ 多空答案分号/顿号分隔 */
  if (type === 'fill') {
    const blanks = stem.match(/[_＿]{2,}|\s{2,}/g) || []
    blanks.forEach(function (b) {
      if (b !== '____') {
        fails.push({ id: q.id, type: 'fill', stem: stem.slice(0, 24), why: '填空空占位不统一（「' + b.slice(0, 10) + '」）——须统一为「____」（4 个半角下划线）' })
      }
    })
    const ansLen = norm(ans).length
    const hasSep = /[;；、,，]/.test(ans)
    if (ansLen > 8 && !hasSep) {
      fails.push({ id: q.id, type: 'fill', stem: stem.slice(0, 24), why: '填空答案 ' + ansLen + ' 字无分隔符（「' + ans.slice(0, 20) + '…」）——多空答案须用分号「；」或顿号「、」间隔' })
    }
  }

  /* D. 名词解释 answer = 「答案：一句话解释」+「答题要点：abc」 */
  if (type === 'terminology') {
    const t = ans.trim()
    if (!/^答案[：:]/.test(t) || !/答题要点[：:]/.test(t)) {
      fails.push({ id: q.id, type: 'terminology', stem: stem.slice(0, 24), why: '名解答案格式须为「答案：一句话解释\n答题要点：abc」——先答案完整解释定义，再列答题要点' })
    }
  }

  /* E. 简答答案结构化分点（禁一大段无结构） */
  if (type === 'essay') {
    const len = norm(ans).length
    const hasPoints = /①|②|③|（1）|\(1\)|（2）|1[.、]|2[.、]|；/.test(ans)
    if (len > 120 && !hasPoints) {
      fails.push({ id: q.id, type: 'essay', stem: stem.slice(0, 24), why: '简答答案 ' + len + ' 字但无分点结构——须分点（①…②… / （1）…（2）… / 1.…2.…）' })
    }
  }
})

console.log('题目质量校验: ' + qs.length + ' 题')
if (fails.length) {
  console.log('❌ FAIL ' + fails.length + ' 处不规范，打回补写:')
  fails.forEach(f => console.log('  · ' + f.id + ' [' + f.type + '] 「' + f.stem + '」→ ' + f.why))
  console.log('  解析正例：「A。大叶性肺炎致病菌为肺炎链球菌，与题干吻合」；填空空「____」；名解「萎缩：指…。答题要点：…」；简答分点「①…②…」')
  process.exit(1)
}
console.log('✅ 全部题目数据规范（实质解析 / 纯文本 options / 统一填空 / 名解完整句 / 简答结构化）')
