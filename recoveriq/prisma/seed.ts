import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL is not set')
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

async function main() {
  const adminPw = await bcrypt.hash('admin123', 10)
  await prisma.user.upsert({
    where: { email: 'admin@yedf.go.ke' },
    update: {},
    create: {
      name: 'System Admin',
      email: 'admin@yedf.go.ke',
      password: adminPw,
      role: 'Admin',
    },
  })

  const managerPw = await bcrypt.hash('manager123', 10)
  await prisma.user.upsert({
    where: { email: 'manager@yedf.go.ke' },
    update: {},
    create: {
      name: 'Credit Manager',
      email: 'manager@yedf.go.ke',
      password: managerPw,
      role: 'Manager',
    },
  })

  const officerPw = await bcrypt.hash('officer123', 10)
  await prisma.user.upsert({
    where: { email: 'officer@yedf.go.ke' },
    update: {},
    create: {
      name: 'Recovery Officer',
      email: 'officer@yedf.go.ke',
      password: officerPw,
      role: 'Officer',
    },
  })

  console.log('✓ Seed completed')
  console.log('  admin@yedf.go.ke / admin123')
  console.log('  manager@yedf.go.ke / manager123')
  console.log('  officer@yedf.go.ke / officer123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
