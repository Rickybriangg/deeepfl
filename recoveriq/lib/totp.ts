import crypto from 'node:crypto'

// In-house TOTP (RFC 6238) + base32 — no external dependency, no third-party
// service. Used for Multi-Factor Authentication (roadmap Section 2 / Security).

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function base32Encode(buf: Buffer): string {
  let bits = 0
  let value = 0
  let output = ''
  for (const byte of buf) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31]
  }
  return output
}

export function base32Decode(input: string): Buffer {
  const clean = input.replace(/=+$/, '').toUpperCase().replace(/\s/g, '')
  let bits = 0
  let value = 0
  const bytes: number[] = []
  for (const char of clean) {
    const idx = BASE32_ALPHABET.indexOf(char)
    if (idx === -1) continue
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return Buffer.from(bytes)
}

// Generates a random base32 secret (default 20 bytes / 160 bits, per RFC).
export function generateTotpSecret(bytes = 20): string {
  return base32Encode(crypto.randomBytes(bytes))
}

// Computes the TOTP code for a given secret and time step.
export function generateTotp(
  secret: string,
  opts?: { time?: number; step?: number; digits?: number }
): string {
  const step = opts?.step ?? 30
  const digits = opts?.digits ?? 6
  const time = Math.floor((opts?.time ?? Date.now()) / 1000)
  const counter = Math.max(0, Math.floor(time / step))

  const counterBuf = Buffer.alloc(8)
  // Write the counter as a big-endian 64-bit integer.
  counterBuf.writeBigUInt64BE(BigInt(counter))

  const key = base32Decode(secret)
  const hmac = crypto.createHmac('sha1', key).update(counterBuf).digest()

  const offset = hmac[hmac.length - 1] & 0xf
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)

  const otp = binary % 10 ** digits
  return otp.toString().padStart(digits, '0')
}

// Verifies a submitted code, allowing for a ±`window` step drift (clock skew).
export function verifyTotp(
  secret: string,
  token: string,
  opts?: { time?: number; step?: number; digits?: number; window?: number }
): boolean {
  const window = opts?.window ?? 1
  const step = opts?.step ?? 30
  const now = opts?.time ?? Date.now()
  const clean = token.replace(/\s/g, '')
  for (let i = -window; i <= window; i++) {
    const candidate = generateTotp(secret, {
      time: now + i * step * 1000,
      step,
      digits: opts?.digits,
    })
    if (crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(clean))) {
      return true
    }
  }
  return false
}

// Builds the otpauth:// provisioning URI for authenticator apps / QR codes.
export function buildOtpAuthUri(secret: string, account: string, issuer = 'RecoverIQ'): string {
  const label = encodeURIComponent(`${issuer}:${account}`)
  const params = new URLSearchParams({ secret, issuer, algorithm: 'SHA1', digits: '6', period: '30' })
  return `otpauth://totp/${label}?${params.toString()}`
}
