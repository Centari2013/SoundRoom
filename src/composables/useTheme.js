import { readonly, ref } from 'vue'
import { supabase } from '@/utils/supabase'
import { useAuth } from './useAuth'

const THEME_CACHE_KEY = 'soundroom_theme_id'

const BASE_CSS_VARS = {
  sr_bg_0: '#f5f5f5',
  sr_bg_1: '#ebebeb',
  sr_bg_2: '#dcdcdc',
  sr_white: '#ffffff',
  sr_white_rgb: '255, 255, 255',
  sr_black: '#000000',
  sr_black_rgb: '0, 0, 0',
  sr_text_0: '#222222',
  sr_text_1: '#555555',
  sr_surface_muted: '#333333',
  sr_border: '#c8c8c8',
  sr_grid_line: 'rgba(0, 0, 0, 0.08)',
  sr_shadow: '0 4px 10px rgba(0, 0, 0, 0.12)',
  sr_primary: '#2e90fa',
  sr_primary_rgb: '46, 144, 250',
  sr_danger: '#f44336',
  sr_danger_rgb: '244, 67, 54',
  sr_highlight: '#ffff00',
  sr_selection_glow: '#6fd7ff',
  sr_node_red: '#d45a5a',
  sr_node_red_rgb: '212, 90, 90',
  sr_node_blue: '#6c8edb',
  sr_node_blue_rgb: '108, 142, 219',
  sr_cone_red: 'rgba(212, 90, 90, 0.1)',
  sr_cone_blue: 'rgba(108, 142, 219, 0.12)',
  sr_detail_stroke: '#2f3a4a',
  sr_detail_fill_rgb: '70, 80, 95',
  sr_detail_gradient_rgb: '140, 150, 165',
  sr_body_fill_rgb: '150, 165, 185',
  sr_body_stroke_rgb: '60, 70, 85',
  sr_detail_fill: 'rgba(70, 80, 95, 0.85)',
  sr_outline_contrast: '#111827',
  sr_outline_contrast_rgb: '17, 24, 39',
  sr_focus: '#4a90e2',
  sr_focus_rgb: '74, 144, 226',
  sr_panel: '#f8f8f8',
  sr_input_bg: '#dcdcdc',
  sr_disabled_bg: '#dcdcdc',
  sr_disabled_text: '#555555',
  sr_vignette_inner: 'rgba(0, 0, 0, 0.06)',
  sr_vignette_middle: 'rgba(0, 0, 0, 0.04)',
  sr_vignette_outer: 'rgba(0, 0, 0, 0.08)',
  sr_vignette_shadow: 'inset 0 0 70px rgba(0, 0, 0, 0.12)',
  sr_panel_border: 'rgba(200, 200, 200, 0.75)',
  sr_icon_muted: '#6b7280',
  sr_palette_blue_500: '#3b82f6',
  sr_palette_green_500: '#22c55e',
  sr_palette_red_500: '#ef4444',
  sr_palette_amber_500: '#f59e0b',
  sr_palette_violet_500: '#8b5cf6'
}

const BASE_THEME = {
  id: 'base-default',
  name: 'Default',
  is_dark_mode: false,
  css_vars: BASE_CSS_VARS
}

const themes = ref([BASE_THEME])
const currentTheme = ref(BASE_THEME)
const isLoadingThemes = ref(false)

function toCssName(key) {
  return `--${key.replace(/_/g, '-')}`
}

function hexToRgb(value) {
  if (typeof value !== 'string') return null
  const hex = value.trim().replace('#', '')
  if (![3, 6].includes(hex.length)) return null
  const normalized = hex.length === 3
    ? hex.split('').map(c => c + c).join('')
    : hex
  const intVal = parseInt(normalized, 16)
  const r = (intVal >> 16) & 255
  const g = (intVal >> 8) & 255
  const b = intVal & 255
  return `${r}, ${g}, ${b}`
}

