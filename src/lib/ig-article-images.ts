/**
 * Inject IG-imported images into AI-generated article HTML at h2 section
 * boundaries. The conventions (Phase 3 / Ticket 37 spec):
 *
 *  - 1 image, M h2: insert after the first h2
 *  - N <= M:        insert one after each of the first N h2 sections
 *  - N > M:         remaining images go at the very end of the last h2 section
 *  - M = 0:         all images at the start of the body (degenerate fallback)
 *
 * The implementation is regex-based to stay isomorphic (no DOM).
 */

const IMAGE_HTML_CLASS = 'max-w-full h-auto rounded-lg'

export function injectImagesIntoArticle(html: string, imageUrls: string[]): string {
  if (imageUrls.length === 0) return html

  const matches = findH2Matches(html)

  // No h2 sections — degrade gracefully by stacking images at the top.
  if (matches.length === 0) {
    return imageUrls.map(buildImageTag).join('\n') + '\n' + html
  }

  // Compute insertion plan: per h2 index, the list of images to insert
  // immediately after that h2's closing tag.
  const plan = new Map<number, string[]>()
  const sectionCount = matches.length
  const imageCount = imageUrls.length

  for (let i = 0; i < imageCount; i++) {
    const targetSection = i < sectionCount ? i : sectionCount - 1
    const list = plan.get(targetSection) ?? []
    list.push(imageUrls[i])
    plan.set(targetSection, list)
  }

  // Build result by walking matches in order and inserting plan[i] after each h2.
  let result = ''
  let cursor = 0
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i]
    // Append everything up to and including the closing </h2>
    result += html.slice(cursor, m.end)
    cursor = m.end
    const images = plan.get(i)
    if (images && images.length > 0) {
      result += '\n' + images.map(buildImageTag).join('\n') + '\n'
    }
  }
  // Tail (everything after the last h2's closing tag)
  result += html.slice(cursor)
  return result
}

interface H2Match {
  start: number
  end: number
}

function findH2Matches(html: string): H2Match[] {
  const re = /<h2\b[^>]*>[\s\S]*?<\/h2>/gi
  const out: H2Match[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    out.push({ start: m.index, end: m.index + m[0].length })
  }
  return out
}

function buildImageTag(url: string): string {
  return `<img class="${IMAGE_HTML_CLASS}" src="${escapeAttr(url)}">`
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}
