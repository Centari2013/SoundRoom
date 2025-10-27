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
 * Update a meta tag if it is available in the document head.
 *
 * @param {string} selector
 * @param {string} value
 * @param {string} attribute
 */
function updateMetaTag(selector, value, attribute = 'content') {
  if (typeof document === 'undefined') return

  const element = document.head.querySelector(selector)
  if (!element) return

  if (value) {
    element.setAttribute(attribute, value)
  } else {
    element.removeAttribute(attribute)
  }
}

/**
 * Update a link element (e.g., canonical) if present.
 *
 * @param {string} selector
 * @param {string} value
 */
function updateLink(selector, value) {
  if (typeof document === 'undefined') return

  const element = document.head.querySelector(selector)
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

  updateMetaTag('meta[name="description"][data-managed="seo"]', seo.description)
  updateMetaTag('meta[name="keywords"][data-managed="seo"]', seo.keywords)
  updateMetaTag('meta[property="og:title"][data-managed="seo"]', ogTitle)
  updateMetaTag('meta[property="og:description"][data-managed="seo"]', ogDescription)
  updateMetaTag('meta[property="og:url"][data-managed="seo"]', canonicalUrl)
  updateMetaTag('meta[property="og:image"][data-managed="seo"]', shareImageUrl)
  updateMetaTag('meta[name="twitter:title"][data-managed="seo"]', twitterTitle)
  updateMetaTag('meta[name="twitter:description"][data-managed="seo"]', twitterDescription)
  updateMetaTag('meta[name="twitter:image"][data-managed="seo"]', shareImageUrl)

  updateLink('link[rel="canonical"][data-managed="seo"]', canonicalUrl)
}
