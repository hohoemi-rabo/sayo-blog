/**
 * Credit-section helpers for AI 記事再構成 (Ticket 37).
 *
 * Gemini is instructed to include a credit block at the bottom of the
 * generated article. To be safe (Gemini 指示は時々無視される), we verify
 * server-side and append the block ourselves if it's missing.
 */

interface CreditSource {
  ig_username: string
  display_name: string
}

interface CreditPost {
  ig_post_url: string | null
}

export function buildCreditHtml(source: CreditSource, post: CreditPost): string {
  const profileUrl = `https://www.instagram.com/${source.ig_username}/`
  const originLine = post.ig_post_url
    ? `<br>\n  元投稿: <a href="${post.ig_post_url}" target="_blank" rel="noopener noreferrer">${post.ig_post_url}</a>`
    : ''

  return `<hr>
<p class="credit">
  この記事は <strong>${escapeHtml(source.display_name)}</strong> さん（<a href="${profileUrl}" target="_blank" rel="noopener noreferrer">@${source.ig_username}</a>）の Instagram 投稿を元に作成しました。${originLine}
</p>`
}

/**
 * Ensure the article HTML contains a credit section. The check is content-based:
 * if the original IG post URL (or the IG profile URL when post URL is missing)
 * already appears anywhere in the html, we trust the AI's credit block.
 * Otherwise we append one.
 */
export function ensureCreditSection(
  html: string,
  source: CreditSource,
  post: CreditPost
): string {
  const profileUrl = `https://www.instagram.com/${source.ig_username}/`
  const expectedMarker = post.ig_post_url ?? profileUrl

  if (html.includes(expectedMarker)) {
    return html
  }

  const credit = buildCreditHtml(source, post)
  return `${html.trimEnd()}\n${credit}`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
