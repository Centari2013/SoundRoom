import { supabase } from '@/utils/supabase'

export async function fetchAllThemes() {
  const { data, error } = await supabase
    .from('themes')
    .select('id, name, required_plan, theme_base, css_vars')
    .order('name', { ascending: true })

  if (error) throw error
  return data || []
}

export async function fetchUserTheme() {
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError) throw authError
  const userId = authData?.user?.id
  if (!userId) return null

  const { data, error } = await supabase
    .from('users')
    .select('theme_id, theme:theme_id ( id, name, required_plan, theme_base, css_vars )')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data?.theme || null
}

export async function saveUserTheme(themeId) {
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError) throw authError
  const userId = authData?.user?.id
  if (!userId) throw new Error('You must be signed in to save a theme.')

  const { error } = await supabase
    .from('users')
    .update({ theme_id: themeId || null })
    .eq('id', userId)

  if (error) throw error
  return themeId || null
}
