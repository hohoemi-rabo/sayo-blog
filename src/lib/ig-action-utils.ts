/**
 * Shared helpers for Instagram-related Server Actions.
 *
 * Extracted to avoid duplicating the same retry/error-formatting logic
 * across the multiple `actions.ts` files in /admin/instagram/* features.
 */

const RETRY_MAX_ATTEMPTS = 3
const RETRY_INITIAL_BACKOFF_MS = 500

export type ActionResult<T = undefined> =
  | ({ success: true } & (T extends undefined ? { data?: never } : { data: T }))
  | { success: false; error: string; code?: ActionErrorCode }

export type ActionErrorCode = 'duplicate' | 'not_found' | 'validation' | 'auth'

/**
 * Retry wrapper for Supabase queries that can hit transient Cloudflare 5xx errors.
 * Retries only on transient errors (5xx / timeout / network) — not on validation errors.
 */
export async function withRetry<T extends { data: unknown; error: unknown }>(
  op: () => Promise<T>,
  label: string
): Promise<T> {
  let lastResult: T | undefined
  for (let attempt = 1; attempt <= RETRY_MAX_ATTEMPTS; attempt++) {
    try {
      const result = await op()
      if (!result.error) return result
      lastResult = result
      if (!isTransientError(result.error)) {
        console.error(`[${label}] non-retriable error:`, result.error)
        return result
      }
      console.warn(
        `[${label}] transient error on attempt ${attempt}/${RETRY_MAX_ATTEMPTS}`
      )
    } catch (thrown) {
      console.warn(
        `[${label}] thrown on attempt ${attempt}/${RETRY_MAX_ATTEMPTS}:`,
        thrown
      )
      if (attempt === RETRY_MAX_ATTEMPTS) {
        return { data: null, error: thrown } as unknown as T
      }
    }
    if (attempt < RETRY_MAX_ATTEMPTS) {
      await sleep(RETRY_INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1))
    }
  }
  return (
    lastResult ??
    ({ data: null, error: new Error('Retry exhausted') } as unknown as T)
  )
}

export function isTransientError(err: unknown): boolean {
  if (!err) return false
  const message = extractErrorMessage(err)
  if (!message) return false
  if (/<!DOCTYPE|Bad gateway|502|503|504|gateway/i.test(message)) return true
  if (/timeout|ETIMEDOUT|ECONNRESET|fetch failed/i.test(message)) return true
  return false
}

export function friendlyDbError(err: unknown): string {
  const message = extractErrorMessage(err) || 'Unknown error'
  if (isTransientError(message)) {
    return 'サーバーが一時的に応答しませんでした。数秒後にもう一度お試しください。'
  }
  return message.length > 200 ? `${message.slice(0, 200)}…` : message
}

/**
 * Postgres unique-violation SQL state code.
 * Supabase returns this as `error.code` on UNIQUE constraint conflicts.
 */
export const PG_UNIQUE_VIOLATION = '23505'

export function isUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const code = (err as { code?: unknown }).code
  return code === PG_UNIQUE_VIOLATION
}

function extractErrorMessage(err: unknown): string {
  if (typeof err === 'string') return err
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const message = (err as { message?: unknown }).message
    if (typeof message === 'string') return message
  }
  return ''
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
