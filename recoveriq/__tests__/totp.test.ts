import { describe, it, expect } from 'vitest'
import {
  base32Encode,
  base32Decode,
  generateTotp,
  verifyTotp,
  generateTotpSecret,
  buildOtpAuthUri,
} from '@/lib/totp'

// RFC 4648 base32 test vectors.
describe('base32', () => {
  it('encodes known vectors', () => {
    expect(base32Encode(Buffer.from('foobar'))).toBe('MZXW6YTBOI')
    expect(base32Encode(Buffer.from('f'))).toBe('MY')
  })
  it('round-trips arbitrary bytes', () => {
    const buf = Buffer.from('hello world TOTP secret')
    expect(base32Decode(base32Encode(buf)).equals(buf)).toBe(true)
  })
})

// RFC 6238 Appendix B test vectors (SHA1, seed = ASCII "12345678901234567890").
describe('generateTotp (RFC 6238 vectors)', () => {
  const secret = base32Encode(Buffer.from('12345678901234567890'))
  const cases: Array<[number, string]> = [
    [59, '94287082'],
    [1111111109, '07081804'],
    [1111111111, '14050471'],
    [1234567890, '89005924'],
    [2000000000, '69279037'],
  ]
  for (const [time, expected] of cases) {
    it(`matches at t=${time}`, () => {
      const code = generateTotp(secret, { time: time * 1000, digits: 8 })
      expect(code).toBe(expected)
    })
  }
})

describe('verifyTotp', () => {
  it('accepts a freshly generated code', () => {
    const secret = generateTotpSecret()
    const now = Date.now()
    const code = generateTotp(secret, { time: now })
    expect(verifyTotp(secret, code, { time: now })).toBe(true)
  })
  it('rejects a wrong code', () => {
    const secret = generateTotpSecret()
    expect(verifyTotp(secret, '000000', { time: 0 })).toBe(false)
  })
  it('tolerates one step of clock drift', () => {
    const secret = generateTotpSecret()
    const now = Date.now()
    const past = generateTotp(secret, { time: now - 30_000 })
    expect(verifyTotp(secret, past, { time: now, window: 1 })).toBe(true)
  })
})

describe('buildOtpAuthUri', () => {
  it('produces a valid otpauth URI', () => {
    const uri = buildOtpAuthUri('ABC123', 'user@example.com')
    expect(uri).toMatch(/^otpauth:\/\/totp\//)
    expect(uri).toContain('secret=ABC123')
    expect(uri).toContain('issuer=RecoverIQ')
  })
})
