"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { useCallback } from "react";

export type InFlowSignInCopy = {
  /** Clerk Sign-In modal heading */
  title?: string;
  /** Supporting line under the heading */
  subtitle?: string;
};

/**
 * Opens Clerk’s sign-in modal (in-flow) and returns the user to `returnPath` after success.
 * Use for join/create and other gated actions; keep `/sign-in` for nav and account flows.
 */
export function useClerkInFlowSignIn() {
  const { isLoaded } = useAuth();
  const { openSignIn } = useClerk();

  const openSignInForReturn = useCallback(
    (returnPath: string, copy?: InFlowSignInCopy) => {
      if (!isLoaded) return;
      const path = returnPath.startsWith("/") ? returnPath : `/${returnPath}`;

      openSignIn({
        forceRedirectUrl: path,
        fallbackRedirectUrl: path,
        ...(copy?.title || copy?.subtitle
          ? {
              appearance: {
                elements: {
                  ...(copy.title ? { headerTitle: copy.title } : {}),
                  ...(copy.subtitle ? { headerSubtitle: copy.subtitle } : {}),
                },
              },
            }
          : {}),
      });
    },
    [isLoaded, openSignIn],
  );

  return { openSignInForReturn, authLoaded: isLoaded };
}
