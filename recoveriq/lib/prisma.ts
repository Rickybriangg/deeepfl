import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function sanitize(url: string): string {
  // node-postgres does not understand channel_binding; strip it so it doesn't
  // interfere with the connection. sslmode is honored and left intact.
  try {
    const u = new URL(url)
    u.searchParams.delete('channel_binding')
    return u.toString()
  } catch {
    return url
  }
}

function createClient(): PrismaClient {
  const raw = process.env.DATABASE_URL
  if (!raw) throw new Error('DATABASE_URL is not set')
  const connectionString = sanitize(raw)
  // Serverless functions keep a warm pooled connection between invocations.
  // Railway's public proxy silently drops idle TCP connections, so a reused
  // connection fails the next query with P1017 "Server has closed the
  // connection". TCP keepalive holds the socket open, and a small pool with
  // sane timeouts keeps the driver from handing out dead connections.
  const adapter = new PrismaPg({
    connectionString,
    max: 5,
    keepAlive: true,
    keepAliveInitialDelayMillis: 5_000,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 15_000,
  })
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

// Reuse a single client across warm invocations in every environment to avoid
// opening a fresh pool (and connection) on each request.
export const prisma = globalForPrisma.prisma ?? createClient()
globalForPrisma.prisma = prisma
