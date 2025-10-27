import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY

if (!stripeSecretKey) {
  console.warn('Missing STRIPE_SECRET_KEY environment variable. Stripe functionality is disabled.')
}

export const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  console.warn('Missing SUPABASE_URL environment variable. Supabase admin client cannot be created.')
}

if (!supabaseServiceKey) {
  console.warn('Missing SUPABASE_SERVICE_ROLE_KEY environment variable. Supabase admin client cannot be created.')
}

export const supabaseAdmin =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          persistSession: false,
        },
      })
    : null
