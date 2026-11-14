import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  contentModifiedAt,
  formatDateStringDot,
  fromJstDatetimeLocal,
  toJstDatetimeLocal,
  isValidDateString,
  lastUpdatedOn,
  normalizeUpdateEntries,
  pickRecentlyUpdatedPostIds,
  toJstDateString,
} from './post-updates.ts'

test('isValidDateString: 実在する日付だけ通す', () => {
  assert.equal(isValidDateString('2026-11-07'), true)
  assert.equal(isValidDateString('2026-02-30'), false)
  assert.equal(isValidDateString('2026/11/07'), false)
  assert.equal(isValidDateString(''), false)
})

test('toJstDateString: UTC の夜は日本時間の翌日になる', () => {
  assert.equal(toJstDateString('2026-05-11T15:30:00Z'), '2026-05-12')
  assert.equal(toJstDateString('2026-05-12T03:00:00+09:00'), '2026-05-12')
})

test('formatDateStringDot: 先頭の 0 を落とす', () => {
  assert.equal(formatDateStringDot('2026-05-02'), '2026.5.2')
})

test('normalizeUpdateEntries: 空行は捨て、新しい順に並べる', () => {
  const r = normalizeUpdateEntries([
    { updated_on: '2026-08-20', note: ' 営業時間の変更を反映 ' },
    { updated_on: '', note: '' },
    { updated_on: '2026-11-07', note: '冬季限定メニューを追記' },
  ])
  assert.deepEqual(r, {
    ok: true,
    entries: [
      { updated_on: '2026-11-07', note: '冬季限定メニューを追記' },
      { updated_on: '2026-08-20', note: '営業時間の変更を反映' },
    ],
  })
})

test('normalizeUpdateEntries: 内容が空・日付が変・長すぎる行はエラー', () => {
  assert.equal(normalizeUpdateEntries([{ updated_on: '2026-11-07', note: ' ' }]).ok, false)
  assert.equal(normalizeUpdateEntries([{ updated_on: '2026-13-01', note: 'a' }]).ok, false)
  assert.equal(normalizeUpdateEntries([{ updated_on: '2026-11-07', note: 'あ'.repeat(101) }]).ok, false)
  assert.equal(normalizeUpdateEntries([{ updated_on: '2026-11-07', note: 'あ'.repeat(100) }]).ok, true)
})

test('lastUpdatedOn: 履歴の最新日。初回掲載日以前なら出さない', () => {
  const published = '2026-05-12T01:00:00+09:00'
  assert.equal(lastUpdatedOn([], published), null)
  assert.equal(lastUpdatedOn([{ updated_on: '2026-05-12' }], published), null)
  assert.equal(
    lastUpdatedOn([{ updated_on: '2026-08-20' }, { updated_on: '2026-11-07' }], published),
    '2026-11-07'
  )
  assert.equal(lastUpdatedOn([{ updated_on: '2026-08-20' }], null), '2026-08-20')
})

test('contentModifiedAt: 最終更新 → 公開日時 → fallback', () => {
  const published = '2026-05-12T01:00:00+09:00'
  assert.equal(contentModifiedAt([{ updated_on: '2026-11-07' }], published, 'x'), '2026-11-07T00:00:00+09:00')
  assert.equal(contentModifiedAt([], published, 'x'), published)
  assert.equal(contentModifiedAt([], null, 'x'), 'x')
})

test('pickRecentlyUpdatedPostIds: 1 記事 1 回・自分を除く・上限まで', () => {
  const rows = [
    { post_id: 'a', updated_on: '2026-11-07' },
    { post_id: 'b', updated_on: '2026-11-05' },
    { post_id: 'a', updated_on: '2026-11-01' },
    { post_id: 'c', updated_on: '2026-10-30' },
    { post_id: 'd', updated_on: '2026-10-01' },
  ]
  assert.deepEqual(pickRecentlyUpdatedPostIds(rows, null, 3), ['a', 'b', 'c'])
  assert.deepEqual(pickRecentlyUpdatedPostIds(rows, 'b', 3), ['a', 'c', 'd'])
})

test('toJstDatetimeLocal / fromJstDatetimeLocal: 日本時間で往復しても日時がずれない', () => {
  const iso = '2026-05-11T16:00:00.000Z' // = 2026-05-12 01:00 JST
  assert.equal(toJstDatetimeLocal(iso), '2026-05-12T01:00')
  assert.equal(fromJstDatetimeLocal(toJstDatetimeLocal(iso)), iso)
})
