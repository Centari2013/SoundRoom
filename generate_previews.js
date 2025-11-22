import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import ffmpegPath from 'ffmpeg-static'
import ffprobePath from 'ffprobe-static'
import pLimit from 'p-limit'

const TEN_SECONDS = 10
const DEFAULT_CONCURRENCY = 2
const execFileAsync = promisify(execFile)
const ffmpegExecutable = ffmpegPath || 'ffmpeg'
const ffprobeExecutable = ffprobePath?.path || ffprobePath || 'ffprobe'

function required(name, value) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function loadEnv() {
  return {
    supabaseUrl: required('SUPABASE_URL', process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL),
    supabaseServiceKey: required('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY),
    r2AccountId: required('R2_ACCOUNT_ID', process.env.R2_ACCOUNT_ID),
    r2AccessKeyId: required('R2_ACCESS_KEY_ID', process.env.R2_ACCESS_KEY_ID),
    r2SecretAccessKey: required('R2_SECRET_ACCESS_KEY', process.env.R2_SECRET_ACCESS_KEY),
    r2PrivateBucket: required('R2_BUCKET_NAME', process.env.R2_BUCKET_NAME),
    r2PreviewBucket: required('R2_PREVIEW_BUCKET_NAME', process.env.R2_PREVIEW_BUCKET_NAME),
    r2PreviewBase: process.env.R2_PREVIEW_PUBLIC_BASE_URL || 'https://preview.soundroom.live',
    concurrency: Number.parseInt(process.env.PREVIEW_CONCURRENCY || '', 10) || DEFAULT_CONCURRENCY
  }
}

function createSupabaseClient(url, serviceKey) {
  return createClient(url, serviceKey, {
    auth: { persistSession: false }
  })
}

function createR2Client({ accountId, accessKeyId, secretAccessKey }) {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey }
  })
}

function safeSegment(value) {
  if (!value) return ''
  return value
    .toString()
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
}

function findCandidate(row, keys) {
  for (const key of keys) {
    if (row[key]) return row[key]
  }
  return null
}

function resolveOriginalKey(row) {
  const key = findCandidate(row, [
    'r2_key',
    'r2_object_key',
    'object_key',
    'key',
    'path',
    'storage_key',
    'file_key',
    'original_key'
  ])
  const base = safeSegment(findCandidate(row, ['base', 'storage_base', 'storageBase', 'plan_tier', 'tier']))
  const bucket = safeSegment(
    findCandidate(row, ['bucket', 'storage_bucket', 'storageBucket', 'r2_bucket', 'owner_id', 'user_id'])
  )

  if (key && base && bucket) {
    if (key.startsWith(`${base}/`) || key.startsWith(`${base}/${bucket}/`)) {
      return key
    }
    return `${base}/${bucket}/${key}`
  }

  return key
}

async function downloadOriginal(client, bucket, key, destinationPath) {
  const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
  await pipeline(response.Body, fs.createWriteStream(destinationPath))
}

async function probeDuration(filePath) {
  const { stdout } = await execFileAsync(ffprobeExecutable, [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'default=noprint_wrappers=1:nokey=1',
    filePath
  ])

  const parsed = parseFloat(stdout.trim())
  return Number.isFinite(parsed) ? parsed : 0
}

async function encodePreview(inputPath, outputPath, durationSeconds) {
  const args = ['-y', '-i', inputPath, '-ac', '1', '-b:a', '64k']
  if (durationSeconds > 0) {
    args.push('-t', durationSeconds.toString())
  }
  args.push('-f', 'mp3', outputPath)
  await execFileAsync(ffmpegExecutable, args)
}

async function uploadPreview(client, bucket, key, filePath) {
  const body = fs.createReadStream(filePath)
  await client.send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: 'audio/mpeg' })
  )
}

function buildPreviewUrl(baseUrl, soundId) {
  const trimmedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  return `${trimmedBase}/previews/${soundId}-preview.mp3`
}

function describeEnv(env) {
  const supabaseHost = (() => {
    try {
      return new URL(env.supabaseUrl).host
    } catch (error) {
      return '(invalid URL)'
    }
  })()

  console.log('▶️  Preview generator configuration:')
  console.log(`   Supabase project: ${supabaseHost}`)
  console.log(`   R2 account:      ${env.r2AccountId}`)
  console.log(`   Source bucket:   ${env.r2PrivateBucket}`)
  console.log(`   Preview bucket:  ${env.r2PreviewBucket}`)
  console.log(`   Public base URL: ${env.r2PreviewBase}`)
  console.log(`   Concurrency:     ${env.concurrency}`)
}

