/**
 * Fail-closed E2E environment detection.
 * Production never sets APP_ENV=test. NODE_ENV=production is used by `next start`
 * even in test, so APP_ENV is the only app-level switch.
 */

export function isE2EAppEnv(): boolean {
  return process.env.APP_ENV === "test";
}

export function isProductionDeploy(): boolean {
  return (
    process.env.VERCEL_ENV === "production" ||
    process.env.APP_ENV === "production"
  );
}

export function e2eAutoAcceptSeconds(): number | null {
  if (!isE2EAppEnv()) return null;
  const raw = process.env.AUTO_ACCEPT_SECONDS_E2E;
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1 || n > 120) return null;
  return Math.floor(n);
}

export function e2eIntermissionSeconds(): number | null {
  if (!isE2EAppEnv()) return null;
  const raw = process.env.INTERMISSION_SECONDS_E2E;
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1 || n > 300) return null;
  return Math.floor(n);
}
