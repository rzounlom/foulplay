# Stripe test-mode billing (DEV / QA)

FoulPlay uses Stripe **test mode** in deployed non-production environments.
Do not add live keys unless you are configuring production and set
`STRIPE_ALLOW_LIVE_KEYS=true`.

## Required environment variables

```
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

STRIPE_PRICE_GAME_NIGHT=price_...   # one-time $2.99, 24h Game Night
STRIPE_PRICE_MONTHLY=price_...      # recurring $7.99/month FoulPlay+
STRIPE_PRICE_LIFETIME=price_...     # one-time $79.99 lifetime
```

`STRIPE_PRICE_ID` is still accepted as a **monthly fallback** for older test setups.

## Safety

- Secret and publishable keys must both be test or both live.
- Live keys are rejected unless `STRIPE_ALLOW_LIVE_KEYS=true`.
- Create products/prices in the **same Stripe mode** as the keys (Dashboard → Test mode).
- Price IDs do not encode test vs live; mixing a live price with test keys will fail at Stripe.

## Webhook events

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

## Local webhook forwarding

```
stripe listen --forward-to localhost:3000/api/stripe/webhook

# E2E app (port 3100)
stripe listen --forward-to localhost:3100/api/stripe/webhook
```

Copy the CLI `whsec_...` into `STRIPE_WEBHOOK_SECRET`.
