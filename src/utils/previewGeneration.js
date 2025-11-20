export async function requestPreviewGeneration(payload) {
  const response = await fetch('/api/generate-preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })

  const rawBody = await response.text().catch(() => '')

  if (!response.ok) {
    let message = rawBody || 'Failed to generate preview'
    try {
      const data = JSON.parse(rawBody)
      message = data?.error || data?.message || message
    } catch (_err) {
      // use fallback
    }
    throw new Error(message)
  }

  try {
    return rawBody ? JSON.parse(rawBody) : {}
  } catch (_err) {
    throw new Error('Preview generation response was not valid JSON')
  }
}
