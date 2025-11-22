import dotenv from 'dotenv'
import path from 'node:path'
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import pLimit from 'p-limit'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const DEFAULT_CONCURRENCY = 5

function required(name, value) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function loadEnv() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL

  return {
    supabaseUrl: required('SUPABASE_URL', supabaseUrl),
    supabaseServiceKey: required(
      'SUPABASE_SERVICE_ROLE_KEY',
      process.env.SUPABASE_SERVICE_ROLE_KEY
    ),
    r2AccountId: required('R2_ACCOUNT_ID', process.env.R2_ACCOUNT_ID),
    r2AccessKeyId: required('R2_ACCESS_KEY_ID', process.env.R2_ACCESS_KEY_ID),
    r2SecretAccessKey: required('R2_SECRET_ACCESS_KEY', process.env.R2_SECRET_ACCESS_KEY),
    r2BucketName: required('R2_BUCKET_NAME', process.env.R2_BUCKET_NAME),
    concurrency:
      Number.parseInt(process.env.MIGRATION_CONCURRENCY || '', 10) || DEFAULT_CONCURRENCY,
  }
}

function normalizeSegment(value) {
  if (!value) return ''
  return value
    .toString()
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

async function streamToBuffer(stream) {
  const chunks = []
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

function createSupabaseClient(url, serviceKey) {
  return createClient(url, serviceKey, { auth: { persistSession: false } })
}

function normalizeKey(key) {
  if (!key) return ''
  return key
    .split('?')[0]
    .replace(/^\/+/, '')
    .trim()
}

function stripBucketPrefix(key, bucketName) {
  if (!key || !bucketName) return key
  const normalizedBucket = normalizeKey(bucketName)
  const normalizedKey = normalizeKey(key)

  if (normalizedKey.startsWith(`${normalizedBucket}/`)) {
    return normalizedKey.slice(normalizedBucket.length + 1)
  }

  return normalizedKey
}

function buildStorageKey(base, bucket, path) {
  const segments = [base, bucket, path]
    .map((segment) => (segment ?? '').toString().replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)

  return segments.join('/')
}

function generateLegacyKeyCandidates(sound, bucketName) {
  const candidates = []
  const seen = new Set()
  const rawPath = normalizeKey(sound.path)
  const normalizedBucketSegment = normalizeSegment(sound.bucket)
  const planTier = normalizeSegment(sound.plan_tier)
  const owner = normalizeSegment(sound.owner_id)
  const normalizedBucketName = normalizeKey(bucketName)

  const knownTiers = ['free', 'basic', 'plus', 'pro']
  const derivedBase = normalizeSegment(sound.base) || planTier || (owner ? 'users' : '')

  const addCandidate = (value) => {
    const key = normalizeKey(value)
    if (key && !seen.has(key)) {
      seen.add(key)
      candidates.push(key)
    }
  }

  const primaryPath = stripBucketPrefix(rawPath, normalizedBucketName)
  const pathVariants = [primaryPath]

  if (rawPath && rawPath !== primaryPath) {
    pathVariants.push(rawPath)
  }

  for (const variant of pathVariants.filter(Boolean)) {
    addCandidate(variant)

    if (normalizedBucketSegment) {
      addCandidate(buildStorageKey('', normalizedBucketSegment, variant))
    }

    if (derivedBase) {
      addCandidate(buildStorageKey(derivedBase, normalizedBucketSegment, variant))
      addCandidate(buildStorageKey(derivedBase, '', variant))
    }

    const leadingSegment = variant.split('/')[0]
    if (leadingSegment && knownTiers.includes(leadingSegment)) {
      const remainder = variant.split('/').slice(1).join('/')
      for (const tier of knownTiers) {
        addCandidate(buildStorageKey(tier, '', remainder))
        addCandidate(buildStorageKey(tier, normalizedBucketSegment, remainder))
      }
    }
  }

  const isFileOnly = primaryPath && !primaryPath.includes('/')
  if (isFileOnly) {
    if (planTier && normalizedBucketSegment) {
      addCandidate(buildStorageKey(planTier, normalizedBucketSegment, primaryPath))
      addCandidate(buildStorageKey(planTier, 'misc', primaryPath))
    }

    if (normalizedBucketSegment) {
      addCandidate(buildStorageKey('', normalizedBucketSegment, primaryPath))
      addCandidate(buildStorageKey('misc', normalizedBucketSegment, primaryPath))
    }

    if (planTier && owner) {
      addCandidate(buildStorageKey(planTier, owner, primaryPath))
    }

    for (const tier of knownTiers) {
      addCandidate(buildStorageKey(tier, normalizedBucketSegment, primaryPath))
      addCandidate(buildStorageKey(tier, 'misc', primaryPath))
    }
  }

  return candidates
}

function resolveExtension(sound, key) {
  const extFromKey = path.extname(key)
  if (extFromKey) return extFromKey

  const extFromName = path.extname(sound.name || '')
  return extFromName
}

async function main() {
  const env = loadEnv()

  const supabase = createSupabaseClient(env.supabaseUrl, env.supabaseServiceKey)

  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${env.r2AccountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.r2AccessKeyId,
      secretAccessKey: env.r2SecretAccessKey,
    },
  })

  console.log(`Fetching sounds from Supabase...`)
  const { data: sounds, error } = await supabase
    .from('sound_files')
    .select('id, path, name, bucket, plan_tier, owner_id, base')
  if (error) {
    throw new Error(`Failed to fetch sounds: ${error.message}`)
  }
  if (!sounds || sounds.length === 0) {
    console.log('No sounds found to migrate.')
    return
  }

  const limit = pLimit(env.concurrency)

  await Promise.all(
    sounds.map((sound) =>
      limit(async () => {
        const candidates = generateLegacyKeyCandidates(sound, env.r2BucketName)

        if (!candidates.length) {
          console.warn(`Skipping sound ${sound.id}: missing path/bucket information`)
          return
        }

        let foundKey = null
        let objectResponse = null

        for (const candidate of candidates) {
          try {
            const response = await s3.send(
              new GetObjectCommand({
                Bucket: env.r2BucketName,
                Key: candidate,
              })
            )
            foundKey = candidate
            objectResponse = response
            break
          } catch (err) {
            if (err?.Code !== 'NoSuchKey') {
              console.error(`Error fetching ${candidate} for sound ${sound.id}:`, err)
            }
          }
        }

        if (!foundKey || !objectResponse) {
          console.error(
            `Failed to locate object for sound ${sound.id}. Tried: ${candidates.join(', ')}`
          )
          return
        }

        const extension = resolveExtension(sound, foundKey)
        if (!extension) {
          console.error(
            `Skipping sound ${sound.id}: could not determine file extension from key "${foundKey}" or name "${sound.name}"`
          )
          return
        }

        const newKey = `${sound.id}${extension}`

        if (foundKey === newKey) {
          console.log(`Skipping sound ${sound.id}: already stored as ${newKey}`)
          return
        }

        try {
          console.log(`Migrating sound ${sound.id}: ${foundKey} → ${newKey}`)

          const body = objectResponse.Body
          if (!body) {
            throw new Error('Empty object body received from R2')
          }

          const buffer = await streamToBuffer(body)

          await s3.send(
            new PutObjectCommand({
              Bucket: env.r2BucketName,
              Key: newKey,
              Body: buffer,
              ContentType: objectResponse.ContentType,
            })
          )

          const { error: updateError } = await supabase
            .from('sound_files')
            .update({ path: newKey })
            .eq('id', sound.id)

          if (updateError) {
            throw new Error(`Supabase update failed: ${updateError.message}`)
          }

          console.log('Updated Supabase record')
        } catch (migrationError) {
          console.error(`Failed to migrate sound ${sound.id}:`, migrationError)
        }
      })
    )
  )

  console.log('Migration complete.')
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
