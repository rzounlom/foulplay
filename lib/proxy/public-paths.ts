/**
 * API paths that must remain reachable without a Clerk session.
 * Keep this list short: guests need invite preview; Stripe/QStash verify
 * their own signatures and are not Clerk-protected.
 */
export const CLERK_EXEMPT_API_PATHS = ["/api/rooms/invite-preview"] as const;

export function isClerkExemptApiPath(pathname: string): boolean {
  return (CLERK_EXEMPT_API_PATHS as readonly string[]).includes(pathname);
}
