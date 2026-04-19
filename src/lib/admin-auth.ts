import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * Admin authentication helper for API routes.
 *
 * Returns null if authenticated, or a NextResponse with 401 status otherwise.
 * Usage:
 *   const unauthorized = await requireAdminAuth()
 *   if (unauthorized) return unauthorized
 */
export async function requireAdminAuth(): Promise<NextResponse | null> {
  const cookieStore = await cookies()
  const authToken = cookieStore.get('admin_auth')
  if (authToken?.value !== 'authenticated') {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }
  return null
}

/**
 * Throws if the current request is not authenticated.
 * For use in Server Actions where throwing is natural.
 */
export async function assertAdminAuth(): Promise<void> {
  const cookieStore = await cookies()
  const authToken = cookieStore.get('admin_auth')
  if (authToken?.value !== 'authenticated') {
    throw new Error('Unauthorized')
  }
}
