import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

import { NextResponse } from "next/server";
import { getDomainType, getAppUrl } from "@/lib/host";
import { isClerkExemptApiPath } from "@/lib/proxy/public-paths";

const isProtectedRoute = createRouteMatcher([
  "/game(.*)",
  "/api/game(.*)",
  "/api/rooms(.*)",
  "/api/ably(.*)",
  "/admin(.*)",
  "/api/admin(.*)",
]);

const APP_ROUTES = [
  "/create",
  "/join",
  "/game",
  "/games",
  "/profile",
  "/upgrade",
  "/admin",
  "/sign-in",
  "/sign-up",
  "/active-games",
];

function isAppRoute(pathname: string): boolean {
  return APP_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

/**
 * Next.js 16 `proxy.ts` accepts a default export or a named `proxy` export.
 * Clerk's Next.js 16 quickstart uses `export default clerkMiddleware(...)`.
 */
const clerkProxy = clerkMiddleware(async (auth, req) => {
  const pathname = req.nextUrl.pathname;
  if (
    !pathname.startsWith("/api/") &&
    !pathname.startsWith("/_next/") &&
    !pathname.startsWith("/favicon") &&
    !pathname.includes(".")
  ) {
    const host = req.headers.get("host") ?? "";
    const domainType = getDomainType(host);
    if (isAppRoute(pathname) && domainType !== "app") {
      const appUrl = getAppUrl();
      const url = new URL(pathname + req.nextUrl.search, appUrl);
      // Never bounce a host onto itself — that 307 looped Clerk on Preview.
      if (url.hostname !== req.nextUrl.hostname) {
        return NextResponse.redirect(url);
      }
    }
  }

  if (isClerkExemptApiPath(pathname)) {
    return NextResponse.next();
  }

  if (isProtectedRoute(req)) {
    const { userId } = await auth();
    if (!userId) {
      if (req.nextUrl.pathname.startsWith("/api")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }
  }
});

export default clerkProxy;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
