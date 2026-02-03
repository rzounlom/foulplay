"use client";

import { ClerkProvider } from "@clerk/nextjs";

/**
 * Wrapper for ClerkProvider that handles missing keys gracefully
 * This prevents build failures when keys are not set (e.g., in CI)
 */
export function ClerkProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  // If no valid key, render children without Clerk (for build/CI)
  if (!publishableKey || publishableKey === "pk_test_dummy") {
    return <>{children}</>;
  }

  return <ClerkProvider>{children}</ClerkProvider>;
}
