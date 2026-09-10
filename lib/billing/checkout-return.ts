/**
 * Safe relative return path after Stripe Checkout.
 * Rejects open redirects and protocol-relative URLs.
 */
export function sanitizeCheckoutReturnPath(
  value: unknown,
  fallback = "/upgrade",
): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return fallback;
  }
  if (trimmed.includes("://")) {
    return fallback;
  }
  if (trimmed.length > 200) {
    return fallback;
  }
  return trimmed;
}

export function withCheckoutQuery(
  path: string,
  params: Record<string, string>,
): string {
  const hashIndex = path.indexOf("#");
  const withoutHash = hashIndex >= 0 ? path.slice(0, hashIndex) : path;
  const hash = hashIndex >= 0 ? path.slice(hashIndex) : "";
  const url = new URL(withoutHash, "https://app.foulplay.io");
  for (const [key, val] of Object.entries(params)) {
    url.searchParams.set(key, val);
  }
  return `${url.pathname}${url.search}${hash}`;
}
