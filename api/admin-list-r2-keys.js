import { AwsClient } from 'aws4fetch'
import { authenticateAdmin } from './_utils/adminAuth.js'
import { HttpError } from './_utils/errors.js'
import { buildCorsHeaders } from './_utils/http.js'

const MAX_KEYS_PER_PAGE = 1000 // S3 / R2 ListObjectsV2 hard cap
const MAX_TOTAL_KEYS = 50000 // safety stop — refuse to enumerate insanely-large buckets

export function OPTIONS(request) {
  return new Response(null, {
    status: 204,
    headers: buildCorsHeaders(request, 'GET, OPTIONS'),
  })
}

/**
 * GET /api/admin-list-r2-keys
 *
 * Pure read endpoint. Enumerates every object in the R2 bucket and
 * returns the keys + sizes. Used by the orphan-check dashboard to
 * compare against the sound_files table.
 *
 * Returns at most MAX_TOTAL_KEYS entries; if the bucket is larger
 * (it shouldn't be — we're well under 10k right now) the response
 * is flagged truncated so the UI can surface that.
 */
export async function GET(request) {
  try {
    await authenticateAdmin(request)

    const { searchParams } = new URL(request.url)
    const bucketParam = (searchParams.get('bucket') || 'main').toLowerCase()

    const {
      R2_ACCESS_KEY_ID,
      R2_SECRET_ACCESS_KEY,
      R2_BUCKET_NAME,
      R2_PREVIEW_BUCKET_NAME,
      R2_ACCOUNT_ID,
    } = process.env

    if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ACCOUNT_ID) {
      throw new HttpError(500, 'R2 credentials are not configured on the server.')
    }

    // Caller selects which bucket to enumerate. `main` is the
    // canonical sound bucket; `preview` is the smaller bucket of
    // generated previews (see api/generate-preview.js).
    let bucketName
    if (bucketParam === 'preview') {
      bucketName = R2_PREVIEW_BUCKET_NAME
      if (!bucketName) {
        throw new HttpError(500, 'R2_PREVIEW_BUCKET_NAME is not configured.')
      }
    } else {
      bucketName = R2_BUCKET_NAME
      if (!bucketName) {
        throw new HttpError(500, 'R2_BUCKET_NAME is not configured.')
      }
    }

    const client = new AwsClient({
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    })

    const baseUrl = `https://${bucketName}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`

    const allKeys = []
    let continuationToken = null
    let truncated = false

    // Page through the bucket. Standard S3 ListObjectsV2 paging.
    while (true) {
      const url = new URL(`${baseUrl}/`)
      url.searchParams.set('list-type', '2')
      url.searchParams.set('max-keys', String(MAX_KEYS_PER_PAGE))
      if (continuationToken) {
        url.searchParams.set('continuation-token', continuationToken)
      }

      const signed = await client.sign(new Request(url, { method: 'GET' }), {
        aws: { signQuery: true },
      })

      const res = await fetch(signed)

      if (!res.ok) {
        const body = await res.text().catch(() => '')
        console.error('[admin-list-r2] list failed', {
          status: res.status,
          body: body.slice(0, 500),
        })
        throw new HttpError(res.status, `R2 list failed: ${body.slice(0, 200)}`)
      }

      const xml = await res.text()
      const { keys, nextToken, isTruncated } = parseListObjectsXml(xml)
      allKeys.push(...keys)

      if (allKeys.length > MAX_TOTAL_KEYS) {
        allKeys.length = MAX_TOTAL_KEYS
        truncated = true
        break
      }

      if (!isTruncated || !nextToken) break
      continuationToken = nextToken
    }

    return new Response(
      JSON.stringify({
        bucket: bucketParam === 'preview' ? 'preview' : 'main',
        keys: allKeys,
        count: allKeys.length,
        truncated,
      }),
      {
        status: 200,
        headers: {
          ...buildCorsHeaders(request, 'GET, OPTIONS'),
          'Content-Type': 'application/json',
        },
      }
    )
  } catch (error) {
    if (error instanceof HttpError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: error.status,
        headers: {
          ...buildCorsHeaders(request, 'GET, OPTIONS'),
          'Content-Type': 'application/json',
        },
      })
    }

    console.error('[admin-list-r2] unexpected error', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: {
        ...buildCorsHeaders(request, 'GET, OPTIONS'),
        'Content-Type': 'application/json',
      },
    })
  }
}

/**
 * Minimal XML parser for the S3 ListObjectsV2 response. We need
 * <Key>, <Size>, <NextContinuationToken>, and <IsTruncated>.
 *
 * Avoids pulling in a full XML library; the response shape is fixed
 * and simple. Regex is fine here because every value is plain text
 * with no nested markup.
 */
function parseListObjectsXml(xml) {
  const keys = []
  const contentRegex = /<Contents>([\s\S]*?)<\/Contents>/g
  const keyRegex = /<Key>([\s\S]*?)<\/Key>/
  const sizeRegex = /<Size>([\s\S]*?)<\/Size>/

  let match
  while ((match = contentRegex.exec(xml)) !== null) {
    const block = match[1]
    const keyMatch = block.match(keyRegex)
    const sizeMatch = block.match(sizeRegex)
    if (!keyMatch) continue
    keys.push({
      key: keyMatch[1],
      size: sizeMatch ? Number(sizeMatch[1]) : 0,
    })
  }

  const isTruncated =
    /<IsTruncated>\s*true\s*<\/IsTruncated>/i.test(xml)
  const nextTokenMatch = xml.match(/<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/)
  const nextToken = nextTokenMatch ? nextTokenMatch[1] : null

  return { keys, isTruncated, nextToken }
}
