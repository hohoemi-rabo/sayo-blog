import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rankRelatedOptions, selectRelatedPostIds, type RelatedCandidate } from './related-posts.ts'

const post = (
  id: string,
  publishedAt: string,
  hashtagSlugs: string[] = [],
  opts: { isPublished?: boolean; eventEnded?: boolean } = {}
): RelatedCandidate => ({
  id,
  publishedAt,
  hashtagSlugs,
  isPublished: opts.isPublished ?? true,
  eventEnded: opts.eventEnded ?? false,
})

const pick = (id: string, opts: { isPublished?: boolean; eventEnded?: boolean } = {}) => ({
  id,
  isPublished: opts.isPublished ?? true,
  eventEnded: opts.eventEnded ?? false,
})

const base = { postId: 'self', hashtagSlugs: ['iida', 'cafe'] }

test('manual only: 3 picks are shown in the chosen order', () => {
  assert.deepEqual(
    selectRelatedPostIds({
      ...base,
      manual: [pick('m3'), pick('m1'), pick('m2')],
      sameCategory: [post('a', '2026-10-01')],
      fallback: [post('z', '2026-10-30')],
    }),
    ['m3', 'm1', 'm2']
  )
})

test('manual + auto: remaining slots are filled by same-category posts', () => {
  assert.deepEqual(
    selectRelatedPostIds({
      ...base,
      manual: [pick('m1')],
      sameCategory: [post('a', '2026-10-01'), post('b', '2026-10-05'), post('m1', '2026-10-09')],
      fallback: [],
    }),
    ['m1', 'b', 'a']
  )
})

test('manual picks that became drafts or ended events are dropped and refilled', () => {
  assert.deepEqual(
    selectRelatedPostIds({
      ...base,
      manual: [pick('draft', { isPublished: false }), pick('ended', { eventEnded: true }), pick('ok')],
      // 外れた手動の記事は自動選定にも出さない
      sameCategory: [post('ended', '2026-10-20'), post('a', '2026-10-01'), post('b', '2026-10-02')],
      fallback: [],
    }),
    ['ok', 'b', 'a']
  )
})

test('auto ranks by common hashtags, then newest first', () => {
  assert.deepEqual(
    selectRelatedPostIds({
      ...base,
      manual: [],
      sameCategory: [
        post('old-none', '2026-01-01'),
        post('new-none', '2026-10-01'),
        post('one-tag', '2026-02-01', ['cafe']),
        post('two-tags', '2025-01-01', ['iida', 'cafe', 'other']),
      ],
      fallback: [],
    }),
    ['two-tags', 'one-tag', 'new-none']
  )
})

test('auto never shows itself, ended events or drafts, and considers all candidates', () => {
  const many = Array.from({ length: 30 }, (_, i) =>
    post(`p${String(i).padStart(2, '0')}`, `2026-0${(i % 9) + 1}-01`)
  )
  const result = selectRelatedPostIds({
    ...base,
    manual: [],
    sameCategory: [
      ...many,
      post('self', '2026-12-31', ['iida', 'cafe']),
      post('ended', '2026-12-30', ['iida', 'cafe'], { eventEnded: true }),
      post('draft', '2026-12-29', ['iida', 'cafe'], { isPublished: false }),
      // 30 件より後ろにあっても選ばれる (先頭で切らない)
      post('last', '2026-01-01', ['iida']),
    ],
    fallback: [],
  })
  assert.equal(result[0], 'last')
  assert.equal(result.length, 3)
  assert.ok(!result.some((id) => ['self', 'ended', 'draft'].includes(id)))
})

test('same category is short: filled by newest posts from other categories', () => {
  assert.deepEqual(
    selectRelatedPostIds({
      ...base,
      manual: [],
      sameCategory: [post('people-1', '2026-03-01')],
      fallback: [
        post('people-1', '2026-03-01'),
        post('self', '2026-10-31'),
        post('food-old', '2026-01-01'),
        post('food-new', '2026-10-01'),
        post('event-ended', '2026-10-20', [], { eventEnded: true }),
        post('outing', '2026-09-01'),
      ],
    }),
    ['people-1', 'food-new', 'outing']
  )
})

test('every post in the category is an ended event (イベント・講座): all slots come from other categories', () => {
  assert.deepEqual(
    selectRelatedPostIds({
      ...base,
      manual: [],
      sameCategory: [
        post('e1', '2026-10-01', ['iida'], { eventEnded: true }),
        post('e2', '2026-09-01', ['cafe'], { eventEnded: true }),
      ],
      fallback: [post('f1', '2026-08-01'), post('f2', '2026-10-10'), post('f3', '2026-07-01'), post('f4', '2026-06-01')],
    }),
    ['f2', 'f1', 'f3']
  )
})

test('nothing to show returns an empty list', () => {
  assert.deepEqual(
    selectRelatedPostIds({ ...base, manual: [], sameCategory: [], fallback: [post('self', '2026-10-01')] }),
    []
  )
})

const option = (
  id: string,
  publishedAt: string | null,
  categoryIds: string[],
  hashtagIds: string[] = [],
  opts: { isPublished?: boolean; eventEnded?: boolean } = {}
) => ({
  id,
  publishedAt,
  categoryIds,
  hashtagIds,
  isPublished: opts.isPublished ?? true,
  eventEnded: opts.eventEnded ?? false,
})

test('admin options: same category first, then common hashtags, then newest; hidden posts last', () => {
  const ranked = rankRelatedOptions(
    [
      option('other-new', '2026-10-30', ['outing']),
      option('food-old', '2023-01-01', ['food']),
      option('food-new', '2026-01-01', ['food']),
      option('food-tag', '2022-01-01', ['food'], ['t1']),
      option('other-tag', '2026-10-01', ['life'], ['t1', 't2']),
      option('food-draft', null, ['food'], ['t1'], { isPublished: false }),
      option('food-ended', '2026-10-31', ['food'], ['t1'], { eventEnded: true }),
    ],
    { categoryId: 'food', hashtagIds: ['t1', 't2'] }
  )
  assert.deepEqual(
    ranked.map((o) => o.id),
    ['food-tag', 'food-new', 'food-old', 'other-tag', 'other-new', 'food-ended', 'food-draft']
  )
})

test('admin options: no category chosen yet falls back to hashtags then newest', () => {
  const ranked = rankRelatedOptions(
    [option('a', '2026-01-01', ['food']), option('b', '2025-01-01', ['life'], ['t1']), option('c', '2026-05-01', ['life'])],
    { categoryId: null, hashtagIds: ['t1'] }
  )
  assert.deepEqual(ranked.map((o) => o.id), ['b', 'c', 'a'])
})

test('posts without a publish date go last and ties stay stable', () => {
  assert.deepEqual(
    selectRelatedPostIds({
      ...base,
      manual: [],
      sameCategory: [post('b', null as unknown as string), post('a', null as unknown as string), post('c', '2020-01-01')],
      fallback: [],
    }),
    ['c', 'a', 'b']
  )
})
