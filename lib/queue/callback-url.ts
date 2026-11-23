import { hostnameFromUrl } from "@/lib/host";

const PRODUCTION_CALLBACK_HOSTS = new Set([
  "foulplay.io",
  "www.foulplay.io",
  "app.foulplay.io",
]);

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

/**
 * Base URL for QStash auto-accept callbacks.
 * Preview deployments must never enqueue jobs to production hosts.
 */
export function getQstashCallbackBaseUrl(): string {
  const configured = stripTrailingSlash(
    process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "",
  );
  const vercelUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "";

  if (process.env.VERCEL_ENV === "preview") {
    const candidate = configured || vercelUrl;
    const host = hostnameFromUrl(candidate);
    if (!host || PRODUCTION_CALLBACK_HOSTS.has(host)) {
      if (!vercelUrl) {
        throw new Error(
          "Refusing to enqueue QStash to a production host from a preview deployment",
        );
      }
      return vercelUrl;
    }
    return candidate;
  }

  return configured || "http://localhost:3000";
}

export function qstashCallbackUrl(path: string): string {
  const base = getQstashCallbackBaseUrl();
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
}

export function qstashDeliveryHeaders(): Record<string, string> | undefined {
  if (process.env.VERCEL_ENV !== "preview") return undefined;
  const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (!bypass) return undefined;
  return {
    "x-vercel-protection-bypass": bypass,
    "x-vercel-set-bypass-cookie": "true",
  };
}
