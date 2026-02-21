/**
 * Domain type based on host header.
 * Used for host-based routing: marketing landing, app.
 */
export type DomainType = "app" | "marketing";

const APP_DOMAIN = "app.foulplay.io";
const MARKETING_DOMAIN = "foulplay.io";

export function getDomainType(host: string | null): DomainType {
  if (!host) return "app";
  const h = host.split(":")[0];
  if (h.startsWith("app.")) return "app";
  if (h.startsWith("marketing.")) return "marketing";
  if (h.includes("localhost") || h === "127.0.0.1") return "app";
  return "marketing";
}

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || `https://${APP_DOMAIN}`;
}

export function getMarketingUrl(): string {
  return process.env.NEXT_PUBLIC_MARKETING_URL || `https://${MARKETING_DOMAIN}`;
}
