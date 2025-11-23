import { computed, ref, watch } from 'vue'
import { supabase } from '@/utils/supabase'
import { useAuth } from '@/composables/useAuth'
import { PLANS } from '@/constants/entitlements'

const THEME_ID_KEY = 'soundroom.themeId'
const THEME_CACHE_KEY = 'soundroom.themeCache'

const themes = ref([])
const currentThemeId = ref(null)
const isLoadingThemes = ref(false)
let authWatcherInitialized = false
let primedFromCache = false

const { user, tier } = useAuth()

function cacheThemes(themeList) {
  try {
    localStorage.setItem(THEME_CACHE_KEY, JSON.stringify(themeList))
  } catch (error) {
    console.warn('Unable to cache themes', error)
  }
}

function loadCachedThemes() {
  try {
    const cached = localStorage.getItem(THEME_CACHE_KEY)
    if (!cached) return []
    const parsed = JSON.parse(cached)
    if (Array.isArray(parsed)) return parsed
    return []
  } catch (error) {
    console.warn('Unable to parse cached themes', error)
    return []
  }
}

function applyCssVariables(theme) {
  if (!theme?.css_vars) return

  Object.entries(theme.css_vars).forEach(([key, value]) => {
    if (typeof value === 'string') {
      document.documentElement.style.setProperty(key, value)
    }
  })

  const name = theme.name?.toLowerCase()
  if (name === 'dark') {
    document.documentElement.style.colorScheme = 'dark'
    document.documentElement.classList.add('dark')
  } else if (name === 'light') {
    document.documentElement.style.colorScheme = 'light'
    document.documentElement.classList.remove('dark')
  }
}

function primeThemeFromCache() {
  if (primedFromCache) return
  primedFromCache = true

  const cached = loadCachedThemes()
  if (cached.length) {
    themes.value = cached
  }

  const storedId = localStorage.getItem(THEME_ID_KEY)
  if (storedId && cached.length) {
    const cachedTheme = cached.find((theme) => theme.id === storedId)
    if (cachedTheme) {
      currentThemeId.value = storedId
      applyCssVariables(cachedTheme)
    }
  }
}

async function fetchThemes() {
  if (isLoadingThemes.value) return themes.value
  isLoadingThemes.value = true
  try {
    const { data, error } = await supabase
      .from('themes')
      .select('id, name, plan_required, css_vars, preview_url')
      .order('name', { ascending: true })

    if (error) throw error

    themes.value = data || []
    cacheThemes(themes.value)
    return themes.value
  } catch (error) {
    console.error('Failed to fetch themes', error)
    return themes.value
  } finally {
    isLoadingThemes.value = false
  }
}

async function fetchUserThemeId(userId) {
  if (!userId) return null
  const { data, error } = await supabase
    .from('users')
    .select('theme_id')
    .eq('id', userId)
    .single()

  if (error) {
    console.warn('Unable to load user theme', error)
    return null
  }

  return data?.theme_id || null
}

function bestAvailableTheme(targetId) {
  if (!themes.value.length) return null

  const accessibleThemes = themes.value.filter((theme) => !isPremiumLocked(theme))

  if (targetId) {
    const matched = themes.value.find((theme) => theme.id === targetId)
    if (matched && !isPremiumLocked(matched)) return matched
  }

  return accessibleThemes[0] || themes.value[0]
}

async function loadTheme() {
  primeThemeFromCache()

  if (!themes.value.length) {
    await fetchThemes()
  }

  const { data } = await supabase.auth.getSession()
  const sessionUserId = data.session?.user?.id
  let desiredId = localStorage.getItem(THEME_ID_KEY)

  if (sessionUserId) {
    desiredId = await fetchUserThemeId(sessionUserId) || desiredId
  }

  const targetTheme = bestAvailableTheme(desiredId)
  if (targetTheme) {
    currentThemeId.value = targetTheme.id
    applyCssVariables(targetTheme)
    localStorage.setItem(THEME_ID_KEY, targetTheme.id)
  }

  return targetTheme
}

function planRank(value) {
  const normalized = (value || 'free').toLowerCase()
  const index = PLANS.indexOf(normalized)
  return index === -1 ? 0 : index
}

function isPremiumLocked(theme) {
  if (!theme) return false
  return planRank(tier.value) < planRank(theme.plan_required)
}

async function setTheme(themeId) {
  if (!themeId) return null
  if (!themes.value.length) await fetchThemes()

  const theme = themes.value.find((item) => item.id === themeId)
  if (!theme) return null
  if (isPremiumLocked(theme)) return null

  currentThemeId.value = themeId
  applyCssVariables(theme)
  localStorage.setItem(THEME_ID_KEY, themeId)
  cacheThemes(themes.value)

  if (user.value?.id) {
    const { error } = await supabase
      .from('users')
      .update({ theme_id: themeId })
      .eq('id', user.value.id)

    if (error) {
      console.warn('Failed to persist theme preference', error)
    }
  }

  return theme
}

function ensureAuthWatcher() {
  if (authWatcherInitialized) return
  authWatcherInitialized = true

  watch(
    () => user.value?.id,
    (newId, oldId) => {
      if (newId && newId !== oldId) {
        void loadTheme()
      }
    }
  )
}

export function useTheme() {
  ensureAuthWatcher()

  return {
    themes: computed(() => themes.value),
    currentTheme: computed(() => themes.value.find((theme) => theme.id === currentThemeId.value) || null),
    loadTheme,
    setTheme,
    isPremiumLocked,
  }
}

export { primeThemeFromCache }
