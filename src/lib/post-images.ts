/**
 * Extract every image from a post's HTML content for the public photo gallery.
 *
 * House convention (mirrors `post-sections.ts`):
 *  - Regex only, NO DOM parser, so this stays isomorphic and runs in Server
 *    Actions / API routes / edge. Do not add an HTML-parser dependency.
 *
 * Why this does NOT reuse `parsePostSections`:
 *  1. `extractFirstImageUrl` returns only the FIRST <img> per section; the
 *     gallery needs every image.
 *  2. It never pairs <figcaption> with its image.
 *  3. It discards everything before the first <h2> (lead / reversed-order
 *     images), which the gallery must keep.
 *
 * This function scans the WHOLE content (not section-by-section), so a lead
 * image or an "image-before-heading" layout is captured correctly.
 *
 * This module is pure (no DB access). Persisting to `post_images` and the
 * denormalized published flags is the job of `syncPostImages` in the data layer.
 */

export interface ExtractedImage {
  /** Image URL (thumbnails bucket). HTML entities are decoded. */
  imageUrl: string
  /** <figcaption> text if the image is inside a <figure>, else null. */
  caption: string | null
  /** <img alt> if present, else null. */
  alt: string | null
  /** -1 for the post thumbnail; 0,1,2,... for body images in document order. */
  position: number
  /** True only for the row derived from `post.thumbnail_url`. */
  isThumbnail: boolean
}

/** Minimal shape this helper needs from a post row. */
export interface ExtractablePost {
  thumbnail_url?: string | null
  content?: string | null
}

/** Decode the small set of HTML entities Tiptap emits. */
function decodeEntities(input: string): string {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&#x0*27;/gi, "'")
    .replace(/&nbsp;/g, ' ')
}

/** Strip all HTML tags, keeping inner text. */
function stripTags(input: string): string {
  return input.replace(/<[^>]+>/g, '')
}

/** Read a quoted attribute value from a single tag string. */
function getAttr(tag: string, name: string): string | null {
  const re = new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, 'i')
  const m = tag.match(re)
  return m ? m[1] : null
}

/** Pull src + alt from the first <img> inside a block. */
function extractImg(block: string): { src: string; alt: string | null } | null {
  const tagMatch = block.match(/<img\b[^>]*>/i)
  if (!tagMatch) return null
  const tag = tagMatch[0]
  const src = getAttr(tag, 'src')
  if (!src) return null
  return { src, alt: getAttr(tag, 'alt') }
}

interface RawImage {
  index: number
  src: string
  alt: string | null
  caption: string | null
}

/**
 * Extract all gallery images from a post.
 *
 * Order of the returned array: the thumbnail (if any, position -1) first,
 * then body images in document order (position 0,1,2,...). Duplicate URLs
 * within the same post are collapsed to a single entry (first occurrence
 * wins; a body figure with a caption is preferred over the bare thumbnail
 * when the URLs are identical).
 */
export function extractPostImages(post: ExtractablePost): ExtractedImage[] {
  const content = post.content ?? ''

  // 1) <figure> blocks (captioned). Mask each block out of a working copy so
  //    the bare-<img> pass below won't re-match imgs already inside a figure.
  //    Masking with equal-length spaces preserves source indices.
  const figureRe = /<figure\b[^>]*>[\s\S]*?<\/figure>/gi
  const figures: RawImage[] = []
  let masked = content
  let fm: RegExpExecArray | null
  while ((fm = figureRe.exec(content)) !== null) {
    const block = fm[0]
    const img = extractImg(block)
    if (img) {
      const capMatch = block.match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i)
      const caption = capMatch ? decodeEntities(stripTags(capMatch[1])).trim() : ''
      figures.push({
        index: fm.index,
        src: decodeEntities(img.src),
        alt: img.alt != null ? decodeEntities(img.alt) : null,
        caption: caption || null,
      })
    }
    masked =
      masked.slice(0, fm.index) +
      ' '.repeat(block.length) +
      masked.slice(fm.index + block.length)
  }

  // 2) Bare <img> outside any figure.
  const bareRe = /<img\b[^>]*>/gi
  const bares: RawImage[] = []
  let bm: RegExpExecArray | null
  while ((bm = bareRe.exec(masked)) !== null) {
    const src = getAttr(bm[0], 'src')
    if (!src) continue
    const alt = getAttr(bm[0], 'alt')
    bares.push({
      index: bm.index,
      src: decodeEntities(src),
      alt: alt != null ? decodeEntities(alt) : null,
      caption: null,
    })
  }

  // 3) Merge by document order, dedup by URL (first wins), compact positions.
  const merged = [...figures, ...bares].sort((a, b) => a.index - b.index)
  const seen = new Set<string>()
  const body: ExtractedImage[] = []
  let position = 0
  for (const item of merged) {
    if (seen.has(item.src)) continue
    seen.add(item.src)
    body.push({
      imageUrl: item.src,
      caption: item.caption,
      alt: item.alt,
      position: position++,
      isThumbnail: false,
    })
  }

  // 4) Thumbnail: add only if it isn't already represented in the body.
  const thumb = post.thumbnail_url?.trim() ?? ''
  const head: ExtractedImage[] =
    thumb && !seen.has(thumb)
      ? [{ imageUrl: decodeEntities(thumb), caption: null, alt: null, position: -1, isThumbnail: true }]
      : []

  return [...head, ...body]
}
