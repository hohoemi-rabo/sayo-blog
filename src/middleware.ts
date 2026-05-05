import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Admin authentication middleware
 * Protects all /admin/* routes except /admin/login.
 * Also injects x-pathname so the admin layout can vary chrome by route
 * (e.g. hide sidebar on preview pages).
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only apply to /admin routes
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next()
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', pathname)
  const passThrough = () =>
    NextResponse.next({ request: { headers: requestHeaders } })

  // Allow access to login page
  if (pathname === '/admin/login') {
    // If already authenticated, redirect to dashboard
    const authToken = request.cookies.get('admin_auth')
    if (authToken?.value === 'authenticated') {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
    return passThrough()
  }

  // Check for authentication cookie
  const authToken = request.cookies.get('admin_auth')

  if (authToken?.value !== 'authenticated') {
    // Redirect to login page if not authenticated
    const loginUrl = new URL('/admin/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return passThrough()
}

export const config = {
  matcher: ['/admin/:path*'],
}
