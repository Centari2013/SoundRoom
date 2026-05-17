/**
 * Consolidated billing endpoint.
 *
 * Dispatches by `?action=<name>` to one of four internal handlers,
 * each ported verbatim from its previous standalone file:
 *
 *   POST ?action=create-checkout  ← was api/create-checkout-session.js
 *   POST ?action=create-portal    ← was api/create-portal-session.js
 *   POST ?action=sync-checkout    ← was api/sync-checkout-session.js
 *   POST ?action=manage-plan      ← was api/manage-plan.js
 *
 * All four are authenticated client-initiated Stripe operations on
 * behalf of the signed-in user. Stripe webhook (signature-verified,
 * unauthenticated, server-to-server) intentionally stays in its own
 * file — it's a different trust model and shouldn't be mixed in.
 *
 * Auth model preserved per-handler:
 *   - create-checkout uses `clientReferenceId` from the body (legacy)
 *   - create-portal / manage-plan use Bearer token via Supabase auth
 *   - sync-checkout currently has no caller-auth check (see prior
 *     audit note — not weakened here, just preserved)
 */

import { corsHeaders, jsonResponse } from './_utils/http.js'
import { stripe, supabaseAdmin } from './_utils/serverClients.js'
import {
  PLAN_PRICE_MAPPING,
  extractCustomerId,
  resolvePlanFromCheckoutSession,
} from './_utils/stripePlans.js'
import { updateUserPlanTier } from './_utils/userPlan.js'

// ─── Dispatch ─────────────────────────────────────────────────────

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders })
}

export async function POST(request) {
  const action = (new URL(request.url).searchParams.get('action') || '').trim()
  if (action === 'create-checkout') return handleCreateCheckout(request)
  if (action === 'create-portal') return handleCreatePortal(request)
  if (action === 'sync-checkout') return handleSyncCheckout(request)
  if (action === 'manage-plan') return handleManagePlan(request)
  return jsonResponse(
    { error: `Unknown billing action: ${action || '(missing)'}` },
    { status: 404 }
  )
}

// ─── Shared Supabase-bearer auth (reused by portal + manage-plan) ─

async function authenticateBearer(request) {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client is not configured')
  }
  const authHeader =
    request.headers.get('authorization') || request.headers.get('Authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : ''
  if (!token) throw new Error('Missing access token')
  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data?.user) throw new Error('Invalid or expired access token')
  return data.user
}

// ─── 1. create-checkout ───────────────────────────────────────────
/**
 * Creates a Stripe Checkout session for the chosen plan. Auth model:
 * `clientReferenceId` is passed in the body (preserves prior
 * behavior). Stripe webhook handles persistence after payment.
 */
async function handleCreateCheckout(request) {
  if (!stripe) {
    return jsonResponse({ error: 'Stripe is not configured' }, { status: 500 })
  }

  try {
    const payload = await request.json()
    const planId = String(payload.planId || '').toLowerCase()
    const userId = payload.userId ? String(payload.userId) : undefined
    const successUrl = payload.successUrl
    const cancelUrl = payload.cancelUrl
    const customerEmail = payload.customerEmail ? String(payload.customerEmail) : undefined
    const clientReferenceId = payload.clientReferenceId
      ? String(payload.clientReferenceId)
      : undefined

    if (!planId) return jsonResponse({ error: 'Missing planId' }, { status: 400 })

    const priceId = PLAN_PRICE_MAPPING[planId]
    if (!priceId) return jsonResponse({ error: 'Unsupported plan selected' }, { status: 400 })

    if (!clientReferenceId) {
      return jsonResponse({ error: 'Missing user reference for checkout' }, { status: 400 })
    }

    const baseUrl = process.env.PUBLIC_APP_URL || 'https://soundroom.live'
    const metadata = { planId, userId }
    if (clientReferenceId) metadata.userId = clientReferenceId

    const subscriptionMetadata = { planId }
    if (clientReferenceId) subscriptionMetadata.userId = clientReferenceId

    const sanitizedBaseUrl = baseUrl.replace(/\/$/, '')
    const successUrlWithSession =
      successUrl ||
      `${sanitizedBaseUrl}/settings?checkout=success&session_id={CHECKOUT_SESSION_ID}`
    const cancelUrlWithSession =
      cancelUrl || `${sanitizedBaseUrl}/upgrade?checkout=cancel`

    let existingCustomerId
    if (supabaseAdmin && userId) {
      try {
        const { data: profile, error: profileError } = await supabaseAdmin
          .from('users')
          .select('stripe_customer_id')
          .eq('id', userId)
          .single()
        if (profileError) {
          console.warn('Unable to load Stripe customer for checkout', profileError)
        } else {
          existingCustomerId = profile?.stripe_customer_id || undefined
        }
      } catch (fetchError) {
        console.warn('Unexpected error fetching Stripe customer', fetchError)
      }
    }

    const checkoutSessionParams = {
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      client_reference_id: clientReferenceId,
      success_url: successUrlWithSession,
      cancel_url: cancelUrlWithSession,
      metadata,
      subscription_data: { metadata: subscriptionMetadata },
    }
    if (existingCustomerId) {
      checkoutSessionParams.customer = existingCustomerId
    } else if (customerEmail) {
      checkoutSessionParams.customer_email = customerEmail
    }

    const session = await stripe.checkout.sessions.create(checkoutSessionParams)
    return jsonResponse({ sessionUrl: session.url })
  } catch (error) {
    console.error('Error creating Stripe checkout session', error)
    return jsonResponse({ error: 'Unable to start checkout' }, { status: 500 })
  }
}

