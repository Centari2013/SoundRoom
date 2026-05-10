const DEFAULT_IMAGE_PATH = '/SoundRoom.png'

/**
 * Default SEO metadata applied across the application.
 */
export const DEFAULT_SEO = {
  title: 'SoundRoom',
  description: 'Build immersive 3D ambient soundscapes in your browser. SoundRoom pairs Vue, Konva, and the Web Audio API to give you a visual soundboard for focus, relaxation, and creative play.',
  keywords: 'SoundRoom, spatial audio, 3D soundboard, ambient audio app, Web Audio API, Konva, Vue sound design',
}

/**
 * Resolve the canonical site URL preferring the explicit env override.
 *
 * @returns {string}
 */
function getSiteUrl() {
  const envUrl = import.meta.env?.VITE_SITE_URL
  if (envUrl) {
    return envUrl.replace(/\/$/, '')
  }

  if (typeof window !== 'undefined') {
    return window.location.origin
  }

  return ''
}

/**
 * Generate an absolute URL from a path using the configured site URL.
 *
 * @param {string} path
 * @returns {string}
 */
function toAbsoluteUrl(path) {
  const base = getSiteUrl()

  if (!path) {
    return base
  }

  if (!base) {
    return path
  }

  try {
    return new URL(path, `${base}/`).toString()
  } catch (error) {
    console.warn('[seo] Failed to build absolute URL', error)
    return path
  }
}

/**
 * Update a meta tag, creating it (with data-managed="seo") if missing.
 *
 * @param {string} selector
 * @param {string} value
 * @param {{ name?: string, property?: string }} createWith - attributes used when creating a new tag
 */
function updateMetaTag(selector, value, createWith = null) {
  if (typeof document === 'undefined') return

  let element = document.head.querySelector(selector)
  if (!element && createWith && value) {
    element = document.createElement('meta')
    if (createWith.name) element.setAttribute('name', createWith.name)
    if (createWith.property) element.setAttribute('property', createWith.property)
    element.setAttribute('data-managed', 'seo')
    document.head.appendChild(element)
  }
  if (!element) return

  if (value) {
    element.setAttribute('content', value)
  } else {
    element.removeAttribute('content')
  }
}

/**
 * Update a link element (e.g., canonical), creating it if missing.
 *
 * @param {string} selector
 * @param {string} value
 * @param {string} rel - rel attribute to use when creating
 */
function updateLink(selector, value, rel = 'canonical') {
  if (typeof document === 'undefined') return

  let element = document.head.querySelector(selector)
  if (!element && value) {
    element = document.createElement('link')
    element.setAttribute('rel', rel)
    element.setAttribute('data-managed', 'seo')
    document.head.appendChild(element)
  }
  if (!element) return

  if (value) {
    element.setAttribute('href', value)
  } else {
    element.removeAttribute('href')
  }
}

/**
 * Apply SEO metadata for the provided route.
 *
 * @param {import('vue-router').RouteLocationNormalizedLoaded} route
 */
export function applySeo(route) {
  if (typeof document === 'undefined') return

  const seo = {
    ...DEFAULT_SEO,
    ...(route.meta?.seo ?? {}),
  }

  const canonicalPath = seo.canonical ?? route.fullPath
  const shareImagePath = seo.image ?? DEFAULT_IMAGE_PATH

  const canonicalUrl = toAbsoluteUrl(canonicalPath)
  const shareImageUrl = toAbsoluteUrl(shareImagePath)
  const ogTitle = seo.openGraphTitle ?? seo.title
  const ogDescription = seo.openGraphDescription ?? seo.description
  const twitterTitle = seo.twitterTitle ?? seo.title
  const twitterDescription = seo.twitterDescription ?? seo.description

  document.title = seo.title

  updateMetaTag('meta[name="description"][data-managed="seo"]', seo.description, { name: 'description' })
  updateMetaTag('meta[name="keywords"][data-managed="seo"]', seo.keywords, { name: 'keywords' })
  updateMetaTag('meta[property="og:title"][data-managed="seo"]', ogTitle, { property: 'og:title' })
  updateMetaTag('meta[property="og:description"][data-managed="seo"]', ogDescription, { property: 'og:description' })
  updateMetaTag('meta[property="og:url"][data-managed="seo"]', canonicalUrl, { property: 'og:url' })
  updateMetaTag('meta[property="og:image"][data-managed="seo"]', shareImageUrl, { property: 'og:image' })
  updateMetaTag('meta[name="twitter:title"][data-managed="seo"]', twitterTitle, { name: 'twitter:title' })
  updateMetaTag('meta[name="twitter:description"][data-managed="seo"]', twitterDescription, { name: 'twitter:description' })
  updateMetaTag('meta[name="twitter:image"][data-managed="seo"]', shareImageUrl, { name: 'twitter:image' })

  updateLink('link[rel="canonical"][data-managed="seo"]', canonicalUrl, 'canonical')
}
