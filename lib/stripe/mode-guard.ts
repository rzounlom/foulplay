export type StripeKeyMode = "test" | "live" | "unknown";

function keyMode(value: string | undefined): StripeKeyMode {
  if (!value) return "unknown";
  if (value.startsWith("sk_test_") || value.startsWith("pk_test_")) return "test";
  if (value.startsWith("sk_live_") || value.startsWith("pk_live_")) return "live";
  return "unknown";
}

/**
 * Prevent mixing Stripe test and live keys, and block live keys unless
 * explicitly allowed. Production live billing is a later phase.
 */
export function getStripeKeySafetyError(): string | null {
  const secret = process.env.STRIPE_SECRET_KEY;
  const publishable = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!secret || !publishable) return null;

  const secretMode = keyMode(secret);
  const pubMode = keyMode(publishable);

  if (
    secretMode !== "unknown" &&
    pubMode !== "unknown" &&
    secretMode !== pubMode
  ) {
    return `Stripe key mode mismatch: secret is ${secretMode} but publishable is ${pubMode}`;
  }

  const mode = secretMode !== "unknown" ? secretMode : pubMode;
  const allowLive = process.env.STRIPE_ALLOW_LIVE_KEYS === "true";
  if (mode === "live" && !allowLive) {
    return "Live Stripe keys are blocked. This environment is test-mode only. Set STRIPE_ALLOW_LIVE_KEYS=true only for production.";
  }

  return null;
}

export function assertStripeModeSafe(): void {
  const error = getStripeKeySafetyError();
  if (error) {
    throw new Error(error);
  }
}

export function getStripeEnvironmentLabel(): string {
  return (
    process.env.VERCEL_ENV ||
    process.env.NODE_ENV ||
    "development"
  );
}
