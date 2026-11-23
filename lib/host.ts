/**
 * Domain type based on host header.
 * Used for host-based routing: marketing landing, app.
 */
export type DomainType = "app" | "marketing";

const APP_DOMAIN = "app.foulplay.io";
const MARKETING_DOMAIN = "foulplay.io";

export function hostnameFromUrl(value: string | undefined | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function getDomainType(host: string | null): DomainType {
  if (!host) return "app";
  const h = host.split(":")[0].toLowerCase();
  if (h.startsWith("app.")) return "app";
  if (h.startsWith("marketing.")) return "marketing";
  if (h.includes("localhost") || h === "127.0.0.1") return "app";
  // Preview deployments live on *.vercel.app and must not be treated as
  // marketing — that redirects /create and /sign-in onto themselves.
  if (h.endsWith(".vercel.app")) return "app";
  const configuredAppHost = hostnameFromUrl(process.env.NEXT_PUBLIC_APP_URL);
  if (configuredAppHost && h === configuredAppHost) return "app";
  return "marketing";
}

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || `https://${APP_DOMAIN}`;
}

export function getMarketingUrl(): string {
  return process.env.NEXT_PUBLIC_MARKETING_URL || `https://${MARKETING_DOMAIN}`;
}
