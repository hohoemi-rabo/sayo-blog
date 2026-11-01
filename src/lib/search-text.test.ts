import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildSnippet,
  escapeLikePattern,
  htmlToPlainText,
  normalizeForSearch,
  splitSearchTerms,
  type SnippetSegment,
} from './search-text.ts'

const render = (segments: SnippetSegment[] | null) =>
  segments?.map((s) => (s.hit ? `[${s.text}]` : s.text)).join('') ?? null

test('normalizeForSearch: 全角英数・大文字をそろえる', () => {
  assert.equal(normalizeForSearch('ＦＵＮＥ　Cafe'), 'fune cafe')
})

test('splitSearchTerms: 半角・全角スペースで分け、重複と空を除く', () => {
  assert.deepEqual(splitSearchTerms('  飯田　カフェ  飯田 '), ['飯田', 'カフェ'])
  assert.deepEqual(splitSearchTerms(''), [])
  assert.deepEqual(splitSearchTerms('　 '), [])
})

test('splitSearchTerms: 語数と 1 語の長さに上限がある', () => {
  assert.deepEqual(splitSearchTerms('a b c d e f g'), ['a', 'b', 'c', 'd', 'e'])
  assert.equal(splitSearchTerms('あ'.repeat(80))[0].length, 50)
})

test('htmlToPlainText: タグと文字参照を除いて空白を詰める', () => {
  assert.equal(
    htmlToPlainText('<h2>見出し</h2><p>A&amp;B&nbsp;です</p><img src="x.jpg"><script>alert(1)</script>'),
    '見出し A&B です'
  )
})

test('buildSnippet: 一致箇所の前後を抜き出して印を付ける', () => {
  const text = 'あ'.repeat(50) + '天竜峡の紅葉' + 'い'.repeat(100)
  const out = render(buildSnippet(text, ['天竜峡'], { before: 5, after: 10 }))
  assert.equal(out, '…あああああ[天竜峡]の紅葉いいいい…')
})

test('buildSnippet: 先頭・末尾まで届くときは … を付けない', () => {
  assert.equal(render(buildSnippet('飯田のカフェ', ['カフェ'])), '飯田の[カフェ]')
})

test('buildSnippet: 複数語・複数回の一致をすべて強調する', () => {
  assert.equal(
    render(buildSnippet('飯田のカフェと飯田のパン', ['飯田', 'パン'])),
    '[飯田]のカフェと[飯田]の[パン]'
  )
})

test('buildSnippet: 全角・半角の違いがあっても一致し、元の表記のまま返す', () => {
  assert.equal(render(buildSnippet('ライターのＦＵＮＥです', ['fune'])), 'ライターの[ＦＵＮＥ]です')
})

test('buildSnippet: 重なる一致はまとめる', () => {
  assert.equal(render(buildSnippet('下伊那郡', ['下伊那', '伊那郡'])), '[下伊那郡]')
})

test('buildSnippet: どの語も無ければ null', () => {
  assert.equal(buildSnippet('飯田のカフェ', ['パン']), null)
  assert.equal(buildSnippet('', ['パン']), null)
  assert.equal(buildSnippet('飯田', []), null)
})

test('escapeLikePattern: % _ \\ を無効化する', () => {
  assert.equal(escapeLikePattern('100%_\\'), '100\\%\\_\\\\')
})
