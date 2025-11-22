import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3'
import pLimit from 'p-limit'
import path from 'node:path'

dotenv.config({ path: '.env.local' })

const requiredEnv = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
]

const missingEnv = requiredEnv.filter((key) => !process.env[key])

if (missingEnv.length) {
  console.error(`Missing required environment variables: ${missingEnv.join(', ')}`)
  process.exit(1)
}

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME,
  MIGRATION_CONCURRENCY,
} = process.env

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
})

const limit = pLimit(Number(MIGRATION_CONCURRENCY) || 5)

async function streamToBuffer(stream) {
  const chunks = []
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

async function migrateSound(sound) {
  const oldKey = sound.r2_object_key

  if (!oldKey) {
    console.warn(`Skipping sound ${sound.id}: no r2_object_key present`)
    return
  }

  const extension = path.extname(oldKey)
  if (!extension) {
    console.warn(`Skipping sound ${sound.id}: cannot determine extension from key "${oldKey}"`)
    return
  }

  const newKey = `${sound.id}${extension}`

  if (path.basename(oldKey) === newKey) {
    console.log(`Skipping sound ${sound.id}: already migrated as ${newKey}`)
    return
  }

  console.log(`Migrating sound ${sound.id}: ${oldKey} → ${newKey}`)

  try {
    const getResult = await s3.send(
      new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: oldKey,
      })
    )

    if (!getResult.Body) {
      throw new Error('R2 object returned no body')
    }

    const bodyBuffer = await streamToBuffer(getResult.Body)

    await s3.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: newKey,
        Body: bodyBuffer,
        ContentType: getResult.ContentType,
      })
    )

    const { error: updateError } = await supabase
      .from('sounds')
      .update({ r2_object_key: newKey })
      .eq('id', sound.id)

    if (updateError) {
      throw updateError
    }

    console.log('Updated Supabase record')
  } catch (error) {
    console.error(`Error migrating sound ${sound.id}:`, error)
  }
}

async function main() {
  const { data: sounds, error } = await supabase.from('sounds').select('*')

  if (error) {
    console.error('Failed to fetch sounds:', error)
    process.exit(1)
  }

  if (!sounds?.length) {
    console.log('No sounds found to migrate.')
    return
  }

  await Promise.all(sounds.map((sound) => limit(() => migrateSound(sound))))
  console.log('Migration complete.')
}

main().catch((error) => {
  console.error('Migration failed:', error)
  process.exit(1)
})
