/**
 * Hard safety checks for destructive E2E DB operations.
 * Never run against production or the everyday dev database.
 */

export function assertSafeE2eEnvironment(options?: { url?: string }): string {
  if (process.env.VERCEL_ENV === "production" || process.env.APP_ENV === "production") {
    throw new Error("Refusing E2E DB helpers: production environment detected");
  }
  if (process.env.APP_ENV !== "test") {
    throw new Error(
      'Refusing E2E DB helpers: set APP_ENV=test (do not use NODE_ENV; next start sets that to production)',
    );
  }

  const url = options?.url || process.env.DATABASE_URL_E2E || "";
  if (!url) {
    throw new Error("DATABASE_URL_E2E is required for E2E database operations");
  }

  if (process.env.PRODUCTION_DATABASE_URL && url === process.env.PRODUCTION_DATABASE_URL) {
    throw new Error("Refusing E2E DB helpers: DATABASE_URL_E2E matches PRODUCTION_DATABASE_URL");
  }

  const allow = process.env.E2E_ALLOW_DB === "true";
  if (!allow && !/e2e/i.test(url)) {
    throw new Error(
      'DATABASE_URL_E2E must contain "e2e" (database or branch name), or set E2E_ALLOW_DB=true for a dedicated local test DB',
    );
  }

  return url;
}

export function e2eBaseUrl(): string {
  return (
    process.env.E2E_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3100"
  );
}

export function isProductionLoadTarget(target: string): boolean {
  try {
    const host = new URL(target).hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1") return false;
    return (
      host === "foulplay.io" ||
      host.endsWith(".foulplay.io") ||
      host.includes("vercel.app")
    );
  } catch {
    return true;
  }
}
