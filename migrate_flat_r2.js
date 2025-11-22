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

function resolveLegacyKey(sound) {
  const rawPath = normalizeKey(sound.path)
  const base = normalizeKey(sound.plan_tier) || 'users'
  const bucket = normalizeKey(sound.bucket || sound.owner_id)

  if (rawPath.includes('/')) {
    return rawPath
  }

  if (!bucket) {
    return rawPath
  }

  return [base, bucket, rawPath].filter(Boolean).join('/')
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
    .select('id, path, name, bucket, plan_tier, owner_id')
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
        const legacyKey = resolveLegacyKey(sound)

        if (!legacyKey) {
          console.warn(`Skipping sound ${sound.id}: missing path/bucket information`)
          return
        }

        const cleanKey = normalizeKey(legacyKey)
        const effectiveKey = stripBucketPrefix(cleanKey, env.r2BucketName)
        const extension = resolveExtension(sound, effectiveKey)
        if (!extension) {
          console.error(
            `Skipping sound ${sound.id}: could not determine file extension from key "${legacyKey}" or name "${sound.name}"`
          )
          return
        }

        const newKey = `${sound.id}${extension}`

        if (effectiveKey === newKey) {
          console.log(`Skipping sound ${sound.id}: already stored as ${newKey}`)
          return
        }

        try {
          console.log(`Migrating sound ${sound.id}: ${legacyKey} → ${newKey}`)
          const objectResponse = await s3.send(
            new GetObjectCommand({
              Bucket: env.r2BucketName,
              Key: effectiveKey,
            })
          )

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
