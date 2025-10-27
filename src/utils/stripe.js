import { loadStripe } from '@stripe/stripe-js'

let stripePromise

/**
 * Lazily load the Stripe.js instance using the publishable key.
 *
 * @returns {Promise<import('@stripe/stripe-js').Stripe | null>}
 */
export function getStripe() {
  if (!stripePromise) {
    const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
    if (!publishableKey) {
      console.warn('Stripe publishable key is not defined. Checkout is disabled.')
      return Promise.resolve(null)
    }

    stripePromise = loadStripe(publishableKey)
  }

  return stripePromise
}

/**
 * Create a checkout session for the selected plan and redirect the user.
 *
 * @param {{
 *   planId: string,
 *   userId: string,
 *   customerEmail?: string,
 *   successUrl?: string,
 *   cancelUrl?: string,
 *   clientReferenceId?: string,
 * }} options
 */
export async function redirectToCheckout(options) {
  const stripe = await getStripe()

  if (!stripe) {
    throw new Error('Stripe failed to load')
  }

  const response = await fetch('/api/create-checkout-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      planId: options.planId,
      userId: options.userId,
      customerEmail: options.customerEmail,
      successUrl: options.successUrl,
      cancelUrl: options.cancelUrl,
      clientReferenceId: options.clientReferenceId,
    }),
  })

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorPayload.error || 'Unable to start checkout')
  }

  const { sessionUrl } = await response.json()

  if (!sessionUrl) {
    throw new Error('Stripe session URL was not returned')
  }

  window.location.href = sessionUrl; // navigate to Stripe directly
  
}
