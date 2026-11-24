import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  articleStatusColumns,
  articleStatusOf,
  isGrayscaleNotice,
  normalizeArticleStatus,
  normalizePlaceStatus,
  normalizeRelocationNote,
  normalizeRelocationUrl,
  photoNoticeOf,
} from './place-status.ts'

test('photo notice: closed wins over an ended event, which wins over relocated', () => {
  assert.equal(photoNoticeOf({ event_ended: true, place_status: 'closed' }), 'closed')
  assert.equal(photoNoticeOf({ event_ended: true, place_status: 'relocated' }), 'event_ended')
  assert.equal(photoNoticeOf({ event_ended: false, place_status: 'relocated' }), 'relocated')
  assert.equal(photoNoticeOf({ event_ended: false, place_status: 'open' }), null)
  // 列を取っていない古いクエリでも落ちない
  assert.equal(photoNoticeOf({}), null)
})

test('only closed and ended events turn the photo grey', () => {
  assert.equal(isGrayscaleNotice('closed'), true)
  assert.equal(isGrayscaleNotice('event_ended'), true)
  assert.equal(isGrayscaleNotice('relocated'), false)
  assert.equal(isGrayscaleNotice(null), false)
})

test('unknown status values fall back to open', () => {
  assert.equal(normalizePlaceStatus('closed'), 'closed')
  assert.equal(normalizePlaceStatus('relocated'), 'relocated')
  assert.equal(normalizePlaceStatus('gone'), 'open')
  assert.equal(normalizePlaceStatus(undefined), 'open')
})

test('relocation url keeps only http(s)', () => {
  assert.equal(normalizeRelocationUrl(' https://example.com/shop '), 'https://example.com/shop')
  assert.equal(normalizeRelocationUrl('javascript:alert(1)'), null)
  assert.equal(normalizeRelocationUrl('example.com'), null)
  assert.equal(normalizeRelocationUrl(''), null)
  assert.equal(normalizeRelocationUrl(null), null)
})

test('relocation note is trimmed, capped and empty becomes null', () => {
  assert.equal(normalizeRelocationNote('  飯田市本町へ移転  '), '飯田市本町へ移転')
  assert.equal(normalizeRelocationNote('   '), null)
  assert.equal(normalizeRelocationNote('あ'.repeat(150))?.length, 100)
})

test('edit screen status is read from the two columns with the photo priority', () => {
  assert.equal(articleStatusOf({ event_ended: false, place_status: 'open' }), 'open')
  assert.equal(articleStatusOf({ event_ended: true, place_status: 'open' }), 'event_ended')
  assert.equal(articleStatusOf({ event_ended: true, place_status: 'closed' }), 'closed')
  assert.equal(articleStatusOf({ event_ended: false, place_status: 'relocated' }), 'relocated')
})

test('edit screen status is saved back into the two columns', () => {
  assert.deepEqual(articleStatusColumns('open'), { event_ended: false, place_status: 'open' })
  assert.deepEqual(articleStatusColumns('event_ended'), { event_ended: true, place_status: 'open' })
  assert.deepEqual(articleStatusColumns('closed'), { event_ended: false, place_status: 'closed' })
  assert.deepEqual(articleStatusColumns('relocated'), { event_ended: false, place_status: 'relocated' })
  assert.equal(normalizeArticleStatus('bogus'), 'open')
})
