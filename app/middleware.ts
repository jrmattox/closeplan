import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    // Add custom middleware logic here
    const path = req.nextUrl.pathname
    const token = req.nextauth.token

    // Verify user has required role for path
    if (path.startsWith('/dashboard')) {
      // For now, just check if user exists
      // Later we'll add specific role checks
      if (!token) {
        return NextResponse.redirect(new URL('/auth/signin', req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token
    }
  }
)

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/deals/:path*',
    '/api/organizations/:path*'
  ]
}
