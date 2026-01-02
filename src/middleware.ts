import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Admin authentication middleware
 * Protects all /admin/* routes except /admin/login
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only apply to /admin routes
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next()
  }

  // Allow access to login page
  if (pathname === '/admin/login') {
    // If already authenticated, redirect to dashboard
    const authToken = request.cookies.get('admin_auth')
    if (authToken?.value === 'authenticated') {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
    return NextResponse.next()
  }

  // Check for authentication cookie
  const authToken = request.cookies.get('admin_auth')

  if (authToken?.value !== 'authenticated') {
    // Redirect to login page if not authenticated
    const loginUrl = new URL('/admin/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
