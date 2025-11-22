import dotenv from 'dotenv'
import path from 'node:path'
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import pLimit from 'p-limit'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

function getEnv() {
  const {
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME,
    MIGRATION_CONCURRENCY,
  } = process.env

  const missing = [
    ['SUPABASE_URL', SUPABASE_URL],
    ['SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_ROLE_KEY],
    ['R2_ACCOUNT_ID', R2_ACCOUNT_ID],
    ['R2_ACCESS_KEY_ID', R2_ACCESS_KEY_ID],
    ['R2_SECRET_ACCESS_KEY', R2_SECRET_ACCESS_KEY],
    ['R2_BUCKET_NAME', R2_BUCKET_NAME],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key)

  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }

  return {
    supabaseUrl: SUPABASE_URL,
    supabaseServiceKey: SUPABASE_SERVICE_ROLE_KEY,
    r2AccountId: R2_ACCOUNT_ID,
    r2AccessKeyId: R2_ACCESS_KEY_ID,
    r2SecretAccessKey: R2_SECRET_ACCESS_KEY,
    r2BucketName: R2_BUCKET_NAME,
    concurrency: Number(MIGRATION_CONCURRENCY || 5),
  }
}

async function streamToBuffer(stream) {
  const chunks = []
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

async function main() {
  const env = getEnv()

  const supabase = createClient(env.supabaseUrl, env.supabaseServiceKey)

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

        const cleanKey = oldKey.split('?')[0]
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
