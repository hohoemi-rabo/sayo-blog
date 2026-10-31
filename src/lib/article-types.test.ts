import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  ARTICLE_TYPE_CHOICES,
  ARTICLE_TYPE_TABS,
  isArticleType,
  parseArticleTypeTab,
} from './article-types.ts'

test('新しく作る記事は 投稿記事 / 取材記事 / 自由記事 の 3 つから選べる', () => {
  assert.deepEqual([...ARTICLE_TYPE_CHOICES], ['mini', 'long', 'free'])
  for (const type of ['mini', 'long', 'free']) {
    assert.equal(isArticleType(type), true, type)
  }
})

test('3 種類以外の値は記事の種類として受け付けない', () => {
  for (const value of ['', 'all', 'other', 'FREE', null, undefined, 1]) {
    assert.equal(isArticleType(value), false, String(value))
  }
})

test('記事一覧のタブは「すべて」+ 選べる種類と同じ並び', () => {
  assert.deepEqual(
    ARTICLE_TYPE_TABS.map((t) => t.key),
    ['all', ...ARTICLE_TYPE_CHOICES]
  )
})

test('一覧のタブ指定が不正なら「すべて」になる', () => {
  assert.equal(parseArticleTypeTab('free'), 'free')
  assert.equal(parseArticleTypeTab('mini'), 'mini')
  assert.equal(parseArticleTypeTab(undefined), 'all')
  assert.equal(parseArticleTypeTab('xxx'), 'all')
})