async function ensureBinaries() {
  const binaries = [
    { exec: ffprobeExecutable, name: 'ffprobe', args: ['-version'] },
    { exec: ffmpegExecutable, name: 'ffmpeg', args: ['-version'] }
  ]

  for (const { exec, name, args } of binaries) {
    try {
      await execFileAsync(exec, args)
    } catch (error) {
      throw new Error(
        `${name} is not available on the PATH (looked for \"${exec}\"); install it or add it to PATH.`
      )
    }
  }
}

async function fetchSoundsWithoutPreview(supabase) {
  const pageSize = 200
  let from = 0
  const results = []

  while (true) {
    const { data, error } = await supabase
      .from('sounds')
      .select('*')
      .is('preview_url', null)
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1)

    if (error) throw error
    if (!data?.length) break

    results.push(...data)
    if (data.length < pageSize) break
    from += pageSize
  }

  return results
}

async function processSound({ sound, r2Client, supabase, env }) {
  const originalKey = resolveOriginalKey(sound)
  if (!originalKey) {
    console.warn(`Skipping sound ${sound.id}: no object key found`)
    return false
  }

  const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'preview-'))
  const inputPath = path.join(tempDir, `${randomUUID()}-source`)
  const previewPath = path.join(tempDir, `${randomUUID()}-preview.mp3`)

  try {
    console.log(`⬇️  Downloading sound ${sound.id} from ${env.r2PrivateBucket}/${originalKey}`)
    await downloadOriginal(r2Client, env.r2PrivateBucket, originalKey, inputPath)
    const durationSeconds = await probeDuration(inputPath)
    const previewDuration = Math.min(durationSeconds || 0, TEN_SECONDS)
    console.log(`🎚️  Encoding preview for sound ${sound.id} (duration ${durationSeconds.toFixed(2)}s) ...`)
    await encodePreview(inputPath, previewPath, previewDuration)

    const previewKey = `previews/${sound.id}-preview.mp3`
    console.log(`⬆️  Uploading preview to ${env.r2PreviewBucket}/${previewKey}`)
    await uploadPreview(r2Client, env.r2PreviewBucket, previewKey, previewPath)

    const previewUrl = buildPreviewUrl(env.r2PreviewBase, sound.id)
    const { error } = await supabase
      .from('sounds')
      .update({ preview_url: previewUrl })
      .eq('id', sound.id)

    if (error) {
      throw new Error(`Failed to update preview_url for sound ${sound.id}: ${error.message}`)
    }

    console.log(
      `✅ Generated preview for sound ${sound.id} (original ${durationSeconds.toFixed(2)}s, preview ${previewDuration}s)`
    )
    return true
  } finally {
    await fsp.rm(tempDir, { recursive: true, force: true })
  }
}

async function main() {
  console.log('Starting preview generation...')
  const env = loadEnv()
  describeEnv(env)
  await ensureBinaries()

  const supabase = createSupabaseClient(env.supabaseUrl, env.supabaseServiceKey)
  const r2Client = createR2Client({
    accountId: env.r2AccountId,
    accessKeyId: env.r2AccessKeyId,
    secretAccessKey: env.r2SecretAccessKey
  })

  console.log('Fetching sounds that are missing previews...')
  const pendingSounds = await fetchSoundsWithoutPreview(supabase)
  if (!pendingSounds.length) {
    console.log('No sounds require preview generation.')
    return
  }

  console.log(`Generating previews for ${pendingSounds.length} sounds...`)
  const limiter = pLimit(env.concurrency)
  const results = await Promise.all(
    pendingSounds.map((sound) =>
      limiter(async () => {
        try {
          return await processSound({ sound, r2Client, supabase, env })
        } catch (error) {
          console.error(`❌ Failed to generate preview for sound ${sound.id}:`, error)
          return false
        }
      })
    )
  )

  const failures = results.filter((ok) => !ok).length
  if (failures) {
    console.error(`Preview generation completed with ${failures} failure(s).`)
    process.exitCode = 1
  } else {
    console.log('All previews generated successfully.')
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Preview generation script failed:', error)
    process.exit(1)
  })
}
