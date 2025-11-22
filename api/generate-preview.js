import { getEnv } from '@vercel/functions'
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
import { supabaseAdmin } from './_utils/serverClients.js'

const TEN_SECONDS = 10
const execFileAsync = promisify(execFile)
const ffmpegExecutable = ffmpegPath || 'ffmpeg'
const ffprobeExecutable = ffprobePath?.path || ffprobePath || 'ffprobe'

function loadEnv() {
  const fallback = getEnv?.()
  return {
    accountId: process.env.R2_ACCOUNT_ID || fallback?.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID || fallback?.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || fallback?.R2_SECRET_ACCESS_KEY,
    privateBucket: process.env.R2_BUCKET_NAME || fallback?.R2_BUCKET_NAME,
    previewBucket: process.env.R2_PREVIEW_BUCKET_NAME || fallback?.R2_PREVIEW_BUCKET_NAME,
    previewPublicBase:
      process.env.R2_PREVIEW_PUBLIC_BASE_URL || fallback?.R2_PREVIEW_PUBLIC_BASE_URL || 'https://preview.soundroom.live'
  }
}

function createR2Client({ accessKeyId, secretAccessKey, accountId }) {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  })
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
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: 'audio/mpeg'
    })
  )
}

function buildPreviewUrl(baseUrl, soundId) {
  const trimmedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  return `${trimmedBase}/previews/${soundId}-preview.mp3`
}

export async function POST(request) {
  try {
    const env = loadEnv()
    if (!env.accountId || !env.accessKeyId || !env.secretAccessKey || !env.privateBucket || !env.previewBucket) {
      return new Response(
        JSON.stringify({
          error: 'Missing Cloudflare R2 configuration',
          message:
            'R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, and R2_PREVIEW_BUCKET_NAME are required.'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const { key, soundId } = await request.json()

    if (!key || !soundId) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
          message: 'key and soundId are required to generate a preview.'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const sanitizedKey = key.toString().replace(/\s+/g, '').replace(/\/+/g, '')
    if (!sanitizedKey || sanitizedKey.includes('..') || sanitizedKey.includes('/')) {
      return new Response(
        JSON.stringify({ error: 'Invalid object key provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const r2 = createR2Client(env)
    const originalKey = sanitizedKey

    const tmpDir = os.tmpdir()
    const inputPath = path.join(tmpDir, `${randomUUID()}-source`)
    const previewPath = path.join(tmpDir, `${randomUUID()}-preview.mp3`)

    try {
      await downloadOriginal(r2, env.privateBucket, originalKey, inputPath)
      const durationSeconds = await probeDuration(inputPath)
      const previewDuration = Math.min(durationSeconds || 0, TEN_SECONDS)
      await encodePreview(inputPath, previewPath, previewDuration)

      const previewKey = `previews/${soundId}-preview.mp3`
      await uploadPreview(r2, env.previewBucket, previewKey, previewPath)

      const previewUrl = buildPreviewUrl(env.previewPublicBase, soundId)

      if (supabaseAdmin) {
        await supabaseAdmin.from('sound_files').update({ preview_url: previewUrl }).eq('id', soundId)
      }

      return new Response(
        JSON.stringify({
          previewUrl,
          originalDuration: durationSeconds,
          previewDuration
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    } finally {
      await Promise.allSettled([
        fsp.rm(inputPath, { force: true }),
        fsp.rm(previewPath, { force: true })
      ])
    }
  } catch (error) {
    console.error('[preview] generation failed', error)
    return new Response(
      JSON.stringify({ error: 'Failed to generate preview', message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  })
}
