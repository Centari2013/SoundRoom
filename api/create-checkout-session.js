import { corsHeaders, jsonResponse } from './_utils/http.js'
import { stripe, supabaseAdmin } from './_utils/serverClients.js'
import { PLAN_PRICE_MAPPING } from './_utils/stripePlans.js'

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  })
}

export async function POST(request) {
  if (!stripe) {
    return jsonResponse({ error: 'Stripe is not configured' }, { status: 500 });
  }

  try {
    const payload = await request.json();
    const planId = String(payload.planId || '').toLowerCase();
    const userId = payload.userId ? String(payload.userId) : undefined;
    const successUrl = payload.successUrl;
    const cancelUrl = payload.cancelUrl;
    const customerEmail = payload.customerEmail ? String(payload.customerEmail) : undefined;
    const clientReferenceId = payload.clientReferenceId ? String(payload.clientReferenceId) : undefined;

    if (!planId) {
      return jsonResponse({ error: 'Missing planId' }, { status: 400 });
    }

    const priceId = PLAN_PRICE_MAPPING[planId];
    if (!priceId) {
      return jsonResponse({ error: 'Unsupported plan selected' }, { status: 400 });
    }

    if (!clientReferenceId) {
      return jsonResponse({ error: 'Missing user reference for checkout' }, { status: 400 });
    }

    const baseUrl = process.env.PUBLIC_APP_URL || 'https://soundroom.live';

    const metadata = { planId, userId };
    if (clientReferenceId) metadata.userId = clientReferenceId;

    const subscriptionMetadata = { planId };
    if (clientReferenceId) subscriptionMetadata.userId = clientReferenceId;

    const sanitizedBaseUrl = baseUrl.replace(/\/$/, '');
    const successUrlWithSession = successUrl
      || `${sanitizedBaseUrl}/settings?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrlWithSession = cancelUrl || `${sanitizedBaseUrl}/upgrade?checkout=cancel`;

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
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      client_reference_id: clientReferenceId,
      success_url: successUrlWithSession,
      cancel_url: cancelUrlWithSession,
      metadata,
      subscription_data: {
        metadata: subscriptionMetadata,
      },
    }

    if (existingCustomerId) {
      checkoutSessionParams.customer = existingCustomerId
    } else if (customerEmail) {
      checkoutSessionParams.customer_email = customerEmail
    }

    const session = await stripe.checkout.sessions.create(checkoutSessionParams)

    return jsonResponse({ sessionUrl: session.url });
  } catch (error) {
    console.error('Error creating Stripe checkout session', error);
    return jsonResponse({ error: 'Unable to start checkout' }, { status: 500 });
  }
}

