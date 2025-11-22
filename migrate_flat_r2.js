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
  const { data: sounds, error } = await supabase.from('sounds').select('id, r2_object_key')
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
        const { id, r2_object_key: oldKey } = sound
        if (!oldKey) {
          console.warn(`Skipping sound ${id}: missing r2_object_key`)
          return
        }

        const cleanKey = normalizeKey(oldKey)
        const extension = path.extname(cleanKey)
        if (!extension) {
          console.error(`Skipping sound ${id}: could not determine file extension from key "${oldKey}"`)
          return
        }

        const newKey = `${id}${extension}`

        if (cleanKey === newKey) {
          console.log(`Skipping sound ${id}: already stored as ${newKey}`)
          return
        }

        try {
          console.log(`Migrating sound ${id}: ${oldKey} → ${newKey}`)
          const objectResponse = await s3.send(
            new GetObjectCommand({
              Bucket: env.r2BucketName,
              Key: cleanKey,
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
            .from('sounds')
            .update({ r2_object_key: newKey })
            .eq('id', id)

          if (updateError) {
            throw new Error(`Supabase update failed: ${updateError.message}`)
          }

          console.log('Updated Supabase record')
        } catch (migrationError) {
          console.error(`Failed to migrate sound ${id}:`, migrationError)
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
