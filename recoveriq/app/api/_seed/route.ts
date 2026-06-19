import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key')
  if (!key || key !== process.env.NEXTAUTH_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const accounts = [
    { name: 'System Admin', email: 'admin@yedf.go.ke', password: 'admin123', role: 'Admin' },
    { name: 'Credit Manager', email: 'manager@yedf.go.ke', password: 'manager123', role: 'Manager' },
    { name: 'Recovery Officer', email: 'officer@yedf.go.ke', password: 'officer123', role: 'Officer' },
  ]

  for (const a of accounts) {
    const hashed = await bcrypt.hash(a.password, 10)
    await prisma.user.upsert({
      where: { email: a.email },
      update: {},
      create: { name: a.name, email: a.email, password: hashed, role: a.role },
    })
  }

  return NextResponse.json({ ok: true, seeded: accounts.map((a) => a.email) })
}
