import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const schema = z.object({ email: z.string().email(), password: z.string().min(1) })

// Validates credentials WITHOUT creating a session, so the login page knows
// whether to prompt for a TOTP code. Returns { ok, mfaRequired }. The actual
// session-issuing authorize() in lib/auth.ts independently enforces MFA, so
// this endpoint cannot be used to bypass the second factor.
export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } })
  if (!user) return NextResponse.json({ ok: false })

  const valid = await bcrypt.compare(parsed.data.password, user.password)
  if (!valid) return NextResponse.json({ ok: false })

  return NextResponse.json({ ok: true, mfaRequired: user.mfaEnabled })
}
