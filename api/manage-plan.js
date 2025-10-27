import { corsHeaders, jsonResponse } from './_utils/http.js'
import { stripe, supabaseAdmin } from './_utils/serverClients.js'
import { updateUserPlanTier } from './_utils/userPlan.js'

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

async function cancelSubscriptionIfNeeded(subscriptionId) {
  if (!subscriptionId) {
    return
  }

  if (!stripe) {
    throw new Error('Stripe is not configured for subscription management')
  }

  try {
    await stripe.subscriptions.cancel(subscriptionId)
  } catch (error) {
    if (error?.statusCode === 404) {
      return
    }

    throw error
  }
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  })
}

export async function POST(request) {
  let payload

  try {
    payload = await request.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  const action = typeof payload.action === 'string' ? payload.action.toLowerCase() : ''

  if (action !== 'downgrade') {
    return jsonResponse({ error: 'Unsupported action' }, { status: 400 })
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
      .select('stripe_subscription_id, stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (profileError) {
      throw new Error(profileError.message)
    }

    const subscriptionId = profile?.stripe_subscription_id || null

    if (subscriptionId) {
      await cancelSubscriptionIfNeeded(subscriptionId)
    }

    const normalizedPlan = await updateUserPlanTier({
      userId: user.id,
      plan: 'free',
      subscriptionId: null,
      customerId: profile?.stripe_customer_id ?? undefined,
    })

    return jsonResponse({ status: 'ok', plan: normalizedPlan })
  } catch (error) {
    console.error('Failed to update plan', error)
    return jsonResponse({ error: error.message || 'Unable to update plan' }, { status: 500 })
  }
}
