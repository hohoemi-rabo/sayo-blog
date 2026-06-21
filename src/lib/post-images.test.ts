import { test } from 'node:test'
import assert from 'node:assert/strict'
import { extractPostImages } from './post-images.ts'

test('standard: h2 -> figure(img+caption) -> p', () => {
  assert.deepEqual(
    extractPostImages({
      content:
        '<h2>見出し</h2><figure><img src="/2026/06/a.jpg" alt="桜"><figcaption>満開の桜</figcaption></figure><p>本文</p>',
    }),
    [{ imageUrl: '/2026/06/a.jpg', caption: '満開の桜', alt: '桜', position: 0, isThumbnail: false }]
  )
})

test('reversed: image before heading is captured', () => {
  assert.deepEqual(
    extractPostImages({
      content:
        '<figure><img src="/2026/06/b.jpg"><figcaption>逆順</figcaption></figure><h2>見出し</h2><p>本文</p>',
    }),
    [{ imageUrl: '/2026/06/b.jpg', caption: '逆順', alt: null, position: 0, isThumbnail: false }]
  )
})

test('lead image before first h2 is captured (parsePostSections would drop it)', () => {
  assert.deepEqual(
    extractPostImages({
      content:
        '<figure><img src="/2026/06/lead.jpg"></figure><p>リード</p><h2>見出し</h2><figure><img src="/2026/06/c.jpg"></figure>',
    }).map((x) => x.imageUrl),
    ['/2026/06/lead.jpg', '/2026/06/c.jpg']
  )
})

test('bare <img> (no figure) has null caption', () => {
  assert.deepEqual(
    extractPostImages({ content: '<h2>x</h2><img src="/2026/06/bare.jpg" alt="裸"><p>t</p>' }),
    [{ imageUrl: '/2026/06/bare.jpg', caption: null, alt: '裸', position: 0, isThumbnail: false }]
  )
})

test('document order across figures and bare imgs', () => {
  assert.deepEqual(
    extractPostImages({
      content: '<figure><img src="/1.jpg"></figure><img src="/2.jpg"><figure><img src="/3.jpg"></figure>',
    }).map((x) => [x.imageUrl, x.position]),
    [['/1.jpg', 0], ['/2.jpg', 1], ['/3.jpg', 2]]
  )
})

test('duplicate url within a post collapses (captioned wins)', () => {
  assert.deepEqual(
    extractPostImages({
      content: '<figure><img src="/dup.jpg"><figcaption>cap</figcaption></figure><img src="/dup.jpg">',
    }),
    [{ imageUrl: '/dup.jpg', caption: 'cap', alt: null, position: 0, isThumbnail: false }]
  )
})

test('distinct thumbnail -> position -1, isThumbnail', () => {
  assert.deepEqual(
    extractPostImages({ thumbnail_url: '/thumb.jpg', content: '<figure><img src="/body.jpg"></figure>' }),
    [
      { imageUrl: '/thumb.jpg', caption: null, alt: null, position: -1, isThumbnail: true },
      { imageUrl: '/body.jpg', caption: null, alt: null, position: 0, isThumbnail: false },
    ]
  )
})

test('thumbnail equal to a body image is not duplicated', () => {
  assert.deepEqual(
    extractPostImages({
      thumbnail_url: '/same.jpg',
      content: '<figure><img src="/same.jpg"><figcaption>同一</figcaption></figure>',
    }),
    [{ imageUrl: '/same.jpg', caption: '同一', alt: null, position: 0, isThumbnail: false }]
  )
})

test('entity-encoded src is decoded', () => {
  assert.equal(extractPostImages({ content: '<img src="/p.jpg?w=1&amp;h=2">' })[0].imageUrl, '/p.jpg?w=1&h=2')
})

test('empty / undefined content', () => {
  assert.deepEqual(extractPostImages({ content: '' }), [])
  assert.deepEqual(extractPostImages({}), [])
})

test('thumbnail-only post', () => {
  assert.deepEqual(extractPostImages({ thumbnail_url: '/only-thumb.jpg' }), [
    { imageUrl: '/only-thumb.jpg', caption: null, alt: null, position: -1, isThumbnail: true },
  ])
})

test('attr order (alt before src) and single quotes', () => {
  assert.deepEqual(extractPostImages({ content: "<img alt='代替' src='/q.jpg'>" }), [
    { imageUrl: '/q.jpg', caption: null, alt: '代替', position: 0, isThumbnail: false },
  ])
})
