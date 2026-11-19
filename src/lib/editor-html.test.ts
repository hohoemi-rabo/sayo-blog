import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatEditorHtml } from './editor-html.ts'

test('ブロックごとに改行する', () => {
  assert.equal(
    formatEditorHtml('<h2>見出し</h2><p>本文<strong>太字</strong></p><hr><p>次</p>'),
    '<h2>見出し</h2>\n<p>本文<strong>太字</strong></p>\n<hr>\n<p>次</p>'
  )
})

test('入れ子 (ボックス・箇条書き) も 1 ブロック 1 行', () => {
  assert.equal(
    formatEditorHtml('<div data-type="box" class="editor-box"><p>a</p></div><ul><li><p>b</p></li></ul>'),
    '<div data-type="box" class="editor-box">\n<p>a</p></div>\n<ul>\n<li>\n<p>b</p></li></ul>'
  )
})

test('<pre> の中は改行を足さない', () => {
  assert.equal(
    formatEditorHtml('<p>a</p><pre><code><p>x</p></code></pre><p>b</p>'),
    '<p>a</p>\n<pre><code><p>x</p></code></pre>\n<p>b</p>'
  )
})

test('<path> や <picture> のような似た名前のタグでは改行しない', () => {
  assert.equal(formatEditorHtml('<p>a<picture></picture></p>'), '<p>a<picture></picture></p>')
})

test('空なら空', () => {
  assert.equal(formatEditorHtml(''), '')
})
