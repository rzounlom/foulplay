"use client";

import { ClerkProvider } from "@clerk/nextjs";

/**
 * Wrapper for ClerkProvider. Always renders ClerkProvider so that useUser() and
 * other Clerk hooks work during static prerender (e.g. in CI with dummy keys).
 * With dummy/missing keys, Clerk treats the user as unauthenticated.
 */
export function ClerkProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const publishableKey =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "pk_test_dummy";

  return (
    <ClerkProvider publishableKey={publishableKey}>
      {children}
    </ClerkProvider>
  );
}
