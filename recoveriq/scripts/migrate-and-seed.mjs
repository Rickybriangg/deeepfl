// Runs at Vercel build time (which can reach the database) to apply migrations
// and seed default accounts. Uses Neon's DIRECT (non-pooled) endpoint for DDL
// and strips channel_binding, which the node-postgres driver does not support.
// Failures are non-fatal so a transient DB issue can't block the whole build.
import { execSync } from 'node:child_process'

const raw = process.env.DATABASE_URL
if (!raw) {
  console.log('[db-bootstrap] DATABASE_URL not set — skipping migrate/seed')
  process.exit(0)
}

let direct = raw
try {
  const url = new URL(raw)
  // Neon pooled host looks like ...-pooler.<region>...; the direct host drops it.
  url.hostname = url.hostname.replace('-pooler', '')
  url.searchParams.delete('channel_binding')
  direct = url.toString()
} catch {
  console.log('[db-bootstrap] could not parse DATABASE_URL — using it as-is')
}

const env = { ...process.env, DATABASE_URL: direct }

try {
  console.log('[db-bootstrap] applying migrations...')
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env })
  console.log('[db-bootstrap] seeding default accounts...')
  execSync('npx prisma db seed', { stdio: 'inherit', env })
  console.log('[db-bootstrap] done')
} catch (e) {
  console.error('[db-bootstrap] migrate/seed failed (continuing build):', e?.message ?? e)
}
