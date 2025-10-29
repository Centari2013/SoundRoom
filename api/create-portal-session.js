import { corsHeaders, jsonResponse } from './_utils/http.js'
import { stripe, supabaseAdmin } from './_utils/serverClients.js'

async function authenticateRequest(request) {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client is not configured')
  }

  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : ''

  if (!token) {
    throw new Error('Missing access token')
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token)

  if (error || !data?.user) {
    throw new Error('Invalid or expired access token')
  }

  return data.user
}

function isValidReturnUrl(url) {
  if (typeof url !== 'string' || !url) {
    return false
  }

  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  })
}

export async function POST(request) {
  if (!stripe) {
    return jsonResponse({ error: 'Stripe is not configured' }, { status: 500 })
  }

  if (!supabaseAdmin) {
    return jsonResponse({ error: 'Supabase admin client is not configured' }, { status: 500 })
  }

  let payload = {}
  try {
    payload = await request.json()
  } catch {
    payload = {}
  }

  let returnUrl = typeof payload.returnUrl === 'string' ? payload.returnUrl : undefined
  if (!isValidReturnUrl(returnUrl)) {
    returnUrl = undefined
  }

  let user
  try {
    user = await authenticateRequest(request)
  } catch (error) {
    return jsonResponse({ error: error.message }, { status: 401 })
  }

  try {
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (profileError) {
      throw new Error(profileError.message)
    }

    const customerId = profile?.stripe_customer_id

    if (!customerId) {
      return jsonResponse({ error: 'No billing account is associated with your profile.' }, { status: 400 })
    }

    const baseUrl = process.env.PUBLIC_APP_URL || 'https://soundroom.live'
    const fallbackReturnUrl = `${baseUrl.replace(/\/$/, '')}/settings`

    const sessionParams = {
      customer: customerId,
      return_url: returnUrl || fallbackReturnUrl,
    }

    const configuredPortalId = process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID
    if (configuredPortalId) {
      sessionParams.configuration = configuredPortalId
    }

    const session = await stripe.billingPortal.sessions.create(sessionParams)

    return jsonResponse({ url: session.url })
  } catch (error) {
    console.error('Failed to create Stripe billing portal session', error)
    return jsonResponse({ error: error.message || 'Unable to open billing portal' }, { status: 500 })
  }
}
