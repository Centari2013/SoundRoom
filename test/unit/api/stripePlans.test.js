import { describe, expect, it } from 'vitest'
import {
  PLAN_PRICE_MAPPING,
  PLAN_PRODUCT_MAPPING,
  extractCustomerId,
  extractSubscriptionId,
  getPlanFromPriceId,
  getPlanFromProductId,
  normalizePlanFromSubscription,
  normalizePlanId,
  resolvePlanFromCheckoutSession,
} from '@/../api/_utils/stripePlans.js'

describe('stripePlans', () => {
  it('normalizes only supported plan ids', () => {
    expect(normalizePlanId('PRO')).toBe('pro')
    expect(normalizePlanId('basic')).toBe('basic')
    expect(normalizePlanId('enterprise')).toBeNull()
    expect(normalizePlanId()).toBeNull()
  })

  it('maps known Stripe prices and products to plans', () => {
    expect(getPlanFromPriceId(PLAN_PRICE_MAPPING.basic)).toBe('basic')
    expect(getPlanFromPriceId(PLAN_PRICE_MAPPING.pro)).toBe('pro')
    expect(getPlanFromProductId(PLAN_PRODUCT_MAPPING.pro)).toBe('pro')
  })

  it('extracts ids from Stripe string or object references', () => {
    expect(extractCustomerId('cus_123')).toBe('cus_123')
    expect(extractCustomerId({ id: 'cus_456' })).toBe('cus_456')
    expect(extractSubscriptionId('sub_123')).toBe('sub_123')
    expect(extractSubscriptionId({ id: 'sub_456' })).toBe('sub_456')
  })

  it('prefers matching metadata when it agrees with Stripe price/product data', () => {
    const subscription = {
      metadata: { planId: 'basic' },
      items: { data: [{ price: { id: PLAN_PRICE_MAPPING.basic } }] },
    }

    expect(normalizePlanFromSubscription(subscription)).toBe('basic')
  })

  it('falls back to price/product mapping when metadata is missing or conflicting', () => {
    const subscription = {
      metadata: { planId: 'basic' },
      items: { data: [{ price: { id: PLAN_PRICE_MAPPING.pro, product: PLAN_PRODUCT_MAPPING.pro } }] },
    }

    expect(normalizePlanFromSubscription(subscription)).toBe('pro')
  })

  it('resolves checkout sessions from metadata, embedded subscription, or unresolved subscription ids', () => {
    expect(resolvePlanFromCheckoutSession({
      metadata: { planId: 'pro' },
      subscription: 'sub_1',
    })).toEqual({ plan: 'pro', subscriptionId: 'sub_1' })

    expect(resolvePlanFromCheckoutSession({
      subscription: {
        id: 'sub_2',
        items: { data: [{ price: { id: PLAN_PRICE_MAPPING.basic } }] },
      },
    })).toEqual({ plan: 'basic', subscriptionId: 'sub_2' })

    expect(resolvePlanFromCheckoutSession({ subscription: 'sub_3' }))
      .toEqual({ plan: undefined, subscriptionId: 'sub_3' })

    expect(resolvePlanFromCheckoutSession(null)).toEqual({ plan: 'free', subscriptionId: null })
  })
})
