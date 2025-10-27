import Stripe from 'stripe'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY

if (!stripeSecretKey) {
  console.warn('Missing STRIPE_SECRET_KEY environment variable. Stripe checkout API will not function.')
}

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey)
  : null

const ALLOWED_ORIGIN = process.env.NODE_ENV === 'production' ? 'https://soundroom.live' : '*'

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Credentials': 'true',
}

const PLAN_PRICE_MAPPING = {
  basic: process.env.STRIPE_BASIC_PRICE_ID,
  pro: process.env.STRIPE_PRO_PRICE_ID,
}

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
      ...(init.headers || {}),
    },
  })
}

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

    const baseUrl = process.env.PUBLIC_APP_URL || 'https://soundroom.live';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      customer_email: customerEmail,
      client_reference_id: clientReferenceId,
      success_url: successUrl || `${baseUrl}/manage-plan?checkout=success`,
      cancel_url: cancelUrl || `${baseUrl}/upgrade?checkout=cancel`,
      metadata: { planId },
    });

    return jsonResponse({ sessionUrl: session.url });
  } catch (error) {
    console.error('Error creating Stripe checkout session', error);
    return jsonResponse({ error: 'Unable to start checkout' }, { status: 500 });
  }
}

