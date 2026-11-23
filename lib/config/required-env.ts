/**
 * Named production environment requirements. Never log or return values.
 */

export type EnvRequirement = {
  name: string;
  requiredInProduction: boolean;
  notes: string;
};

export const PRODUCTION_ENV_REQUIREMENTS: EnvRequirement[] = [
  {
    name: "DATABASE_URL",
    requiredInProduction: true,
    notes: "Neon pooled connection",
  },
  {
    name: "DIRECT_DATABASE_URL",
    requiredInProduction: true,
    notes: "Neon direct URL for prisma migrate",
  },
  {
    name: "CLERK_SECRET_KEY",
    requiredInProduction: true,
    notes: "Production Clerk instance (sk_live)",
  },
  {
    name: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    requiredInProduction: true,
    notes: "Must match the production Clerk instance",
  },
  {
    name: "NEXT_PUBLIC_APP_URL",
    requiredInProduction: true,
    notes: "https://app.foulplay.io",
  },
  {
    name: "NEXT_PUBLIC_MARKETING_URL",
    requiredInProduction: true,
    notes: "https://foulplay.io",
  },
  {
    name: "APP_URL",
    requiredInProduction: true,
    notes: "QStash callback base; must be https://app.foulplay.io",
  },
  {
    name: "ABLY_API_KEY",
    requiredInProduction: true,
    notes: "Server-only. Do not set NEXT_PUBLIC_ABLY_API_KEY in production",
  },
  {
    name: "QSTASH_TOKEN",
    requiredInProduction: true,
    notes: "Upstash QStash",
  },
  {
    name: "QSTASH_CURRENT_SIGNING_KEY",
    requiredInProduction: true,
    notes: "Verifies auto-accept callbacks",
  },
  {
    name: "QSTASH_NEXT_SIGNING_KEY",
    requiredInProduction: true,
    notes: "Key rotation",
  },
  {
    name: "STRIPE_SECRET_KEY",
    requiredInProduction: false,
    notes: "Required only after live billing is approved (sk_live)",
  },
  {
    name: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    requiredInProduction: false,
    notes: "Must match Stripe secret mode",
  },
  {
    name: "STRIPE_WEBHOOK_SECRET",
    requiredInProduction: false,
    notes: "Live-mode webhook signing secret",
  },
  {
    name: "STRIPE_PRICE_GAME_NIGHT",
    requiredInProduction: false,
    notes: "Live price id for $2.99",
  },
  {
    name: "STRIPE_PRICE_MONTHLY",
    requiredInProduction: false,
    notes: "Live price id for $7.99",
  },
  {
    name: "STRIPE_PRICE_LIFETIME",
    requiredInProduction: false,
    notes: "Live price id for $79.99",
  },
  {
    name: "STRIPE_ALLOW_LIVE_KEYS",
    requiredInProduction: false,
    notes: "Must be exactly true before live keys are accepted",
  },
];

export const PRODUCTION_FORBIDDEN_ENV = [
  { name: "APP_ENV", forbiddenValue: "test", notes: "Never set APP_ENV=test in production" },
  {
    name: "NEXT_PUBLIC_ABLY_API_KEY",
    forbiddenWhenSet: true,
    notes: "Would embed the Ably root key in the browser bundle",
  },
  {
    name: "E2E_TEST_TOKEN",
    forbiddenWhenSet: true,
    notes: "E2E-only; must not exist in production",
  },
  {
    name: "DATABASE_URL_E2E",
    forbiddenWhenSet: true,
    notes: "E2E-only",
  },
  {
    name: "E2E_ALLOW_DB",
    forbiddenWhenSet: true,
    notes: "Destructive E2E override",
  },
] as const;

export type EnvPresence = {
  name: string;
  set: boolean;
};

export function inspectEnvPresence(names: string[]): EnvPresence[] {
  return names.map((name) => ({
    name,
    set: Boolean(process.env[name] && String(process.env[name]).trim() !== ""),
  }));
}

export function getForbiddenProductionEnvIssues(): string[] {
  const issues: string[] = [];
  if (process.env.APP_ENV === "test") {
    issues.push("APP_ENV=test is set");
  }
  if (process.env.NEXT_PUBLIC_ABLY_API_KEY) {
    issues.push("NEXT_PUBLIC_ABLY_API_KEY is set");
  }
  if (process.env.E2E_TEST_TOKEN) {
    issues.push("E2E_TEST_TOKEN is set");
  }
  if (process.env.DATABASE_URL_E2E) {
    issues.push("DATABASE_URL_E2E is set");
  }
  if (process.env.E2E_ALLOW_DB === "true") {
    issues.push("E2E_ALLOW_DB=true is set");
  }
  return issues;
}
