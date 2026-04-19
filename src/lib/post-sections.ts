/**
 * Parse a post's HTML content into logical sections keyed by <h2> headings.
 *
 * The blog convention (documented in Phase 3 requirements) is that each
 * publishable section follows the pattern:
 *
 *   <h2>見出し</h2>
 *   <img src="...">  (optional but recommended)
 *   <p>...</p>       (one or more body paragraphs / blocks)
 *
 * Each <h2> starts a new section. Content before the first <h2> is ignored
 * (it is usually a lead paragraph / intro that doesn't correspond to any IG post).
 */

export interface PostSection {
  index: number // 0-based, stable per render
  heading: string // h2 inner text
  imageUrl: string | null // first <img> inside the section, if any
  text: string // plain text of the section (paragraphs etc.)
  html: string // raw html of the section (excluding the h2 itself)
}

/**
 * Extract sections from a post's HTML.
 *
 * Implementation notes:
 *  - We do not use a DOM parser to keep the library isomorphic (runs in Server
 *    Actions / API routes on the edge). A regex-based split on <h2>…</h2> is
 *    sufficient for Tiptap-generated HTML which always emits well-formed tags.
 *  - Nested h3/h4 inside a section stay with the section.
 */
export function parsePostSections(html: string): PostSection[] {
  if (!html) return []

  // Split on <h2 …>…</h2>. We use a non-greedy match and capture the heading text.
  const h2Regex = /<h2\b[^>]*>([\s\S]*?)<\/h2>/gi
  const matches: Array<{ heading: string; start: number; end: number }> = []
  let m: RegExpExecArray | null
  while ((m = h2Regex.exec(html)) !== null) {
    matches.push({
      heading: stripTags(m[1]).trim(),
      start: m.index,
      end: m.index + m[0].length,
    })
  }

  if (matches.length === 0) return []

  const sections: PostSection[] = []
  for (let i = 0; i < matches.length; i++) {
    const current = matches[i]
    const next = matches[i + 1]
    const bodyStart = current.end
    const bodyEnd = next ? next.start : html.length
    const bodyHtml = html.slice(bodyStart, bodyEnd)

    const imageUrl = extractFirstImageUrl(bodyHtml)
    const text = htmlToPlainText(bodyHtml)

    sections.push({
      index: i,
      heading: current.heading,
      imageUrl,
      text,
      html: bodyHtml,
    })
  }

  return sections
}

/** Strip all HTML tags from a string (keeps inner text). */
function stripTags(input: string): string {
  return input.replace(/<[^>]+>/g, '')
}

/** Return the src attribute of the first <img> tag in the given html, if any. */
function extractFirstImageUrl(html: string): string | null {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i)
  return match ? match[1] : null
}

/**
 * Lightweight html -> plain text conversion for feeding into LLM prompts.
 * Keeps paragraph breaks, drops all tags, decodes common entities.
 */
function htmlToPlainText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[3-6]|li|figure|figcaption)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
