import { supabase } from '@/utils/supabase'

/**
 * Create a Stripe Billing Portal session and return the redirect URL.
 *
 * @param {string | undefined} returnUrl - Optional URL that Stripe should
 *   redirect back to when the customer exits the portal.
 * @returns {Promise<string>} - Resolves with the portal session URL.
 */
export async function createBillingPortalSession(returnUrl) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) {
    throw new Error(sessionError.message)
  }

  const accessToken = sessionData?.session?.access_token
  if (!accessToken) {
    throw new Error('You must be signed in to manage your subscription.')
  }

  const response = await fetch('/api/billing?action=create-portal', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ returnUrl }),
  })

  let payload = {}
  try {
    payload = await response.json()
  } catch {
    payload = {}
  }

  if (!response.ok) {
    throw new Error(payload.error || 'Unable to open the billing portal. Please try again later.')
  }

  if (typeof payload.url !== 'string' || payload.url.length === 0) {
    throw new Error('Billing portal is currently unavailable. Please contact support for assistance.')
  }

  return payload.url
}