// ─── 2. create-portal ─────────────────────────────────────────────
/**
 * Opens a Stripe Billing Portal session for the authenticated user.
 * Requires Bearer token. Refuses if the user has no
 * `stripe_customer_id` recorded (they've never subscribed).
 */
function isValidReturnUrl(url) {
  if (typeof url !== 'string' || !url) return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

async function handleCreatePortal(request) {
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
  if (!isValidReturnUrl(returnUrl)) returnUrl = undefined

  let user
  try {
    user = await authenticateBearer(request)
  } catch (error) {
    return jsonResponse({ error: error.message }, { status: 401 })
  }

  try {
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()
    if (profileError) throw new Error(profileError.message)

    const customerId = profile?.stripe_customer_id
    if (!customerId) {
      return jsonResponse(
        { error: 'No billing account is associated with your profile.' },
        { status: 400 }
      )
    }

    const baseUrl = process.env.PUBLIC_APP_URL || 'https://soundroom.live'
    const fallbackReturnUrl = `${baseUrl.replace(/\/$/, '')}/settings`

    const sessionParams = {
      customer: customerId,
      return_url: returnUrl || fallbackReturnUrl,
    }
    const configuredPortalId = process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID
    if (configuredPortalId) sessionParams.configuration = configuredPortalId

    const session = await stripe.billingPortal.sessions.create(sessionParams)
    return jsonResponse({ url: session.url })
  } catch (error) {
    console.error('Failed to create Stripe billing portal session', error)
    return jsonResponse({ error: error.message || 'Unable to open billing portal' }, { status: 500 })
  }
}

// ─── 3. sync-checkout ─────────────────────────────────────────────
/**
 * Post-redirect plan reconciliation. The customer lands back on the
 * site with a session_id, we fetch the session from Stripe to confirm
 * payment, then write the resolved plan to Supabase. Idempotent —
 * the webhook is the canonical truth; this is a UX optimization so
 * the Settings page shows the right plan immediately.
 */
async function handleSyncCheckout(request) {
  if (!stripe) {
    return jsonResponse({ error: 'Stripe is not configured' }, { status: 500 })
  }

  let payload
  try {
    payload = await request.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  const sessionId = typeof payload.sessionId === 'string' ? payload.sessionId.trim() : ''
  if (!sessionId) return jsonResponse({ error: 'Missing sessionId' }, { status: 400 })

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'subscription.items'],
    })

    if (session.payment_status !== 'paid') {
      return jsonResponse({ status: 'pending' }, { status: 202 })
    }

    const userId = session.client_reference_id || session.metadata?.userId
    if (!userId) {
      return jsonResponse(
        { error: 'Checkout session is missing user reference' },
        { status: 400 }
      )
    }

    const { plan: resolvedPlan, subscriptionId: resolvedSubscriptionId } =
      await resolvePlanFromCheckoutSession(session, stripe)

    const customerId = extractCustomerId(session.customer)
    const planToPersist = resolvedPlan ?? (resolvedSubscriptionId ? undefined : 'free')
    const subscriptionId = planToPersist === 'free' ? null : resolvedSubscriptionId ?? null

    try {
      const persistedPlan = await updateUserPlanTier({
        userId,
        plan: planToPersist,
        customerId,
        subscriptionId,
      })

      if (planToPersist === undefined) {
        return jsonResponse({ status: 'pending' }, { status: 202 })
      }

      return jsonResponse({ status: 'ok', plan: persistedPlan ?? planToPersist ?? 'free' })
    } catch (error) {
      console.error('Failed to persist user plan tier after checkout session sync', error)
      return jsonResponse({ error: 'Failed to finalize plan' }, { status: 500 })
    }
  } catch (error) {
    console.error('Failed to sync checkout session', error)
    return jsonResponse({ error: 'Failed to sync checkout session' }, { status: 500 })
  }
}

// ─── 4. manage-plan ───────────────────────────────────────────────
/**
 * Currently supports `action: 'downgrade'` only (preserved from
 * original). Cancels the Stripe subscription and downgrades the
 * Supabase plan_tier to 'free'. Bearer-token authenticated.
 */
async function cancelSubscriptionIfNeeded(subscriptionId) {
  if (!subscriptionId) return
  if (!stripe) throw new Error('Stripe is not configured for subscription management')
  try {
    await stripe.subscriptions.cancel(subscriptionId)
  } catch (error) {
    if (error?.statusCode === 404) return
    throw error
  }
}

async function handleManagePlan(request) {
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
    user = await authenticateBearer(request)
  } catch (error) {
    return jsonResponse({ error: error.message }, { status: 401 })
  }

  try {
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('stripe_subscription_id, stripe_customer_id')
      .eq('id', user.id)
      .single()
    if (profileError) throw new Error(profileError.message)

    const subscriptionId = profile?.stripe_subscription_id || null
    if (subscriptionId) await cancelSubscriptionIfNeeded(subscriptionId)

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
