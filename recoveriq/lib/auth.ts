import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { verifyTotp } from '@/lib/totp'

// Thrown to signal the client that a valid TOTP code is still required.
export const MFA_REQUIRED = 'MFA_REQUIRED'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  token: z.string().optional(),
})

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        })
        if (!user) return null

        const valid = await bcrypt.compare(parsed.data.password, user.password)
        if (!valid) return null

        // Second factor: if MFA is enabled, a valid current TOTP code is required.
        if (user.mfaEnabled && user.mfaSecret) {
          const token = parsed.data.token
          if (!token) throw new Error(MFA_REQUIRED)
          if (!verifyTotp(user.mfaSecret, token)) throw new Error(MFA_REQUIRED)
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role?: string }).role
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        ;(session.user as { id?: string }).id = token.id as string
        ;(session.user as { role?: string }).role = token.role as string
      }
      return session
    },
  },
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
}
