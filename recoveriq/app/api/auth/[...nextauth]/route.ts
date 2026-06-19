import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

// Never statically optimize the auth endpoint: a cached/prerendered handler
// makes the credentials callback reject POSTs with 405 Method Not Allowed.
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