function valueToRgb(value) {
  if (!value) return null
  if (value.startsWith('rgb')) {
    const digits = value.replace(/rgba?\(|\)/g, '').split(',').slice(0, 3).map(v => v.trim())
    if (digits.length === 3 && digits.every(v => v !== '')) return digits.join(', ')
    return null
  }
  if (value.startsWith('#')) return hexToRgb(value)
  return null
}

function clearSrVars(root) {
  Array.from(root.style).forEach((prop) => {
    if (prop.startsWith('--sr-')) {
      root.style.removeProperty(prop)
    }
  })
}

function mergeCssVars(cssVars = {}) {
  return { ...BASE_CSS_VARS, ...cssVars }
}

async function persistUserTheme(themeId) {
  const { user } = useAuth()
  if (!user.value?.id) return
  await supabase.from('users').update({ theme_id: themeId }).eq('id', user.value.id)
}

async function applyTheme(theme) {
  const root = document.documentElement
  const merged = mergeCssVars(theme?.css_vars)
  clearSrVars(root)

  Object.entries(merged).forEach(([key, value]) => {
    const cssName = toCssName(key)
    const normalizedValue = typeof value === 'number' ? String(value) : value
    if (typeof normalizedValue === 'string') {
      root.style.setProperty(cssName, normalizedValue)
      const rgbValue = valueToRgb(normalizedValue)
      if (rgbValue && !cssName.endsWith('-rgb')) {
        root.style.setProperty(`${cssName}-rgb`, rgbValue)
      }
    }
  })

  if (theme?.is_dark_mode) root.classList.add('dark')
  else root.classList.remove('dark')

  root.style.setProperty('color-scheme', theme?.is_dark_mode ? 'dark' : 'light')
  currentTheme.value = { ...(theme ?? BASE_THEME), css_vars: merged }
  localStorage.setItem(THEME_CACHE_KEY, theme?.id ?? BASE_THEME.id)
}

async function fetchThemes() {
  isLoadingThemes.value = true
  try {
    const { data, error } = await supabase
      .from('themes')
      .select('id, name, css_vars, is_dark_mode, is_premium, required_plan')
    if (error) throw error
    themes.value = [BASE_THEME, ...(data ?? [])]
    return themes.value
  } catch (error) {
    console.error('Failed to fetch themes', error)
    themes.value = [BASE_THEME]
    return themes.value
  } finally {
    isLoadingThemes.value = false
  }
}

function isPremiumLocked(theme) {
  const { tier } = useAuth()
  const requiredPlan = (theme?.required_plan || (theme?.is_premium ? 'pro' : 'free')).toLowerCase()
  const currentTier = (tier.value || 'free').toLowerCase()
  if (requiredPlan === 'free') return false
  return currentTier === 'free'
}

async function setTheme(themeId, { persist = true } = {}) {
  const theme = themes.value.find((t) => t.id === themeId) ?? BASE_THEME
  await applyTheme(theme)
  if (persist) {
    localStorage.setItem(THEME_CACHE_KEY, theme.id)
    await persistUserTheme(theme.id)
  }
  return theme
}

async function preloadTheme() {
  await applyTheme(currentTheme.value)
  let savedId = localStorage.getItem(THEME_CACHE_KEY)
  try {
    if (!savedId) {
      const { data: authData } = await supabase.auth.getUser()
      const authUserId = authData?.user?.id
      if (authUserId) {
        const { data: userTheme } = await supabase
          .from('users')
          .select('theme_id')
          .eq('id', authUserId)
          .single()
        savedId = userTheme?.theme_id || savedId
        if (savedId) {
          localStorage.setItem(THEME_CACHE_KEY, savedId)
        }
      }
    }
    await fetchThemes()
    const matched = themes.value.find((theme) => theme.id === savedId)
    if (matched) {
      await applyTheme(matched)
    }
  } catch (error) {
    console.warn('Theme preload fallback to base', error)
  }
}

export function useTheme() {
  return {
    themes: readonly(themes),
    currentTheme: readonly(currentTheme),
    isLoadingThemes: readonly(isLoadingThemes),
    fetchThemes,
    setTheme,
    applyTheme,
    preloadTheme,
    isPremiumLocked,
  }
}
