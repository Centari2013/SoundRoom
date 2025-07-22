import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('aws4fetch', () => ({
  AwsClient: vi.fn().mockImplementation(() => ({
    sign: vi.fn(async (req) => ({ url: req.url + '?signed' }))
  }))
}))

beforeEach(() => {
  vi.resetModules()
})

describe('get-signed-url API', () => {
  it('returns 400 when key is missing', async () => {
    const { GET } = await import('../api/get-signed-url.js')
    const res = await GET(new Request('https://example.com/api'))
    expect(res.status).toBe(400)
  })

  it('signs the url when key provided', async () => {
    process.env.R2_ACCESS_KEY_ID = 'id'
    process.env.R2_SECRET_ACCESS_KEY = 'secret'
    process.env.R2_BUCKET_NAME = 'bucket'
    process.env.R2_ACCOUNT_ID = 'acc'
    const { GET } = await import('../api/get-signed-url.js')
    const res = await GET(new Request('https://example.com/api?key=file.mp3'))
    const body = await res.json()
    expect(body.signedUrl).toContain('bucket.acc.r2.cloudflarestorage.com/file.mp3')
    expect(res.status).toBe(200)
  })
})
